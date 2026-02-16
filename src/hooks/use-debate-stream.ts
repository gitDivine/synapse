'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  replyTo?: MessageReplyTo;
}

export interface AgentInfo {
  id: string;
  displayName: string;
  color: string;
  avatar: string;
  currentPsychState?: string;
}

export interface SummaryKeyMoment {
  agentId: string;
  excerpt: string;
  significance: string;
}

export interface SummaryDissent {
  agentId: string;
  position: string;
}

export interface SummarySource {
  name: string;
  title: string;
  url?: string;
}

export interface DebateSummary {
  verdict: string;
  confidence: string;
  keyMoments: SummaryKeyMoment[];
  dissent: SummaryDissent[];
  openQuestions: string[];
  sources: SummarySource[];
  userContributions: string[];
  influence?: Record<string, number>;
  consensusHistory?: { turn: number; score: number }[];
  quoteLinks?: { sourceMessageId: string; targetMessageId: string; agentName: string; excerpt: string }[];
}

type DebateStatus = 'connecting' | 'active' | 'ended' | 'error';

const STALE_CHECK_INTERVAL_MS = 20_000;
const STALE_THRESHOLD_MS = 45_000;

export function useDebateStream(sessionId: string) {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [status, setStatus] = useState<DebateStatus>('connecting');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [consensusScore, setConsensusScore] = useState(0);
  const [summary, setSummary] = useState<DebateSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followupResponse, setFollowupResponse] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [momentum, setMomentum] = useState(0);
  const [momentumDirection, setMomentumDirection] = useState<'heating' | 'steady' | 'cooling'>('steady');
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [showInfluence, setShowInfluence] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const lastEventTimeRef = useRef(Date.now());
  const statusRef = useRef<DebateStatus>('connecting');
  const abortRef = useRef<AbortController | null>(null);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const es = new EventSource(`/api/debate/${sessionId}/stream`);
    esRef.current = es;

    const touchLastEvent = () => {
      lastEventTimeRef.current = Date.now();
    };

    es.addEventListener('heartbeat', touchLastEvent);

    es.addEventListener('debate:start', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setAgents(data.agents);
      setStatus('active');
    });

    es.addEventListener('agent:thinking', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setActiveAgent(data.agentId);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === data.agentId
            ? { ...a, currentPsychState: data.psychState }
            : a
        )
      );
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          agentId: data.agentId,
          content: '',
          complete: false,
          psychState: data.psychState,
          timestamp: Date.now(),
        },
      ]);
    });

    es.addEventListener('agent:chunk', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === data.messageId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          content: updated[idx].content + data.content,
        };
        return updated;
      });
    });

    es.addEventListener('agent:done', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, complete: true } : m
        )
      );
      setActiveAgent(null);
    });

    es.addEventListener('psych:state_change', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === data.agentId
            ? { ...a, currentPsychState: data.to }
            : a
        )
      );
    });

    es.addEventListener('consensus:update', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setConsensusScore(data.score);
    });

    es.addEventListener('momentum:update', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setMomentum(data.momentum);
      setMomentumDirection(data.direction);
    });

    es.addEventListener('quote:linked', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.targetMessageId
            ? {
                ...m,
                replyTo: {
                  messageId: data.sourceMessageId,
                  agentName: data.agentName,
                  excerpt: data.excerpt,
                },
              }
            : m
        )
      );
    });

    es.addEventListener('research:results', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      const sources = data.results ?? [];
      const snippets = sources
        .map((r: { sourceName: string; title: string }) => `[${r.sourceName}] ${r.title}`)
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
    });

    es.addEventListener('user:intervention', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${data.timestamp}`,
          agentId: 'user',
          content: data.content,
          complete: true,
          psychState: 'intervention',
          timestamp: data.timestamp,
          isUser: true,
        },
      ]);
    });

    es.addEventListener('debate:summary', (e) => {
      touchLastEvent();
      const data = JSON.parse(e.data);
      setSummary(data);
    });

    es.addEventListener('debate:end', () => {
      touchLastEvent();
      setStatus('ended');
      es.close();
    });

    es.addEventListener('error', (e) => {
      const messageEvent = e as MessageEvent;
      if (messageEvent.data) {
        try {
          const data = JSON.parse(messageEvent.data);
          setError(data.message);
        } catch {
          setError('Connection lost');
        }
      } else {
        setError('Connection lost');
      }
      setStatus('error');
      es.close();
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED && statusRef.current !== 'ended') {
        setStatus('error');
        setError('Connection lost. The debate stream was interrupted.');
      }
    };

    // Stale connection detector — catches silent failures
    const staleCheckInterval = setInterval(() => {
      if (
        statusRef.current === 'active' &&
        Date.now() - lastEventTimeRef.current > STALE_THRESHOLD_MS
      ) {
        esRef.current?.close();
        setStatus('error');
        setError('Connection timed out. The server may be unresponsive.');
        clearInterval(staleCheckInterval);
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => {
      es.close();
      clearInterval(staleCheckInterval);
      abortRef.current?.abort();
    };
  }, [sessionId]);

  const getAgent = useCallback(
    (agentId: string) => agents.find((a) => a.id === agentId),
    [agents]
  );

  const sendIntervention = useCallback(
    async (message: string) => {
      const controller = new AbortController();
      try {
        const res = await fetch(`/api/debate/${sessionId}/intervene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [sessionId]
  );

  const sendReaction = useCallback(
    async (messageId: string, emoji: string) => {
      // Optimistic update
      setReactions((prev) => {
        const msgReactions = { ...(prev[messageId] ?? {}) };
        msgReactions[emoji] = (msgReactions[emoji] ?? 0) + 1;
        return { ...prev, [messageId]: msgReactions };
      });

      try {
        const controller = new AbortController();
        const res = await fetch(`/api/debate/${sessionId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setReactions((prev) => ({ ...prev, [messageId]: data.reactions }));
        }
      } catch {
        // Revert on failure
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

  const askFollowup = useCallback(
    async (question: string) => {
      // Abort any previous followup request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setFollowupLoading(true);
      setFollowupResponse('');

      try {
        const res = await fetch(`/api/debate/${sessionId}/followup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          setFollowupLoading(false);
          return false;
        }

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
                if (currentEvent === 'followup:chunk' && data.content) {
                  setFollowupResponse((prev) => prev + data.content);
                }
              } catch {
                // Skip malformed lines
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Request was cancelled, not an error
        } else {
          setFollowupResponse('Failed to get a response from Synapse.');
        }
      }

      setFollowupLoading(false);
      return true;
    },
    [sessionId]
  );

  return {
    messages,
    agents,
    status,
    activeAgent,
    consensusScore,
    summary,
    error,
    followupResponse,
    followupLoading,
    momentum,
    momentumDirection,
    reactions,
    showInfluence,
    setShowInfluence,
    getAgent,
    sendIntervention,
    sendReaction,
    askFollowup,
  };
}
