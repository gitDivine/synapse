'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useScrollAnchor } from '@/hooks/use-scroll-anchor';
import { MessageBubble } from './message-bubble';
import type { DebateMessage, AgentInfo } from '@/hooks/use-debate-stream';

const RENDER_WINDOW = 30;
const EXPAND_STEP = 20;

interface MessageFeedProps {
  messages: DebateMessage[];
  agents: AgentInfo[];
  activeAgent: string | null;
  status: string;
  reactions?: Record<string, Record<string, number>>;
  onReact?: (messageId: string, emoji: string) => void;
  influenceScores?: Record<string, number>;
  showInfluence?: boolean;
}

export function MessageFeed({
  messages,
  agents,
  activeAgent,
  status,
  reactions,
  onReact,
  influenceScores,
  showInfluence,
}: MessageFeedProps) {
  const scrollRef = useScrollAnchor([messages]);
  const [visibleStart, setVisibleStart] = useState(0);

  const getAgent = (agentId: string) =>
    agents.find((a) => a.id === agentId);

  const effectiveStart = Math.max(visibleStart, messages.length - RENDER_WINDOW);
  const actualStart = Math.min(visibleStart, effectiveStart);
  const visibleMessages = messages.slice(actualStart);
  const hiddenCount = actualStart;

  const showEarlier = () => {
    setVisibleStart((prev) => Math.max(0, prev - EXPAND_STEP));
  };

  // Loading state — glass skeleton cards
  if (status === 'connecting') {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="mx-2 flex gap-3 rounded-xl glass-panel px-4 py-3"
            style={{ opacity: 1 - i * 0.2 }}
          >
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-surface-overlay animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 rounded-full bg-surface-overlay animate-shimmer" />
              <div className="h-3 w-full rounded-full bg-surface-overlay animate-shimmer" />
              <div className="h-3 w-3/4 rounded-full bg-surface-overlay animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (status === 'error' && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-medium text-text-primary">
            Connection lost
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            The conversation stream was interrupted. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-gradient-to-r from-accent to-purple-500 px-4 py-2 text-sm font-medium text-white transition-shadow hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Empty state — assembling council with converging dots SVG
  if (messages.length === 0 && status === 'active') {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
              <circle cx="6" cy="12" r="2.5" fill="currentColor" opacity="0.9">
                <animate attributeName="cx" values="6;10;6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.7">
                <animate attributeName="cy" values="12;10;12" dur="2s" repeatCount="indefinite" begin="0.3s" />
              </circle>
              <circle cx="18" cy="12" r="2.5" fill="currentColor" opacity="0.5">
                <animate attributeName="cx" values="18;14;18" dur="2s" repeatCount="indefinite" begin="0.6s" />
              </circle>
            </svg>
          </div>
          <p className="text-sm font-medium text-text-primary">
            Assembling the council...
          </p>
          <p className="mt-1 text-xs text-text-muted">
            AI agents are reviewing your problem
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
    >
      {/* Show earlier messages button */}
      {hiddenCount > 0 && (
        <button
          onClick={showEarlier}
          className="w-full border-b border-white/[0.04] px-4 py-2 text-center text-xs font-medium text-accent transition-colors hover:bg-white/[0.02]"
        >
          Show {Math.min(EXPAND_STEP, hiddenCount)} earlier messages ({hiddenCount} hidden)
        </button>
      )}

      <AnimatePresence mode="popLayout">
        {visibleMessages.map((msg) => {
          const msgReactions = reactions?.[msg.id];
          const influence = showInfluence ? influenceScores?.[msg.id] : undefined;

          if (msg.isUnavailable) {
            return (
              <div
                key={msg.id}
                className="flex items-center gap-2 px-4 py-2 text-xs text-text-muted"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                <span>{msg.content}</span>
              </div>
            );
          }
          if (msg.isUser) {
            return (
              <MessageBubble
                key={msg.id}
                messageId={msg.id}
                agentName="You"
                agentAvatar="U"
                agentColor="var(--accent)"
                content={msg.content}
                psychState="intervention"
                isStreaming={false}
                isUser
                reactions={msgReactions}
                onReact={onReact}
                influenceScore={influence}
              />
            );
          }
          if (msg.isResearch) {
            return (
              <MessageBubble
                key={msg.id}
                messageId={msg.id}
                agentName="Synapse"
                agentAvatar="S"
                agentColor="var(--accent)"
                content={msg.content}
                psychState="research"
                isStreaming={false}
                isResearch
                influenceScore={influence}
              />
            );
          }
          if (msg.agentId === 'synapse') {
            return (
              <MessageBubble
                key={msg.id}
                messageId={msg.id}
                agentName="Synapse"
                agentAvatar="S"
                agentColor="var(--accent)"
                content={msg.content}
                psychState={msg.psychState}
                isStreaming={!msg.complete && activeAgent === 'synapse'}
                reactions={msgReactions}
                onReact={onReact}
                influenceScore={influence}
              />
            );
          }
          const agent = getAgent(msg.agentId);
          const replyToAgent = msg.replyTo
            ? getAgent(agents.find((a) => a.displayName === msg.replyTo?.agentName)?.id ?? '')
            : undefined;

          return (
            <MessageBubble
              key={msg.id}
              messageId={msg.id}
              agentName={agent?.displayName ?? msg.agentId}
              agentAvatar={agent?.avatar ?? '?'}
              agentColor={agent?.color ?? 'var(--agent-blue)'}
              content={msg.content}
              psychState={msg.psychState}
              isStreaming={!msg.complete && activeAgent === msg.agentId}
              replyTo={msg.replyTo}
              replyToColor={replyToAgent?.color}
              reactions={msgReactions}
              onReact={onReact}
              influenceScore={influence}
            />
          );
        })}
      </AnimatePresence>

      {/* Idle indicator */}
      {status === 'idle' && (
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-text-muted">
            Synapse is ready. Type below to continue the conversation.
          </p>
        </div>
      )}
    </div>
  );
}
