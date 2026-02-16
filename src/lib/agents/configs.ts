import type { AgentConfig } from './types';

export const AGENT_CONFIGS: AgentConfig[] = [
  // Google Gemini — multimodal anchor
  {
    id: 'gemini-flash',
    displayName: 'Gemini Flash',
    provider: 'google',
    model: 'gemini-2.0-flash',
    color: 'var(--agent-blue)',
    avatar: 'GF',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.85 },
      { id: 'image_analysis', description: 'Image and document analysis', strength: 0.9 },
      { id: 'code_reasoning', description: 'Code reasoning', strength: 0.8 },
    ],
    maxTokens: 2048,
    temperature: 0.7,
  },
  // Groq — Llama 3 (speed + energy)
  {
    id: 'llama-groq',
    displayName: 'Llama 3',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    color: 'var(--agent-amber)',
    avatar: 'L3',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.85 },
      { id: 'code_reasoning', description: 'Code reasoning', strength: 0.8 },
    ],
    maxTokens: 2048,
    temperature: 0.7,
  },
  // Anthropic — Claude Haiku (synthesis + structure)
  {
    id: 'claude-haiku',
    displayName: 'Claude Haiku',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    color: 'var(--agent-purple)',
    avatar: 'CH',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.9 },
      { id: 'code_reasoning', description: 'Code reasoning', strength: 0.85 },
      { id: 'synthesis', description: 'Synthesis and structure', strength: 0.95 },
    ],
    maxTokens: 2048,
    temperature: 0.7,
  },
  // Cohere — Command R (grounded factual reasoning)
  {
    id: 'cohere-command-r',
    displayName: 'Command R',
    provider: 'cohere',
    model: 'command-r',
    color: 'var(--agent-green)',
    avatar: 'CR',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.8 },
      { id: 'web_search', description: 'Grounded factual retrieval', strength: 0.85 },
    ],
    maxTokens: 2048,
    temperature: 0.7,
  },
  // Together AI — Qwen 2.5 (technical + multilingual)
  {
    id: 'together-qwen',
    displayName: 'Qwen 2.5',
    provider: 'together',
    model: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    color: 'var(--agent-cyan)',
    avatar: 'QW',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.85 },
      { id: 'code_reasoning', description: 'Code reasoning', strength: 0.85 },
      { id: 'multilingual', description: 'Multilingual reasoning', strength: 0.9 },
    ],
    maxTokens: 2048,
    temperature: 0.7,
  },
  // Hugging Face — Phi-3.5 (lightweight, punches above weight)
  {
    id: 'hf-phi',
    displayName: 'Phi-3.5',
    provider: 'huggingface',
    model: 'microsoft/Phi-3.5-mini-instruct',
    color: 'var(--agent-red)',
    avatar: 'PH',
    capabilities: [
      { id: 'general_reasoning', description: 'General reasoning', strength: 0.75 },
      { id: 'code_reasoning', description: 'Code reasoning', strength: 0.7 },
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },
];
