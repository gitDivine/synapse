import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const redditAdapter: SourceAdapter = {
  id: 'reddit',
  name: 'Reddit',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      q: query.query,
      sort: 'relevance',
      limit: String(query.maxResults ?? 3),
      type: 'link',
    });

    const res = await fetch(
      `https://www.reddit.com/search.json?${params}`,
      {
        headers: { 'User-Agent': 'SYNAPSE/1.0 (debate-platform)' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const posts = data?.data?.children ?? [];

    return posts.map(
      (child: { data: { title: string; selftext: string; permalink: string; subreddit: string; score: number } }, i: number) => {
        const post = child.data;
        return {
          source: 'reddit' as const,
          title: `r/${post.subreddit}: ${post.title}`,
          snippet: post.selftext
            ? post.selftext.slice(0, 300)
            : post.title,
          url: `https://reddit.com${post.permalink}`,
          relevance: 1 - i * 0.2,
        };
      }
    );
  },
};
