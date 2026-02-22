import type {
  AIAgent,
  AgentConfig,
  AgentFactory,
  AgentMessage,
  AgentStreamChunk,
} from '../types';
import { agentRegistry } from '../registry';

/** Max time to wait for HuggingFace API response — must fit within Vercel 60s with 4 agents */
const FETCH_TIMEOUT_MS = 12_000;

/** Hugging Face Inference API (OpenAI-compatible endpoint) */
class HuggingFaceAgent implements AIAgent {
  readonly config: AgentConfig;
  private apiKey: string;
  private baseUrl = 'https://router.huggingface.co/v1';

  constructor(config: AgentConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  async complete(messages: AgentMessage[]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HuggingFace API error: ${res.status} ${err}`);
      }

      const data = await res.json();
      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async *stream(messages: AgentMessage[]): AsyncIterable<AgentStreamChunk> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'HuggingFace API timed out'
        : `HuggingFace API error: ${err}`;
      yield { type: 'error', content: msg };
      return;
    }

    // Clear the initial fetch timeout — streaming has its own chunk-level timeout
    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      yield { type: 'error', content: `HuggingFace API error: ${res.status} ${err}` };
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
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                yield { type: 'text_delta', content: delta };
              }
            } catch {
              // Skip malformed lines
            }
          }
          if (trimmed === 'data: [DONE]') {
            yield { type: 'done', content: '' };
            return;
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
      const res = await fetch(
        'https://huggingface.co/api/whoami-v2',
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

const factory: AgentFactory = (config, apiKey) =>
  new HuggingFaceAgent(config, apiKey);

export function register() {
  agentRegistry.registerProvider('huggingface', factory);
}
