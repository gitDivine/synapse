import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

/**
 * Tavily Search API adapter — AI-optimized search.
 * Free tier: 1,000 queries/month.
 * Sign up at https://tavily.com/
 */
export const tavilyAdapter: SourceAdapter = {
  id: 'tavily',
  name: 'Tavily',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.query,
        max_results: query.maxResults ?? 3,
        search_depth: 'basic',
        include_answer: true,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: SourceResult[] = [];

    // Tavily's AI-generated answer (great for factual queries)
    if (data.answer) {
      results.push({
        source: 'tavily',
        title: `AI Answer: ${query.query}`,
        snippet: data.answer,
        relevance: 1.0,
      });
    }

    // Web results
    const webResults = data.results ?? [];
    for (let i = 0; i < Math.min(webResults.length, query.maxResults ?? 3); i++) {
      const item = webResults[i];
      results.push({
        source: 'tavily',
        title: item.title ?? query.query,
        snippet: item.content ?? '',
        url: item.url,
        relevance: item.score ?? (0.9 - i * 0.1),
      });
    }

    return results.slice(0, query.maxResults ?? 3);
  },
};
