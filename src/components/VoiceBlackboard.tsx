/**
 * VoiceBlackboard - Integrated Voice Chat + Blackboard Canvas Component
 * Combines ADK voice chat with a classroom-style blackboard for visual teaching.
 * The board scrolls vertically — old work stays visible, new work extends below.
 */

'use client';

import React, { useEffect, useState, useCallback, useRef, MouseEvent, ChangeEvent } from 'react';
import { BlackboardCanvas } from './BlackboardCanvas';
import { useBlackboardConnection, ConnectionStatus } from '../hooks/useBlackboardConnection';
import { useADKVoiceChat } from '../hooks/useADKVoiceChat';
import { BlackboardCommand } from '../types/blackboard';
import { processLatex, containsLatex } from '@/lib/math';
import { extractThinking } from '@/lib/textFiltering';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThinkingDisplay } from './ThinkingDisplay';

// Image upload icon
const ImagePlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const SpeakerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.465a5 5 0 01-.707-7.071m2.828-2.828a9 9 0 0112.728 0" />
  </svg>
);

// Supported languages
const LANGUAGES = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'es-US', name: 'Spanish', nativeName: 'Español' },
];

// AI Voice options
const VOICE_OPTIONS = [
  { id: 'Puck', name: 'Puck', description: 'Friendly & Engaging', gender: 'neutral' },
  { id: 'Charon', name: 'Charon', description: 'Calm & Professional', gender: 'neutral' },
  { id: 'Kore', name: 'Kore', description: 'Warm & Supportive', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Deep & Authoritative', gender: 'male' },
  { id: 'Aoede', name: 'Aoede', description: 'Clear & Expressive', gender: 'female' },
];

// ============================================================
// ACTIVITY FORMATTER
// ============================================================

/**
 * One-line summary of a tutor tool call, intended for the muted "activity"
 * track in the right panel. Returns null for tools that aren't worth
 * narrating to the student (low-level positioning, etc.).
 */
function describeToolCall(name: string, args: Record<string, any>): string | null {
  const truncate = (s: any, n = 60): string => {
    const str = String(s ?? '').replace(/\s+/g, ' ').trim();
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
  };

  switch (name) {
    case 'start_new_topic':
      return `📝 New topic: ${truncate(args.title || args.topic)}`;
    case 'clear_board':
      return '🧹 Cleared the board';
    case 'clear_area':
      return '🧹 Cleared a section';
    case 'draw_title':
      return `🪧 Title: ${truncate(args.text)}`;
    case 'draw_text':
      return `✏️ Wrote: "${truncate(args.text)}"`;
    case 'draw_equation':
      return `∑ Equation: ${truncate(args.latex)}`;
    case 'animate_derivation':
      return `🧮 Derivation${args.steps_json ? ` (${
        Array.isArray(args.steps_json) ? args.steps_json.length : '?'
      } steps)` : ''}`;
    case 'draw_graph':
      return `📈 Graph: ${truncate(args.graph_type)}`;
    case 'draw_curve':
      return `📈 Curve: ${truncate(args.expression)}`;
    case 'draw_shape':
      return `🔺 Shape: ${truncate(args.type)}`;
    case 'draw_arrow':
      return `↗️ Arrow${args.label ? `: ${truncate(args.label)}` : ''}`;
    case 'draw_line':
      return '➖ Line';
    case 'draw_diagram':
      return `📐 Diagram: ${truncate(args.diagram_type)}`;
    case 'draw_free_body_diagram':
      return '⚛️ Free body diagram';
    case 'draw_circuit':
      return '🔌 Circuit';
    case 'draw_molecule':
      return `🧪 Molecule: ${truncate(args.formula)}`;
    case 'draw_lens_ray_diagram':
    case 'draw_mirror_ray_diagram':
      return '🔆 Ray diagram';
    case 'draw_wave_diagram':
      return '🌊 Wave diagram';
    case 'draw_vector_diagram':
      return '➡️ Vector diagram';
    case 'draw_orbital_diagram':
      return '🪐 Orbital diagram';
    case 'draw_table':
      return '📋 Table';
    case 'draw_bullet_list':
      return `• List: ${truncate(args.title)}`;
    case 'draw_comparison':
      return '⚖️ Comparison';
    case 'draw_number_line':
      return '🔢 Number line';
    case 'draw_timeline':
      return '🗓️ Timeline';
    case 'annotate':
      return `🗒️ Note: ${truncate(args.text)}`;
    case 'point_at':
      return '👉 Pointed at the board';
    case 'highlight':
      return '🌟 Highlighted on board';
    case 'underline':
      return '➰ Underlined on board';
    case 'highlight_pdf_text':
      return `🖍️ Highlighted in PDF: "${truncate(args.text)}"`;
    case 'clear_pdf_highlights':
      return '🧹 Cleared PDF highlights';
    case 'retrieve_study_material':
      return `📚 Looking up: ${truncate(args.query)}`;
    case 'search_pyq':
    case 'search_previous_year_questions':
      return `🔍 Searching previous-year questions: ${truncate(args.subject || args.topic)}`;
    case 'generate_practice_question':
      return `✍️ Practice question: ${truncate(args.topic)}`;
    case 'get_student_analytics':
    case 'get_weak_topics':
      return '📊 Checking your progress';
    case 'remove_element':
    case 'move_element':
    case 'get_next_position':
      // Mechanical board ops — don't narrate.
      return null;
    default:
      return `🛠️ ${name}`;
  }
}

// ============================================================
// TYPES
// ============================================================

export interface VoiceBlackboardProps {
  studentId?: number;
  targetExam?: string;
  sessionId?: string;
  languageCode?: string;
  className?: string;
  onTranscript?: (role: string, text: string) => void;
  /** Optional question/prompt handed off from another page (e.g. the practice
   *  "Ask the AI tutor" button). Auto-sent to the tutor once the lesson connects. */
  initialPrompt?: string;
}

interface Transcript {
  id: string;
  // 'activity' is a legacy role kept for backward-compat; new tool-call
  // narration accumulates in `liveActivities` and is folded into the
  // following agent message's `activities` field once the turn ends.
  role: 'user' | 'agent' | 'activity';
  text: string;
  /** Accumulated thinking paragraphs for this agent turn — see
   *  useTranscriptProcessor.Transcript for the rationale. */
  thinkingHistory?: string[];
  timestamp: Date;
  isPartial?: boolean;
  // Tool-call summaries that ran during this agent turn, displayed as a
  // small "actions taken" chip-row above the message bubble.
  activities?: string[];
}

// Board dimensions — these set the SVG coordinate space and the cap on
// rendered size. The width is fixed (the canonical horizontal coord scale);
// the height is a *minimum* (16:9 floor) and grows at runtime to match the
// actual container's aspect ratio so the board genuinely fills available
// space and content placed at y=80% lands near the visible bottom. Content
// beyond the viewport scrolls vertically inside the canvas.
const BOARD_WIDTH = 1600;
const MIN_BOARD_HEIGHT = 900;

// ============================================================
// EXAM-AWARE STARTER PROMPTS
// ============================================================

type Starter = { label: string; prompt: string };

const CLASSROOM_STARTERS_BY_EXAM: Record<string, Starter[]> = {
  jee: [
    { label: "Newton's Laws", prompt: "Teach me Newton's laws of motion with an example on the board." },
    { label: 'Integration', prompt: 'Walk me through integration by parts with a worked example.' },
    { label: 'Chemical Bonding', prompt: 'Explain ionic vs covalent bonding with diagrams on the board.' },
  ],
  neet: [
    { label: 'Cell Division', prompt: 'Teach me mitosis and meiosis, draw the stages on the board.' },
    { label: 'Human Physiology', prompt: 'Walk me through the human digestive system with a diagram.' },
    { label: 'Organic Chemistry', prompt: 'Explain functional groups in organic chemistry with examples.' },
  ],
  sat: [
    { label: 'Algebra Word Problem', prompt: 'Give me an SAT-style algebra word problem and solve it step by step.' },
    { label: 'Geometry', prompt: 'Teach me a common SAT geometry concept with a diagram.' },
    { label: 'Reading Tips', prompt: 'Give me tips to tackle SAT reading comprehension passages.' },
  ],
  cpa: [
    { label: 'Financial Reporting', prompt: 'Explain a key financial reporting concept for the CPA exam.' },
    { label: 'Audit Risk', prompt: 'Walk me through how audit risk is assessed.' },
    { label: 'Tax Deductions', prompt: 'Explain common tax deductions tested on the CPA exam.' },
  ],
};

const DEFAULT_CLASSROOM_STARTERS: Starter[] = [
  { label: 'Explain a concept', prompt: "Help me understand a concept I'm struggling with — let's start with something basic." },
  { label: 'Solve a problem', prompt: 'Give me a practice problem and walk me through the solution on the board.' },
  { label: 'Study tips', prompt: 'Give me study tips tailored to my target exam.' },
];

function getClassroomStarters(targetExam: string | undefined | null): Starter[] {
  if (!targetExam) return DEFAULT_CLASSROOM_STARTERS;
  const key = targetExam.toLowerCase().replace(/[-_\s]/g, '').replace(/^iit/, '');
  return CLASSROOM_STARTERS_BY_EXAM[key] ?? DEFAULT_CLASSROOM_STARTERS;
}

// ============================================================
// COMPONENT
// ============================================================

export const VoiceBlackboard: React.FC<VoiceBlackboardProps> = ({
  studentId = 1,
  targetExam,
  sessionId: propSessionId,
  languageCode = 'en-US',
  className = '',
  onTranscript,
  initialPrompt,
}) => {
  // Connection state
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);

  // Language and voice selection state
  const [selectedLanguage, setSelectedLanguage] = useState(languageCode);
  const [selectedVoice, setSelectedVoice] = useState('Puck');

  // Refs
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  // Ref to the scrollable transcript container itself. We scroll this directly
  // (panel.scrollTop = panel.scrollHeight) instead of using element.scrollIntoView,
  // because scrollIntoView walks every scrollable ancestor and can leak the
  // scroll up into <main> / <body>, dragging the whole page off-screen.
  const transcriptsContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Blackboard connection hook
  const {
    status: blackboardStatus,
    sessionId: blackboardSessionId,
    connect: connectBlackboard,
    disconnect: disconnectBlackboard,
    blackboard,
  } = useBlackboardConnection({
    sessionId: propSessionId,
    autoConnect: false,
    onCommand: (command: BlackboardCommand) => {
      console.log('[VoiceBlackboard] Received command:', command.type);
    },
    onError: (err) => {
      console.error('[VoiceBlackboard] Blackboard error:', err);
      setError(`Blackboard: ${err}`);
    },
  });

  // ADK Voice chat hook
  const {
    connect: connectVoice,
    disconnect: disconnectVoice,
    startListening,
    stopListening,
    sendTextMessage,
    sendImageWithQuestion,
    connectionState,
    isListening: voiceIsListening,
    isSpeaking: voiceIsSpeaking,
    transcriptions,
    toolCalls,
    error: voiceError,
    setLanguage,
  } = useADKVoiceChat({
    studentId,
    userId: `student_${studentId}`,
    language: selectedLanguage,
    targetExam,
    mode: 'classroom',
    // The v2 voice WS multiplexes blackboard commands onto its own channel
    // instead of the standalone /blackboard/stream socket. Forward them
    // into the same execute path the standalone socket would have used so
    // tool-driven drawing actually lands on the canvas.
    onBlackboardCommand: (command) => {
      blackboard.executeCommand(command as BlackboardCommand);
    },
  });

  // Image upload state
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [imageQuestion, setImageQuestion] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dynamic board height — grows so the SVG viewBox matches the actual
  // container's aspect ratio. Width is fixed (canonical x-coords); height
  // is the y-coord scale, so y=80% always maps to "near the visible bottom"
  // regardless of viewport. Floor at MIN_BOARD_HEIGHT (16:9).
  const [boardHeight, setBoardHeight] = useState(MIN_BOARD_HEIGHT);
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const recompute = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      // Subtract the wooden frame (12px each side) to match the actual
      // SVG render area. Off-by-a-few-px doesn't matter visually.
      const innerW = Math.max(1, r.width - 24);
      const innerH = Math.max(1, r.height - 24);
      const dynamicH = Math.round((BOARD_WIDTH * innerH) / innerW);
      setBoardHeight((prev) => {
        const next = Math.max(MIN_BOARD_HEIGHT, dynamicH);
        return Math.abs(next - prev) >= 4 ? next : prev;
      });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync voice state
  const voiceConnected = connectionState === 'connected';

  // Process transcriptions from ADK voice hook
  useEffect(() => {
    if (transcriptions.length > 0) {
      const latest = transcriptions[transcriptions.length - 1];
      const transcriptRole = latest.source === 'user' ? 'user' : 'agent';

      // Backend `thinking` events arrive with an empty `text` and the
      // `thinking` field set. Fold them into the open partial agent
      // transcript (or open one) so the upcoming final answer inherits
      // the chain-of-thought history.
      if (transcriptRole === 'agent' && latest.thinking !== undefined) {
        const thoughtText = latest.thinking.trim();
        if (!thoughtText) return;
        setTranscripts(prev => {
          const idx = prev.findIndex(t => t.role === 'agent' && t.isPartial);
          if (idx >= 0) {
            const existing = prev[idx];
            const updated = [...prev];
            updated[idx] = {
              ...existing,
              thinkingHistory: [
                ...(existing.thinkingHistory ?? []),
                thoughtText,
              ],
            };
            return updated;
          }
          return [...prev, {
            id: `${Date.now()}-agent-partial`,
            role: 'agent',
            text: '',
            thinkingHistory: [thoughtText],
            timestamp: new Date(),
            isPartial: true,
          }];
        });
        setIsSpeaking(true);
        return;
      }

      // For agent messages, split into thinking paragraphs + answer. We keep
      // the full paragraph list so the widget can expand to show the full
      // chain-of-thought; carry over from partial → final because Gemini Live
      // tends to drop thinking markers from the finalized text.
      let displayText = latest.text;
      let thinkingParagraphs: string[] = [];
      if (transcriptRole === 'agent') {
        const result = extractThinking(latest.text);
        displayText = result.answer;
        thinkingParagraphs = result.thinkingParagraphs;
      }

      // Skip only if there's truly nothing to show (no answer AND no thinking)
      if (!displayText.trim() && thinkingParagraphs.length === 0) {
        if (latest.source === 'agent') {
          setIsSpeaking(!latest.finished);
        }
        return;
      }

      if (latest.finished) {
        setTranscripts(prev => {
          const existingPartial = prev.find(t => t.role === transcriptRole && t.isPartial);
          const inherited = existingPartial?.thinkingHistory ?? [];
          const finalHistory =
            thinkingParagraphs.length >= inherited.length ? thinkingParagraphs : inherited;

          const filtered = prev.filter(t => !(t.role === transcriptRole && t.isPartial));
          const isDuplicate = filtered.some(t =>
            t.role === transcriptRole && t.text === displayText && !t.isPartial
          );
          if (isDuplicate) return filtered;

          return [...filtered, {
            id: `${Date.now()}-${transcriptRole}`,
            role: transcriptRole,
            text: displayText,
            thinkingHistory: finalHistory.length > 0 ? finalHistory : undefined,
            timestamp: new Date(),
            isPartial: false,
          }];
        });
        onTranscript?.(transcriptRole, displayText);
      } else {
        setTranscripts(prev => {
          const existingPartialIdx = prev.findIndex(t => t.role === transcriptRole && t.isPartial);
          if (existingPartialIdx >= 0) {
            const existing = prev[existingPartialIdx];
            const merged =
              thinkingParagraphs.length >= (existing.thinkingHistory?.length ?? 0)
                ? thinkingParagraphs
                : existing.thinkingHistory!;
            const updated = [...prev];
            updated[existingPartialIdx] = {
              ...existing,
              text: displayText,
              thinkingHistory: merged.length > 0 ? merged : undefined,
            };
            return updated;
          }
          return [...prev, {
            id: `${Date.now()}-${transcriptRole}-partial`,
            role: transcriptRole,
            text: displayText,
            thinkingHistory: thinkingParagraphs.length > 0 ? thinkingParagraphs : undefined,
            timestamp: new Date(),
            isPartial: true,
          }];
        });
      }

      if (latest.source === 'agent') {
        setIsSpeaking(!latest.finished);
      }
    }
  }, [transcriptions, onTranscript]);

  // Tool calls accumulate into a single in-place "thinking chip" instead of
  // pushing one transcript row per call. The chip animates while the turn
  // is in progress and gets folded into the agent's bubble (as a small
  // "actions taken" chip-row) once the turn finalizes.
  const [liveActivities, setLiveActivities] = useState<string[]>([]);
  const lastRenderedToolCallIdxRef = useRef(0);
  const lastFoldedAgentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (toolCalls.length <= lastRenderedToolCallIdxRef.current) return;
    const fresh = toolCalls.slice(lastRenderedToolCallIdxRef.current);
    lastRenderedToolCallIdxRef.current = toolCalls.length;
    const lines = fresh
      .map((tc) => describeToolCall(tc.tool, tc.args))
      .filter((line): line is string => !!line);
    if (lines.length > 0) {
      setLiveActivities(prev => [...prev, ...lines]);
    }
  }, [toolCalls]);

  // Fold any pending live activities into the most-recent finalized agent
  // transcript. Each agent transcript only gets folded into once.
  useEffect(() => {
    if (liveActivities.length === 0) return;
    const lastT = transcripts[transcripts.length - 1];
    if (!lastT || lastT.role !== 'agent' || lastT.isPartial) return;
    if (lastFoldedAgentIdRef.current === lastT.id) return;
    lastFoldedAgentIdRef.current = lastT.id;
    const folded = liveActivities;
    setTranscripts(prev => prev.map(t =>
      t.id === lastT.id ? { ...t, activities: folded } : t
    ));
    setLiveActivities([]);
  }, [transcripts, liveActivities]);

  // When the user sends the next message, drop any leftover live activities
  // (e.g. from a turn that didn't produce an agent text response).
  useEffect(() => {
    const lastT = transcripts[transcripts.length - 1];
    if (lastT?.role === 'user' && liveActivities.length > 0) {
      setLiveActivities([]);
    }
  }, [transcripts, liveActivities.length]);

  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      console.error('[VoiceBlackboard] Voice error:', voiceError);
      setError(`Voice: ${voiceError}`);
    }
  }, [voiceError]);

  // Scroll the transcript panel itself to the bottom on new content.
  // Direct scrollTop manipulation (vs. scrollIntoView) keeps the scroll
  // strictly inside this panel — it cannot leak up to ancestor scroll
  // containers and shift the whole page.
  useEffect(() => {
    const panel = transcriptsContainerRef.current;
    if (panel) {
      panel.scrollTop = panel.scrollHeight;
    }
  }, [transcripts, liveActivities.length]);

  // Connect both services
  const handleConnect = useCallback(async () => {
    setError(null);

    try {
      await connectBlackboard();
      await connectVoice();
      await startListening();
      setIsVoiceConnected(true);
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [connectBlackboard, connectVoice, startListening]);

  // Disconnect both services
  const handleDisconnect = useCallback(() => {
    stopListening();
    disconnectVoice();
    disconnectBlackboard();
    setIsVoiceConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  }, [stopListening, disconnectVoice, disconnectBlackboard]);

  // Toggle mute/listening
  const handleToggleMute = useCallback(async () => {
    if (voiceIsListening) {
      stopListening();
      setIsListening(false);
    } else {
      await startListening();
      setIsListening(true);
    }
  }, [voiceIsListening, startListening, stopListening]);

  // Send text message
  const handleSendText = useCallback((text: string) => {
    if (text.trim()) {
      sendTextMessage(text);
      setTranscripts(prev => [...prev, {
        id: `${Date.now()}-user-text`,
        role: 'user',
        text,
        timestamp: new Date(),
        isPartial: false,
      }]);
    }
  }, [sendTextMessage]);

  // Auto-send a question handed off from another page (e.g. practice's "Ask the
  // AI tutor"), once — as soon as the voice session is connected.
  const initialSentRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && voiceConnected && !initialSentRef.current) {
      initialSentRef.current = true;
      handleSendText(initialPrompt);
    }
  }, [initialPrompt, voiceConnected, handleSendText]);

  // Clear blackboard (erases everything; teacher can use this to restart a topic)
  const handleClearBoard = useCallback(() => {
    blackboard.clearAll();
  }, [blackboard]);

  // Image upload handlers
  const handleImageSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const preview = reader.result as string;
      setPendingImage({
        base64,
        mimeType: file.type,
        preview
      });
      setShowImageInput(true);
      setImageQuestion('');
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  const handleSendImageQuestion = useCallback(() => {
    if (!pendingImage) return;

    const question = imageQuestion.trim() || 'Please analyze this image and help me understand it.';

    // Send image with question
    sendImageWithQuestion(pendingImage.base64, question, pendingImage.mimeType);

    // Add to transcripts as user message
    setTranscripts(prev => [...prev, {
      id: `${Date.now()}-user-image`,
      role: 'user',
      text: `[Uploaded image] ${question}`,
      timestamp: new Date(),
      isPartial: false,
    }]);

    // Clear image state
    setPendingImage(null);
    setImageQuestion('');
    setShowImageInput(false);
  }, [pendingImage, imageQuestion, sendImageWithQuestion]);

  const handleClearImage = useCallback(() => {
    setPendingImage(null);
    setImageQuestion('');
    setShowImageInput(false);
  }, []);

  // Connection status indicator
  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'bg-success';
      case 'connecting': return 'bg-amber';
      case 'error': return 'bg-error';
      default: return 'bg-text-dim';
    }
  };

  return (
    <div className={`voice-blackboard flex flex-col h-full ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-surface border-b border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-text">
            AI Classroom
          </h2>

          {/* Connection status indicators */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${getStatusColor(blackboardStatus)}`} />
              <span className="text-text-muted">Board</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${voiceConnected ? 'bg-success' : 'bg-text-dim'}`} />
              <span className="text-text-muted">Voice</span>
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {!isVoiceConnected ? (
            <>
              {/* Language Selection */}
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-hover rounded-lg border border-border">
                <GlobeIcon />
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setLanguage(e.target.value);
                  }}
                  className="bg-transparent text-text text-sm focus:outline-none cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-surface">
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Selection */}
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-hover rounded-lg border border-border">
                <SpeakerIcon />
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="bg-transparent text-text text-sm focus:outline-none cursor-pointer"
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id} className="bg-surface">
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-success hover:bg-success-muted text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414-9.9m-4.242 7.072a9 9 0 0112.728 0" />
                </svg>
                Start Lesson
              </button>
            </>
          ) : (
            <>
              {/* Current settings indicator (when connected) */}
              <div className="flex items-center gap-1 px-2 py-1 bg-surface-hover rounded text-xs text-text-muted">
                <GlobeIcon />
                <span>{LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName || 'English'}</span>
                <span className="mx-1">|</span>
                <SpeakerIcon />
                <span>{selectedVoice}</span>
              </div>

              <button
                onClick={handleClearBoard}
                className="px-4 py-2 bg-surface-hover hover:bg-surface-active text-text border border-border rounded-lg flex items-center gap-2 transition-colors"
                title="Erase the entire board"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Erase Board
              </button>

              {/* Image upload button */}
              <button
                onClick={() => imageInputRef.current?.click()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center gap-2 transition-colors"
                title="Upload an image to ask questions about"
              >
                <ImagePlusIcon />
                Upload Image
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-error hover:bg-error-muted text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Lesson
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-error/10 border-b border-error/30 text-error text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Image upload preview panel */}
      {showImageInput && pendingImage && (
        <div className="p-4 bg-surface-hover border-b border-border">
          <div className="flex items-start gap-4 max-w-4xl mx-auto">
            {/* Image preview */}
            <div className="relative flex-shrink-0">
              <img
                src={pendingImage.preview}
                alt="Upload preview"
                className="w-32 h-32 object-cover rounded-lg border border-border"
              />
              <button
                onClick={handleClearImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-error hover:bg-error-muted text-white rounded-full flex items-center justify-center transition-colors"
                title="Remove image"
              >
                <XIcon />
              </button>
            </div>

            {/* Question input */}
            <div className="flex-1">
              <label className="block text-sm text-text-muted mb-2">
                Ask a question about this image:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageQuestion}
                  onChange={(e) => setImageQuestion(e.target.value)}
                  placeholder="e.g., Explain this diagram, Solve this problem, What concept is shown here?"
                  className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-text placeholder-text-dim focus:outline-none focus:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendImageQuestion();
                    }
                  }}
                />
                <button
                  onClick={handleSendImageQuestion}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Ask
                </button>
              </div>
              <p className="text-xs text-text-dim mt-2">
                Tip: Upload textbook pages, diagrams, or problems. The AI tutor will analyze and explain them on the blackboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Board canvas (main area) — cream paper, navy ink (brand re-skin) */}
        <div className="flex-1 relative bg-background-secondary flex flex-col">
          {/* Canvas container — board fills the area; content scrolls inside it */}
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-stretch justify-center p-2"
          >
            <BlackboardCanvas
              width={BOARD_WIDTH}
              height={boardHeight}
              boardColor="#FAFAF7"
              showGrid={false}
              externalElements={blackboard.elements}
              externalPointer={blackboard.pointer}
              externalHighlights={blackboard.highlights}
              enableAnimations={true}
              onElementMeasured={blackboard.reportElementMeasured}
            />
          </div>
        </div>

        {/* Side panel with transcripts */}
        <div className="w-80 bg-surface border-l border-border flex flex-col">
          {/* Speaking/Listening indicator */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2">
              {voiceIsSpeaking && (
                <div className="flex items-center gap-2 text-success">
                  <div className="flex gap-1">
                    <span className="w-1 h-4 bg-success rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-6 bg-success rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-4 bg-success rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Teacher is speaking...</span>
                </div>
              )}
              {voiceIsListening && !voiceIsSpeaking && (
                <div className="flex items-center gap-2 text-primary">
                  {/* The dot is the brand's live primitive — it pulses, the frame never does */}
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm">Listening...</span>
                </div>
              )}
              {!isVoiceConnected && (
                <span className="text-text-dim text-sm">Not connected</span>
              )}
            </div>
          </div>

          {/* Transcript list */}
          <div
            ref={transcriptsContainerRef}
            className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3"
          >
            {transcripts.length === 0 ? (
              <div className="text-text-muted py-8">
                {initialPrompt ? (
                  <div className="text-center mb-5">
                    <p className="text-text">Your practice question is ready.</p>
                    <p className="text-sm mt-2">Click <span className="font-semibold">Start Lesson</span> and the tutor will walk you through it on the board.</p>
                  </div>
                ) : (
                  <div className="text-center mb-5">
                    <p>Start the lesson to begin talking with your AI tutor.</p>
                    <p className="text-sm mt-2">The tutor will explain concepts and draw on the blackboard.</p>
                  </div>
                )}
                <div className="px-2" style={initialPrompt ? { display: 'none' } : undefined}>
                  <p className="text-xs text-text-muted text-center mb-2">Try asking about:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {getClassroomStarters(targetExam).map((starter) => (
                      <button
                        key={starter.label}
                        onClick={() => {
                          if (isVoiceConnected) handleSendText(starter.prompt);
                        }}
                        disabled={!isVoiceConnected}
                        title={isVoiceConnected ? starter.prompt : 'Connect to start'}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          isVoiceConnected
                            ? 'border-border bg-surface-hover text-text-secondary hover:bg-surface-active hover:border-primary/50 cursor-pointer'
                            : 'border-border bg-surface-hover/50 text-text-dim cursor-not-allowed'
                        }`}
                      >
                        {starter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {transcripts.map((transcript) => {
                  if (transcript.role === 'activity') {
                    // Legacy fallback — current flow folds activities into
                    // the next agent message rather than emitting these.
                    return (
                      <div
                        key={transcript.id}
                        className="px-3 py-1 text-xs italic text-text-muted mx-2"
                      >
                        {transcript.text}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={transcript.id}
                      className={`p-3 rounded-lg ${
                        transcript.role === 'user'
                          ? 'bg-primary-soft/60 ml-4'
                          : 'bg-surface-hover mr-4'
                      } ${transcript.isPartial ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          transcript.role === 'user' ? 'text-primary' : 'text-success'
                        }`}>
                          {transcript.role === 'user' ? 'You' : 'Teacher'}
                        </span>
                        {transcript.isPartial && (
                          <span className="text-xs text-text-dim">typing...</span>
                        )}
                      </div>
                      {transcript.role === 'agent' && transcript.activities && transcript.activities.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {transcript.activities.map((act, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] rounded-full bg-surface-active/60 text-text-muted border border-border"
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                      )}
                      {transcript.role === 'agent' && transcript.thinkingHistory && (
                        <ThinkingDisplay
                          history={transcript.thinkingHistory}
                          isPartial={transcript.isPartial}
                        />
                      )}
                      {transcript.role === 'agent' ? (
                        transcript.text ? (
                          <div className="text-text text-sm">
                            <MarkdownRenderer content={transcript.text} />
                          </div>
                        ) : null
                      ) : (
                        <p className="text-text text-sm whitespace-pre-line">
                          {containsLatex(transcript.text)
                            ? <span dangerouslySetInnerHTML={{ __html: processLatex(transcript.text) }} />
                            : transcript.text}
                        </p>
                      )}
                    </div>
                  );
                })}
                {liveActivities.length > 0 && (
                  <div
                    key="live-activity-chip"
                    className="mr-4 px-3 py-2 rounded-lg bg-surface-hover border border-border flex items-center gap-2"
                  >
                    <div className="flex gap-1 shrink-0" aria-hidden>
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-text-secondary truncate">
                      {liveActivities[liveActivities.length - 1]}
                    </span>
                    {liveActivities.length > 1 && (
                      <span className="ml-auto shrink-0 text-[10px] text-text-dim px-1.5 py-0.5 rounded-full bg-surface-active/60 border border-border">
                        +{liveActivities.length - 1}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
            <div ref={transcriptsEndRef} />
          </div>

          {/* Voice Input Section */}
          <div className="p-4 border-t border-border space-y-3">
            {/* Big Talk Button */}
            {isVoiceConnected && (
              <button
                onClick={handleToggleMute}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
                  voiceIsListening
                    ? 'bg-success hover:bg-success-muted shadow-soft'
                    : 'bg-error hover:bg-error-muted shadow-soft'
                }`}
              >
                {voiceIsListening ? (
                  <>
                    <svg className="w-6 h-6 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                    <span className="text-white font-semibold text-lg">Listening... (Click to pause)</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-white font-semibold text-lg">Click to Talk</span>
                  </>
                )}
              </button>
            )}

            {/* Or type a question */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-text-dim">or type your question</span>
              </div>
            </div>

            {/* Text input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
                if (input.value.trim()) {
                  handleSendText(input.value);
                  input.value = '';
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                name="message"
                placeholder={isVoiceConnected ? "Type a question..." : "Connect to start"}
                disabled={!isVoiceConnected}
                className="flex-1 px-3 py-2 bg-surface-hover border border-border rounded-lg text-text placeholder-text-dim focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isVoiceConnected}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-surface-active disabled:text-text-dim disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer with session info */}
      <div className="p-2 bg-surface border-t border-border text-xs text-text-dim flex justify-between">
        <span>Session: {blackboardSessionId || 'Not connected'}</span>
        <span>Elements: {blackboard.elements.size}</span>
      </div>
    </div>
  );
};

export default VoiceBlackboard;
