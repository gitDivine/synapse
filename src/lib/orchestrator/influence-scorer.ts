interface MessageInfo {
  id: string;
  agentId: string;
  content: string;
  isUser?: boolean;
  isResearch?: boolean;
}

interface KeyMoment {
  agentId: string;
  excerpt: string;
  significance: string;
}

interface QuoteLink {
  sourceMessageId: string;
  targetMessageId: string;
}

interface ConsensusSnapshot {
  turn: number;
  score: number;
}

export class InfluenceScorer {
  score(
    messages: MessageInfo[],
    keyMoments: KeyMoment[],
    consensusHistory: ConsensusSnapshot[],
    quoteLinks: QuoteLink[],
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      let msgScore = 0;

      // +0.35 if message content appears in a keyMoment excerpt
      for (const km of keyMoments) {
        if (km.agentId === msg.agentId && this.contentOverlaps(msg.content, km.excerpt)) {
          msgScore += 0.35;
          break;
        }
      }

      // +0.15 per quote reference to this message (max 0.30)
      const quotedCount = quoteLinks.filter((q) => q.sourceMessageId === msg.id).length;
      msgScore += Math.min(quotedCount * 0.15, 0.30);

      // +0.20 if consensus shifted significantly after this message
      if (i < consensusHistory.length - 1) {
        const before = consensusHistory[i]?.score ?? 0;
        const after = consensusHistory[i + 1]?.score ?? 0;
        if (Math.abs(after - before) > 0.08) {
          msgScore += 0.20;
        }
      }

      // +0.10 for user intervention messages
      if (msg.isUser) {
        msgScore += 0.10;
      }

      // +0.10 if this message first introduced a live source citation
      if (msg.content.includes('retrieved live') && !this.previouslySourced(messages, i)) {
        msgScore += 0.10;
      }

      scores[msg.id] = msgScore;
    }

    // Normalize: highest score becomes 1.0
    const maxScore = Math.max(...Object.values(scores), 0.01);
    for (const id of Object.keys(scores)) {
      scores[id] = Math.round((scores[id] / maxScore) * 100) / 100;
    }

    return scores;
  }

  private contentOverlaps(content: string, excerpt: string): boolean {
    if (!excerpt || excerpt.length < 10) return false;
    // Check if significant words from the excerpt appear in the content
    const excerptWords = excerpt.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const contentLower = content.toLowerCase();
    const matchCount = excerptWords.filter((w) => contentLower.includes(w)).length;
    return matchCount >= Math.min(3, excerptWords.length * 0.5);
  }

  private previouslySourced(messages: MessageInfo[], currentIndex: number): boolean {
    for (let i = 0; i < currentIndex; i++) {
      if (messages[i].content.includes('retrieved live')) return true;
    }
    return false;
  }
}
