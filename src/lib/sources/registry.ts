import type { SourceAdapter, SourceId, SourceResult, SourceQuery } from './types';
import { wikipediaAdapter } from './adapters/wikipedia';
import { redditAdapter } from './adapters/reddit';
import { duckduckgoAdapter } from './adapters/duckduckgo';
import { hackernewsAdapter } from './adapters/hackernews';
import { stackexchangeAdapter } from './adapters/stackexchange';
import { arxivAdapter } from './adapters/arxiv';
import { githubAdapter } from './adapters/github';
import { pubmedAdapter } from './adapters/pubmed';
import { braveAdapter } from './adapters/brave';
import { serperAdapter } from './adapters/serper';
import { tavilyAdapter } from './adapters/tavily';

const adapters = new Map<SourceId, SourceAdapter>();

// Register all adapters (API-key-gated ones return [] if key is missing)
[
  wikipediaAdapter,
  redditAdapter,
  duckduckgoAdapter,
  hackernewsAdapter,
  stackexchangeAdapter,
  arxivAdapter,
  githubAdapter,
  pubmedAdapter,
  braveAdapter,
  serperAdapter,
  tavilyAdapter,
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

const SEARCH_TIMEOUT_MS = 5_000;

/**
 * Search multiple sources in parallel with a hard timeout.
 * Returns combined results sorted by relevance.
 * Never blocks the debate longer than SEARCH_TIMEOUT_MS.
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

  // Race all sources against a hard timeout — return whatever results arrived in time
  const results = await Promise.race([
    Promise.all(promises).then((r) => r.flat()),
    new Promise<SourceResult[]>((resolve) =>
      setTimeout(() => resolve([]), SEARCH_TIMEOUT_MS)
    ),
  ]);
  return results.sort((a, b) => b.relevance - a.relevance);
}
