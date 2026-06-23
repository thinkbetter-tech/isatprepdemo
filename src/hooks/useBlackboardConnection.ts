/**
 * Blackboard Connection Hook
 * Manages WebSocket connection to the blackboard server for receiving commands
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  BlackboardCommand,
  CommandResult,
} from '../types/blackboard';
import { useBlackboardState } from './useBlackboardState';

// ============================================================
// TYPES
// ============================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseBlackboardConnectionConfig {
  sessionId?: string;
  userId?: string;
  autoConnect?: boolean;
  onCommand?: (command: BlackboardCommand) => void;
  onError?: (error: string) => void;
}

export interface UseBlackboardConnectionReturn {
  // Connection state
  status: ConnectionStatus;
  sessionId: string | null;
  error: string | null;

  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Command handling
  sendCommandResult: (result: CommandResult) => void;
  requestStateSync: () => void;

  // Blackboard state (from useBlackboardState)
  blackboard: ReturnType<typeof useBlackboardState>;
}

// ============================================================
// HOOK
// ============================================================

export function useBlackboardConnection(
  config: UseBlackboardConnectionConfig = {}
): UseBlackboardConnectionReturn {
  const {
    sessionId: initialSessionId,
    userId = 'student',
    autoConnect = false,
    onCommand,
    onError,
  } = config;

  // State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Blackboard state hook
  const blackboard = useBlackboardState();

  // ============================================================
  // CONNECTION MANAGEMENT
  // ============================================================

  const connect = useCallback(async (): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Blackboard] Already connected');
      return;
    }

    setStatus('connecting');
    setError(null);

    return new Promise((resolve, reject) => {
      try {
        // Generate session ID if not provided
        const currentSessionId = sessionId || uuidv4().slice(0, 8);
        setSessionId(currentSessionId);

        // Build WebSocket URL
        const backendUrl = import.meta.env.VITE_CLASSROOM_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
        const wsBase = backendUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/blackboard/stream?session_id=${currentSessionId}&user_id=${userId}`;

        console.log('[Blackboard] Connecting to:', wsUrl);

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('[Blackboard] WebSocket connected');
          setStatus('connected');
          reconnectAttemptsRef.current = 0;
          resolve();
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleMessage(data);
          } catch (e) {
            console.error('[Blackboard] Failed to parse message:', e);
          }
        };

        wsRef.current.onerror = (event) => {
          console.error('[Blackboard] WebSocket error:', event);
          setError('Connection error');
          setStatus('error');
          onError?.('Connection error');
          reject(new Error('WebSocket connection error'));
        };

        wsRef.current.onclose = () => {
          console.log('[Blackboard] WebSocket closed');
          setStatus('disconnected');

          // Attempt reconnection
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`[Blackboard] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
            setTimeout(() => connect(), delay);
          }
        };

      } catch (err) {
        console.error('[Blackboard] Connection failed:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
        setStatus('error');
        reject(err);
      }
    });
  }, [sessionId, userId, onError]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(async (): Promise<void> => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    await connect();
  }, [disconnect, connect]);

  // ============================================================
  // MESSAGE HANDLING
  // ============================================================

  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('[Blackboard] Session established:', data.session_id);
        setSessionId(data.session_id);
        break;

      case 'command':
        handleCommand(data.data as BlackboardCommand);
        break;

      case 'state_sync':
        handleStateSync(data.data);
        break;

      case 'error':
        console.error('[Blackboard] Server error:', data.message);
        setError(data.message);
        onError?.(data.message);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('[Blackboard] Unknown message type:', data.type);
    }
  }, [onError]);

  const handleCommand = useCallback((command: BlackboardCommand) => {
    console.log('[Blackboard] Received command:', command.type, command.id);

    // Execute the command
    const result = blackboard.executeCommand(command);

    // Notify callback if provided
    onCommand?.(command);

    // Send result back to server
    sendCommandResult(result);
  }, [blackboard, onCommand]);

  const handleStateSync = useCallback((state: any) => {
    console.log('[Blackboard] State sync received');
    if (state) {
      blackboard.importState(state);
    }
  }, [blackboard]);

  // ============================================================
  // OUTGOING MESSAGES
  // ============================================================

  const sendCommandResult = useCallback((result: CommandResult) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'command_result',
        ...result,
      }));
    }
  }, []);

  const requestStateSync = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'request_sync',
      }));
    }
  }, []);

  // ============================================================
  // EFFECTS
  // ============================================================

  // Auto-connect if configured
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [status]);

  // Send element count updates
  useEffect(() => {
    if (status !== 'connected') return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'state_update',
        elementCount: blackboard.elements.size,
      }));
    }
  }, [status, blackboard.elements.size]);

  return {
    // Connection state
    status,
    sessionId,
    error,

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Command handling
    sendCommandResult,
    requestStateSync,

    // Blackboard state
    blackboard,
  };
}
