import type {
  AIAgent,
  AgentConfig,
  AgentFactory,
  AgentMessage,
  AgentStreamChunk,
} from '../types';
import { agentRegistry } from '../registry';

/** Max time to wait for Cohere API initial response — must fit within Vercel 60s with 4 agents */
const FETCH_TIMEOUT_MS = 12_000;

class CohereAgent implements AIAgent {
  readonly config: AgentConfig;
  private apiKey: string;
  private baseUrl = 'https://api.cohere.com/v2';

  constructor(config: AgentConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  private toCohereMessages(messages: AgentMessage[]) {
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystem = messages.filter((m) => m.role !== 'system');
    return {
      system: systemMsg?.content,
      messages: nonSystem.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };
  }

  async complete(messages: AgentMessage[]) {
    const { system, messages: msgs } = this.toCohereMessages(messages);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            ...msgs,
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cohere API error: ${res.status} ${err}`);
      }

      const data = await res.json();
      const content =
        data.message?.content?.[0]?.text ?? '';

      return {
        content,
        usage: {
          promptTokens: data.usage?.billed_units?.input_tokens ?? 0,
          completionTokens: data.usage?.billed_units?.output_tokens ?? 0,
          totalTokens:
            (data.usage?.billed_units?.input_tokens ?? 0) +
            (data.usage?.billed_units?.output_tokens ?? 0),
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async *stream(messages: AgentMessage[]): AsyncIterable<AgentStreamChunk> {
    const { system, messages: msgs } = this.toCohereMessages(messages);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            ...msgs,
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Cohere API timed out'
        : `Cohere API error: ${err}`;
      yield { type: 'error', content: msg };
      return;
    }

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      yield { type: 'error', content: `Cohere API error: ${res.status} ${err}` };
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Per-chunk stall timeout — if no data arrives for 12s, abort
    let chunkTimer: ReturnType<typeof setTimeout> | null = null;
    const resetChunkTimer = () => {
      if (chunkTimer) clearTimeout(chunkTimer);
      chunkTimer = setTimeout(() => {
        reader.cancel();
      }, 8_000);
    };
    resetChunkTimer();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetChunkTimer();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Cohere v2 returns SSE format: "data: {...}"
          // Skip event lines and extract JSON from data lines
          if (trimmed.startsWith('event:')) continue;
          if (trimmed === 'data: [DONE]') continue;

          const jsonStr = trimmed.startsWith('data: ')
            ? trimmed.slice(6)
            : trimmed;

          try {
            const json = JSON.parse(jsonStr);
            if (json.type === 'content-delta') {
              const text = json.delta?.message?.content?.text;
              if (text) {
                yield { type: 'text_delta', content: text };
              }
            }
            if (json.type === 'message-end') {
              yield { type: 'done', content: '' };
              return;
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } finally {
      if (chunkTimer) clearTimeout(chunkTimer);
    }

    yield { type: 'done', content: '' };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const res = await fetch('https://api.cohere.com/v2/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

const factory: AgentFactory = (config, apiKey) =>
  new CohereAgent(config, apiKey);

export function register() {
  agentRegistry.registerProvider('cohere', factory);
}
