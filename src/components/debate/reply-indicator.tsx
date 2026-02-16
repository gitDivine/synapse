'use client';

interface ReplyIndicatorProps {
  agentName: string;
  agentColor?: string;
  excerpt: string;
  messageId: string;
}

export function ReplyIndicator({
  agentName,
  agentColor,
  excerpt,
  messageId,
}: ReplyIndicatorProps) {
  const handleClick = () => {
    const el = document.getElementById(messageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight flash
      el.classList.add('ring-1', 'ring-accent/40');
      setTimeout(() => el.classList.remove('ring-1', 'ring-accent/40'), 1500);
    }
  };

  const truncated = excerpt.length > 60 ? excerpt.slice(0, 57) + '...' : excerpt;

  return (
    <button
      onClick={handleClick}
      className="mb-1 inline-flex max-w-full items-center gap-1.5 rounded-md border-l-2 bg-surface-overlay/50 px-2 py-0.5 text-[10px] text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-secondary"
      style={{ borderLeftColor: agentColor ?? 'var(--accent)' }}
      aria-label={`Replying to ${agentName}`}
    >
      <span className="flex-shrink-0">{'\u21A9'}</span>
      <span className="flex-shrink-0 font-medium" style={{ color: agentColor }}>
        @{agentName}
      </span>
      <span className="truncate">&ldquo;{truncated}&rdquo;</span>
    </button>
  );
}
