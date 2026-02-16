import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/session/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = sessionStore.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'completed') {
    return NextResponse.json(
      { error: 'Debate has not completed yet' },
      { status: 400 }
    );
  }

  if (!session.replayEvents || session.replayEvents.length === 0) {
    return NextResponse.json(
      { error: 'No replay data available for this session' },
      { status: 404 }
    );
  }

  const totalDuration =
    session.replayEvents[session.replayEvents.length - 1]?.elapsed ?? 0;

  return NextResponse.json({
    problem: session.problem,
    replayEvents: session.replayEvents,
    totalDuration,
  });
}
