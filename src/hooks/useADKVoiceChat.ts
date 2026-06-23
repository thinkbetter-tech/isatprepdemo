/**
 * ADK Voice Chat Hook
 * Connects to Google ADK Voice Agent via WebSocket for bidirectional audio streaming
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Types
export type VoiceMode = 'classroom' | 'pustak' | 'review' | 'video_lecture';

export interface ADKVoiceConfig {
  studentId: number;
  userId: string;
  language: string;
  targetExam?: string;
  mode?: VoiceMode;
  // Fired when the v2 voice WS emits a blackboard_command. The v2 backend
  // multiplexes canvas commands onto the voice WS (see api/voice_v2_websocket
  // _flush_blackboard_commands), so the parent must hand them off to the
  // blackboard renderer's executeCommand.
  onBlackboardCommand?: (command: any) => void;
}

export interface ADKTranscription {
  source: 'user' | 'agent';
  text: string;
  finished: boolean;
  timestamp: Date;
  /** Optional reasoning/thinking paragraph attached to this entry. When
   *  present, this entry represents a `thinking` event from the backend
   *  (Gemini's include_thoughts=True), not a regular text turn. The
   *  consumer (useTranscriptProcessor) accumulates these into a per-turn
   *  thinkingHistory and ignores `text` for thinking entries. */
  thinking?: string;
}

export interface ADKToolCall {
  tool: string;
  args: Record<string, any>;
  timestamp: Date;
}

export type ADKConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

interface UseADKVoiceChatReturn {
  // State
  connectionState: ADKConnectionState;
  isListening: boolean;
  isSpeaking: boolean;
  transcriptions: ADKTranscription[];
  toolCalls: ADKToolCall[];
  error: string | null;
  uploadedImage: string | null; // Base64 image data

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendTextMessage: (text: string) => void;
  sendImageWithQuestion: (imageBase64: string, question: string, mimeType?: string) => void;
  sendVideoContext: (imageBase64: string, contextText: string, mimeType?: string) => void;
  setUploadedImage: (imageBase64: string | null) => void;
  clearTranscriptions: () => void;
  setLanguage: (language: string) => void;
}

// Browser-side STT (Web Speech API) replaced the Cloud Speech path. Mic
// audio never leaves the browser; we POST only the finalized transcript
// over the existing {type:"text"} JSON frame, which the v2 harness
// dispatches via _run_harness_for_user_text. See
// api/voice_v2_websocket.py for the matching server change.

// Audio worklet for PCM playback (24kHz output from Gemini)
const PCM_PLAYER_WORKLET = `
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 24000 * 60; // 60 seconds buffer
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;

    this.port.onmessage = (event) => {
      if (event.data.command === 'clear') {
        this.readIndex = this.writeIndex;
        return;
      }
      const int16Samples = new Int16Array(event.data);
      this._enqueue(int16Samples);
    };
  }

  _enqueue(int16Samples) {
    for (let i = 0; i < int16Samples.length; i++) {
      this.buffer[this.writeIndex] = int16Samples[i] / 32768;
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

      if (this.writeIndex === this.readIndex) {
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
      }
    }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const framesPerBlock = output[0].length;

    for (let frame = 0; frame < framesPerBlock; frame++) {
      output[0][frame] = this.buffer[this.readIndex];
      if (output.length > 1) {
        output[1][frame] = this.buffer[this.readIndex];
      }

      if (this.readIndex !== this.writeIndex) {
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
      }
    }
    return true;
  }
}

registerProcessor('pcm-player-processor', PCMPlayerProcessor);
`;

