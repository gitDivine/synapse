import type { AIAgent } from '@/lib/agents/types';
import type { PsychologicalTrait, PsychologicalState } from './types';
import { ALL_TRAITS } from './types';

// Traits to assign first for diversity
const INITIAL_PRIORITY: PsychologicalTrait[] = [
  'analytical',
  'skeptical',
  'curious',
  'enthusiastic',
  'synthesizer',
  'provocateur',
  'concessive',
  'devil_advocate',
];

export class PsychologicalStateEngine {
  private states = new Map<string, PsychologicalState>();

  assignInitialStates(agents: AIAgent[]): Map<string, PsychologicalState> {
    this.states.clear();

    agents.forEach((agent, i) => {
      const trait = INITIAL_PRIORITY[i % INITIAL_PRIORITY.length];
      this.states.set(agent.config.id, {
        agentId: agent.config.id,
        current: trait,
        history: [],
        turnsInCurrentState: 0,
      });
    });

    return new Map(this.states);
  }

  getState(agentId: string): PsychologicalState | undefined {
    return this.states.get(agentId);
  }

  /**
   * Transition an agent's psychological state based on debate dynamics.
   * Rules:
   * - Don't stay in one state for more than 2-3 turns
   * - If consensus is high and no devil's advocate exists, force one
   * - Respond to content signals (concession language -> concessive)
   * - Ensure diversity: don't duplicate active traits when possible
   */
  transition(
    agentId: string,
    responseContent: string,
    consensusScore: number,
    turnNumber: number,
  ): PsychologicalState {
    const state = this.states.get(agentId);
    if (!state) throw new Error(`No state for agent: ${agentId}`);

    state.turnsInCurrentState++;

    // Stay in current state if fewer than 2 turns
    if (state.turnsInCurrentState < 2) {
      return state;
    }

    let newTrait = state.current;

    // Force devil's advocate if consensus is building and nobody has it
    if (consensusScore > 0.6 && !this.anyInState('devil_advocate')) {
      newTrait = 'devil_advocate';
    }
    // Detect natural concession in content
    else if (this.detectsConcession(responseContent) && state.current !== 'concessive') {
      newTrait = 'concessive';
    }
    // Detect excitement/agreement
    else if (this.detectsExcitement(responseContent) && state.current !== 'enthusiastic') {
      newTrait = 'enthusiastic';
    }
    // Time-based rotation: pick a trait not currently active
    else if (state.turnsInCurrentState >= 3) {
      newTrait = this.pickUnusedTrait(agentId, state);
    }

    if (newTrait !== state.current) {
      state.history.push(state.current);
      state.current = newTrait;
      state.turnsInCurrentState = 0;
    }

    this.states.set(agentId, state);
    return state;
  }

  private anyInState(trait: PsychologicalTrait): boolean {
    for (const state of this.states.values()) {
      if (state.current === trait) return true;
    }
    return false;
  }

  private pickUnusedTrait(
    agentId: string,
    current: PsychologicalState,
  ): PsychologicalTrait {
    const activeTraits = new Set<PsychologicalTrait>();
    for (const [id, state] of this.states) {
      if (id !== agentId) activeTraits.add(state.current);
    }

    // Prefer traits not currently used by any agent
    const unused = ALL_TRAITS.filter(
      (t) => !activeTraits.has(t) && t !== current.current
    );

    if (unused.length > 0) {
      return unused[Math.floor(Math.random() * unused.length)];
    }

    // Fallback: pick any trait different from current
    const different = ALL_TRAITS.filter((t) => t !== current.current);
    return different[Math.floor(Math.random() * different.length)];
  }

  private detectsConcession(content: string): boolean {
    return /\b(you're right|good point|I agree|I was wrong|fair enough|I concede|you raise a valid)\b/i.test(
      content
    );
  }

  private detectsExcitement(content: string): boolean {
    return /\b(brilliant|excellent|exactly|great idea|this is key|breakthrough|love this)\b/i.test(
      content
    );
  }
}
