export interface SourceResult {
  source: SourceId;
  title: string;
  snippet: string;
  url?: string;
  timestamp?: string;
  relevance: number;
}

export interface SourceQuery {
  query: string;
  context?: string;
  maxResults?: number;
}

export interface SourceAdapter {
  id: SourceId;
  name: string;
  search(query: SourceQuery): Promise<SourceResult[]>;
}

export type SourceId =
  | 'wikipedia'
  | 'reddit'
  | 'duckduckgo'
  | 'hackernews'
  | 'stackexchange'
  | 'arxiv'
  | 'github'
  | 'pubmed'
  | 'brave'
  | 'serper'
  | 'tavily';

export interface SearchDecision {
  shouldSearch: boolean;
  reason: string;
  suggestedSources: SourceId[];
  query: string;
}

export interface CitedSource {
  sourceId: SourceId;
  sourceName: string;
  title: string;
  url?: string;
  retrievedLive: boolean;
}
