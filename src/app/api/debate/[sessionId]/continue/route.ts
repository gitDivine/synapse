import { NextRequest } from 'next/server';
import { initializeAgents } from '@/lib/agents/init';
import { encodeSSE } from '@/lib/streaming/sse-encoder';
import { getAllApiKeys } from '@/lib/utils/env';
import { runContinuation } from '@/lib/orchestrator/orchestrator';
import { sessionStore } from '@/lib/session/store';
import type { SSEEvent } from '@/lib/streaming/event-types';
import type { TranscriptEntry } from '@/lib/session/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HEARTBEAT_INTERVAL_MS = 15_000;
const TURN_TIMEOUT_MS = 55_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Stream timeout: agent took too long to respond')), ms)
    ),
  ]);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const body = await req.json();
  const { message, problem, transcript, roundNumber } = body as {
    message: string;
    problem: string;
    transcript: TranscriptEntry[];
    roundNumber: number;
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(transcript)) {
    return new Response(JSON.stringify({ error: 'Transcript is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Resolve problem: use provided value, or extract from first user turn in transcript
  const resolvedProblem = (typeof problem === 'string' && problem.trim())
    ? problem.trim()
    : transcript.find((t) => t.agentId === 'user')?.content ?? message.trim();

  // Ensure session exists so interventions/pause work during continuation
  if (!sessionStore.get(sessionId)) {
    sessionStore.create(sessionId, {
      problem: resolvedProblem,
      apiKeys: {},
      status: 'active',
      createdAt: Date.now(),
      interventionQueue: [],
      reactions: {},
    });
  } else {
    sessionStore.update(sessionId, { status: 'active' });
  }

  initializeAgents();

  const serverKeys = getAllApiKeys();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      const heartbeatInterval = setInterval(() => {
        try {
          send({ type: 'heartbeat', data: { timestamp: Date.now() }, timestamp: Date.now() });
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        const iterator = runContinuation(
          resolvedProblem,
          message.trim(),
          transcript,
          serverKeys,
          roundNumber ?? 1,
          sessionId,
        )[Symbol.asyncIterator]();

        let done = false;
        while (!done) {
          const result = await withTimeout(iterator.next(), TURN_TIMEOUT_MS);
          done = result.done ?? false;
          if (!done) {
            send(result.value);
          }
        }
      } catch (error) {
        send({
          type: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Continuation failed',
          },
          timestamp: Date.now(),
        });
      } finally {
        clearInterval(heartbeatInterval);
        sessionStore.update(sessionId, { status: 'idle' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
