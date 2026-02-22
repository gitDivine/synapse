'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TranscriptEntry } from '@/lib/session/types';

export interface MessageReplyTo {
  messageId: string;
  agentName: string;
  excerpt: string;
}

export interface DebateMessage {
  id: string;
  agentId: string;
  content: string;
  complete: boolean;
  psychState: string;
  timestamp: number;
  isUser?: boolean;
  isResearch?: boolean;
  isUnavailable?: boolean;
  replyTo?: MessageReplyTo;
}

export interface AgentInfo {
  id: string;
  displayName: string;
  color: string;
  avatar: string;
  currentPsychState?: string;
}

export interface RoundData {
  roundNumber: number;
  consensusScore: number;
  influence: Record<string, number>;
}

type DebateStatus = 'connecting' | 'active' | 'idle' | 'error';

const STALE_CHECK_INTERVAL_MS = 20_000;
const STALE_THRESHOLD_MS = 45_000;
const AUTO_CONSENSUS_THRESHOLD = 0.85;
const MAX_AUTO_ROUNDS = 5;
const AUTO_CONTINUE_MSG = 'Continue the discussion — the council hasn\'t reached consensus yet. Build on each other\'s points and try to converge on a conclusion.';

export function useDebateStream(sessionId: string, problem?: string) {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [status, setStatus] = useState<DebateStatus>('connecting');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [consensusScore, setConsensusScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [momentum, setMomentum] = useState(0);
  const [momentumDirection, setMomentumDirection] = useState<'heating' | 'steady' | 'cooling'>('steady');
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [showInfluence, setShowInfluence] = useState(false);
  const [roundNumber, setRoundNumber] = useState(0);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  // Whether the user has a queued intervention waiting to be processed
  const [interventionQueued, setInterventionQueued] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const lastEventTimeRef = useRef(Date.now());
  const statusRef = useRef<DebateStatus>('connecting');
  const abortRef = useRef<AbortController | null>(null);
  const staleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const continuingRef = useRef(false);
  // Persist problem across rounds — initial value from prop, updated if empty
  const problemRef = useRef(problem ?? '');
  // Client-side intervention buffer — stores message until round ends, then auto-continues
  const pendingInterventionRef = useRef<string | null>(null);
  // Always-current reference to continueConversation (avoids stale closures in handleSSEEvent)
  const continueConversationRef = useRef<(message: string, opts?: { skipUserMessage?: boolean; routing?: 'synapse' | 'council' }) => Promise<boolean>>(
    async () => false
  );
  // Tracks whether the current round was auto-triggered (suppresses user:intervention echo)
  const autoRoundActiveRef = useRef(false);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Shared event handler — used by both EventSource (initial) and fetch reader (continuation)
  // Uses refs for anything that changes over time (continueConversationRef, pendingInterventionRef)
  const handleSSEEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    // Touch timestamp for every event — prevents stale detector from firing during continuations
    lastEventTimeRef.current = Date.now();

    switch (eventType) {
      case 'heartbeat':
        break;

      case 'debate:start':
        setAgents(data.agents as AgentInfo[]);
        setStatus('active');
        break;

      case 'agent:thinking': {
        const agentId = data.agentId as string;
        const messageId = data.messageId as string;
        setActiveAgent(agentId);
        // Only update agent psych state for real agents, not synapse
        if (agentId !== 'synapse') {
          setAgents((prev) =>
            prev.map((a) =>
              a.id === agentId ? { ...a, currentPsychState: data.psychState as string } : a
            )
          );
        }
        setMessages((prev) => {
          // Prevent duplicate messages with same ID
          if (prev.some((m) => m.id === messageId)) return prev;
          return [
            ...prev,
            {
              id: messageId,
              agentId,
              content: '',
              complete: false,
              psychState: data.psychState as string,
              timestamp: Date.now(),
            },
          ];
        });
        break;
      }

      case 'agent:chunk': {
        const messageId = data.messageId as string;
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === messageId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            content: updated[idx].content + (data.content as string),
          };
          return updated;
        });
        break;
      }

      case 'agent:done': {
        const messageId = data.messageId as string;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, complete: true } : m))
        );
        setActiveAgent(null);
        break;
      }

      case 'psych:state_change':
        setAgents((prev) =>
          prev.map((a) =>
            a.id === (data.agentId as string)
              ? { ...a, currentPsychState: data.to as string }
              : a
          )
        );
        break;

      case 'consensus:update':
        setConsensusScore(data.score as number);
        break;

      case 'momentum:update':
        setMomentum(data.momentum as number);
        setMomentumDirection(data.direction as 'heating' | 'steady' | 'cooling');
        break;

      case 'quote:linked':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === (data.targetMessageId as string)
              ? {
                  ...m,
                  replyTo: {
                    messageId: data.sourceMessageId as string,
                    agentName: data.agentName as string,
                    excerpt: data.excerpt as string,
                  },
                }
              : m
          )
        );
        break;

      case 'research:results': {
        const sources = (data.results as Array<{ sourceName: string; title: string; url?: string }>) ?? [];
        const snippets = sources
          .map((r) => r.url ? `[${r.sourceName}] [${r.title}](${r.url})` : `[${r.sourceName}] ${r.title}`)
          .join('\n');
        setMessages((prev) => [
          ...prev,
          {
            id: `research-${Date.now()}`,
            agentId: 'synapse',
            content: `Synapse researched: "${data.query}"\n${snippets}`,
            complete: true,
            psychState: 'research',
            timestamp: Date.now(),
            isResearch: true,
          },
        ]);
        break;
      }

      case 'agent:unavailable': {
        // Agent hit rate limit or errored — show subtle notice, don't set error state
        setMessages((prev) => [
          ...prev,
          {
            id: `unavailable-${Date.now()}`,
            agentId: data.agentId as string,
            content: data.message as string,
            complete: true,
            psychState: 'unavailable',
            timestamp: Date.now(),
            isUnavailable: true,
          },
        ]);
        break;
      }

      case 'user:intervention':
        // Suppress auto-continue system messages from appearing in the chat
        if (autoRoundActiveRef.current && (data.content as string) === AUTO_CONTINUE_MSG) {
          autoRoundActiveRef.current = false;
          break;
        }
        // Only add if not already in messages (continuation adds it client-side first)
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.isUser && m.content === (data.content as string)
          );
          if (exists) return prev;
          return [
            ...prev,
            {
              id: `user-${data.timestamp}`,
              agentId: 'user',
              content: data.content as string,
              complete: true,
              psychState: 'intervention',
              timestamp: data.timestamp as number,
              isUser: true,
            },
          ];
        });
        break;

      case 'round:complete': {
        const rd: RoundData = {
          roundNumber: data.roundNumber as number,
          consensusScore: data.consensusScore as number,
          influence: (data.influence as Record<string, number>) ?? {},
        };
        setRoundData(rd);
        const nextRound = (data.roundNumber as number) + 1;
        setRoundNumber(nextRound);
        // Close EventSource — initial stream is done, continuations use fetch
        esRef.current?.close();
        // Stop stale detector — continuations use fetch with their own timeout
        if (staleIntervalRef.current) {
          clearInterval(staleIntervalRef.current);
          staleIntervalRef.current = null;
        }

        // Priority 1: User intervention pending — start new round with their message
        if (pendingInterventionRef.current) {
          const pending = pendingInterventionRef.current;
          pendingInterventionRef.current = null;
          setInterventionQueued(false);
          setTimeout(() => {
            continueConversationRef.current(pending, { skipUserMessage: true });
          }, 800);
          break;
        }

        // Priority 2: Auto-continue if consensus not reached
        const score = data.consensusScore as number;
        if (score < AUTO_CONSENSUS_THRESHOLD && nextRound < MAX_AUTO_ROUNDS) {
          // Don't go idle — keep status active, agents keep debating
          autoRoundActiveRef.current = true;
          setTimeout(() => {
            continueConversationRef.current(AUTO_CONTINUE_MSG, { skipUserMessage: true });
          }, 1000);
          break;
        }

        // Otherwise: debate concluded — go idle, wait for user
        setStatus('idle');
        statusRef.current = 'idle';
        break;
      }

      case 'error': {
        const msg = data.message as string;
        setError(msg);
        break;
      }
    }
  }, []);

  // Initial EventSource connection
  useEffect(() => {
    const streamUrl = problem
      ? `/api/debate/${sessionId}/stream?problem=${encodeURIComponent(problem)}`
      : `/api/debate/${sessionId}/stream`;
    const es = new EventSource(streamUrl);
    esRef.current = es;

    const touchLastEvent = () => {
      lastEventTimeRef.current = Date.now();
    };

    // List of SSE event types to listen for
    const eventTypes = [
      'heartbeat', 'debate:start', 'agent:thinking', 'agent:chunk', 'agent:done',
      'agent:unavailable', 'psych:state_change', 'consensus:update', 'momentum:update',
      'quote:linked', 'research:results', 'user:intervention', 'round:complete', 'turn:pause',
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (e) => {
        touchLastEvent();
        try {
          const data = JSON.parse((e as MessageEvent).data);
          handleSSEEvent(type, data);
        } catch {
          // Skip malformed events
        }
      });
    }

    es.addEventListener('error', (e) => {
      // Ignore errors after a successful round completion
      if (statusRef.current === 'idle') return;

      const messageEvent = e as MessageEvent;
      if (messageEvent.data) {
        try {
          const data = JSON.parse(messageEvent.data);
          setError(data.message);
        } catch {
          setError('Connection lost');
        }
      } else if (es.readyState === EventSource.CLOSED) {
        setError('Connection lost. The conversation stream was interrupted.');
      } else {
        // EventSource is reconnecting — let it try
        return;
      }
      setStatus('error');
      es.close();
    });

    // Stale connection detector
    staleIntervalRef.current = setInterval(() => {
      if (
        statusRef.current === 'active' &&
        Date.now() - lastEventTimeRef.current > STALE_THRESHOLD_MS
      ) {
        esRef.current?.close();
        setStatus('error');
        setError('Connection timed out. The server may be unresponsive.');
        if (staleIntervalRef.current) {
          clearInterval(staleIntervalRef.current);
          staleIntervalRef.current = null;
        }
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => {
      es.close();
      if (staleIntervalRef.current) {
        clearInterval(staleIntervalRef.current);
        staleIntervalRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, [sessionId, problem, handleSSEEvent]);

  const getAgent = useCallback(
    (agentId: string) => agents.find((a) => a.id === agentId),
    [agents]
  );

  /**
   * Queue a user intervention during an active debate.
   * The message appears in the feed immediately. When the current round ends,
   * a new continuation round starts automatically where agents address it.
   */
  const sendIntervention = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      // Add user message to chat feed immediately
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          agentId: 'user',
          content: trimmed,
          complete: true,
          psychState: 'intervention',
          timestamp: Date.now(),
          isUser: true,
        },
      ]);

      // Store as pending — round:complete handler will auto-continue
      pendingInterventionRef.current = trimmed;
      setInterventionQueued(true);

      // Fire-and-forget POST (best effort — may not reach the streaming instance on serverless)
      fetch(`/api/debate/${sessionId}/intervene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      }).catch(() => {});

      return true;
    },
    [sessionId]
  );

  const sendPause = useCallback(
    () => {
      fetch(`/api/debate/${sessionId}/intervene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pause' }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const sendUnpause = useCallback(
    () => {
      fetch(`/api/debate/${sessionId}/intervene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'unpause' }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const sendReaction = useCallback(
    async (messageId: string, emoji: string) => {
      setReactions((prev) => {
        const msgReactions = { ...(prev[messageId] ?? {}) };
        msgReactions[emoji] = (msgReactions[emoji] ?? 0) + 1;
        return { ...prev, [messageId]: msgReactions };
      });

      try {
        const res = await fetch(`/api/debate/${sessionId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji }),
        });
        if (res.ok) {
          const data = await res.json();
          setReactions((prev) => ({ ...prev, [messageId]: data.reactions }));
        }
      } catch {
        setReactions((prev) => {
          const msgReactions = { ...(prev[messageId] ?? {}) };
          msgReactions[emoji] = Math.max(0, (msgReactions[emoji] ?? 1) - 1);
          if (msgReactions[emoji] === 0) delete msgReactions[emoji];
          return { ...prev, [messageId]: msgReactions };
        });
      }
    },
    [sessionId]
  );

  /**
   * Continue the conversation by sending a user message and triggering a new round.
   * Posts to /continue with the full transcript, then reads the SSE stream response.
   */
  const continueConversation = useCallback(
    async (message: string, opts?: { skipUserMessage?: boolean; routing?: 'synapse' | 'council' }) => {
      // Guard against double calls
      if (continuingRef.current) return false;
      continuingRef.current = true;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Add user message to feed immediately (skip if already added by intervention)
      if (!opts?.skipUserMessage) {
        const userMsgId = `user-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: userMsgId,
            agentId: 'user',
            content: message,
            complete: true,
            psychState: 'continuation',
            timestamp: Date.now(),
            isUser: true,
          },
        ]);
      }

      setStatus('active');
      statusRef.current = 'active';
      lastEventTimeRef.current = Date.now();
      setError(null);

      // Build transcript from current messages for the server (exclude system notices)
      const transcript: TranscriptEntry[] = messages
        .filter((m) => m.complete && m.content && !m.isUnavailable && !m.isResearch)
        .map((m) => ({
          agentId: m.agentId,
          displayName: m.isUser
            ? 'User'
            : m.agentId === 'synapse'
              ? 'Synapse'
              : agents.find((a) => a.id === m.agentId)?.displayName ?? m.agentId,
          content: m.content,
          psychState: m.psychState,
        }));

      try {
        const res = await fetch(`/api/debate/${sessionId}/continue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: opts?.routing === 'synapse' ? `@Synapse ${message.trim()}` : message.trim(),
            problem: problemRef.current,
            transcript,
            roundNumber,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          setStatus('idle');
          setError('Failed to continue conversation.');
          return false;
        }

        // Read SSE stream from fetch response
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(currentEvent, data);
              } catch {
                // Skip malformed lines
              }
            }
          }
        }

        return true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return false;
        }
        setStatus('idle');
        setError('Connection lost during continuation.');
        return false;
      } finally {
        continuingRef.current = false;
        // Safety net: if round:complete never fired (server error, timeout, crash),
        // ensure we don't stay stuck in 'active' forever.
        setStatus((prev) => (prev === 'active' ? 'idle' : prev));
      }
    },
    [sessionId, messages, agents, roundNumber, handleSSEEvent]
  );

  // Sync ref on every render — ensures handleSSEEvent always calls the latest version.
  // This is synchronous (not in a useEffect) so it's guaranteed to be current
  // by the time any setTimeout callback reads it.
  continueConversationRef.current = continueConversation;

  return {
    messages,
    agents,
    status,
    activeAgent,
    consensusScore,
    error,
    momentum,
    momentumDirection,
    reactions,
    showInfluence,
    setShowInfluence,
    roundData,
    interventionQueued,
    getAgent,
    sendIntervention,
    sendPause,
    sendUnpause,
    sendReaction,
    continueConversation,
  };
}
