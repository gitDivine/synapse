import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/session/store';
import { initializeAgents } from '@/lib/agents/init';
import { agentRegistry } from '@/lib/agents/registry';
import { getAllApiKeys } from '@/lib/utils/env';
import { encodeSSE } from '@/lib/streaming/sse-encoder';
import type { SSEEvent } from '@/lib/streaming/event-types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = sessionStore.get(sessionId);

  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  if (session.status !== 'completed') {
    return new Response('Debate has not concluded yet', { status: 400 });
  }

  if (!session.debateTranscript) {
    return new Response('No debate transcript available', { status: 400 });
  }

  const body = await req.json();
  const { question } = body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Question is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (question.trim().length > 2000) {
    return new Response(JSON.stringify({ error: 'Question is too long (max 2000 characters)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  initializeAgents();

  // Use the same agent that generated the summary
  const serverKeys = getAllApiKeys();
  const mergedKeys = { ...serverKeys, ...session.apiKeys };
  const agentId = session.summaryAgentId;

  let agent;
  if (agentId) {
    try {
      agent = agentRegistry.createAgent(agentId, mergedKeys);
    } catch {
      // Fall back to any available agent
    }
  }

  if (!agent) {
    const available = agentRegistry.createAvailableAgents(mergedKeys);
    if (available.length === 0) {
      return new Response(JSON.stringify({ error: 'No agents available' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    agent = available[0];
  }

  const messages = [
    {
      role: 'system' as const,
      content: `You are Synapse — the moderator of the SYNAPSE debate platform. A debate has concluded and you delivered the verdict. The user now has a follow-up question. Answer it drawing on the full debate history below. Be direct, helpful, and reference specific agents or moments from the debate when relevant. Do NOT reconvene the council — answer this yourself from your complete knowledge of the debate.`,
    },
    {
      role: 'user' as const,
      content: `ORIGINAL PROBLEM: ${session.problem}\n\nFULL DEBATE TRANSCRIPT:\n${session.debateTranscript}\n\nFOLLOW-UP QUESTION: ${question.trim()}`,
    },
  ];

  const textEncoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(textEncoder.encode(encodeSSE(event)));
      };

      try {
        for await (const chunk of agent.stream(messages)) {
          if (chunk.type === 'text_delta') {
            send({
              type: 'followup:chunk',
              data: { content: chunk.content },
              timestamp: Date.now(),
            });
          }
        }
        send({
          type: 'followup:done',
          data: {},
          timestamp: Date.now(),
        });
      } catch (err) {
        send({
          type: 'error',
          data: {
            message: err instanceof Error ? err.message : 'Follow-up failed',
          },
          timestamp: Date.now(),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
