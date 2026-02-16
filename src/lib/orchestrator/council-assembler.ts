import type { AIAgent, ProviderType } from '@/lib/agents/types';
import { agentRegistry } from '@/lib/agents/registry';

const MAX_COUNCIL_SIZE = 5;
const MIN_COUNCIL_SIZE = 2;

export class CouncilAssembler {
  /**
   * Pick agents that maximize capability coverage for the given problem.
   * Uses a greedy set-cover: each round, pick the agent covering the most
   * uncovered capabilities, until we have enough agents or full coverage.
   */
  assemble(
    problem: string,
    apiKeys: Partial<Record<ProviderType, string>>,
  ): AIAgent[] {
    const availableConfigs = agentRegistry.getAvailableConfigs(apiKeys);

    if (availableConfigs.length === 0) return [];

    // If we only have a few agents, use all of them
    if (availableConfigs.length <= MAX_COUNCIL_SIZE) {
      return availableConfigs.map((c) =>
        agentRegistry.createAgent(c.id, apiKeys)
      );
    }

    // Identify capabilities the problem likely needs
    const needed = this.analyzeNeeded(problem);

    // Greedy set-cover selection
    const selected: string[] = [];
    const covered = new Set<string>();

    while (
      selected.length < MAX_COUNCIL_SIZE &&
      selected.length < availableConfigs.length
    ) {
      let bestId = '';
      let bestScore = -1;

      for (const config of availableConfigs) {
        if (selected.includes(config.id)) continue;

        // Score = number of needed capabilities this agent covers that aren't yet covered
        const newCoverage = config.capabilities.filter(
          (cap) => needed.includes(cap.id) && !covered.has(cap.id)
        ).length;

        // Tie-break by total capability strength
        const strengthSum = config.capabilities.reduce(
          (sum, cap) => sum + cap.strength,
          0
        );

        const score = newCoverage * 10 + strengthSum;

        if (score > bestScore) {
          bestScore = score;
          bestId = config.id;
        }
      }

      if (!bestId) break;

      selected.push(bestId);
      const config = availableConfigs.find((c) => c.id === bestId)!;
      for (const cap of config.capabilities) {
        covered.add(cap.id);
      }
    }

    // Ensure minimum council size
    while (
      selected.length < MIN_COUNCIL_SIZE &&
      selected.length < availableConfigs.length
    ) {
      const remaining = availableConfigs.find(
        (c) => !selected.includes(c.id)
      );
      if (remaining) selected.push(remaining.id);
      else break;
    }

    return selected.map((id) => agentRegistry.createAgent(id, apiKeys));
  }

  private analyzeNeeded(problem: string): string[] {
    const needs: string[] = ['general_reasoning'];
    const lower = problem.toLowerCase();

    if (/code|function|algorithm|debug|program|software|api|bug/i.test(lower)) {
      needs.push('code_reasoning');
    }
    if (/image|visual|picture|diagram|photo|screenshot/i.test(lower)) {
      needs.push('image_analysis');
    }
    if (/data|statistic|number|chart|graph|metric|analysis/i.test(lower)) {
      needs.push('data_analysis');
    }
    if (/search|research|find|latest|current|news|fact/i.test(lower)) {
      needs.push('web_search');
    }
    if (/translate|language|multilingual|spanish|french|chinese/i.test(lower)) {
      needs.push('multilingual');
    }
    if (/synthesize|summary|combine|integrate|overview/i.test(lower)) {
      needs.push('synthesis');
    }

    return needs;
  }
}
