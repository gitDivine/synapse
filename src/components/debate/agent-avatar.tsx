'use client';

interface AgentAvatarProps {
  avatar: string;
  color: string;
  isActive?: boolean;
  name?: string;
}

export function AgentAvatar({ avatar, color, isActive, name }: AgentAvatarProps) {
  return (
    <div
      className="relative flex-shrink-0"
      role="img"
      aria-label={`${name ?? avatar} avatar${isActive ? ', currently speaking' : ''}`}
    >
      {/* Glow halo when active */}
      {isActive && (
        <div
          className="absolute -inset-1 rounded-full animate-pulse-glow blur-sm"
          style={{ backgroundColor: color, opacity: 0.35 }}
          aria-hidden="true"
        />
      )}
      <div
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-shadow"
        style={{
          backgroundColor: color,
          boxShadow: isActive
            ? `0 0 12px ${color}40, inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 2px ${color}50`
            : 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {avatar}
      </div>
      {isActive && (
        <div
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ border: `2px solid ${color}` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
