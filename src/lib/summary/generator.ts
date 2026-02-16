import type { AIAgent, AgentMessage } from '@/lib/agents/types';
import type { ContextLog } from '@/lib/memory/context-log';
import type { SourceResult } from '@/lib/sources/types';
import { getSourceName } from '@/lib/sources/registry';

export interface StructuredSummary {
  verdict: string;
  confidence: string;
  keyMoments: Array<{ agentId: string; excerpt: string; significance: string }>;
  dissent: Array<{ agentId: string; position: string }>;
  openQuestions: string[];
  sources: Array<{ name: string; title: string; url?: string }>;
  userContributions: string[];
}

export class SummaryGenerator {
  pickAgent(agents: AIAgent[]): AIAgent {
    const withSynthesis = agents.find((a) =>
      a.config.capabilities.some((c) => c.id === 'synthesis')
    );
    if (withSynthesis) return withSynthesis;

    return agents.reduce((best, current) => {
      const bestStrength = best.config.capabilities.reduce(
        (s, c) => s + c.strength,
        0
      );
      const currentStrength = current.config.capabilities.reduce(
        (s, c) => s + c.strength,
        0
      );
      return currentStrength > bestStrength ? current : best;
    });
  }

  async generate(
    agent: AIAgent,
    problem: string,
    memory: ContextLog,
    consensusScore: number,
    researchResults: SourceResult[],
  ): Promise<StructuredSummary> {
    const messages = this.buildPrompt(problem, memory, consensusScore, researchResults);

    let raw = '';
    try {
      const result = await agent.complete(messages);
      raw = result.content;
    } catch {
      return this.fallback(memory, consensusScore, researchResults);
    }

    return this.parse(raw, consensusScore, memory, researchResults);
  }

  private buildPrompt(
    problem: string,
    memory: ContextLog,
    consensusScore: number,
    researchResults: SourceResult[],
  ): AgentMessage[] {
    const agentIds = [...new Set(memory.getAllTurns().filter(t => t.agentId !== 'user').map((t) => t.agentId))];
    const userTurns = memory.getAllTurns().filter(t => t.agentId === 'user');

    const confidenceLabel = consensusScore >= 0.85
      ? 'the council reached strong consensus on this'
      : consensusScore >= 0.6
        ? 'the council agrees on this direction but notes meaningful uncertainty remains'
        : 'the council explored multiple perspectives without reaching full agreement';

    const sourceSummary = researchResults.length > 0
      ? `\n\nLIVE SOURCES REFERENCED DURING DEBATE:\n${researchResults.map(r => `- ${getSourceName(r.source)}: ${r.title}${r.url ? ` (${r.url})` : ''}`).join('\n')}`
      : '';

    const userContributions = userTurns.length > 0
      ? `\n\nUSER CONTRIBUTIONS DURING DEBATE:\n${userTurns.map(t => `- ${t.content}`).join('\n')}`
      : '';

    return [
      {
        role: 'system',
        content: `You are Synapse — the moderator and final voice of the SYNAPSE debate platform. You watched the entire debate from above. You have no position — you are the impartial judge.

Your job is to deliver the FINAL VERDICT to the user. This is not a dry summary — it's a cohesive, human-readable conclusion from a trusted advisor who consulted their entire team.

Output valid JSON with this structure:
{
  "verdict": "A narrative verdict (3-6 sentences). Open by acknowledging the user's problem and the journey of the debate. Reference specific agents by name and what they contributed. Then deliver the clear answer/solution. Be direct and actionable. Speak as Synapse addressing the user personally.",
  "confidence": "${confidenceLabel}",
  "keyMoments": [
    { "agentId": "agent-id", "excerpt": "What they said or argued", "significance": "Why it mattered to the outcome" }
  ],
  "dissent": [
    { "agentId": "agent-id", "position": "What they still disagreed about" }
  ],
  "openQuestions": ["Unresolved questions"],
  "userContributions": ["How the user's input shaped the discussion"],
  "sources": [
    { "name": "Source name", "title": "What was referenced", "url": "link if available" }
  ]
}

Participating agents: ${agentIds.join(', ')}.
Only output the JSON, no other text.`,
      },
      {
        role: 'user',
        content: `PROBLEM: ${problem}\n\nDEBATE TRANSCRIPT:\n${memory.getTranscript()}${sourceSummary}${userContributions}\n\nDeliver Synapse's verdict.`,
      },
    ];
  }

  private parse(
    raw: string,
    fallbackConfidence: number,
    memory: ContextLog,
    researchResults: SourceResult[],
  ): StructuredSummary {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          verdict: parsed.verdict ?? parsed.answer ?? raw.slice(0, 500),
          confidence: typeof parsed.confidence === 'string'
            ? parsed.confidence
            : fallbackConfidence >= 0.85
              ? 'The council reached strong consensus on this'
              : 'The council explored multiple perspectives',
          keyMoments: Array.isArray(parsed.keyMoments)
            ? parsed.keyMoments.map((m: Record<string, string>) => ({
                agentId: m.agentId ?? 'unknown',
                excerpt: m.excerpt ?? '',
                significance: m.significance ?? '',
              }))
            : [],
          dissent: Array.isArray(parsed.dissent)
            ? parsed.dissent.map((d: Record<string, string>) => ({
                agentId: d.agentId ?? 'unknown',
                position: d.position ?? '',
              }))
            : [],
          openQuestions: Array.isArray(parsed.openQuestions)
            ? parsed.openQuestions
            : [],
          userContributions: Array.isArray(parsed.userContributions)
            ? parsed.userContributions
            : [],
          sources: Array.isArray(parsed.sources)
            ? parsed.sources
            : this.buildSourceList(researchResults),
        };
      }
    } catch {
      // Fall through to fallback
    }

    return this.fallback(memory, fallbackConfidence, researchResults);
  }

  private fallback(
    memory: ContextLog,
    confidence: number,
    researchResults: SourceResult[],
  ): StructuredSummary {
    return {
      verdict: `The council debated this problem across ${memory.length} turns. Synapse observed the full discussion and notes that ${confidence >= 0.85 ? 'strong consensus was reached' : 'multiple perspectives were explored without full agreement'}.`,
      confidence: confidence >= 0.85
        ? 'The council reached strong consensus on this'
        : confidence >= 0.6
          ? 'The council agrees on this direction but notes meaningful uncertainty remains'
          : 'The council explored multiple perspectives without reaching full agreement',
      keyMoments: [],
      dissent: [],
      openQuestions: [],
      userContributions: [],
      sources: this.buildSourceList(researchResults),
    };
  }

  private buildSourceList(results: SourceResult[]): Array<{ name: string; title: string; url?: string }> {
    const seen = new Set<string>();
    return results
      .filter((r) => {
        const key = `${r.source}:${r.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((r) => ({
        name: getSourceName(r.source),
        title: r.title,
        url: r.url,
      }));
  }
}
