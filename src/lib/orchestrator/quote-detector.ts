export interface QuoteReference {
  referencedAgentId: string;
  referencedAgentName: string;
  referencedMessageId: string;
  excerpt: string;
}

interface AgentInfo {
  id: string;
  displayName: string;
}

interface MessageInfo {
  id: string;
  agentId: string;
  content: string;
}

export class QuoteDetector {
  /**
   * Detect which agents are referenced in a response by scanning for display names.
   * Returns one reference per agent (the most recent message from that agent).
   */
  detect(
    response: string,
    currentAgentId: string,
    agents: AgentInfo[],
    messageHistory: MessageInfo[],
  ): QuoteReference[] {
    const references: QuoteReference[] = [];
    const seenAgents = new Set<string>();

    for (const agent of agents) {
      if (agent.id === currentAgentId) continue;
      if (seenAgents.has(agent.id)) continue;

      // Check if agent name appears in response (with or without @)
      const namePattern = new RegExp(
        `(?:@\\s*)?${this.escapeRegex(agent.displayName)}`,
        'i',
      );

      if (!namePattern.test(response)) continue;

      seenAgents.add(agent.id);

      // Find the most recent message from this agent
      const referencedMsg = [...messageHistory]
        .reverse()
        .find((m) => m.agentId === agent.id && m.content.length > 0);

      if (!referencedMsg) continue;

      // Extract excerpt: first sentence of the referenced message, truncated
      const excerpt = this.extractExcerpt(referencedMsg.content);

      references.push({
        referencedAgentId: agent.id,
        referencedAgentName: agent.displayName,
        referencedMessageId: referencedMsg.id,
        excerpt,
      });
    }

    return references;
  }

  private extractExcerpt(content: string): string {
    // Try to get first meaningful sentence
    const cleaned = content.replace(/^[\s\n]+/, '');
    const sentenceMatch = cleaned.match(/^[^.!?\n]+[.!?]?/);
    const sentence = sentenceMatch?.[0] ?? cleaned.slice(0, 80);

    // Truncate to ~80 chars
    if (sentence.length <= 80) return sentence.trim();
    return sentence.slice(0, 77).trim() + '...';
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
