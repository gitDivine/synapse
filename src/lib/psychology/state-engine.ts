import type { AIAgent } from '@/lib/agents/types';
import type { PsychologicalTrait, PsychologicalState } from './types';
import { ALL_TRAITS } from './types';

// Traits to assign first for diversity
const INITIAL_PRIORITY: PsychologicalTrait[] = [
  'analytical',
  'curious',
  'skeptical',
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
   * Transition an agent's psychological state based on conversation dynamics.
   * Agents shift states after every turn based on content analysis,
   * consensus levels, and diversity — keeping conversations dynamic.
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

    // After an agent's first turn, always evaluate for transition
    // (agents should shift based on how the conversation evolves)
    if (state.turnsInCurrentState < 1) {
      return state;
    }

    let newTrait = state.current;

    // Force devil's advocate if consensus is building and nobody has it
    if (consensusScore > 0.6 && !this.anyInState('devil_advocate')) {
      newTrait = 'devil_advocate';
    }
    // Content-based transitions: detect the agent's natural reaction patterns
    else {
      const detected = this.detectTrait(responseContent, state.current);
      if (detected) {
        newTrait = detected;
      }
      // After 2+ turns in same state, rotate for diversity
      else if (state.turnsInCurrentState >= 2) {
        newTrait = this.pickUnusedTrait(agentId, state);
      }
    }

    if (newTrait !== state.current) {
      state.history.push(state.current);
      state.current = newTrait;
      state.turnsInCurrentState = 0;
    }

    this.states.set(agentId, state);
    return state;
  }

  /**
   * Analyze response content to detect which psychological trait
   * the agent is naturally exhibiting, based on language patterns.
   */
  private detectTrait(content: string, currentTrait: PsychologicalTrait): PsychologicalTrait | null {
    const lower = content.toLowerCase();

    // Check each trait pattern — return the first strong match that differs from current
    if (currentTrait !== 'concessive' && this.detectsConcession(lower)) return 'concessive';
    if (currentTrait !== 'skeptical' && this.detectsSkepticism(lower)) return 'skeptical';
    if (currentTrait !== 'curious' && this.detectsCuriosity(lower)) return 'curious';
    if (currentTrait !== 'enthusiastic' && this.detectsExcitement(lower)) return 'enthusiastic';
    if (currentTrait !== 'synthesizer' && this.detectsSynthesis(lower)) return 'synthesizer';
    if (currentTrait !== 'analytical' && this.detectsAnalysis(lower)) return 'analytical';
    if (currentTrait !== 'provocateur' && this.detectsProvocation(lower)) return 'provocateur';
    if (currentTrait !== 'devil_advocate' && this.detectsDevilAdvocate(lower)) return 'devil_advocate';

    return null;
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

    // Prefer traits not currently used by any agent and not in recent history
    const recentHistory = new Set(current.history.slice(-3));
    const fresh = ALL_TRAITS.filter(
      (t) => !activeTraits.has(t) && t !== current.current && !recentHistory.has(t)
    );

    if (fresh.length > 0) {
      return fresh[Math.floor(Math.random() * fresh.length)];
    }

    // Fallback: prefer unused by others
    const unused = ALL_TRAITS.filter(
      (t) => !activeTraits.has(t) && t !== current.current
    );

    if (unused.length > 0) {
      return unused[Math.floor(Math.random() * unused.length)];
    }

    // Last resort: any different trait
    const different = ALL_TRAITS.filter((t) => t !== current.current);
    return different[Math.floor(Math.random() * different.length)];
  }

  private detectsConcession(content: string): boolean {
    return /\b(you're right|good point|i agree|i was wrong|fair enough|i concede|you raise a valid|that's true|can't argue with|i stand corrected|valid point|i'll give you that)\b/.test(content);
  }

  private detectsSkepticism(content: string): boolean {
    return /\b(i disagree|not convinced|where's the (proof|evidence)|how do we know|that's a stretch|i'm not sure|hold on|wait a minute|that doesn't add up|questionable|citation needed|unsubstantiated)\b/.test(content);
  }

  private detectsCuriosity(content: string): boolean {
    return /\b(what if|i wonder|interesting|what about|have we considered|what happens when|curious|that raises the question|fascinating|let me ask|how would that work)\b/.test(content);
  }

  private detectsExcitement(content: string): boolean {
    return /\b(brilliant|excellent|exactly|great idea|this is key|breakthrough|love this|yes!|amazing|absolutely|that's it|bingo|nailed it|perfect|incredible)\b/.test(content);
  }

  private detectsSynthesis(content: string): boolean {
    return /\b(both of you|combining|if we merge|the common thread|actually saying the same|bringing together|the real (disagreement|issue)|underlying|connect|unify|framework|pattern here)\b/.test(content);
  }

  private detectsAnalysis(content: string): boolean {
    return /\b(let me break|step by step|first,? second|the data (shows|suggests)|statistically|empirically|technically|specifically|the key (variable|factor)|assumption|hypothesis|evidence suggests)\b/.test(content);
  }

  private detectsProvocation(content: string): boolean {
    return /\b(flip this|what if the opposite|controversial|unpopular opinion|hear me out|nobody's (talking|mentioning)|elephant in the room|completely different angle|plot twist|hot take)\b/.test(content);
  }

  private detectsDevilAdvocate(content: string): boolean {
    return /\b(playing devil|for the sake of argument|counterpoint|but what about the risk|the other side|we're ignoring|groupthink|blind spot|worst case|downside)\b/.test(content);
  }
}
