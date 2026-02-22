import type { AIAgent, AgentConfig, AgentMessage, AgentStreamChunk, TokenUsage } from './types';

const FETCH_TIMEOUT_MS = 15_000; // Synapse gets a bit longer since its output is larger

/**
 * Dedicated Synapse moderator agent powered by Google Gemini 2.5 Flash.
 * This is NOT a debate agent — it's the synthesis/moderator brain that:
 * 1. Analyzes and summarizes what the debate agents discussed
 * 2. Delivers executive summaries to the user
 * 3. Responds to @Synapse mentions with its own voice
 */
export class SynapseAgent implements AIAgent {
  readonly config: AgentConfig = {
    id: 'synapse',
    displayName: 'Synapse',
    provider: 'google',
    model: 'gemini-2.5-flash',
    color: 'var(--accent)',
    avatar: 'S',
    capabilities: [
      { id: 'synthesis', description: 'Multi-perspective synthesis', strength: 0.95 },
      { id: 'summarization', description: 'Executive summarization', strength: 0.95 },
    ],
    maxTokens: 2048,
    temperature: 0.6,
  };

  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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

  async complete(messages: AgentMessage[]): Promise<{ content: string; usage: TokenUsage }> {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(systemInstruction && { systemInstruction }),
          contents,
          generationConfig: {
            maxOutputTokens: this.config.maxTokens,
            temperature: this.config.temperature,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Synapse (Gemini) API error: ${res.status} ${err}`);
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

  async *stream(messages: AgentMessage[]): AsyncIterable<AgentStreamChunk> {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const url = `${this.baseUrl}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(systemInstruction && { systemInstruction }),
          contents,
          generationConfig: {
            maxOutputTokens: this.config.maxTokens,
            temperature: this.config.temperature,
          },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Synapse (Gemini) API timed out'
        : `Synapse (Gemini) API error: ${err}`;
      yield { type: 'error', content: msg };
      return;
    }

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      yield { type: 'error', content: `Synapse (Gemini) API error: ${res.status} ${err}` };
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let chunkTimer: ReturnType<typeof setTimeout> | null = null;
    const resetChunkTimer = () => {
      if (chunkTimer) clearTimeout(chunkTimer);
      chunkTimer = setTimeout(() => { reader.cancel(); }, 10_000);
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
        `${this.baseUrl}/models?key=${this.apiKey}`,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Create the Synapse agent if GOOGLE_AI_API_KEY is available.
 * Returns null if no key — orchestrator falls back to debate agent rotation.
 */
export function createSynapseAgent(): SynapseAgent | null {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  return new SynapseAgent(apiKey);
}
