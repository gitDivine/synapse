import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const wikipediaAdapter: SourceAdapter = {
  id: 'wikipedia',
  name: 'Wikipedia',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query.query,
      srlimit: String(query.maxResults ?? 3),
      format: 'json',
      origin: '*',
    });

    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const results = data?.query?.search ?? [];

    return results.map((item: { title: string; snippet: string; pageid: number }, i: number) => ({
      source: 'wikipedia' as const,
      title: item.title,
      snippet: item.snippet.replace(/<[^>]+>/g, ''),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      relevance: 1 - i * 0.2,
    }));
  },
};
