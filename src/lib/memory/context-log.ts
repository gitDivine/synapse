export interface DebateTurn {
  agentId: string;
  displayName: string;
  content: string;
  turnNumber: number;
  psychState: string;
}

export class ContextLog {
  private turns: DebateTurn[] = [];

  addTurn(agentId: string, content: string, psychState: string, displayName?: string): void {
    this.turns.push({
      agentId,
      displayName: displayName ?? agentId,
      content,
      turnNumber: this.turns.length,
      psychState,
    });
  }

  getAllTurns(): DebateTurn[] {
    return [...this.turns];
  }

  /**
   * Get recent turns formatted with display names for natural inter-agent conversation.
   * Agents see each other by name so they can directly address and reply to specific participants.
   */
  getDebateHistory(
    excludeAgentId?: string,
    maxTurns = 8,
  ): string {
    const relevant = this.turns
      .slice(-maxTurns)
      .map((t) => {
        const label = t.agentId === excludeAgentId
          ? `${t.displayName} (you)`
          : t.displayName;
        const roleTag = t.agentId === 'user' ? '👤 User' : label;
        return `[${roleTag} — ${t.psychState}]:\n${t.content}`;
      });

    return relevant.join('\n\n');
  }

  /**
   * Get the full debate transcript for summary generation.
   */
  getTranscript(): string {
    return this.turns
      .map((t) => {
        const label = t.agentId === 'user' ? 'User' : t.displayName;
        return `[Turn ${t.turnNumber + 1} — ${label} (${t.psychState})]:\n${t.content}`;
      })
      .join('\n\n---\n\n');
  }

  get length(): number {
    return this.turns.length;
  }
}
