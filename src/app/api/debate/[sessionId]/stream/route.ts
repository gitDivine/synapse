import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/session/store';
import { initializeAgents } from '@/lib/agents/init';
import { encodeSSE } from '@/lib/streaming/sse-encoder';
import { getAllApiKeys } from '@/lib/utils/env';
import { runDebate } from '@/lib/orchestrator/orchestrator';
import type { SSEEvent } from '@/lib/streaming/event-types';
import type { ReplayEvent } from '@/lib/session/types';

export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL_MS = 15_000;
const TURN_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Stream timeout: agent took too long to respond')), ms)
    ),
  ]);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = sessionStore.get(sessionId);

  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  initializeAgents();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      // Record events for replay
      const replayBuffer: ReplayEvent[] = [];
      const startTime = Date.now();

      // Heartbeat to keep connection alive and let client detect stale connections
      const heartbeatInterval = setInterval(() => {
        try {
          send({ type: 'heartbeat', data: { timestamp: Date.now() }, timestamp: Date.now() });
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        sessionStore.update(sessionId, { status: 'active' });

        // Merge server-side env keys with any client-provided keys
        const serverKeys = getAllApiKeys();
        const mergedKeys = { ...serverKeys, ...session.apiKeys };

        // Run the full multi-agent debate via the orchestrator with per-turn timeout
        const iterator = runDebate(session, mergedKeys, sessionId)[Symbol.asyncIterator]();
        let done = false;

        while (!done) {
          const result = await withTimeout(iterator.next(), TURN_TIMEOUT_MS);
          done = result.done ?? false;
          if (!done) {
            const event = result.value;
            // Record for replay before sending
            replayBuffer.push({
              event: event as unknown as Record<string, unknown>,
              elapsed: Date.now() - startTime,
            });
            send(event);
          }
        }

        // Save replay events alongside completion
        sessionStore.update(sessionId, {
          status: 'completed',
          replayEvents: replayBuffer,
        });
      } catch (error) {
        send({
          type: 'error',
          data: {
            message:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
          timestamp: Date.now(),
        });
        sessionStore.update(sessionId, { status: 'error' });
      } finally {
        clearInterval(heartbeatInterval);
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
