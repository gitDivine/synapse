import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const arxivAdapter: SourceAdapter = {
  id: 'arxiv',
  name: 'arXiv',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const maxResults = query.maxResults ?? 3;
    const params = new URLSearchParams({
      search_query: `all:${query.query}`,
      start: '0',
      max_results: String(maxResults),
      sortBy: 'relevance',
      sortOrder: 'descending',
    });

    const res = await fetch(
      `https://export.arxiv.org/api/query?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return [];

    const xml = await res.text();
    return parseArxivXml(xml);
  },
};

function parseArxivXml(xml: string): SourceResult[] {
  const results: SourceResult[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  let i = 0;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const title = extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim() ?? '';
    const summary = extractTag(entry, 'summary')?.replace(/\s+/g, ' ').trim() ?? '';
    const idUrl = extractTag(entry, 'id') ?? '';
    const published = extractTag(entry, 'published') ?? '';

    if (title) {
      results.push({
        source: 'arxiv',
        title,
        snippet: summary.slice(0, 300),
        url: idUrl,
        timestamp: published,
        relevance: 1 - i * 0.2,
      });
      i++;
    }
  }

  return results;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}
