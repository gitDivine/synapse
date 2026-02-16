import type { SourceAdapter, SourceId, SourceResult, SourceQuery } from './types';
import { wikipediaAdapter } from './adapters/wikipedia';
import { redditAdapter } from './adapters/reddit';
import { duckduckgoAdapter } from './adapters/duckduckgo';
import { hackernewsAdapter } from './adapters/hackernews';
import { stackexchangeAdapter } from './adapters/stackexchange';
import { arxivAdapter } from './adapters/arxiv';
import { githubAdapter } from './adapters/github';
import { pubmedAdapter } from './adapters/pubmed';

const adapters = new Map<SourceId, SourceAdapter>();

// Register all adapters
[
  wikipediaAdapter,
  redditAdapter,
  duckduckgoAdapter,
  hackernewsAdapter,
  stackexchangeAdapter,
  arxivAdapter,
  githubAdapter,
  pubmedAdapter,
].forEach((adapter) => adapters.set(adapter.id, adapter));

export function getSourceAdapter(id: SourceId): SourceAdapter | undefined {
  return adapters.get(id);
}

export function getAllSourceIds(): SourceId[] {
  return [...adapters.keys()];
}

export function getSourceName(id: SourceId): string {
  return adapters.get(id)?.name ?? id;
}

/**
 * Search multiple sources in parallel.
 * Returns combined results sorted by relevance.
 */
export async function searchSources(
  sourceIds: SourceId[],
  query: SourceQuery,
): Promise<SourceResult[]> {
  const promises = sourceIds.map(async (id) => {
    const adapter = adapters.get(id);
    if (!adapter) return [];
    try {
      return await adapter.search(query);
    } catch {
      // Silently fail individual sources — never block the debate
      return [];
    }
  });

  const results = (await Promise.all(promises)).flat();
  return results.sort((a, b) => b.relevance - a.relevance);
}
