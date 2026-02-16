import type {
  AIAgent,
  AgentConfig,
  AgentFactory,
  AgentMessage,
  AgentStreamChunk,
  TokenUsage,
} from '../types';
import { agentRegistry } from '../registry';

class AnthropicAgent implements AIAgent {
  readonly config: AgentConfig;
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(config: AgentConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  private toAnthropicMessages(messages: AgentMessage[]) {
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
    const { system, messages: msgs } = this.toAnthropicMessages(messages);

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        ...(system && { system }),
        messages: msgs,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const textBlock = data.content.find(
      (b: { type: string }) => b.type === 'text'
    );

    return {
      content: textBlock?.text ?? '',
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens:
          (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
    };
  }

  async *stream(messages: AgentMessage[]): AsyncIterable<AgentStreamChunk> {
    const { system, messages: msgs } = this.toAnthropicMessages(messages);

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true,
        ...(system && { system }),
        messages: msgs,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      yield { type: 'error', content: `Anthropic API error: ${res.status} ${err}` };
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
            if (json.type === 'content_block_delta') {
              const delta = json.delta?.text;
              if (delta) {
                yield { type: 'text_delta', content: delta };
              }
            }
            if (json.type === 'message_stop') {
              yield { type: 'done', content: '' };
              return;
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
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

const factory: AgentFactory = (config, apiKey) =>
  new AnthropicAgent(config, apiKey);

export function register() {
  agentRegistry.registerProvider('anthropic', factory);
}
