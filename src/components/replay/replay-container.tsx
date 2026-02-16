'use client';

import { useState } from 'react';
import { useReplayEngine } from '@/hooks/use-replay-engine';
import { Header } from '@/components/shared/header';
import { MessageFeed } from '@/components/debate/message-feed';
import { DebateSidebar } from '@/components/debate/debate-sidebar';
import { SummaryPanel } from '@/components/debate/summary-panel';
import { ReplayPlayer } from './replay-player';
import { cn } from '@/lib/utils/cn';

interface ReplayContainerProps {
  sessionId: string;
}

export function ReplayContainer({ sessionId }: ReplayContainerProps) {
  const {
    loading,
    fetchError,
    problem,
    playing,
    speed,
    progress,
    currentTime,
    totalDuration,
    play,
    pause,
    seekTo,
    changeSpeed,
    messages,
    agents,
    status,
    activeAgent,
    consensusScore,
    summary,
    momentum,
    momentumDirection,
  } = useReplayEngine(sessionId);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-text-secondary">Loading replay...</p>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-text-primary">
              Replay unavailable
            </p>
            <p className="mt-1 text-sm text-text-secondary">{fetchError}</p>
            <a
              href="/"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Start a new debate
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Build influence scores from summary data
  const influenceScores = summary?.influence;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />

      {/* Problem banner */}
      {problem && (
        <div className="border-b border-border bg-surface-raised px-4 py-2">
          <p className="mx-auto max-w-3xl text-xs text-text-muted">
            <span className="font-medium text-text-secondary">Replaying:</span>{' '}
            {problem.length > 120 ? problem.slice(0, 117) + '...' : problem}
          </p>
        </div>
      )}

      <div id="main-content" className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Message feed */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4">
            <MessageFeed
              messages={messages}
              agents={agents}
              activeAgent={activeAgent}
              status={status}
              influenceScores={influenceScores}
              showInfluence={status === 'ended'}
            />
          </div>

          {/* Summary panel — shown after replay completes */}
          {summary && <SummaryPanel summary={summary} agents={agents} />}
        </div>

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          className="fixed right-4 top-16 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised shadow-lg md:hidden"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          )}
        </button>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — responsive: slide-in on mobile, always visible on desktop */}
        {agents.length > 0 && (
          <div
            className={cn(
              'fixed right-0 top-0 z-40 h-full w-64 transition-transform duration-300 md:relative md:translate-x-0',
              sidebarOpen ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <DebateSidebar
              agents={agents}
              activeAgent={activeAgent}
              consensusScore={consensusScore}
              currentTurn={messages.filter((m) => m.complete && !m.isUser).length}
              status={status}
              momentum={momentum}
              momentumDirection={momentumDirection}
              showInfluence={status === 'ended'}
              onToggleInfluence={() => {}}
              sessionId={sessionId}
            />
          </div>
        )}
      </div>

      {/* Replay player bar at bottom */}
      <ReplayPlayer
        playing={playing}
        speed={speed}
        progress={progress}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onPlay={play}
        onPause={pause}
        onSeek={seekTo}
        onChangeSpeed={changeSpeed}
        sessionId={sessionId}
      />
    </div>
  );
}
