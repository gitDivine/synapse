'use client';

const EMOJI_SET = ['👍', '👎', '🤔', '🔥', '💡', '❌'];

interface MessageReactionsProps {
  messageId: string;
  reactions: Record<string, number>;
  onReact: (messageId: string, emoji: string) => void;
  disabled?: boolean;
}

export function MessageReactions({
  messageId,
  reactions,
  onReact,
  disabled,
}: MessageReactionsProps) {
  const hasAnyReactions = Object.values(reactions).some((c) => c > 0);

  return (
    <div className="mt-1.5 flex items-center gap-1">
      {EMOJI_SET.map((emoji) => {
        const count = reactions[emoji] ?? 0;
        const isActive = count > 0;

        return (
          <button
            key={emoji}
            onClick={() => onReact(messageId, emoji)}
            disabled={disabled}
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-all ${
              isActive
                ? 'border border-accent/30 bg-accent-soft'
                : 'border border-transparent opacity-0 group-hover:opacity-100 hover:bg-surface-overlay'
            } disabled:pointer-events-none`}
            aria-label={`React with ${emoji}`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="text-[10px] tabular-nums text-text-muted">
                {count}
              </span>
            )}
          </button>
        );
      })}
      {/* Show a subtle hint on hover when no reactions exist */}
      {!hasAnyReactions && (
        <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-50">
          React
        </span>
      )}
    </div>
  );
}
