'use client';

import { motion } from 'motion/react';

interface ConsensusMeterProps {
  score: number;
  status: 'connecting' | 'active' | 'idle' | 'error';
}

export function ConsensusMeter({ score, status }: ConsensusMeterProps) {
  const percentage = Math.round(score * 100);

  const getColor = () => {
    if (score >= 0.85) return '#22c55e';
    if (score >= 0.6) return '#f59e0b';
    if (score >= 0.3) return '#6366f1';
    return '#71717a';
  };

  const getLabel = () => {
    if (status !== 'active' && status !== 'idle') return 'Waiting...';
    if (score >= 0.85) return 'Strong consensus';
    if (score >= 0.6) return 'Converging';
    if (score >= 0.3) return 'Debating';
    return 'Divergent';
  };

  return (
    <div
      className="space-y-1.5"
      role="meter"
      aria-label={`Consensus: ${percentage}%, ${getLabel()}`}
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">Consensus</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: getColor() }}>
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: getColor() }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
      <p className="text-[10px] text-text-muted">{getLabel()}</p>
    </div>
  );
}
