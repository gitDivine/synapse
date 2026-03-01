import type { AgentConfig } from './types';

export const AGENT_CONFIGS: AgentConfig[] = [
  // Groq — Llama 3.1 8B (fast inference, high free-tier rate limits ~20k TPM)
  {
    id: 'llama-groq',
    displayName: 'Llama 3',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    color: 'var(--agent-amber)',
    avatar: 'L3',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.85 },
      { id: 'code_reasoning', description: 'Code reasoning', strength: 0.8 },
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },
  // Mistral — Small (fast, multilingual, concise)
  {
    id: 'mistral-small',
    displayName: 'Mistral Small',
    provider: 'mistral',
    model: 'mistral-small-latest',
    color: 'var(--agent-purple)',
    avatar: 'MS',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.8 },
      { id: 'multilingual', description: 'Multilingual understanding', strength: 0.9 },
      { id: 'synthesis', description: 'Concise synthesis', strength: 0.8 },
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },
  // Cohere — Command A (grounded factual reasoning)
  {
    id: 'cohere-command-a',
    displayName: 'Command A',
    provider: 'cohere',
    model: 'command-a-03-2025',
    color: 'var(--agent-green)',
    avatar: 'CA',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.8 },
      { id: 'web_search', description: 'Grounded factual retrieval', strength: 0.85 },
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },
  // Google — Gemini 2.5 Flash (fast, strong reasoning, multimodal-capable)
  {
    id: 'gemini-flash',
    displayName: 'Gemini Flash',
    provider: 'google',
    model: 'gemini-2.5-flash',
    color: 'var(--agent-blue)',
    avatar: 'GF',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.9 },
      { id: 'code_reasoning', description: 'Code reasoning', strength: 0.85 },
      { id: 'data_analysis', description: 'Data analysis', strength: 0.85 },
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },
];
