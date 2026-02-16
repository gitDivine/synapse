import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const githubAdapter: SourceAdapter = {
  id: 'github',
  name: 'GitHub',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      q: query.query,
      sort: 'stars',
      order: 'desc',
      per_page: String(query.maxResults ?? 3),
    });

    const res = await fetch(
      `https://api.github.com/search/repositories?${params}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SYNAPSE/1.0',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.items ?? [];

    return items.map(
      (repo: { full_name: string; description: string | null; html_url: string; stargazers_count: number; language: string | null }, i: number) => ({
        source: 'github' as const,
        title: repo.full_name,
        snippet: `${repo.description ?? 'No description'} — ${repo.stargazers_count} stars${repo.language ? `, ${repo.language}` : ''}`,
        url: repo.html_url,
        relevance: 1 - i * 0.2,
      })
    );
  },
};
