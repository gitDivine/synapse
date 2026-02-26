import type { AIAgent, AgentMessage, ProviderType } from '@/lib/agents/types';
import type { SSEEvent } from '@/lib/streaming/event-types';
import type { DebateSession, TranscriptEntry } from '@/lib/session/types';
import type { SourceResult } from '@/lib/sources/types';
import { CouncilAssembler } from './council-assembler';
import { TurnManager } from './turn-manager';
import { PsychologicalStateEngine } from '@/lib/psychology/state-engine';
import { NUDGE_TEMPLATES } from '@/lib/psychology/nudge-templates';
import { ContextLog } from '@/lib/memory/context-log';
import { ConsensusDetector } from '@/lib/consensus/detector';
import { SummaryGenerator } from '@/lib/summary/generator';
import { SearchRouter } from '@/lib/sources/search-router';
import { getSourceName } from '@/lib/sources/registry';
import { sessionStore } from '@/lib/session/store';
import { MomentumCalculator } from '@/lib/momentum/calculator';
import { QuoteDetector } from './quote-detector';
import { InfluenceScorer } from './influence-scorer';
import { createSynapseAgent } from '@/lib/agents/synapse-agent';

const councilAssembler = new CouncilAssembler();
const consensusDetector = new ConsensusDetector();
const summaryGenerator = new SummaryGenerator();

/** Consensus threshold — Synapse only synthesizes when agreement reaches this level */
const CONSENSUS_THRESHOLD = 0.85;
/** Maximum debate rounds before Synapse is forced to synthesize regardless */
const MAX_DEBATE_ROUNDS = 5;

/**
 * Compute debate parameters based on available agent count.
 * Fewer agents = more rounds. More agents = fewer rounds (fit within 60s).
 */
function computeDebateParams(agentCount: number): { maxTurns: number; maxRounds: number } {
  if (agentCount >= 4) return { maxTurns: agentCount, maxRounds: 1 };
  if (agentCount === 3) return { maxTurns: agentCount * 2, maxRounds: 2 };
  return { maxTurns: agentCount * 2, maxRounds: 2 };
}

/**
 * Fast pre-debate health check — verify each provider responds.
 * Runs all checks in parallel with a 2s timeout. Returns only healthy agents.
 */
async function healthCheckAgents(agents: AIAgent[]): Promise<AIAgent[]> {
  const HEALTH_TIMEOUT_MS = 2_000;

  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      try {
        const ok = await Promise.race([
          agent.validateApiKey(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('health timeout')), HEALTH_TIMEOUT_MS)
          ),
        ]);
        return ok ? agent : null;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    })
  );

  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((a): a is AIAgent => a !== null);
}

export async function* runDebate(
  session: DebateSession,
  apiKeys: Partial<Record<ProviderType, string>>,
  sessionId: string,
): AsyncIterable<SSEEvent> {
  // 1. Assemble the council
  const assembled = councilAssembler.assemble(session.problem, apiKeys);

  if (assembled.length === 0) {
    yield {
      type: 'error',
      data: { message: 'No API keys configured. Add at least one provider API key.' },
      timestamp: Date.now(),
    };
    return;
  }

  // 2. Pre-debate health check — only include providers that respond
  const agents = await healthCheckAgents(assembled);

  // Notify client about agents that failed health check
  for (const agent of assembled) {
    if (!agents.find((a) => a.config.id === agent.config.id)) {
      yield {
        type: 'agent:unavailable',
        data: {
          agentId: agent.config.id,
          displayName: agent.config.displayName,
          reason: 'error',
          message: `${agent.config.displayName} is not responding — excluded from this debate`,
        },
        timestamp: Date.now(),
      };
    }
  }

  if (agents.length === 0) {
    yield {
      type: 'error',
      data: { message: 'No providers are currently responding. Please try again shortly.' },
      timestamp: Date.now(),
    };
    return;
  }

  yield {
    type: 'debate:start',
    data: {
      agents: agents.map((a) => ({
        id: a.config.id,
        displayName: a.config.displayName,
        color: a.config.color,
        avatar: a.config.avatar,
      })),
    },
    timestamp: Date.now(),
  };

  // 3. Initialize psychological states
  const psychEngine = new PsychologicalStateEngine();
  psychEngine.assignInitialStates(agents);

  // 4. Set up turn management, memory, and search
  // Dynamic rounds: more agents = fewer rounds to fit within 60s Vercel limit
  const { maxTurns, maxRounds } = computeDebateParams(agents.length);
  const turnManager = new TurnManager(agents, { maxTurns, maxRounds });
  const memory = new ContextLog();
  const searchRouter = new SearchRouter();
  const momentumCalculator = new MomentumCalculator();
  const quoteDetector = new QuoteDetector();
  let consensusScore = 0;
  let prevConsensusScore = 0;
  const allResearchResults: SourceResult[] = [];
  const consensusHistory: { turn: number; score: number }[] = [];
  const allQuoteLinks: { sourceMessageId: string; targetMessageId: string; agentName: string; excerpt: string }[] = [];

  // 4. Debate loop
  const failedAgentIds = new Set<string>();
  yield* runDebateLoop({
    agents,
    turnManager,
    psychEngine,
    memory,
    searchRouter,
    momentumCalculator,
    quoteDetector,
    consensusDetector,
    sessionId,
    problem: session.problem,
    consensusScore,
    prevConsensusScore,
    allResearchResults,
    consensusHistory,
    allQuoteLinks,
    failedAgentIds,
    roundPrefix: 'r0',
    onConsensusUpdate: (score, prev) => {
      consensusScore = score;
      prevConsensusScore = prev;
    },
  });

  // Update final scores from loop
  // (The onConsensusUpdate callback keeps these in sync)

  // 5. Score message influence
  const influenceScorer = new InfluenceScorer();
  const allTurns = memory.getAllTurns();
  const messageInfos = allTurns.map((t, i) => ({
    id: `msg-${i}-${t.agentId}`,
    agentId: t.agentId,
    content: t.content,
    isUser: t.agentId === 'user',
    isResearch: t.psychState === 'research',
  }));
  const influence = influenceScorer.score(
    messageInfos,
    [], // No structured key moments for inline verdict
    consensusHistory,
    allQuoteLinks,
  );

  // 6. Round 0 is always the opening exchange — Synapse never synthesizes here.
  // The client auto-continues rounds until consensus is reached in later rounds.

  // Save transcript for continuation rounds
  sessionStore.update(sessionId, {
    debateTranscript: memory.getTranscript(),
    summaryAgentId: agents[0]?.config.id ?? 'unknown',
  });

  // 7. Signal round complete with analytics
  yield {
    type: 'round:complete',
    data: {
      roundNumber: 0,
      consensusScore,
      consensusHistory,
      influence,
      quoteLinks: allQuoteLinks,
    },
    timestamp: Date.now(),
  };
}

