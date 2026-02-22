'use client';

import { useState, useEffect } from 'react';
import { useDebateStream } from '@/hooks/use-debate-stream';
import { Header } from '@/components/shared/header';
import { MessageFeed } from './message-feed';
import { DebateSidebar } from './debate-sidebar';
import { UserInterveneBar } from './user-intervene-bar';
import { useToast } from '@/components/shared/toast';
import { cn } from '@/lib/utils/cn';

interface DebateContainerProps {
  sessionId: string;
  problem?: string;
}

export function DebateContainer({ sessionId, problem }: DebateContainerProps) {
  const {
    messages,
    agents,
    status,
    activeAgent,
    consensusScore,
    error,
    sendIntervention,
    sendPause,
    sendUnpause,
    continueConversation,
    interventionQueued,
    momentum,
    momentumDirection,
    reactions,
    showInfluence,
    setShowInfluence,
    sendReaction,
    roundData,
  } = useDebateStream(sessionId, problem);

  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const influenceScores = roundData?.influence;

  // Toast on error
  useEffect(() => {
    if (error) toast(error, 'error');
  }, [error, toast]);

  // Determine input bar mode
  const isActive = status === 'active';
  const isIdle = status === 'idle';
  const showInput = isActive || isIdle;

  const handleSend = async (message: string, routing?: 'synapse' | 'council') => {
    if (isActive) {
      return sendIntervention(message);
    }
    if (isIdle) {
      await continueConversation(message, { routing: routing ?? 'council' });
      return true;
    }
    return false;
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />

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
              reactions={reactions}
              onReact={sendReaction}
              influenceScores={influenceScores}
              showInfluence={showInfluence}
            />
          </div>

          {/* Error banner */}
          {error && (
            <div className="border-t border-error/20 bg-error/5 px-4 py-2 text-center text-sm text-error">
              {error}
            </div>
          )}

          {/* Unified input bar — visible during active and idle states */}
          {showInput && (
            <UserInterveneBar
              onSend={handleSend}
              disabled={false}
              mode={isIdle ? 'continue' : 'intervene'}
              interventionQueued={interventionQueued}
            />
          )}
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

        {/* Sidebar */}
        {agents.length > 0 ? (
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
              showInfluence={showInfluence}
              onToggleInfluence={() => setShowInfluence((prev) => !prev)}
              sessionId={sessionId}
            />
          </div>
        ) : (
          <aside className="hidden w-64 flex-col border-l border-border bg-surface-raised md:flex">
            <div className="border-b border-border p-4">
              <div className="mb-2 h-3 w-24 rounded bg-surface-overlay animate-shimmer" />
              <div className="h-2 w-16 rounded bg-surface-overlay animate-shimmer" />
            </div>
            <div className="border-b border-border p-4">
              <div className="h-3 w-20 rounded bg-surface-overlay animate-shimmer" />
              <div className="mt-2 h-1.5 w-full rounded-full bg-surface-overlay animate-shimmer" />
            </div>
            <div className="p-4">
              <div className="mb-3 h-3 w-24 rounded bg-surface-overlay animate-shimmer" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-surface-overlay animate-shimmer" />
                      <div className="h-3 w-20 rounded bg-surface-overlay animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
