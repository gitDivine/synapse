import type { SourceAdapter, SourceQuery, SourceResult } from '../types';

export const pubmedAdapter: SourceAdapter = {
  id: 'pubmed',
  name: 'PubMed',

  async search(query: SourceQuery): Promise<SourceResult[]> {
    const maxResults = query.maxResults ?? 3;

    // Step 1: Search for IDs
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: query.query,
      retmax: String(maxResults),
      retmode: 'json',
      sort: 'relevance',
    });

    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist ?? [];

    if (ids.length === 0) return [];

    // Step 2: Fetch summaries for those IDs
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    });

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!summaryRes.ok) return [];

    const summaryData = await summaryRes.json();
    const results: SourceResult[] = [];

    for (let i = 0; i < ids.length; i++) {
      const article = summaryData?.result?.[ids[i]];
      if (article?.title) {
        results.push({
          source: 'pubmed',
          title: article.title,
          snippet: `${article.source ?? ''} (${article.pubdate ?? 'unknown date'})${article.authors?.[0]?.name ? ` — ${article.authors[0].name} et al.` : ''}`,
          url: `https://pubmed.ncbi.nlm.nih.gov/${ids[i]}/`,
          timestamp: article.pubdate,
          relevance: 1 - i * 0.2,
        });
      }
    }

    return results;
  },
};
