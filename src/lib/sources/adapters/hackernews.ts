import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const hackernewsAdapter: SourceAdapter = {
  id: 'hackernews',
  name: 'Hacker News',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      query: query.query,
      tags: 'story',
      hitsPerPage: String(query.maxResults ?? 3),
    });

    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const hits = data?.hits ?? [];

    return hits.map(
      (hit: { title: string; story_text?: string; url?: string; objectID: string; points: number; created_at: string }, i: number) => ({
        source: 'hackernews' as const,
        title: hit.title,
        snippet: hit.story_text
          ? hit.story_text.replace(/<[^>]+>/g, '').slice(0, 300)
          : hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        timestamp: hit.created_at,
        relevance: 1 - i * 0.2,
      })
    );
  },
};
