import type { AIAgent } from '@/lib/agents/types';

interface TurnManagerOptions {
  maxTurns: number;
  maxRounds: number;
}

const DEFAULTS: TurnManagerOptions = {
  maxTurns: 12,
  maxRounds: 3,
};

export class TurnManager {
  private agents: AIAgent[];
  private options: TurnManagerOptions;
  private turnNumber = 0;
  private roundIndex = 0;
  private converged = false;
  private turnOrder: string[];
  /** Agents that have successfully spoken at least once */
  private spokenAgentIds = new Set<string>();

  constructor(agents: AIAgent[], options?: Partial<TurnManagerOptions>) {
    this.agents = agents;
    this.options = { ...DEFAULTS, ...options };
    this.turnOrder = agents.map((a) => a.config.id);
  }

  get turn(): number {
    return this.turnNumber;
  }

  get round(): number {
    return Math.floor(this.turnNumber / this.agents.length);
  }

  /** Whether every agent has spoken at least once */
  get allAgentsSpoken(): boolean {
    return this.spokenAgentIds.size >= this.agents.length;
  }

  /** Record that an agent successfully contributed a message */
  markSpoken(agentId: string): void {
    this.spokenAgentIds.add(agentId);
  }

  nextAgent(): AIAgent {
    const agentId =
      this.turnOrder[this.roundIndex % this.turnOrder.length];
    return this.agents.find((a) => a.config.id === agentId)!;
  }

  advanceTurn(): void {
    this.turnNumber++;
    this.roundIndex++;

    // At the end of a round, shuffle to vary who goes first
    if (this.roundIndex % this.agents.length === 0) {
      this.reshuffleOrder();
    }
  }

  markConverged(): void {
    this.converged = true;
  }

  isComplete(): boolean {
    // Never end the debate until every council member has spoken at least once
    if (!this.allAgentsSpoken) {
      // Still respect the hard maxTurns cap to avoid infinite loops
      return this.turnNumber >= this.options.maxTurns;
    }

    return (
      this.converged ||
      this.turnNumber >= this.options.maxTurns ||
      this.round >= this.options.maxRounds
    );
  }

  private reshuffleOrder(): void {
    // Rotate: move first agent to end, so a different agent leads each round
    const first = this.turnOrder.shift();
    if (first) this.turnOrder.push(first);
  }
}
