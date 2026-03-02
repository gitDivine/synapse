'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { AgentAvatar } from './agent-avatar';
import { PsychologicalBadge } from './psychological-badge';
import { ReplyIndicator } from './reply-indicator';
import { MessageReactions } from './message-reactions';
import type { MessageReplyTo } from '@/hooks/use-debate-stream';

interface MessageBubbleProps {
  messageId: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  content: string;
  psychState: string;
  isStreaming: boolean;
  isUser?: boolean;
  isResearch?: boolean;
  replyTo?: MessageReplyTo;
  replyToColor?: string;
  reactions?: Record<string, number>;
  onReact?: (messageId: string, emoji: string) => void;
  influenceScore?: number;
}

/** Strip <think>...</think> blocks (e.g. Qwen's chain-of-thought) from displayed text */
function stripThinkBlocks(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
  cleaned = cleaned.replace(/<think>[\s\S]*$/, '');
  return cleaned.trimStart();
}

/** Convert markdown links [text](url) to clickable <a> tags */
function renderWithLinks(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">
          {match[1]}
        </a>
      );
    }
    return part;
  });
}

function MessageBubbleInner({
  messageId,
  agentName,
  agentAvatar,
  agentColor,
  content,
  psychState,
  isStreaming,
  isUser,
  isResearch,
  replyTo,
  replyToColor,
  reactions,
  onReact,
  influenceScore,
}: MessageBubbleProps) {
  const bgClass = isUser
    ? 'bg-accent/8 border border-accent/15 backdrop-blur-sm'
    : isResearch
      ? 'glass-panel border-l-2 border-l-accent/30'
      : 'glass-panel';

  // Influence heat map glow
  const influenceStyle: React.CSSProperties = {};
  if (influenceScore !== undefined && influenceScore > 0.1) {
    if (influenceScore > 0.7) {
      influenceStyle.boxShadow = '0 0 24px rgba(251, 191, 36, 0.2), inset 0 0 0 1px rgba(251, 191, 36, 0.15)';
      influenceStyle.borderLeft = '2px solid rgba(251, 191, 36, 0.6)';
    } else if (influenceScore > 0.4) {
      influenceStyle.boxShadow = '0 0 16px rgba(251, 191, 36, 0.1), inset 0 0 0 1px rgba(251, 191, 36, 0.08)';
      influenceStyle.borderLeft = '2px solid rgba(251, 191, 36, 0.3)';
    } else {
      influenceStyle.boxShadow = '0 0 6px rgba(251, 191, 36, 0.04)';
    }
  }

  return (
    <motion.div
      id={messageId}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }}
      className={`group flex gap-3 rounded-xl mx-2 my-1 px-4 py-3 transition-all ${bgClass}`}
      style={influenceStyle}
      role="article"
      aria-label={`${agentName} says`}
    >
      <AgentAvatar
        avatar={agentAvatar}
        color={agentColor}
        isActive={isStreaming}
        name={agentName}
      />
      <div className="min-w-0 flex-1">
        {/* Reply indicator */}
        {replyTo && (
          <ReplyIndicator
            agentName={replyTo.agentName}
            agentColor={replyToColor}
            excerpt={replyTo.excerpt}
            messageId={replyTo.messageId}
          />
        )}

        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${isStreaming ? 'drop-shadow-[0_0_6px_currentColor]' : ''}`}
            style={{ color: agentColor }}
          >
            {agentName}
          </span>
          {!isUser && !isResearch && <PsychologicalBadge trait={psychState} />}
          {isUser && (
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent border border-accent/20">
              Moderator
            </span>
          )}
          {isResearch && (
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20">
              Live Research
            </span>
          )}
          {influenceScore !== undefined && influenceScore > 0.1 && (
            <span
              className="text-[10px] tabular-nums text-amber-400/70"
              title={`Influence: ${Math.round(influenceScore * 100)}%`}
            >
              {Math.round(influenceScore * 100)}% influence
            </span>
          )}
        </div>
        <div className={`whitespace-pre-wrap text-sm leading-relaxed ${isResearch ? 'text-text-secondary font-mono text-xs' : 'text-neutral-200'}`}>
          {renderWithLinks(stripThinkBlocks(content))}
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-[3px] rounded-full bg-current align-middle animate-cursor-breathe"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Emoji reactions */}
        {reactions && onReact && !isResearch && (
          <MessageReactions
            messageId={messageId}
            reactions={reactions}
            onReact={onReact}
            disabled={isStreaming}
          />
        )}
      </div>
    </motion.div>
  );
}

export const MessageBubble = memo(MessageBubbleInner);
