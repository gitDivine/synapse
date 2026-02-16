'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  DebateMessage,
  AgentInfo,
  DebateSummary,
  MessageReplyTo,
} from '@/hooks/use-debate-stream';

type DebateStatus = 'connecting' | 'active' | 'ended' | 'error';
type PlaybackSpeed = 0.5 | 1 | 2 | 4;

interface ReplayEvent {
  event: {
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
  };
  elapsed: number;
}

interface ReplayData {
  problem: string;
  replayEvents: ReplayEvent[];
  totalDuration: number;
}

export function useReplayEngine(sessionId: string) {
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);

  // Debate state (mirrors useDebateStream)
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [status, setStatus] = useState<DebateStatus>('connecting');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [consensusScore, setConsensusScore] = useState(0);
  const [summary, setSummary] = useState<DebateSummary | null>(null);
  const [momentum, setMomentum] = useState(0);
  const [momentumDirection, setMomentumDirection] = useState<'heating' | 'steady' | 'cooling'>('steady');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Fetch replay data on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchReplay() {
      try {
        const res = await fetch(`/api/debate/${sessionId}/replay`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFetchError(data.error ?? 'Failed to load replay');
          setLoading(false);
          return;
        }
        const data: ReplayData = await res.json();
        if (!cancelled) {
          setReplayData(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFetchError('Failed to load replay');
          setLoading(false);
        }
      }
    }
    fetchReplay();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Process a single event
  const processEvent = useCallback((event: ReplayEvent['event']) => {
    const { type, data } = event;
    const d = data as Record<string, unknown>;

    switch (type) {
      case 'debate:start':
        setAgents(d.agents as AgentInfo[]);
        setStatus('active');
        break;

      case 'agent:thinking':
        setActiveAgent(d.agentId as string);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === d.agentId ? { ...a, currentPsychState: d.psychState as string } : a
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: d.messageId as string,
            agentId: d.agentId as string,
            content: '',
            complete: false,
            psychState: d.psychState as string,
            timestamp: Date.now(),
          },
        ]);
        break;

      case 'agent:chunk':
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === d.messageId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            content: updated[idx].content + (d.content as string),
          };
          return updated;
        });
        break;

      case 'agent:done':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === d.messageId ? { ...m, complete: true } : m
          )
        );
        setActiveAgent(null);
        break;

      case 'psych:state_change':
        setAgents((prev) =>
          prev.map((a) =>
            a.id === d.agentId ? { ...a, currentPsychState: d.to as string } : a
          )
        );
        break;

      case 'consensus:update':
        setConsensusScore(d.score as number);
        break;

      case 'momentum:update':
        setMomentum(d.momentum as number);
        setMomentumDirection(d.direction as 'heating' | 'steady' | 'cooling');
        break;

      case 'quote:linked':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === d.targetMessageId
              ? {
                  ...m,
                  replyTo: {
                    messageId: d.sourceMessageId as string,
                    agentName: d.agentName as string,
                    excerpt: d.excerpt as string,
                  } as MessageReplyTo,
                }
              : m
          )
        );
        break;

      case 'research:results': {
        const results = (d.results as Array<{ sourceName: string; title: string }>) ?? [];
        const snippets = results
          .map((r) => `[${r.sourceName}] ${r.title}`)
          .join('\n');
        setMessages((prev) => [
          ...prev,
          {
            id: `research-${Date.now()}`,
            agentId: 'synapse',
            content: `Synapse researched: "${d.query}"\n${snippets}`,
            complete: true,
            psychState: 'research',
            timestamp: Date.now(),
            isResearch: true,
          },
        ]);
        break;
      }

      case 'user:intervention':
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${d.timestamp}`,
            agentId: 'user',
            content: d.content as string,
            complete: true,
            psychState: 'intervention',
            timestamp: d.timestamp as number,
            isUser: true,
          },
        ]);
        break;

      case 'debate:summary':
        setSummary(d as unknown as DebateSummary);
        break;

      case 'debate:end':
        setStatus('ended');
        break;
    }
  }, []);

  // Reset all state
  const resetState = useCallback(() => {
    setMessages([]);
    setAgents([]);
    setStatus('connecting');
    setActiveAgent(null);
    setConsensusScore(0);
    setSummary(null);
    setMomentum(0);
    setMomentumDirection('steady');
  }, []);

  // Schedule next event
  const scheduleNext = useCallback((fromIndex: number, fromTime: number) => {
    if (!replayData) return;
    const events = replayData.replayEvents;

    if (fromIndex >= events.length) {
      setPlaying(false);
      return;
    }

    const nextEvent = events[fromIndex];
    const delay = Math.max(0, (nextEvent.elapsed - fromTime) / speedRef.current);

    timerRef.current = setTimeout(() => {
      processEvent(nextEvent.event);
      setCurrentTime(nextEvent.elapsed);
      setEventIndex(fromIndex + 1);
      scheduleNext(fromIndex + 1, nextEvent.elapsed);
    }, delay);
  }, [replayData, processEvent]);

  // Play
  const play = useCallback(() => {
    if (!replayData) return;
    setPlaying(true);
    scheduleNext(eventIndex, currentTime);
  }, [replayData, eventIndex, currentTime, scheduleNext]);

  // Pause
  const pause = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Seek to a progress (0-1)
  const seekTo = useCallback((progress: number) => {
    if (!replayData) return;

    const wasPlaying = playing;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const targetTime = progress * replayData.totalDuration;

    // Reset and replay all events up to target time instantly
    resetState();

    const events = replayData.replayEvents;
    let idx = 0;
    for (; idx < events.length; idx++) {
      if (events[idx].elapsed > targetTime) break;
      processEvent(events[idx].event);
    }

    setCurrentTime(targetTime);
    setEventIndex(idx);

    if (wasPlaying) {
      // Use setTimeout to let state settle before resuming
      setTimeout(() => scheduleNext(idx, targetTime), 0);
    } else {
      setPlaying(false);
    }
  }, [replayData, playing, resetState, processEvent, scheduleNext]);

  // Update speed
  const changeSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    const wasPlaying = playing;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSpeed(newSpeed);
    speedRef.current = newSpeed;

    if (wasPlaying) {
      // Resume with new speed
      setTimeout(() => scheduleNext(eventIndex, currentTime), 0);
    }
  }, [playing, eventIndex, currentTime, scheduleNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const totalDuration = replayData?.totalDuration ?? 0;
  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  return {
    // Loading state
    loading,
    fetchError,
    problem: replayData?.problem ?? '',

    // Playback controls
    playing,
    speed,
    progress,
    currentTime,
    totalDuration,
    play,
    pause,
    seekTo,
    changeSpeed,

    // Debate state (same shape as useDebateStream)
    messages,
    agents,
    status,
    activeAgent,
    consensusScore,
    summary,
    momentum,
    momentumDirection,
  };
}
