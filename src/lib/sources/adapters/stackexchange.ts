import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const stackexchangeAdapter: SourceAdapter = {
  id: 'stackexchange',
  name: 'Stack Overflow',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      order: 'desc',
      sort: 'relevance',
      intitle: query.query,
      site: 'stackoverflow',
      pagesize: String(query.maxResults ?? 3),
      filter: 'default',
    });

    const res = await fetch(
      `https://api.stackexchange.com/2.3/search?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.items ?? [];

    return items.map(
      (item: { title: string; link: string; score: number; answer_count: number; is_answered: boolean }, i: number) => ({
        source: 'stackexchange' as const,
        title: item.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        snippet: `${item.is_answered ? 'Answered' : 'Unanswered'} — ${item.answer_count} answers, score: ${item.score}`,
        url: item.link,
        relevance: 1 - i * 0.2,
      })
    );
  },
};
