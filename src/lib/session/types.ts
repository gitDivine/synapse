import type { ProviderType } from '@/lib/agents/types';

export interface UserIntervention {
  content: string;
  timestamp: number;
}

export interface ReplayEvent {
  event: Record<string, unknown>;
  elapsed: number;
}

export interface DebateSession {
  problem: string;
  apiKeys: Partial<Record<ProviderType, string>>;
  status: 'pending' | 'active' | 'completed' | 'error';
  createdAt: number;
  interventionQueue: UserIntervention[];
  debateTranscript?: string;
  summaryAgentId?: string;
  reactions?: Record<string, Record<string, number>>;
  replayEvents?: ReplayEvent[];
}