export function useADKVoiceChat(config: ADKVoiceConfig): UseADKVoiceChatReturn {
  // State
  const [connectionState, setConnectionState] = useState<ADKConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptions, setTranscriptions] = useState<ADKTranscription[]>([]);
  const [toolCalls, setToolCalls] = useState<ADKToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(config.language);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playerNodeRef = useRef<AudioWorkletNode | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Web Speech API recognizer — the live, non-streaming transcript flows
  // through here, then we forward the final text to the harness via
  // sendTextMessage. Held in a ref because the recognizer is rebuilt
  // lazily on first use to keep the API surface unchanged.
  const recognizerRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>('');

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop the speech recognizer if it's running. abort() short-circuits
    // any pending onresult, which is what we want on disconnect (vs.
    // stop(), which would still deliver one last final result).
    if (recognizerRef.current) {
      try { recognizerRef.current.abort(); } catch (_) { /* idempotent */ }
      recognizerRef.current = null;
    }
    interimTranscriptRef.current = '';

    // Stop playback
    if (playerNodeRef.current) {
      playerNodeRef.current.port.postMessage({ command: 'clear' });
      playerNodeRef.current.disconnect();
      playerNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  // Initialize audio playback context
  const initPlaybackContext = useCallback(async () => {
    // Create 24kHz context for playback (Gemini outputs 24kHz)
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });

    // Load player worklet
    const playerBlob = new Blob([PCM_PLAYER_WORKLET], { type: 'application/javascript' });
    const playerUrl = URL.createObjectURL(playerBlob);
    await audioContextRef.current.audioWorklet.addModule(playerUrl);
    URL.revokeObjectURL(playerUrl);

    // Create player node
    playerNodeRef.current = new AudioWorkletNode(
      audioContextRef.current,
      'pcm-player-processor'
    );
    playerNodeRef.current.connect(audioContextRef.current.destination);

    console.log('[ADK Voice] Playback context initialized (24kHz)');
  }, []);

  // Build a Web Speech API recognizer. Returns null when the API is
  // unavailable (Firefox, older Safari) — callers must handle that and
  // fall back to typed input. We rebuild it per startListening() because
  // some Chromium versions choke on reusing a recognizer across abort()
  // → start() cycles.
  const buildRecognizer = useCallback((): any => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = currentLanguage;
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    return r;
  }, [currentLanguage]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[ADK Voice] Already connected');
      return;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      // Initialize playback first
      await initPlaybackContext();

      // Build WebSocket URL - connect to backend server
      const backendUrl = import.meta.env.VITE_CLASSROOM_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
      const wsBase = backendUrl.replace(/^http/, 'ws');
      const targetExamParam = config.targetExam ? `&target_exam=${encodeURIComponent(config.targetExam)}` : '';
      const modeParam = config.mode ? `&mode=${config.mode}` : '';
      // Plan 7 Task 2: cut over from v1 ADK ws (/voice/adk/stream) to
      // the v2 harness ws (/api/voice/v2/stream). Wire protocol is the
      // same query-param set (user_id, student_id, language, target_exam,
      // mode); the v2 endpoint mirrors the v1 contract intentionally.
      const wsUrl = `${wsBase}/api/voice/v2/stream?user_id=${config.userId}&student_id=${config.studentId}&language=${currentLanguage}${targetExamParam}${modeParam}`;

      console.log('[ADK Voice] Connecting to:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[ADK Voice] WebSocket connected');
        setConnectionState('connected');
        setError(null);
        reconnectAttempts.current = 0; // Reset on successful connection
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'connected':
              sessionIdRef.current = data.session_id;
              console.log('[ADK Voice] Session established:', data.session_id);
              break;

            case 'audio':
              // Auto-stop the speech recognizer when the agent responds
              // — the user asked their doubt, now they should listen
              // (avoids the recognizer trying to transcribe the agent's
              // own audio if the page lacks an output device the mic
              // can't pick up).
              if (recognizerRef.current) {
                try { recognizerRef.current.abort(); } catch (_) {}
                recognizerRef.current = null;
                interimTranscriptRef.current = '';
                setIsListening(false);
                console.log('[ADK Voice] Auto-stopped recognizer — agent is responding');
              }

              // Decode base64 audio and play
              const audioData = base64ToArrayBuffer(data.data);
              if (playerNodeRef.current) {
                playerNodeRef.current.port.postMessage(audioData);
                setIsSpeaking(true);
              }
              break;

            case 'text':
              // Agent text response from the v2 harness. The v1 ADK path
              // emitted these as 'transcription' messages; v2 emits 'text'
              // instead, but we feed both into the same transcriptions
              // state so VoiceBlackboard's existing right-panel renderer
              // works unchanged.
              console.log('[ADK Voice] Text:', data.data);
              setTranscriptions(prev => [...prev, {
                source: 'agent',
                text: data.data,
                finished: data.finished !== false,
                timestamp: new Date(),
              }]);
              break;

            case 'thinking':
              // Reasoning trace from Gemini's include_thoughts=True. Pushed
              // into transcriptions with empty text + the `thinking` field
              // so useTranscriptProcessor can fold it into the upcoming
              // agent turn's thinkingHistory.
              console.log('[ADK Voice] Thinking:', data.data);
              setTranscriptions(prev => [...prev, {
                source: 'agent',
                text: '',
                thinking: data.data,
                finished: data.finished !== false,
                timestamp: new Date(),
              }]);
              break;

            case 'blackboard_command':
              // v2 multiplexes canvas commands onto this WS. Hand off to
              // the parent (which has access to blackboard.executeCommand).
              if (data.command) {
                config.onBlackboardCommand?.(data.command);
              }
              break;

            case 'tool_result':
              // Acknowledged by the harness; nothing to render directly.
              break;

            case 'turn_complete':
              // End-of-turn marker; useful for telemetry only.
              break;

            case 'transcription':
              setTranscriptions(prev => [...prev, {
                source: data.source,
                text: data.text,
                finished: data.finished,
                timestamp: new Date()
              }]);

              // Agent is speaking
              if (data.source === 'agent' && !data.finished) {
                setIsSpeaking(true);
              } else if (data.source === 'agent' && data.finished) {
                setIsSpeaking(false);
              }
              break;

            case 'tool_call':
              setToolCalls(prev => [...prev, {
                tool: data.tool,
                args: data.args,
                timestamp: new Date()
              }]);
              console.log('[ADK Voice] Tool called:', data.tool, data.args);
              break;

            case 'error':
              console.error('[ADK Voice] Error:', data.message);
              setError(data.message);
              break;

            case 'pong':
              // Heartbeat response
              break;

            case 'image_received':
              console.log('[ADK Voice] Image received by server:', data.message);
              break;

            case 'context_stored':
              console.log('[ADK Voice] Video context stored:', data.message);
              break;

            case 'status':
              console.log('[ADK Voice] Status:', data.message);
              break;

            default:
              console.log('[ADK Voice] Unknown message type:', data.type);
          }
        } catch (e) {
          console.error('[ADK Voice] Failed to parse message:', e);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('[ADK Voice] WebSocket error:', event);
        setError('Connection error - will attempt to reconnect');
        setConnectionState('error');
      };

      wsRef.current.onclose = (event) => {
        console.log('[ADK Voice] WebSocket closed:', event.code, event.reason);
        cleanup();

        // Auto-reconnect on unexpected closure (1011 = internal error, 1006 = abnormal)
        if ((event.code === 1011 || event.code === 1006) && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(2000 * reconnectAttempts.current, 10000); // Exponential backoff, max 10s
          console.log(`[ADK Voice] Connection lost (attempt ${reconnectAttempts.current}/${maxReconnectAttempts}), reconnecting in ${delay/1000}s...`);
          setError(`Connection interrupted - reconnecting automatically...`);
          setConnectionState('disconnected');
          // Note: User will need to click "Start Lesson" again or we could auto-reconnect
          // For now, just inform user - cleaner UX than auto-reconnect which may fail
        } else {
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            setError('Connection lost - please click "Start Lesson" to reconnect.');
          }
          setConnectionState('disconnected');
          reconnectAttempts.current = 0;
        }
      };

    } catch (err) {
      console.error('[ADK Voice] Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnectionState('error');
    }
  }, [config.userId, config.studentId, config.targetExam, config.mode, currentLanguage, initPlaybackContext, cleanup]);

  // Disconnect
  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup]);

  // Start listening (microphone) — push-to-talk press.
  // Wires up a fresh Web Speech API recognizer, streams interim results
  // into the right-panel UI, and (on release) forwards the final
  // transcript to the harness via sendTextMessage. The recognizer runs
  // in the browser; no audio touches the WS.
  const startListening = useCallback(async () => {
    if (connectionState !== 'connected') {
      console.warn('[ADK Voice] Not connected');
      return;
    }

    // Clear any buffered TTS audio so it doesn't bleed into the new turn.
    if (playerNodeRef.current) {
      playerNodeRef.current.port.postMessage({ command: 'clear' });
    }

    const recog = buildRecognizer();
    if (!recog) {
      setError('Voice input is not supported in this browser. Please type your question instead.');
      return;
    }

    interimTranscriptRef.current = '';

    recog.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        interimTranscriptRef.current = interim;
        setTranscriptions(prev => {
          // Replace any trailing in-progress user transcription with the
          // latest interim string so the panel updates live without
          // pushing a new row per keystroke.
          const last = prev[prev.length - 1];
          const next: ADKTranscription = {
            source: 'user',
            text: interim,
            finished: false,
            timestamp: new Date(),
          };
          if (last && last.source === 'user' && !last.finished) {
            return [...prev.slice(0, -1), next];
          }
          return [...prev, next];
        });
      }

      if (finalChunk) {
        const finalText = finalChunk.trim();
        interimTranscriptRef.current = '';
        if (finalText) {
          setTranscriptions(prev => {
            const last = prev[prev.length - 1];
            const next: ADKTranscription = {
              source: 'user',
              text: finalText,
              finished: true,
              timestamp: new Date(),
            };
            if (last && last.source === 'user' && !last.finished) {
              return [...prev.slice(0, -1), next];
            }
            return [...prev, next];
          });

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'text', data: finalText }));
          }
          console.log('[ADK Voice] Sent transcript to harness:', finalText);
        }
      }
    };

    recog.onerror = (event: any) => {
      // 'no-speech' just means the user didn't speak; not an error worth surfacing.
      if (event?.error && event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[ADK Voice] SpeechRecognition error:', event.error);
        setError(`Speech recognition: ${event.error}`);
      }
    };

    recog.onend = () => {
      // The recognizer ended naturally (silence) or via stop()/abort().
      // setIsListening(false) is owned by stopListening / cleanup.
      if (recognizerRef.current === recog) {
        recognizerRef.current = null;
      }
    };

    try {
      recog.start();
      recognizerRef.current = recog;
      setIsListening(true);
      console.log('[ADK Voice] Started listening (Web Speech API)');
    } catch (err) {
      console.error('[ADK Voice] Failed to start recognizer:', err);
      setError(err instanceof Error ? err.message : 'Could not start speech recognition');
    }
  }, [connectionState, buildRecognizer]);

  // Stop listening — push-to-talk release.
  // recog.stop() flushes any in-progress audio to one final result, so
  // onresult delivers the transcript and the existing handler forwards
  // it to the harness. We only flip isListening here; the actual text
  // dispatch happens in the recognizer's onresult above.
  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch (_) { /* idempotent */ }
    }
    setIsListening(false);
  }, []);

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text',
        data: text
      }));
    }
  }, []);

  // Send image with question - for asking about uploaded images (triggers immediate response)
  const sendImageWithQuestion = useCallback((imageBase64: string, question: string, mimeType: string = 'image/jpeg') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Store the image for context
      setUploadedImage(imageBase64);

      // Send image message to backend
      wsRef.current.send(JSON.stringify({
        type: 'image_question',
        image: imageBase64,
        mime_type: mimeType,
        question: question || 'Please analyze this image and help me understand it.'
      }));

      // Add to transcriptions for display
      setTranscriptions(prev => [...prev, {
        source: 'user',
        text: question || '[Image uploaded for analysis]',
        finished: true,
        timestamp: new Date()
      }]);

      console.log('[ADK Voice] Sent image with question:', question);
    }
  }, []);

  // Send video context - image goes as realtime context (NO response triggered)
  // The model sees the image but waits for the user to speak their doubt
  const sendVideoContext = useCallback((imageBase64: string, contextText: string, mimeType: string = 'image/jpeg') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setUploadedImage(imageBase64);

      wsRef.current.send(JSON.stringify({
        type: 'store_video_context',
        image: imageBase64,
        mime_type: mimeType,
        context: contextText
      }));

      console.log('[ADK Voice] Sent video context (image via realtime, no response)');
    }
  }, []);

  // Clear transcriptions
  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
    setToolCalls([]);
  }, []);

  // Set language
  const setLanguage = useCallback((language: string) => {
    setCurrentLanguage(language);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        language
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (connectionState !== 'connected') return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionState]);

  return {
    connectionState,
    isListening,
    isSpeaking,
    transcriptions,
    toolCalls,
    error,
    uploadedImage,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendTextMessage,
    sendImageWithQuestion,
    sendVideoContext,
    setUploadedImage,
    clearTranscriptions,
    setLanguage,
  };
}

// Helper function to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Handle base64url encoding
  let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (standardBase64.length % 4) {
    standardBase64 += '=';
  }

  const binaryString = window.atob(standardBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