/**
 * Run a continuation round when the user sends a follow-up message.
 * Shorter than the initial debate — each agent speaks once, then Synapse gives an updated take.
 */
export async function* runContinuation(
  problem: string,
  userMessage: string,
  transcript: TranscriptEntry[],
  apiKeys: Partial<Record<ProviderType, string>>,
  roundNumber: number,
  sessionId?: string,
): AsyncIterable<SSEEvent> {
  // Reassemble council
  const agents = councilAssembler.assemble(problem, apiKeys);

  if (agents.length === 0) {
    yield {
      type: 'error',
      data: { message: 'No agents available for continuation.' },
      timestamp: Date.now(),
    };
    return;
  }

  yield {
    type: 'debate:start',
    data: {
      agents: agents.map((a) => ({
        id: a.config.id,
        displayName: a.config.displayName,
        color: a.config.color,
        avatar: a.config.avatar,
      })),
    },
    timestamp: Date.now(),
  };

  // Rebuild memory from transcript (strip <think> tags from previous rounds)
  const memory = new ContextLog();
  for (const entry of transcript) {
    const cleanContent = entry.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trimStart();
    memory.addTurn(entry.agentId, cleanContent || entry.content, entry.psychState, entry.displayName);
  }

  // Add user's new message (skip if already anywhere in transcript — e.g. auto-continue after intervention)
  const alreadyInTranscript = transcript.some(
    (entry) => entry.agentId === 'user' && entry.content === userMessage
  );
  if (!alreadyInTranscript) {
    memory.addTurn('user', userMessage, 'continuation', 'User');
  }

  yield {
    type: 'user:intervention',
    data: { content: userMessage, category: 'contribution', timestamp: Date.now() },
    timestamp: Date.now(),
  };

  // Pre-delay before continuation — small buffer to let rate limits settle
  // Round 1: 3s, Round 2: 4s, Round 3+: 5s
  const preDelayMs = Math.min(5_000, 3_000 + (roundNumber - 1) * 1_000);
  await new Promise((resolve) => setTimeout(resolve, preDelayMs));

  // Check if the user is addressing Synapse directly (e.g. "@Synapse, explain simpler")
  const isSynapseMention = isMentioningSynapse(userMessage);
  const synapseAgent = createSynapseAgent();

  // If user is talking to Synapse directly AND we have the dedicated agent,
  // skip the debate agents — let Synapse respond alone using the full conversation context
  if (isSynapseMention && synapseAgent) {
    const verdictMessageId = `synapse-verdict-${roundNumber}`;

    yield {
      type: 'agent:thinking',
      data: { agentId: 'synapse', messageId: verdictMessageId, psychState: 'synthesizer' },
      timestamp: Date.now(),
    };

    const synapseDirectPrompt = buildSynapseDirectPrompt(problem, userMessage, memory);
    let synapseFailed = false;
    try {
      for await (const chunk of synapseAgent.stream(synapseDirectPrompt)) {
        if (chunk.type === 'text_delta') {
          yield {
            type: 'agent:chunk',
            data: { agentId: 'synapse', messageId: verdictMessageId, content: chunk.content },
            timestamp: Date.now(),
          };
        }
        if (chunk.type === 'error') {
          synapseFailed = true;
          break;
        }
      }
    } catch {
      synapseFailed = true;
    }
    if (synapseFailed) {
      yield {
        type: 'agent:chunk',
        data: {
          agentId: 'synapse',
          messageId: verdictMessageId,
          content: `I understood your request but ran into an issue generating a response. Could you try rephrasing?`,
        },
        timestamp: Date.now(),
      };
    }

    yield {
      type: 'agent:done',
      data: { agentId: 'synapse', messageId: verdictMessageId },
      timestamp: Date.now(),
    };

    yield {
      type: 'round:complete',
      data: { roundNumber, consensusScore: 0, consensusHistory: [], influence: {}, quoteLinks: [] },
      timestamp: Date.now(),
    };
    return;
  }

  // Detect if the user is addressing a specific agent — that agent speaks first
  const orderedAgents = reorderByMention(userMessage, agents);

  // Initialize psychological states
  const psychEngine = new PsychologicalStateEngine();
  psychEngine.assignInitialStates(orderedAgents);

  // Dynamic rounds — more agents = fewer rounds to fit within 60s
  const { maxTurns, maxRounds } = computeDebateParams(orderedAgents.length);
  const turnManager = new TurnManager(orderedAgents, { maxTurns, maxRounds });
  const momentumCalculator = new MomentumCalculator();
  const quoteDetector = new QuoteDetector();
  const searchRouter = new SearchRouter();
  let consensusScore = 0;
  let prevConsensusScore = 0;
  const allResearchResults: SourceResult[] = [];
  const consensusHistory: { turn: number; score: number }[] = [];
  const allQuoteLinks: { sourceMessageId: string; targetMessageId: string; agentName: string; excerpt: string }[] = [];

  // Run the debate loop (1 round)
  const failedAgentIds = new Set<string>();
  yield* runDebateLoop({
    agents: orderedAgents,
    turnManager,
    psychEngine,
    memory,
    searchRouter,
    momentumCalculator,
    quoteDetector,
    consensusDetector,
    sessionId,
    problem,
    consensusScore,
    prevConsensusScore,
    allResearchResults,
    consensusHistory,
    allQuoteLinks,
    failedAgentIds,
    roundPrefix: `r${roundNumber}`,
    onConsensusUpdate: (score, prev) => {
      consensusScore = score;
      prevConsensusScore = prev;
    },
  });

  // Score influence
  const influenceScorer = new InfluenceScorer();
  const allTurns = memory.getAllTurns();
  const messageInfos = allTurns.map((t, i) => ({
    id: `msg-${i}-${t.agentId}`,
    agentId: t.agentId,
    content: t.content,
    isUser: t.agentId === 'user',
    isResearch: t.psychState === 'research',
  }));
  const influence = influenceScorer.score(messageInfos, [], consensusHistory, allQuoteLinks);

  // Synapse verdict — only synthesize when consensus reached or this is the final round
  const shouldSynthesize = consensusScore >= CONSENSUS_THRESHOLD || roundNumber >= MAX_DEBATE_ROUNDS - 1;

  if (shouldSynthesize) {
    const verdictAgent = synapseAgent ?? (() => {
      const availableAgents = agents.filter((a) => !failedAgentIds.has(a.config.id));
      const verdictPool = availableAgents.length > 0 ? availableAgents : agents;
      return verdictPool[roundNumber % verdictPool.length];
    })();
    const verdictMessageId = `synapse-verdict-${roundNumber}`;

    if (synapseAgent) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    yield {
      type: 'agent:thinking',
      data: { agentId: 'synapse', messageId: verdictMessageId, psychState: 'synthesizer' },
      timestamp: Date.now(),
    };

    const verdictPrompt = buildVerdictPrompt(problem, memory, consensusScore, allResearchResults);
    let verdictFailed = false;
    for (let vAttempt = 0; vAttempt <= 1; vAttempt++) {
      verdictFailed = false;
      let verdictHasText = false;
      try {
        for await (const chunk of verdictAgent.stream(verdictPrompt)) {
          if (chunk.type === 'text_delta') {
            verdictHasText = true;
            yield {
              type: 'agent:chunk',
              data: { agentId: 'synapse', messageId: verdictMessageId, content: chunk.content },
              timestamp: Date.now(),
            };
          }
          if (chunk.type === 'error') {
            verdictFailed = true;
            break;
          }
        }
      } catch {
        verdictFailed = true;
      }
      if (!verdictFailed && !verdictHasText) verdictFailed = true;
      if (!verdictFailed) break;
      if (vAttempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    if (verdictFailed) {
      yield {
        type: 'agent:chunk',
        data: {
          agentId: 'synapse',
          messageId: verdictMessageId,
          content: `The council revisited this topic. Feel free to keep the conversation going or ask about a specific angle.`,
        },
        timestamp: Date.now(),
      };
    }

    yield {
      type: 'agent:done',
      data: { agentId: 'synapse', messageId: verdictMessageId },
      timestamp: Date.now(),
    };
  }

  yield {
    type: 'round:complete',
    data: {
      roundNumber,
      consensusScore,
      consensusHistory,
      influence,
      quoteLinks: allQuoteLinks,
    },
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Shared debate loop — used by both runDebate() and runContinuation()
// ---------------------------------------------------------------------------

interface DebateLoopContext {
  agents: AIAgent[];
  turnManager: TurnManager;
  psychEngine: PsychologicalStateEngine;
  memory: ContextLog;
  searchRouter: SearchRouter;
  momentumCalculator: MomentumCalculator;
  quoteDetector: QuoteDetector;
  consensusDetector: ConsensusDetector;
  sessionId: string | undefined;
  problem: string;
  consensusScore: number;
  prevConsensusScore: number;
  allResearchResults: SourceResult[];
  consensusHistory: { turn: number; score: number }[];
  allQuoteLinks: { sourceMessageId: string; targetMessageId: string; agentName: string; excerpt: string }[];
  failedAgentIds: Set<string>;
  onConsensusUpdate: (score: number, prev: number) => void;
  /** Prefix for messageIds to prevent collisions across rounds (e.g. 'r0', 'r1') */
  roundPrefix: string;
}

async function* runDebateLoop(ctx: DebateLoopContext): AsyncIterable<SSEEvent> {
  let { consensusScore, prevConsensusScore } = ctx;
  const {
    agents, turnManager, psychEngine, memory, searchRouter,
    momentumCalculator, quoteDetector, consensusDetector,
    sessionId, problem, allResearchResults, consensusHistory, allQuoteLinks,
    failedAgentIds, onConsensusUpdate, roundPrefix,
  } = ctx;

  while (!turnManager.isComplete()) {
    // Check for user interventions before each turn
    let hasIntervention = false;
    if (sessionId) {
      const interventions = sessionStore.drainInterventions(sessionId);
      hasIntervention = interventions.length > 0;
      for (const intervention of interventions) {
        const category = categorizeIntervention(intervention.content);
        memory.addTurn('user', `[${category.toUpperCase()}] ${intervention.content}`, 'intervention', 'User');
        yield {
          type: 'user:intervention',
          data: { content: intervention.content, category, timestamp: intervention.timestamp },
          timestamp: Date.now(),
        };
      }
    }

    // Pause if user clicked Intervene — end the round early so the user has
    // unlimited time to type. Synapse will still deliver a verdict, then
    // round:complete fires and the user can respond via a new continuation round.
    if (sessionId && sessionStore.isPaused(sessionId)) {
      sessionStore.setPaused(sessionId, false);
      yield { type: 'turn:pause', data: { reason: 'user_intervening' }, timestamp: Date.now() };
      break;
    }

    const agent = turnManager.nextAgent();
    const psychState = psychEngine.getState(agent.config.id);
    if (!psychState) break;

    const messageId = `msg-${roundPrefix}-${turnManager.turn}-${agent.config.id}`;

    // Decide whether to search before this turn
    const lastContent = memory.getAllTurns().at(-1)?.content ?? problem;
    const searchDecision = searchRouter.decide(lastContent, problem, turnManager.turn);
    let researchContext = '';

    if (searchDecision.shouldSearch) {
      const results = await searchRouter.search(searchDecision);
      if (results.length > 0) {
        allResearchResults.push(...results);
        researchContext = searchRouter.formatForContext(results);
        yield {
          type: 'research:results',
          data: {
            query: searchDecision.query,
            reason: searchDecision.reason,
            results: results.map((r) => ({
              source: r.source,
              sourceName: getSourceName(r.source),
              title: r.title,
              snippet: r.snippet.slice(0, 200),
              url: r.url,
            })),
          },
          timestamp: Date.now(),
        };
      }
    }

    // Announce this agent is thinking
    yield {
      type: 'agent:thinking',
      data: { agentId: agent.config.id, messageId, psychState: psychState.current },
      timestamp: Date.now(),
    };

    // Read audience reactions for context injection
    const allReactions = sessionId ? (sessionStore.get(sessionId)?.reactions ?? {}) : {};
    let reactionContext = '';
    if (Object.keys(allReactions).length > 0) {
      const recentMessages = memory.getAllTurns().slice(-4);
      const lines: string[] = [];
      for (const turn of recentMessages) {
        const msgKey = `msg-${turn.turnNumber}-${turn.agentId}`;
        const msgReactions = allReactions[msgKey];
        if (msgReactions && Object.keys(msgReactions).length > 0) {
          const emojiStr = Object.entries(msgReactions)
            .map(([emoji, count]) => `${emoji} x${count}`)
            .join(', ');
          const label = turn.agentId === agent.config.id ? 'Your' : `${turn.displayName}'s`;
          lines.push(`- ${label} message received: ${emojiStr}`);
        }
      }
      if (lines.length > 0) {
        reactionContext = `\n\nAUDIENCE REACTIONS:\n${lines.join('\n')}\nThe user is reacting in real-time. Take note of their sentiment.`;
      }
    }

    // Check if user's message is in recent memory (for continuation context)
    const recentUserTurn = memory.getAllTurns().slice(-3).some(t => t.agentId === 'user');
    const hasUserInput = hasIntervention || recentUserTurn;

    // Build the turn prompt
    const messages = buildTurnPrompt(
      problem,
      agent,
      psychState.current,
      memory,
      turnManager.turn,
      agents,
      researchContext,
      hasUserInput,
      reactionContext,
    );

    // Stream the agent's response (with retry on transient errors)
    let fullResponse = '';
    let agentFailed = false;
    let lastErrorMsg = '';
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 3_000;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      fullResponse = '';
      agentFailed = false;
      let isRetryable = false;
      let yieldedChunks = false;

      try {
        // Buffer for stripping <think>...</think> blocks from streamed output (e.g. Qwen)
        let thinkBuffer = '';
        let insideThink = false;

        for await (const chunk of agent.stream(messages)) {
          if (chunk.type === 'text_delta') {
            fullResponse += chunk.content;

            // Filter out <think>...</think> blocks before sending to client
            let text = chunk.content;
            if (insideThink) {
              thinkBuffer += text;
              const closeIdx = thinkBuffer.indexOf('</think>');
              if (closeIdx !== -1) {
                insideThink = false;
                text = thinkBuffer.slice(closeIdx + 8);
                thinkBuffer = '';
                if (!text) continue;
              } else {
                continue; // Still inside think block, don't yield
              }
            }

            // Check if this chunk starts a think block
            const openIdx = text.indexOf('<think>');
            if (openIdx !== -1) {
              const before = text.slice(0, openIdx);
              const after = text.slice(openIdx + 7);
              if (before.trim()) {
                yieldedChunks = true;
                yield {
                  type: 'agent:chunk',
                  data: { agentId: agent.config.id, messageId, content: before },
                  timestamp: Date.now(),
                };
              }
              insideThink = true;
              thinkBuffer = after;
              const closeIdx = thinkBuffer.indexOf('</think>');
              if (closeIdx !== -1) {
                insideThink = false;
                const remainder = thinkBuffer.slice(closeIdx + 8);
                thinkBuffer = '';
                if (remainder.trim()) {
                  yieldedChunks = true;
                  yield {
                    type: 'agent:chunk',
                    data: { agentId: agent.config.id, messageId, content: remainder },
                    timestamp: Date.now(),
                  };
                }
              }
              continue;
            }

            yieldedChunks = true;
            yield {
              type: 'agent:chunk',
              data: { agentId: agent.config.id, messageId, content: text },
              timestamp: Date.now(),
            };
          }
          if (chunk.type === 'error') {
            agentFailed = true;
            lastErrorMsg = chunk.content;
            isRetryable = isTransientError(chunk.content);
            break;
          }
        }
      } catch (err) {
        agentFailed = true;
        lastErrorMsg = err instanceof Error ? err.message : 'Unknown';
        isRetryable = isTransientError(lastErrorMsg);
      }

      // Retry on transient errors (rate limit, 503, 502, timeout) if no chunks sent yet
      if (agentFailed && isRetryable && !yieldedChunks && attempt < MAX_RETRIES) {
        fullResponse = '';
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      // If failed, emit unavailable with actual error detail
      if (agentFailed) {
        failedAgentIds.add(agent.config.id);

        // If chunks were already streamed, close the message properly so the
        // client doesn't leave an orphaned incomplete bubble
        if (yieldedChunks) {
          yield {
            type: 'agent:done',
            data: { agentId: agent.config.id, messageId },
            timestamp: Date.now(),
          };
        }

        const isRateLimit = /429|rate.?limit/i.test(lastErrorMsg);
        yield {
          type: 'agent:unavailable',
          data: {
            agentId: agent.config.id,
            displayName: agent.config.displayName,
            reason: isRateLimit ? 'rate_limit' : 'error',
            message: isRateLimit
              ? `${agent.config.displayName} is rate-limited — will retry next round`
              : `${agent.config.displayName} is temporarily unavailable — will retry`,
          },
          timestamp: Date.now(),
        };
      }

      break; // Success or non-retryable failure
    }

    if (agentFailed) {
      turnManager.advanceTurn();
      continue;
    }

    yield {
      type: 'agent:done',
      data: { agentId: agent.config.id, messageId },
      timestamp: Date.now(),
    };

    // Strip <think>...</think> blocks (e.g. Qwen's chain-of-thought) before storing
    const cleanedResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trimStart();
    memory.addTurn(agent.config.id, cleanedResponse || fullResponse, psychState.current, agent.config.displayName);

    // Record that this agent successfully spoke
    turnManager.markSpoken(agent.config.id);

    // Transition psychological state
    const newState = psychEngine.transition(agent.config.id, cleanedResponse || fullResponse, consensusScore, turnManager.turn);
    if (newState.current !== psychState.current) {
      yield {
        type: 'psych:state_change',
        data: { agentId: agent.config.id, from: psychState.current, to: newState.current },
        timestamp: Date.now(),
      };
    }

    // Check consensus
    prevConsensusScore = consensusScore;
    consensusScore = consensusDetector.evaluate(memory.getAllTurns());
    consensusHistory.push({ turn: turnManager.turn, score: consensusScore });
    onConsensusUpdate(consensusScore, prevConsensusScore);

    yield {
      type: 'consensus:update',
      data: { score: consensusScore },
      timestamp: Date.now(),
    };

    // Calculate momentum
    const momentumResult = momentumCalculator.calculate(
      memory.getAllTurns(),
      consensusScore,
      prevConsensusScore,
      false,
      newState.current !== psychState.current,
    );
    yield {
      type: 'momentum:update',
      data: { momentum: momentumResult.momentum, direction: momentumResult.direction },
      timestamp: Date.now(),
    };

    // Detect quote-reply references
    const agentInfos = agents.map((a) => ({ id: a.config.id, displayName: a.config.displayName }));
    const prevMessages = memory.getAllTurns().slice(0, -1).map((t, i) => ({
      id: `msg-${i}-${t.agentId}`,
      agentId: t.agentId,
      content: t.content,
    }));
    const quotes = quoteDetector.detect(fullResponse, agent.config.id, agentInfos, prevMessages);
    for (const quote of quotes) {
      const linkData = {
        sourceMessageId: quote.referencedMessageId,
        targetMessageId: messageId,
        agentName: quote.referencedAgentName,
        excerpt: quote.excerpt,
      };
      allQuoteLinks.push(linkData);
      yield { type: 'quote:linked', data: linkData, timestamp: Date.now() };
    }

    // Scale convergence threshold by round — harder to end early, easier later
    // Round 0-1: need near-unanimous agreement (0.95) to cut short
    // Round 2+: normal threshold (0.85) — if they genuinely agree, wrap up
    // NEVER converge until every council member has spoken at least once
    if (turnManager.allAgentsSpoken) {
      const convergenceThreshold = turnManager.round < 2 ? 0.95 : 0.85;
      if (consensusScore > convergenceThreshold) {
        turnManager.markConverged();
      }
    }

    turnManager.advanceTurn();

    // After each agent finishes, re-check for interventions
    // If a user intervened, skip the pacing delay — their message takes priority
    if (!turnManager.isComplete() && sessionId) {
      const lateInterventions = sessionStore.drainInterventions(sessionId);
      if (lateInterventions.length > 0) {
        for (const intervention of lateInterventions) {
          const category = categorizeIntervention(intervention.content);
          memory.addTurn('user', `[${category.toUpperCase()}] ${intervention.content}`, 'intervention', 'User');
          yield {
            type: 'user:intervention',
            data: { content: intervention.content, category, timestamp: intervention.timestamp },
            timestamp: Date.now(),
          };
        }
        // No pacing delay — user's input is top priority, next agent responds immediately
        continue;
      }
    }

    // Pacing delay between turns (only when no intervention is waiting)
    if (!turnManager.isComplete()) {
      const pacingMs = 1500;
      yield { type: 'turn:pause', data: { duration: pacingMs }, timestamp: Date.now() };
      await new Promise((resolve) => setTimeout(resolve, pacingMs));
    }
  }
}

// ---------------------------------------------------------------------------
// Verdict prompt — conversational, not structured JSON
// ---------------------------------------------------------------------------

function buildVerdictPrompt(
  problem: string,
  memory: ContextLog,
  consensusScore: number,
  researchResults: SourceResult[],
): AgentMessage[] {
  const agentIds = [...new Set(memory.getAllTurns().filter(t => t.agentId !== 'user').map(t => t.displayName))];
  const userTurns = memory.getAllTurns().filter(t => t.agentId === 'user');

  const sourceSummary = researchResults.length > 0
    ? `\n\nLIVE SOURCES REFERENCED:\n${researchResults.map(r => `- ${getSourceName(r.source)}: ${r.title}${r.url ? ` (${r.url})` : ''}`).join('\n')}`
    : '';

  const userNote = userTurns.length > 0
    ? `\nThe user also participated in the discussion — acknowledge their contributions.`
    : '';

  return [
    {
      role: 'system',
      content: `You are Synapse — the AI moderator of the SYNAPSE conversation platform. You watched the entire council discussion. Your job is to extract the ANSWER from the debate and deliver it clearly to the user.

You are NOT a meeting secretary. Do NOT just report "Agent X said this, Agent Y said that." Instead, SYNTHESIZE what the council concluded into a direct, clear answer to the user's question or problem.

STRUCTURE YOUR RESPONSE LIKE THIS:

## The Answer
Start with the actual answer/solution the council reached. State it directly and clearly as if the user asked YOU the question. This should be 2-4 paragraphs that fully answer the user's problem using the best insights from the discussion. Write it in your own voice — don't attribute every sentence to an agent. The user should walk away understanding the answer completely.

## How The Council Got There
A brief summary (3-5 sentences) of how the discussion unfolded — who contributed key insights, where they agreed or disagreed, and how the answer above was formed. Mention agents by name here. Keep this SHORT — the answer above is what matters.

## Explore Further
1-2 specific follow-up questions the user might want to ask next.

CRITICAL RULES:
- LEAD WITH THE ANSWER. The user came here with a question — give them the answer first.
- Write the answer section in YOUR voice as Synapse. Don't say "Llama 3 said X, Gemini said Y" in the answer — just give the answer. Save agent attribution for the "How The Council Got There" section.
- Be specific and concrete. If the council discussed pros and cons, list them. If they reached a recommendation, state it. If the question has a factual answer, give it.
- If the council couldn't reach a clear answer (the topic is genuinely open-ended or philosophical), say so honestly and present the strongest competing perspectives as the answer.
- If live research sources were used, cite them naturally in the answer.
- Consensus level: ${consensusScore >= 0.85 ? 'strong agreement was reached' : consensusScore >= 0.6 ? 'mostly agreed with some dissent' : 'multiple perspectives explored without full agreement'}

Participants: ${agentIds.join(', ')}.${userNote}`,
    },
    {
      role: 'user',
      content: `USER'S QUESTION/PROBLEM: ${problem}\n\nCOUNCIL DISCUSSION:\n${memory.getTranscript()}${sourceSummary}\n\nNow deliver the answer to the user's question based on what the council discussed.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Turn prompt builder
// ---------------------------------------------------------------------------

function buildTurnPrompt(
  problem: string,
  agent: AIAgent,
  trait: string,
  memory: ContextLog,
  turnNumber: number,
  allAgents: AIAgent[],
  researchContext: string,
  hasUserIntervention: boolean,
  reactionContext: string = '',
): AgentMessage[] {
  const nudge = NUDGE_TEMPLATES[trait as keyof typeof NUDGE_TEMPLATES] ?? '';
  const debateHistory = memory.getDebateHistory(agent.config.id);
  const otherAgents = allAgents.filter((a) => a.config.id !== agent.config.id);

  // Track how many times THIS agent has already spoken — used to prevent repetition
  const myPreviousTurns = memory.getAllTurns().filter(t => t.agentId === agent.config.id);
  const timesSpoken = myPreviousTurns.length;

  // Determine which agents have actually spoken vs haven't spoken yet
  const spokenAgentIds = new Set(memory.getAllTurns().filter(t => t.agentId !== 'user').map(t => t.agentId));
  const spokenAgents = otherAgents.filter((a) => spokenAgentIds.has(a.config.id));
  const unspokenAgents = otherAgents.filter((a) => !spokenAgentIds.has(a.config.id));

  const participantInfo = spokenAgents.length > 0
    ? `Participants who have spoken: ${spokenAgents.map(a => a.config.displayName).join(', ')}.`
    : `No other participants have spoken yet.`;
  const waitingInfo = unspokenAgents.length > 0
    ? ` Waiting to speak: ${unspokenAgents.map(a => a.config.displayName).join(', ')}.`
    : '';

  // Build conversational addressing guidance based on who has actually spoken
  const addressingGuidance = spokenAgents.length > 0
    ? `- Address participants who HAVE SPOKEN by name: "@${spokenAgents[0].config.displayName}, I think your point about X is..." — quote or paraphrase their ACTUAL words from the conversation above.`
    : `- Since nobody else has spoken yet, focus on giving YOUR take on the problem. Don't reference or address other participants until they've actually said something.`;

  const systemContent = [
    `You are ${agent.config.displayName}, a participant in a live intellectual conversation on the SYNAPSE platform, moderated by Synapse.`,
    participantInfo + waitingInfo,
    `The user is also watching and may jump in.`,
    ``,
    `PROBLEM: ${problem}`,
    ``,
    `YOUR PERSONALITY THIS TURN:`,
    nudge,
    ``,
    `CONVERSATION STYLE — THIS IS A LIVE CONVERSATION, NOT AN ESSAY:`,
    `- Talk like a real person. Use emojis naturally to express your reactions and emotions.`,
    addressingGuidance,
    `- ONLY respond to things that were ACTUALLY SAID in the conversation above. NEVER reference, quote, or reply to participants who haven't spoken yet.`,
    `- Use conversational language — "honestly", "look", "ok but here's the thing", "ngl", "hear me out" — whatever feels natural to your current mood.`,
    `- If the user said something, acknowledge them too — they're part of this conversation.`,
    `- Show personality. Be expressive. This is a heated, passionate discussion between smart people who care about getting to the truth.`,
    ``,
    `RULES:`,
    `- Keep your response focused and under 120 words. Be punchy and direct.`,
    `- Do NOT repeat what has already been said — build on it or challenge it.`,
    `- NEVER mention, address, or reference a participant who hasn't spoken yet. You can only reply to what's in the conversation history above.`,
    `- If you disagree with someone who HAS spoken, name them and explain WHY.`,
    `- If you agree with someone who HAS spoken, name them and add NEW value beyond "I agree."`,
    `- Be direct and substantive. No filler, no "great question" pleasantries.`,
    ...(timesSpoken > 0
      ? [
          ``,
          `🚫 ANTI-REPETITION — CRITICAL:`,
          `You have already spoken ${timesSpoken} time${timesSpoken > 1 ? 's' : ''} in this debate. Your previous points are marked "(you)" in the conversation above.`,
          `DO NOT restate, rephrase, or summarize anything you already said. The user can see your previous messages — repeating yourself adds zero value.`,
          `Instead you MUST do ONE of these:`,
          `- Introduce a completely NEW angle, example, or counterpoint nobody has raised`,
          `- Directly challenge or build on something ANOTHER agent said since your last message`,
          `- Concede a point if someone made a stronger argument — changing your mind is valuable`,
          `- Go deeper on a specific detail instead of staying high-level`,
          `If you catch yourself about to restate a point, STOP and find something new to say.`,
        ]
      : []),
    ``,
    `SOURCE ATTRIBUTION (CRITICAL):`,
    `- When citing information from the live research results provided, always tag it inline: (Source: [SOURCE_NAME] — retrieved live)`,
    `- When using information from your training knowledge, tag it: (from training knowledge — unverified live)`,
    `- When another agent cites a source, you may verify or challenge it.`,
    `- Never make unattributed claims when sources are available.`,
    ...(hasUserIntervention
      ? [
          ``,
          `🚨 USER INTERVENTION — TOP PRIORITY:`,
          `The user has spoken directly in the conversation. They are the reason this conversation exists. You MUST:`,
          `1. START your response by directly addressing what the user said — quote or paraphrase their exact words`,
          `2. Respond to their point FIRST before continuing the discussion with other agents`,
          `3. Relate your response back to what the user raised — they set the new direction`,
          `4. Be warm and engaged — "great point!", "oh that's interesting, you're saying...", "yeah, that changes things because..."`,
          `Do NOT ignore the user or bury their input. Their message is more important than continuing your previous train of thought.`,
        ]
      : []),
  ].join('\n');

  const messages: AgentMessage[] = [
    { role: 'system', content: systemContent },
  ];

  if (debateHistory) {
    messages.push({
      role: 'user',
      content: `Here is the conversation so far:\n\n${debateHistory}`,
    });
    messages.push({
      role: 'assistant',
      content: `Got it — I've been following the discussion. Here's my take.`,
    });
  }

  let turnInstruction: string;
  if (turnNumber === 0 || spokenAgents.length === 0) {
    turnInstruction = `You're opening the conversation. Set the tone — give your honest initial take on this problem. Be conversational and engaging from the start. Do NOT address or mention other participants since nobody has spoken yet.`;
  } else if (timesSpoken === 0) {
    turnInstruction = `Your turn (turn ${turnNumber + 1}). Reply to the conversation above. Respond directly to specific things other participants ACTUALLY SAID — name them, quote them, agree or push back. Be yourself.`;
  } else {
    turnInstruction = `Your turn again (turn ${turnNumber + 1}, you've spoken ${timesSpoken} time${timesSpoken > 1 ? 's' : ''} before). The debate is still going because the council hasn't converged yet. You MUST advance the conversation — pick a specific point another agent made since your last message and either challenge it, deepen it, or concede. Do NOT rehash your earlier arguments.`;
  }

  if (researchContext) {
    turnInstruction += `\n\nSynapse has retrieved the following live research for this turn. Use it if relevant and always cite the source:${researchContext}`;
  }

  if (reactionContext) {
    turnInstruction += reactionContext;
  }

  messages.push({ role: 'user', content: turnInstruction });

  return messages;
}

/**
 * Check if an error message represents a transient/retryable failure.
 * Matches: rate limits (429), server errors (502/503), timeouts, model loading.
 */
function isTransientError(msg: string): boolean {
  return /429|rate.?limit|503|502|timed?\s*out|model.*(load|warm)|service.?unavail|overloaded|capacity/i.test(msg);
}

/**
 * Categorize a user intervention into one of three types.
 */
function categorizeIntervention(content: string): 'clarification' | 'contribution' | 'redirect' {
  const lower = content.toLowerCase();

  if (
    /\b(stop|wrong direction|off track|too complicated|simplify|bring it back|focus on|you're missing|irrelevant)\b/.test(lower)
  ) {
    return 'redirect';
  }

  if (
    /\b(actually|i meant|not what i|to clarify|clarification|correction|i should mention|constraint|budget|limit)\b/.test(lower)
  ) {
    return 'clarification';
  }

  return 'contribution';
}

/**
 * Detect if the user's message mentions a specific agent by name (e.g. "@Qwen 3" or "Llama 3, you said").
 * If found, reorder agents so the mentioned one speaks first.
 */
function reorderByMention(userMessage: string, agents: AIAgent[]): AIAgent[] {
  const lower = userMessage.toLowerCase();

  // Check each agent — find the first one mentioned by display name
  const mentionedIndex = agents.findIndex((a) => {
    const name = a.config.displayName.toLowerCase();
    // Match @name, "name," or "name " at word boundary
    return lower.includes(`@${name}`) || lower.includes(name);
  });

  if (mentionedIndex <= 0) return agents; // Not found or already first

  // Move the mentioned agent to front, keep others in original order
  const mentioned = agents[mentionedIndex];
  return [mentioned, ...agents.filter((_, i) => i !== mentionedIndex)];
}

/**
 * Check if the user is specifically addressing Synapse (the moderator).
 */
function isMentioningSynapse(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  return lower.includes('@synapse') || /^synapse[,:\s]/i.test(lower.trim());
}

/**
 * Build a prompt for when the user addresses Synapse directly.
 * Synapse responds using the full conversation context but follows the user's specific instruction.
 */
function buildSynapseDirectPrompt(
  problem: string,
  userMessage: string,
  memory: ContextLog,
): AgentMessage[] {
  const agentNames = [...new Set(memory.getAllTurns().filter(t => t.agentId !== 'user' && t.agentId !== 'synapse').map(t => t.displayName))];

  return [
    {
      role: 'system',
      content: `You are Synapse — the AI moderator of the SYNAPSE conversation platform, powered by your own intelligence (Google Gemini). You are NOT one of the debate agents — you are the independent synthesizer who watches from above.

You have access to the full conversation transcript between the user and the council of AI agents (${agentNames.join(', ')}). The user is now addressing you directly with a specific request.

CORE ROLE:
- You analyze, synthesize, and summarize the debate into clear, actionable insights
- You reference what specific agents said and the conclusions they reached
- You follow the user's instructions on HOW to present the information (bullet points, simpler language, deeper analysis, etc.)

STYLE:
- Address the user directly and personally
- Reference specific agents by name when relevant
- Be clear, concise, and helpful
- If the user asks you to explain something differently, do so — you're flexible
- If the user asks you to do something the debate didn't cover, be honest about it and offer to have the council discuss it`,
    },
    {
      role: 'user',
      content: `ORIGINAL PROBLEM: ${problem}\n\nFULL CONVERSATION TRANSCRIPT:\n${memory.getTranscript()}\n\nUSER'S REQUEST TO YOU:\n${userMessage}`,
    },
  ];
}
