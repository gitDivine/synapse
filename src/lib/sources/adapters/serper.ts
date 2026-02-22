import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

/**
 * Serper.dev adapter — Google search results.
 * Free tier: 2,500 queries on signup.
 * Sign up at https://serper.dev/
 */
export const serperAdapter: SourceAdapter = {
  id: 'serper',
  name: 'Google (via Serper)',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return [];

    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query.query,
        num: query.maxResults ?? 3,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: SourceResult[] = [];

    // Knowledge graph (instant answer)
    if (data.knowledgeGraph) {
      const kg = data.knowledgeGraph;
      results.push({
        source: 'serper',
        title: kg.title ?? query.query,
        snippet: kg.description ?? '',
        url: kg.descriptionLink ?? kg.website,
        relevance: 1.0,
      });
    }

    // Organic results
    const organic = data.organic ?? [];
    for (let i = 0; i < Math.min(organic.length, query.maxResults ?? 3); i++) {
      const item = organic[i];
      results.push({
        source: 'serper',
        title: item.title ?? query.query,
        snippet: item.snippet ?? '',
        url: item.link,
        timestamp: item.date,
        relevance: 0.95 - i * 0.1,
      });
    }

    return results.slice(0, query.maxResults ?? 3);
  },
};
