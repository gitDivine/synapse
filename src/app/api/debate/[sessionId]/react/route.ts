import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/session/store';

export const dynamic = 'force-dynamic';

const ALLOWED_EMOJIS = ['👍', '👎', '🤔', '🔥', '💡', '❌'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = sessionStore.get(sessionId);

  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  if (session.status !== 'active' && session.status !== 'completed') {
    return new Response('Debate is not active', { status: 400 });
  }

  const body = await req.json();
  const { messageId, emoji } = body;

  if (!messageId || typeof messageId !== 'string') {
    return Response.json({ error: 'messageId is required' }, { status: 400 });
  }

  if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
    return Response.json(
      { error: `Invalid emoji. Allowed: ${ALLOWED_EMOJIS.join(' ')}` },
      { status: 400 },
    );
  }

  sessionStore.addReaction(sessionId, messageId, emoji);
  const allReactions = sessionStore.getReactions(sessionId);
  const messageReactions = allReactions[messageId] ?? {};

  return Response.json({ reactions: messageReactions });
}
