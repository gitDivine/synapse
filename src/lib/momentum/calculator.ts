import type { DebateTurn } from '@/lib/memory/context-log';

export interface MomentumResult {
  momentum: number;
  direction: 'heating' | 'steady' | 'cooling';
}

export class MomentumCalculator {
  private history: { turn: number; score: number }[] = [];

  calculate(
    turns: DebateTurn[],
    consensusScore: number,
    prevConsensusScore: number,
    hasIntervention: boolean,
    psychStateChanged: boolean,
  ): MomentumResult {
    const recentTurns = turns.slice(-2);
    let score = 0;

    // Disagreement density in recent turns
    for (const turn of recentTurns) {
      const content = turn.content.toLowerCase();
      if (
        /\b(i disagree|however|but i think|on the contrary|push back|challenge|not quite|that's not)\b/.test(content)
      ) {
        score += 0.2;
      }
    }

    // Consensus delta — big shifts mean heated debate
    const consensusDelta = Math.abs(consensusScore - prevConsensusScore);
    if (consensusDelta > 0.1) {
      score += 0.3;
    } else if (consensusDelta > 0.05) {
      score += 0.15;
    }

    // User intervention spike
    if (hasIntervention) {
      score += 0.25;
    }

    // Psych state transition
    if (psychStateChanged) {
      score += 0.15;
    }

    // Long responses indicate intensity
    const lastTurn = turns.at(-1);
    if (lastTurn && lastTurn.content.split(/\s+/).length > 200) {
      score += 0.1;
    }

    // Decay: if no signals, pull toward 0
    if (score === 0 && this.history.length > 0) {
      const lastScore = this.history.at(-1)?.score ?? 0;
      score = Math.max(0, lastScore - 0.1);
    } else {
      // Blend with previous for smoothness
      const lastScore = this.history.at(-1)?.score ?? 0;
      score = lastScore * 0.3 + score * 0.7;
    }

    // Clamp to 0-1
    score = Math.max(0, Math.min(1, score));

    // Calculate direction
    const recentAvg = this.history.length >= 3
      ? this.history.slice(-3).reduce((sum, h) => sum + h.score, 0) / 3
      : this.history.length > 0
        ? this.history.reduce((sum, h) => sum + h.score, 0) / this.history.length
        : score;

    let direction: MomentumResult['direction'] = 'steady';
    if (score - recentAvg > 0.05) {
      direction = 'heating';
    } else if (recentAvg - score > 0.05) {
      direction = 'cooling';
    }

    this.history.push({ turn: turns.length, score });
    return { momentum: score, direction };
  }

  getHistory(): { turn: number; score: number }[] {
    return [...this.history];
  }
}
