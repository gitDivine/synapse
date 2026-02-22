import type { ProviderType } from '@/lib/agents/types';

export interface UserIntervention {
  content: string;
  timestamp: number;
}

export interface ReplayEvent {
  event: Record<string, unknown>;
  elapsed: number;
}

export interface TranscriptEntry {
  agentId: string;
  displayName: string;
  content: string;
  psychState: string;
}

export interface DebateSession {
  problem: string;
  apiKeys: Partial<Record<ProviderType, string>>;
  status: 'pending' | 'active' | 'completed' | 'idle' | 'error';
  createdAt: number;
  interventionQueue: UserIntervention[];
  paused?: boolean;
  debateTranscript?: string;
  summaryAgentId?: string;
  roundNumber?: number;
  reactions?: Record<string, Record<string, number>>;
  replayEvents?: ReplayEvent[];
}
