import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

/**
 * Brave Search API adapter.
 * Free tier: 2,000 queries/month — real web search results.
 * Sign up at https://brave.com/search/api/
 */
export const braveAdapter: SourceAdapter = {
  id: 'brave',
  name: 'Brave Search',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({
      q: query.query,
      count: String(query.maxResults ?? 3),
      text_decorations: 'false',
      search_lang: 'en',
    });

    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) return [];

    const data = await res.json();
    const webResults = data.web?.results ?? [];
    const results: SourceResult[] = [];

    for (let i = 0; i < Math.min(webResults.length, query.maxResults ?? 3); i++) {
      const item = webResults[i];
      results.push({
        source: 'brave',
        title: item.title ?? query.query,
        snippet: item.description ?? item.title ?? '',
        url: item.url,
        timestamp: item.age,
        relevance: 1.0 - i * 0.15,
      });
    }

    // Also grab news results if available (great for trending topics)
    const newsResults = data.news?.results ?? [];
    for (let i = 0; i < Math.min(newsResults.length, 2); i++) {
      const item = newsResults[i];
      results.push({
        source: 'brave',
        title: `[News] ${item.title ?? query.query}`,
        snippet: item.description ?? '',
        url: item.url,
        timestamp: item.age,
        relevance: 0.9 - i * 0.1,
      });
    }

    return results.slice(0, query.maxResults ?? 3);
  },
};
