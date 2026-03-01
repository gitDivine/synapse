import type {
  AIAgent,
  AgentConfig,
  AgentFactory,
  AgentMessage,
  AgentStreamChunk,
} from '../types';
import { agentRegistry } from '../registry';

const FETCH_TIMEOUT_MS = 12_000;

/** Track which key index to try next (shared across instances for fair rotation) */
let globalKeyIndex = 0;

class GoogleAgent implements AIAgent {
  readonly config: AgentConfig;
  private keys: string[];
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: AgentConfig, apiKey: string) {
    this.config = config;
    // Support comma-separated keys for rotation on rate limits
    this.keys = apiKey.split(',').map((k) => k.trim()).filter(Boolean);
  }

  /** Pick the next key using round-robin */
  private getKey(): string {
    const key = this.keys[globalKeyIndex % this.keys.length];
    return key;
  }

  /** Advance to the next key after a rate limit */
  private rotateKey(): void {
    globalKeyIndex = (globalKeyIndex + 1) % this.keys.length;
  }

  private toGeminiMessages(messages: AgentMessage[]) {
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystem = messages.filter((m) => m.role !== 'system');

    return {
      systemInstruction: systemMsg
        ? { parts: [{ text: systemMsg.content }] }
        : undefined,
      contents: nonSystem.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    };
  }

  async complete(messages: AgentMessage[]) {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const body = JSON.stringify({
      ...(systemInstruction && { systemInstruction }),
      contents,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    });

    // Try each key once on rate-limit errors
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const key = this.getKey();
      const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${key}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        if (res.status === 429 && attempt < this.keys.length - 1) {
          this.rotateKey();
          continue;
        }

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Google AI API error: ${res.status} ${err}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const usage = data.usageMetadata;

        return {
          content: text,
          usage: {
            promptTokens: usage?.promptTokenCount ?? 0,
            completionTokens: usage?.candidatesTokenCount ?? 0,
            totalTokens: usage?.totalTokenCount ?? 0,
          },
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error('Google AI API: all keys rate-limited');
  }

  async *stream(messages: AgentMessage[]): AsyncIterable<AgentStreamChunk> {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const body = JSON.stringify({
      ...(systemInstruction && { systemInstruction }),
      contents,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    });

    // Try each key once on rate-limit errors
    let res: Response | null = null;
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const key = this.getKey();
      const url = `${this.baseUrl}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${key}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        if (response.status === 429 && attempt < this.keys.length - 1) {
          clearTimeout(timeout);
          this.rotateKey();
          continue;
        }

        clearTimeout(timeout);
        res = response;
        break;
      } catch (err) {
        clearTimeout(timeout);
        if (attempt < this.keys.length - 1) {
          this.rotateKey();
          continue;
        }
        const msg = err instanceof Error && err.name === 'AbortError'
          ? 'Google AI API timed out'
          : `Google AI API error: ${err}`;
        yield { type: 'error', content: msg };
        return;
      }
    }

    if (!res) {
      yield { type: 'error', content: 'Google AI API: all keys rate-limited' };
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      yield { type: 'error', content: `Google AI API error: ${res.status} ${err}` };
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let chunkTimer: ReturnType<typeof setTimeout> | null = null;
    const resetChunkTimer = () => {
      if (chunkTimer) clearTimeout(chunkTimer);
      chunkTimer = setTimeout(() => { reader.cancel(); }, 8_000);
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
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield { type: 'text_delta', content: text };
              }
            } catch {
              // Skip malformed lines
            }
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
        `${this.baseUrl}/models?key=${this.getKey()}`
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

const factory: AgentFactory = (config, apiKey) =>
  new GoogleAgent(config, apiKey);

export function register() {
  agentRegistry.registerProvider('google', factory);
}
