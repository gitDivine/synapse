export type SSEEventType =
  | 'debate:start'
  | 'agent:thinking'
  | 'agent:chunk'
  | 'agent:done'
  | 'agent:unavailable'
  | 'psych:state_change'
  | 'consensus:update'
  | 'research:results'
  | 'round:complete'
  | 'user:intervention'
  | 'momentum:update'
  | 'quote:linked'
  | 'turn:pause'
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

export interface RoundCompleteData {
  roundNumber: number;
  consensusScore: number;
  consensusHistory: Array<{ turn: number; score: number }>;
  influence: Record<string, number>;
  quoteLinks: Array<{
    sourceMessageId: string;
    targetMessageId: string;
    agentName: string;
    excerpt: string;
  }>;
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
