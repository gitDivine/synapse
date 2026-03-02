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

  const color = getColor();

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
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Consensus</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {percentage}%
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
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
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
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        )}
      </div>
      <p className="text-[10px] text-text-muted">{getLabel()}</p>
    </div>
  );
}
