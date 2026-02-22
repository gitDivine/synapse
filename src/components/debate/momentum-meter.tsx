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
        <span className="text-xs font-medium text-text-muted">Momentum</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: getColor() }}>
          {percentage}%{getDirectionIcon()}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: getColor() }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
      </div>
      <p className="text-[10px] text-text-muted">{getLabel()}</p>
    </div>
  );
}
