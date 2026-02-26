import type { ProviderType } from '@/lib/agents/types';

const ENV_KEYS: Record<ProviderType, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_AI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  cohere: 'COHERE_API_KEY',
  together: 'TOGETHER_API_KEY',
  huggingface: 'HUGGINGFACE_API_KEY',
  mistral: 'MISTRAL_API_KEY',
};

export function getApiKey(provider: ProviderType): string {
  const envKey = ENV_KEYS[provider];
  return process.env[envKey] ?? '';
}

export function getAvailableProviders(): ProviderType[] {
  return (Object.keys(ENV_KEYS) as ProviderType[]).filter(
    (provider) => getApiKey(provider).length > 0
  );
}

export function getAllApiKeys(): Partial<Record<ProviderType, string>> {
  const keys: Partial<Record<ProviderType, string>> = {};
  for (const provider of Object.keys(ENV_KEYS) as ProviderType[]) {
    const key = getApiKey(provider);
    if (key) keys[provider] = key;
  }
  return keys;
}
