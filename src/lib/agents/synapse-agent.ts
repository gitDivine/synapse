import type { AIAgent, AgentConfig, AgentMessage, AgentStreamChunk, TokenUsage } from './types';

const FETCH_TIMEOUT_MS = 15_000; // Synapse gets a bit longer since its output is larger

/** Round-robin index for Synapse key rotation (shared across instances) */
let synapseKeyIndex = 0;

/**
 * Dedicated Synapse moderator agent powered by Google Gemini 2.5 Flash.
 * This is NOT a debate agent — it's the synthesis/moderator brain that:
 * 1. Analyzes and summarizes what the debate agents discussed
 * 2. Delivers executive summaries to the user
 * 3. Responds to @Synapse mentions with its own voice
 *
 * Supports multiple API keys (comma-separated) with rotation on 429 errors.
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

  private keys: string[];
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(keys: string[]) {
    this.keys = keys;
  }

  private getKey(): string {
    return this.keys[synapseKeyIndex % this.keys.length];
  }

  private rotateKey(): void {
    synapseKeyIndex = (synapseKeyIndex + 1) % this.keys.length;
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
    const body = JSON.stringify({
      ...(systemInstruction && { systemInstruction }),
      contents,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    });

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

    throw new Error('Synapse (Gemini): all keys rate-limited');
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
          ? 'Synapse (Gemini) API timed out'
          : `Synapse (Gemini) API error: ${err}`;
        yield { type: 'error', content: msg };
        return;
      }
    }

    if (!res) {
      yield { type: 'error', content: 'Synapse (Gemini): all keys rate-limited' };
      return;
    }

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
        `${this.baseUrl}/models?key=${this.getKey()}`,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Get the Synapse API keys.
 * Priority: GOOGLE_SYNAPSE_API_KEY (dedicated), fallback to GOOGLE_AI_API_KEY.
 */
function getSynapseKeys(): string[] {
  // Dedicated Synapse keys (preferred — separate quota from council)
  const dedicated = process.env.GOOGLE_SYNAPSE_API_KEY;
  if (dedicated) {
    const keys = dedicated.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length > 0) return keys;
  }
  // Fallback: use the last key from the council pool
  const shared = process.env.GOOGLE_AI_API_KEY;
  if (!shared) return [];
  const keys = shared.split(',').map((k) => k.trim()).filter(Boolean);
  return keys.length > 0 ? [keys[keys.length - 1]] : [];
}

/**
 * Create the Synapse agent if Google API keys are available.
 * Returns null if no key — orchestrator falls back to debate agent rotation.
 */
export function createSynapseAgent(): SynapseAgent | null {
  const keys = getSynapseKeys();
  if (keys.length === 0) return null;
  return new SynapseAgent(keys);
}

/**
 * Get a single Synapse API key for one-shot operations (file analysis).
 * Round-robins through available Synapse keys.
 */
export function getSynapseApiKey(): string | null {
  const keys = getSynapseKeys();
  if (keys.length === 0) return null;
  const key = keys[synapseKeyIndex % keys.length];
  synapseKeyIndex = (synapseKeyIndex + 1) % keys.length;
  return key;
}

/**
 * Analyze an uploaded file (image or document) using Gemini's multimodal capabilities.
 * Returns extracted/described text content.
 */
export async function analyzeAttachment(
  apiKey: string,
  base64: string,
  mimeType: string,
  fileName?: string,
): Promise<string> {
  const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  const url = `${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const isImage = mimeType.startsWith('image/');
  const systemPrompt = isImage
    ? 'You are a document analysis assistant. Describe this image in detail — what it shows, any text visible, charts, diagrams, data, or key information. Be thorough but concise. If it contains text, extract it verbatim.'
    : 'You are a document analysis assistant. Extract and summarize the key content from this document. Preserve important data, structure, and meaning. If it contains tables or structured data, represent them clearly.';

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: fileName ? `Analyze this file: "${fileName}"` : 'Analyze this file.' },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.2,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini analysis failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned empty analysis');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
