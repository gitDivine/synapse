import type {
  AIAgent,
  AgentConfig,
  AgentFactory,
  AgentMessage,
  AgentStreamChunk,
} from '../types';
import { agentRegistry } from '../registry';

class GoogleAgent implements AIAgent {
  readonly config: AgentConfig;
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: AgentConfig, apiKey: string) {
    this.config = config;
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

  async complete(messages: AgentMessage[]) {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`;

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
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google AI API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const usage = data.usageMetadata;

    return {
      content: text,
      usage: {
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? 0,
      },
    };
  }

  async *stream(messages: AgentMessage[]): AsyncIterable<AgentStreamChunk> {
    const { systemInstruction, contents } = this.toGeminiMessages(messages);
    const url = `${this.baseUrl}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

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
    });

    if (!res.ok) {
      const err = await res.text();
      yield { type: 'error', content: `Google AI API error: ${res.status} ${err}` };
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

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

    yield { type: 'done', content: '' };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const res = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`
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
