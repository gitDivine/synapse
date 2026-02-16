'use client';

import { cn } from '@/lib/utils/cn';

const TRAIT_STYLES: Record<string, { label: string; className: string }> = {
  analytical: { label: 'Analytical', className: 'bg-blue-500/10 text-blue-400' },
  curious: { label: 'Curious', className: 'bg-purple-500/10 text-purple-400' },
  skeptical: { label: 'Skeptical', className: 'bg-red-500/10 text-red-400' },
  concessive: { label: 'Conceding', className: 'bg-green-500/10 text-green-400' },
  devil_advocate: { label: "Devil's Advocate", className: 'bg-orange-500/10 text-orange-400' },
  enthusiastic: { label: 'Excited', className: 'bg-yellow-500/10 text-yellow-400' },
  synthesizer: { label: 'Synthesizing', className: 'bg-teal-500/10 text-teal-400' },
  provocateur: { label: 'Provocateur', className: 'bg-pink-500/10 text-pink-400' },
};

interface PsychologicalBadgeProps {
  trait: string;
}

export function PsychologicalBadge({ trait }: PsychologicalBadgeProps) {
  const style = TRAIT_STYLES[trait] ?? {
    label: trait,
    className: 'bg-zinc-500/10 text-zinc-400',
  };

  return (
    <span
      role="status"
      aria-label={`Psychological state: ${style.label}`}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        style.className
      )}
    >
      {style.label}
    </span>
  );
}
