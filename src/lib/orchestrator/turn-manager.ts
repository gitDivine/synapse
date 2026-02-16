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
