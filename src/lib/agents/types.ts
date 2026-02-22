export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentStreamChunk {
  type: 'text_delta' | 'done' | 'error';
  content: string;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentCapability {
  id: string;
  description: string;
  strength: number; // 0.0 - 1.0
}

export interface AgentConfig {
  id: string;
  displayName: string;
  provider: ProviderType;
  model: string;
  color: string;
  avatar: string;
  capabilities: AgentCapability[];
  maxTokens: number;
  temperature: number;
}

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'openrouter'
  | 'cohere'
  | 'together'
  | 'huggingface'
  | 'deepseek'
  | 'mistral';

export interface AIAgent {
  readonly config: AgentConfig;

  complete(messages: AgentMessage[]): Promise<{
    content: string;
    usage: TokenUsage;
  }>;

  stream(messages: AgentMessage[]): AsyncIterable<AgentStreamChunk>;

  validateApiKey(): Promise<boolean>;
}

export type AgentFactory = (config: AgentConfig, apiKey: string) => AIAgent;
