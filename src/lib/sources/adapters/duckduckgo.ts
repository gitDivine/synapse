import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const duckduckgoAdapter: SourceAdapter = {
  id: 'duckduckgo',
  name: 'DuckDuckGo',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      q: query.query,
      format: 'json',
      no_redirect: '1',
      no_html: '1',
    });

    const res = await fetch(
      `https://api.duckduckgo.com/?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const results: SourceResult[] = [];

    // Instant answer (abstract)
    if (data.Abstract) {
      results.push({
        source: 'duckduckgo',
        title: data.Heading || query.query,
        snippet: data.Abstract,
        url: data.AbstractURL || undefined,
        relevance: 1.0,
      });
    }

    // Related topics
    const topics = (data.RelatedTopics ?? []).slice(0, (query.maxResults ?? 3) - results.length);
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      if (topic.Text) {
        results.push({
          source: 'duckduckgo',
          title: topic.Text.split(' - ')[0] ?? query.query,
          snippet: topic.Text,
          url: topic.FirstURL || undefined,
          relevance: 0.8 - i * 0.15,
        });
      }
    }

    return results;
  },
};
