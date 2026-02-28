import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { sessionStore } from '@/lib/session/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { problem, apiKeys } = body;

  if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
    return NextResponse.json({ error: 'Problem is required' }, { status: 400 });
  }

  if (problem.length > 12000) {
    return NextResponse.json(
      { error: 'Problem must be under 12000 characters' },
      { status: 400 }
    );
  }

  const sessionId = nanoid(12);

  sessionStore.create(sessionId, {
    problem: problem.trim(),
    apiKeys: apiKeys ?? {},
    status: 'pending',
    createdAt: Date.now(),
    interventionQueue: [],
    reactions: {},
  });

  return NextResponse.json({ sessionId });
}
