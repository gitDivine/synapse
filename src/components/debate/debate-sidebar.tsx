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
  status: 'connecting' | 'active' | 'idle' | 'error';
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
    <aside className="flex w-64 flex-col glass-panel-raised border-l border-glass-border">
      {/* Debate progress */}
      <div className="border-b border-white/[0.04] p-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Conversation Progress
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${status === 'active' ? 'animate-pulse-glow' : ''}`}
            style={{
              backgroundColor:
                status === 'active'
                  ? '#22c55e'
                  : status === 'idle'
                    ? '#eab308'
                    : status === 'error'
                      ? '#ef4444'
                      : '#71717a',
              boxShadow: status === 'active' ? '0 0 8px #22c55e60' : undefined,
            }}
          />
          <span className="text-xs text-text-secondary capitalize">
            {status === 'idle' ? 'Awaiting input' : status}
          </span>
          {(status === 'active' || status === 'idle') && (
            <span className="ml-auto text-xs tabular-nums text-text-muted">
              Turn {currentTurn}
            </span>
          )}
        </div>
      </div>

      {/* Consensus meter */}
      <div className="border-b border-white/[0.04] p-4">
        <ConsensusMeter score={consensusScore} status={status} />
      </div>

      {/* Momentum meter */}
      <div className="border-b border-white/[0.04] p-4">
        <MomentumMeter
          momentum={momentum}
          direction={momentumDirection}
          status={status}
        />
      </div>

      {/* Post-round actions */}
      {status === 'idle' && (
        <div className="border-b border-white/[0.04] p-4 space-y-2">
          <button
            onClick={onToggleInfluence}
            className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              showInfluence
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                : 'glass-subtle text-text-secondary hover:bg-white/[0.06]'
            }`}
          >
            {showInfluence ? 'Hide Influence Map' : 'Show Influence Map'}
          </button>
          {sessionId && (
            <button
              onClick={handleShareReplay}
              className="w-full rounded-lg glass-subtle px-3 py-2 text-xs font-medium text-text-secondary transition-all hover:bg-white/[0.06]"
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
                className={`rounded-lg p-3 transition-all ${
                  isActive
                    ? 'glass-subtle border border-accent/30 shadow-[0_0_16px_rgba(99,102,241,0.08)]'
                    : 'glass-subtle border border-transparent hover:border-white/[0.06]'
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
                      <p className="text-[10px] text-accent drop-shadow-[0_0_4px_rgba(99,102,241,0.4)]">Speaking...</p>
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
