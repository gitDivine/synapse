'use client';

import type { AgentInfo } from '@/hooks/use-debate-stream';
import { AgentAvatar } from './agent-avatar';
import { PsychologicalBadge } from './psychological-badge';
import { ConsensusMeter } from './consensus-meter';
import { MomentumMeter } from './momentum-meter';
import { useToast } from '@/components/shared/toast';

interface DebateSidebarProps {
  agents: AgentInfo[];
  activeAgent: string | null;
  consensusScore: number;
  currentTurn: number;
  status: 'connecting' | 'active' | 'ended' | 'error';
  momentum: number;
  momentumDirection: 'heating' | 'steady' | 'cooling';
  showInfluence: boolean;
  onToggleInfluence: () => void;
  sessionId?: string;
}

export function DebateSidebar({
  agents,
  activeAgent,
  consensusScore,
  currentTurn,
  status,
  momentum,
  momentumDirection,
  showInfluence,
  onToggleInfluence,
  sessionId,
}: DebateSidebarProps) {
  const { toast } = useToast();

  const handleShareReplay = () => {
    if (!sessionId) return;
    const url = `${window.location.origin}/debate/${sessionId}/replay`;
    navigator.clipboard.writeText(url);
    toast('Replay link copied!', 'success');
  };

  return (
    <aside className="flex w-64 flex-col border-l border-border bg-surface-raised">
      {/* Debate progress */}
      <div className="border-b border-border p-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Debate Progress
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                status === 'active'
                  ? '#22c55e'
                  : status === 'ended'
                    ? '#6366f1'
                    : status === 'error'
                      ? '#ef4444'
                      : '#71717a',
            }}
          />
          <span className="text-xs text-text-secondary capitalize">{status}</span>
          {status === 'active' && (
            <span className="ml-auto text-xs tabular-nums text-text-muted">
              Turn {currentTurn}
            </span>
          )}
        </div>
      </div>

      {/* Consensus meter */}
      <div className="border-b border-border p-4">
        <ConsensusMeter score={consensusScore} status={status} />
      </div>

      {/* Momentum meter */}
      <div className="border-b border-border p-4">
        <MomentumMeter
          momentum={momentum}
          direction={momentumDirection}
          status={status}
        />
      </div>

      {/* Post-debate actions */}
      {status === 'ended' && (
        <div className="border-b border-border p-4 space-y-2">
          <button
            onClick={onToggleInfluence}
            className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              showInfluence
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-surface-overlay text-text-secondary hover:bg-surface-overlay/80'
            }`}
          >
            {showInfluence ? 'Hide Influence Map' : 'Show Influence Map'}
          </button>
          {sessionId && (
            <button
              onClick={handleShareReplay}
              className="w-full rounded-lg bg-surface-overlay px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay/80"
            >
              Share Replay Link
            </button>
          )}
        </div>
      )}

      {/* Agent roster */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Council Members
        </h3>
        <div className="space-y-3">
          {agents.map((agent) => {
            const isActive = activeAgent === agent.id;
            return (
              <div
                key={agent.id}
                className={`rounded-lg border p-3 transition-colors ${
                  isActive
                    ? 'border-accent/30 bg-accent-soft'
                    : 'border-border bg-background'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AgentAvatar
                    avatar={agent.avatar}
                    color={agent.color}
                    isActive={isActive}
                    name={agent.displayName}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {agent.displayName}
                    </p>
                    {isActive && (
                      <p className="text-[10px] text-accent">Speaking...</p>
                    )}
                  </div>
                </div>
                {agent.currentPsychState && (
                  <div className="mt-2">
                    <PsychologicalBadge trait={agent.currentPsychState} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
