import type { DebateTurn } from '@/lib/memory/context-log';

export class ConsensusDetector {
  /**
   * Evaluate genuine convergence vs polite agreement.
   * Returns 0.0 (total disagreement) to 1.0 (full consensus).
   */
  evaluate(turns: DebateTurn[]): number {
    if (turns.length < 2) return 0;

    // Focus on the last 2 rounds of discussion
    const recentTurns = turns.slice(-6);
    return this.heuristicScore(recentTurns);
  }

  private heuristicScore(turns: DebateTurn[]): number {
    let agreementSignals = 0;
    let disagreementSignals = 0;
    let substantiveAgreement = 0;
    let stanceShifts = 0;

    for (const turn of turns) {
      const content = turn.content.toLowerCase();

      // Agreement markers
      if (
        /\b(i agree|good point|you're right|exactly|building on|i concur|well said|strong argument)\b/.test(
          content
        )
      ) {
        agreementSignals++;
        // Substantive if they add reasoning (longer response with causal language)
        if (
          content.length > 150 &&
          /\b(because|since|this means|therefore|which implies|furthermore)\b/.test(
            content
          )
        ) {
          substantiveAgreement++;
        }
      }

      // Disagreement markers
      if (
        /\b(i disagree|however|but i think|on the contrary|i challenge|not quite|that's not|i'd push back)\b/.test(
          content
        )
      ) {
        disagreementSignals++;
      }

      // Stance shifts (agent changing their mind — strong convergence signal)
      if (
        /\b(i was wrong|i've changed my mind|you've convinced me|i concede|fair enough|i stand corrected|updating my position)\b/.test(
          content
        )
      ) {
        stanceShifts++;
      }
    }

    const total = agreementSignals + disagreementSignals;
    if (total === 0) return 0.3; // Neutral baseline

    // Weight: substantive agreement > stance shifts > raw agreement > raw disagreement
    const numerator =
      agreementSignals * 1 +
      substantiveAgreement * 2 +
      stanceShifts * 3;
    const denominator =
      total * 1 +
      substantiveAgreement * 2 +
      stanceShifts * 3 +
      disagreementSignals * 1.5;

    const rawScore = numerator / denominator;

    // Dampen early rounds — need at least 2 full exchanges (8+ turns) for reliable consensus.
    // AI agents are naturally agreeable so early scores inflate without real debate depth.
    if (turns.length < 8) {
      return Math.max(0.1, Math.min(rawScore * 0.6, 0.7));
    }

    // Apply a minimum floor — even with disagreements, some consensus exists
    return Math.max(0.1, Math.min(rawScore, 1.0));
  }
}
