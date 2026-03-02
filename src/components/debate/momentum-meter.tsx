'use client';

import { motion } from 'motion/react';

interface MomentumMeterProps {
  momentum: number;
  direction: 'heating' | 'steady' | 'cooling';
  status: 'connecting' | 'active' | 'idle' | 'error';
}

export function MomentumMeter({ momentum, direction, status }: MomentumMeterProps) {
  const percentage = Math.round(momentum * 100);

  const getColor = () => {
    if (momentum >= 0.7) return '#ef4444';
    if (momentum >= 0.4) return '#f59e0b';
    if (momentum >= 0.15) return '#6366f1';
    return '#71717a';
  };

  const getLabel = () => {
    if (status !== 'active' && status !== 'idle') return 'Waiting...';
    if (momentum >= 0.7) return 'Intense';
    if (momentum >= 0.4) return 'Active';
    if (momentum >= 0.15) return 'Cooling';
    return 'Calm';
  };

  const getDirectionIcon = () => {
    if (status !== 'active') return '';
    if (direction === 'heating') return ' \u2191';
    if (direction === 'cooling') return ' \u2193';
    return ' \u2192';
  };

  const color = getColor();

  return (
    <div
      className="space-y-1.5"
      role="meter"
      aria-label={`Conversation momentum: ${percentage}%, ${getLabel()}`}
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Momentum</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {percentage}%{getDirectionIcon()}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(to right, ${color}60, ${color})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
        {/* Glowing tip orb */}
        {percentage > 3 && (
          <motion.div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full animate-bar-tip-pulse"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}80, 0 0 16px ${color}40`,
            }}
            initial={{ left: 0 }}
            animate={{ left: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        )}
      </div>
      <p className="text-[10px] text-text-muted">{getLabel()}</p>
    </div>
  );
}
