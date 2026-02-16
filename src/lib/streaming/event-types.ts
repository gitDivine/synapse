export type SSEEventType =
  | 'debate:start'
  | 'agent:thinking'
  | 'agent:chunk'
  | 'agent:done'
  | 'psych:state_change'
  | 'consensus:update'
  | 'research:results'
  | 'debate:summary'
  | 'debate:end'
  | 'user:intervention'
  | 'followup:chunk'
  | 'followup:done'
  | 'momentum:update'
  | 'quote:linked'
  | 'heartbeat'
  | 'error';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  data: T;
  timestamp: number;
}

// Typed event data payloads
export interface DebateStartData {
  agents: Array<{
    id: string;
    displayName: string;
    color: string;
    avatar: string;
  }>;
}

export interface AgentThinkingData {
  agentId: string;
  messageId: string;
  psychState: string;
}

export interface AgentChunkData {
  agentId: string;
  messageId: string;
  content: string;
}

export interface AgentDoneData {
  agentId: string;
  messageId: string;
}

export interface ConsensusUpdateData {
  score: number;
}

export interface DebateSummaryData {
  answer: string;
  confidence: number;
  keyMoments: Array<{
    agentId: string;
    excerpt: string;
    significance: string;
  }>;
  dissent: Array<{
    agentId: string;
    position: string;
  }>;
  openQuestions: string[];
}

export interface MomentumUpdateData {
  momentum: number;
  direction: 'heating' | 'steady' | 'cooling';
}

export interface QuoteLinkData {
  sourceMessageId: string;
  targetMessageId: string;
  agentName: string;
  excerpt: string;
}

export interface ErrorData {
  message: string;
}
