import { NextRequest, NextResponse } from 'next/server';
import { analyzeAttachment, getSynapseApiKey } from '@/lib/agents/synapse-agent';

export const maxDuration = 60;

const SUPPORTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown',
]);

const MAX_BASE64_SIZE = 4_000_000; // ~3MB file = ~4MB base64

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { base64, mimeType, fileName } = body as {
    base64: string;
    mimeType: string;
    fileName?: string;
  };

  if (!base64 || typeof base64 !== 'string') {
    return NextResponse.json({ error: 'File data is required' }, { status: 400 });
  }

  if (!mimeType || !SUPPORTED_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type. Use images (JPEG, PNG, GIF, WebP), PDF, TXT, CSV, or Markdown.` },
      { status: 400 },
    );
  }

  if (base64.length > MAX_BASE64_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 3MB.' }, { status: 413 });
  }

  const apiKey = getSynapseApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'File analysis requires Gemini — Google AI API key not configured.' },
      { status: 503 },
    );
  }

  try {
    const content = await analyzeAttachment(apiKey, base64, mimeType, fileName);
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'File analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
