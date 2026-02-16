import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/session/store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = sessionStore.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'active') {
    return NextResponse.json(
      { error: 'Debate is not active' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    );
  }

  if (message.length > 1000) {
    return NextResponse.json(
      { error: 'Message must be under 1000 characters' },
      { status: 400 }
    );
  }

  const success = sessionStore.pushIntervention(sessionId, {
    content: message.trim(),
    timestamp: Date.now(),
  });

  if (!success) {
    return NextResponse.json(
      { error: 'Could not queue intervention' },
      { status: 400 }
    );
  }

  return NextResponse.json({ queued: true });
}
