'use client';

import { cn } from '@/lib/utils/cn';

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
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white'
        )}
        style={{ backgroundColor: color }}
      >
        {avatar}
      </div>
      {isActive && (
        <div
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ borderColor: color, border: '2px solid' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
