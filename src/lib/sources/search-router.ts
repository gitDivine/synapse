import type { SourceId, SearchDecision, SourceResult } from './types';
import { searchSources } from './registry';

/**
 * Determines when and what to search based on debate context.
 * Rules: search when a claim is contestable, recency matters,
 * or community/expert opinion would materially change the answer.
 */
export class SearchRouter {
  private searchCount = 0;
  private readonly maxSearchesPerDebate = 8;

  /**
   * Analyze the latest turn and decide whether external search is needed.
   */
  decide(
    content: string,
    problem: string,
    turnNumber: number,
  ): SearchDecision {
    // Don't search on every turn — budget searches
    if (this.searchCount >= this.maxSearchesPerDebate) {
      return { shouldSearch: false, reason: 'Search budget exhausted', suggestedSources: [], query: '' };
    }

    // Don't search on the very first turn — let agents use their training first
    if (turnNumber === 0) {
      return { shouldSearch: false, reason: 'First turn — use training knowledge', suggestedSources: [], query: '' };
    }

    // Only search every 2nd or 3rd turn to avoid being slow
    if (turnNumber % 2 !== 0 && turnNumber < 4) {
      return { shouldSearch: false, reason: 'Skipping search this turn', suggestedSources: [], query: '' };
    }

    const lowerContent = content.toLowerCase();
    const lowerProblem = problem.toLowerCase();
    const combined = `${lowerContent} ${lowerProblem}`;

    // Detect when search would be valuable
    const signals = this.detectSearchSignals(combined);
    if (signals.sources.length === 0) {
      return { shouldSearch: false, reason: 'No search signals detected', suggestedSources: [], query: '' };
    }

    // Extract the best search query from the content
    const query = this.extractSearchQuery(content, problem);

    return {
      shouldSearch: true,
      reason: signals.reason,
      suggestedSources: signals.sources,
      query,
    };
  }

  /**
   * Execute a search and return formatted results.
   */
  async search(decision: SearchDecision): Promise<SourceResult[]> {
    if (!decision.shouldSearch) return [];

    this.searchCount++;
    return searchSources(decision.suggestedSources, {
      query: decision.query,
      maxResults: 2,
    });
  }

  /**
   * Format search results into context that can be injected into agent prompts.
   */
  formatForContext(results: SourceResult[]): string {
    if (results.length === 0) return '';

    const lines = results.map((r) => {
      const urlPart = r.url ? ` (${r.url})` : '';
      return `[${r.source.toUpperCase()} — retrieved live] ${r.title}${urlPart}\n  ${r.snippet}`;
    });

    return `\n--- LIVE RESEARCH RESULTS ---\n${lines.join('\n\n')}\n--- END RESEARCH ---\n`;
  }

  /**
   * Check which API-key-gated sources are available at runtime.
   * Sources without keys silently return [] but we can be smarter
   * by routing to sources we know are configured.
   */
  private getAvailableWebSearch(): SourceId {
    if (process.env.BRAVE_SEARCH_API_KEY) return 'brave';
    if (process.env.SERPER_API_KEY) return 'serper';
    if (process.env.TAVILY_API_KEY) return 'tavily';
    return 'duckduckgo'; // fallback — instant answers only
  }

  private detectSearchSignals(content: string): { sources: SourceId[]; reason: string } {
    const sources: SourceId[] = [];
    const reasons: string[] = [];
    const webSearch = this.getAvailableWebSearch();

    // Contestable claims — things that need verification
    if (/\b(studies show|research suggests|according to|data indicates|evidence suggests|experts say)\b/.test(content)) {
      sources.push(webSearch, 'wikipedia', 'pubmed');
      reasons.push('Contestable claim detected — needs verification');
    }

    // Recency signals — needs current information
    if (/\b(latest|recent|current|2024|2025|2026|trending|new|updated|nowadays)\b/.test(content)) {
      sources.push(webSearch, 'reddit', 'hackernews');
      reasons.push('Recency signal — needs current data');
    }

    // Technical/code topics
    if (/\b(code|programming|library|framework|api|algorithm|implementation|software|developer)\b/.test(content)) {
      sources.push('stackexchange', 'github', webSearch);
      reasons.push('Technical topic — needs code/implementation context');
    }

    // Science/medical topics
    if (/\b(clinical|medical|health|disease|treatment|diagnosis|biology|chemistry|physics|research paper)\b/.test(content)) {
      sources.push('pubmed', 'arxiv');
      reasons.push('Scientific topic — needs academic sources');
    }

    // Community opinion needed
    if (/\b(people think|community|opinion|experience|real.world|anecdot|review|recommend)\b/.test(content)) {
      sources.push('reddit', 'hackernews', webSearch);
      reasons.push('Community perspective needed');
    }

    // General knowledge gap
    if (/\b(what is|who is|how does|definition|explain|history of)\b/.test(content)) {
      sources.push(webSearch, 'wikipedia');
      reasons.push('Knowledge gap — needs factual grounding');
    }

    // Product / app / brand lookup (trending topics, niche products)
    if (/\b(app|product|brand|company|startup|platform|service|tool|website|mobile)\b/.test(content)) {
      sources.push(webSearch, 'reddit');
      reasons.push('Product/brand lookup — needs web search');
    }

    // Deduplicate sources
    const uniqueSources = [...new Set(sources)];

    return {
      sources: uniqueSources.slice(0, 3), // Max 3 sources per search
      reason: reasons[0] ?? 'General search triggered',
    };
  }

  private extractSearchQuery(content: string, problem: string): string {
    // Use the last substantive sentence from the content as the query
    // Fall back to the problem statement
    const sentences = content
      .replace(/\n/g, ' ')
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 200);

    if (sentences.length > 0) {
      // Pick the most information-dense sentence (longest, usually)
      const best = sentences.reduce((a, b) => (a.length > b.length ? a : b));
      // Trim to a reasonable search query length
      return best.slice(0, 120);
    }

    return problem.slice(0, 120);
  }
}
