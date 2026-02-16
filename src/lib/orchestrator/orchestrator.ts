import type { AIAgent, AgentMessage, ProviderType } from '@/lib/agents/types';
import type { SSEEvent } from '@/lib/streaming/event-types';
import type { DebateSession } from '@/lib/session/types';
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

const councilAssembler = new CouncilAssembler();
const consensusDetector = new ConsensusDetector();
const summaryGenerator = new SummaryGenerator();

export async function* runDebate(
  session: DebateSession,
  apiKeys: Partial<Record<ProviderType, string>>,
  sessionId: string,
): AsyncIterable<SSEEvent> {
  // 1. Assemble the council
  const agents = councilAssembler.assemble(session.problem, apiKeys);

  if (agents.length === 0) {
    yield {
      type: 'error',
      data: { message: 'No API keys configured. Add at least one provider API key.' },
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

  // 2. Initialize psychological states
  const psychEngine = new PsychologicalStateEngine();
  psychEngine.assignInitialStates(agents);

  // 3. Set up turn management, memory, and search
  const turnManager = new TurnManager(agents, {
    maxTurns: agents.length * 3,
    maxRounds: 3,
  });
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
  while (!turnManager.isComplete()) {
    // Check for user interventions before each turn
    const interventions = sessionStore.drainInterventions(sessionId);
    for (const intervention of interventions) {
      // Categorize the intervention
      const category = categorizeIntervention(intervention.content);

      // Log into memory with category marker
      memory.addTurn('user', `[${category.toUpperCase()}] ${intervention.content}`, 'intervention', 'User');

      yield {
        type: 'user:intervention',
        data: {
          content: intervention.content,
          category,
          timestamp: intervention.timestamp,
        },
        timestamp: Date.now(),
      };
    }

    const agent = turnManager.nextAgent();
    const psychState = psychEngine.getState(agent.config.id);
    if (!psychState) break;

    const messageId = `msg-${turnManager.turn}-${agent.config.id}`;

    // Decide whether to search before this turn
    const lastContent = memory.getAllTurns().at(-1)?.content ?? session.problem;
    const searchDecision = searchRouter.decide(lastContent, session.problem, turnManager.turn);
    let researchContext = '';

    if (searchDecision.shouldSearch) {
      const results = await searchRouter.search(searchDecision);
      if (results.length > 0) {
        allResearchResults.push(...results);
        researchContext = searchRouter.formatForContext(results);

        // Notify the UI that research was found
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
      data: {
        agentId: agent.config.id,
        messageId,
        psychState: psychState.current,
      },
      timestamp: Date.now(),
    };

    // Read audience reactions for context injection
    const allReactions = sessionStore.get(sessionId)?.reactions ?? {};
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

    // Build the turn prompt with search results and source attribution rules
    const messages = buildTurnPrompt(
      session.problem,
      agent,
      psychState.current,
      memory,
      turnManager.turn,
      agents,
      researchContext,
      interventions.length > 0,
      reactionContext,
    );

    // Stream the agent's response
    let fullResponse = '';
    try {
      for await (const chunk of agent.stream(messages)) {
        if (chunk.type === 'text_delta') {
          fullResponse += chunk.content;
          yield {
            type: 'agent:chunk',
            data: {
              agentId: agent.config.id,
              messageId,
              content: chunk.content,
            },
            timestamp: Date.now(),
          };
        }
        if (chunk.type === 'error') {
          yield {
            type: 'error',
            data: { message: chunk.content },
            timestamp: Date.now(),
          };
          break;
        }
      }
    } catch (err) {
      yield {
        type: 'error',
        data: {
          message: `${agent.config.displayName} error: ${err instanceof Error ? err.message : 'Unknown'}`,
        },
        timestamp: Date.now(),
      };
      turnManager.advanceTurn();
      continue;
    }

    // Mark turn done
    yield {
      type: 'agent:done',
      data: { agentId: agent.config.id, messageId },
      timestamp: Date.now(),
    };

    // Update memory with display name for cross-agent referencing
    memory.addTurn(agent.config.id, fullResponse, psychState.current, agent.config.displayName);

    // Transition psychological state
    const newState = psychEngine.transition(
      agent.config.id,
      fullResponse,
      consensusScore,
      turnManager.turn,
    );

    if (newState.current !== psychState.current) {
      yield {
        type: 'psych:state_change',
        data: {
          agentId: agent.config.id,
          from: psychState.current,
          to: newState.current,
        },
        timestamp: Date.now(),
      };
    }

    // Check consensus
    prevConsensusScore = consensusScore;
    consensusScore = consensusDetector.evaluate(memory.getAllTurns());
    consensusHistory.push({ turn: turnManager.turn, score: consensusScore });
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
      interventions.length > 0,
      newState.current !== psychState.current,
    );
    yield {
      type: 'momentum:update',
      data: { momentum: momentumResult.momentum, direction: momentumResult.direction },
      timestamp: Date.now(),
    };

    // Detect quote-reply references
    const agentInfos = agents.map((a) => ({ id: a.config.id, displayName: a.config.displayName }));
    const messageInfos = memory.getAllTurns().slice(0, -1).map((t, i) => ({
      id: `msg-${i}-${t.agentId}`,
      agentId: t.agentId,
      content: t.content,
    }));
    const quotes = quoteDetector.detect(fullResponse, agent.config.id, agentInfos, messageInfos);
    for (const quote of quotes) {
      const linkData = {
        sourceMessageId: quote.referencedMessageId,
        targetMessageId: messageId,
        agentName: quote.referencedAgentName,
        excerpt: quote.excerpt,
      };
      allQuoteLinks.push(linkData);
      yield {
        type: 'quote:linked',
        data: linkData,
        timestamp: Date.now(),
      };
    }

    if (consensusScore > 0.85) {
      turnManager.markConverged();
    }

    turnManager.advanceTurn();
  }

  // 5. Generate Synapse's verdict
  const summaryAgent = summaryGenerator.pickAgent(agents);
  const structuredSummary = await summaryGenerator.generate(
    summaryAgent,
    session.problem,
    memory,
    consensusScore,
    allResearchResults,
  );

  // 6. Score message influence
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
    structuredSummary.keyMoments,
    consensusHistory,
    allQuoteLinks,
  );

  // Save transcript + summary agent for follow-up questions
  sessionStore.update(sessionId, {
    debateTranscript: memory.getTranscript(),
    summaryAgentId: summaryAgent.config.id,
  });

  yield {
    type: 'debate:summary',
    data: { ...structuredSummary, consensusHistory, quoteLinks: allQuoteLinks, influence },
    timestamp: Date.now(),
  };

  yield { type: 'debate:end', data: {}, timestamp: Date.now() };
}

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
  const otherNames = otherAgents.map((a) => a.config.displayName).join(', ');

  const systemContent = [
    `You are ${agent.config.displayName}, a participant in a live intellectual debate on the SYNAPSE platform, moderated by Synapse.`,
    `Other participants: ${otherNames}.`,
    `The user is also watching and may jump in.`,
    ``,
    `PROBLEM: ${problem}`,
    ``,
    `YOUR PERSONALITY THIS TURN:`,
    nudge,
    ``,
    `CONVERSATION STYLE — THIS IS A LIVE DEBATE, NOT AN ESSAY:`,
    `- Talk like a real person. Use emojis naturally to express your reactions and emotions.`,
    `- Address other participants DIRECTLY by name: "@${otherAgents[0]?.config.displayName ?? 'them'}, I think your point about X is..." or "${otherAgents[0]?.config.displayName ?? 'they'}, when you said Y, did you consider...?"`,
    `- REPLY to specific things others have said. Quote or paraphrase their exact points before responding.`,
    `- Use conversational language — "honestly", "look", "ok but here's the thing", "ngl", "hear me out" — whatever feels natural to your current mood.`,
    `- React to what happened in the discussion: agree, disagree, build on, challenge, or riff on specific arguments.`,
    `- If the user said something, acknowledge them too — they're part of this conversation.`,
    `- Show personality. Be expressive. This is a heated, passionate discussion between smart people who care about getting to the truth.`,
    ``,
    `RULES:`,
    `- Keep your response focused and under 250 words.`,
    `- Do NOT repeat what has already been said — build on it or challenge it.`,
    `- If you disagree, name WHO you disagree with and explain WHY.`,
    `- If you agree, name WHO you agree with and add NEW value beyond "I agree."`,
    `- Be direct and substantive. No filler, no "great question" pleasantries.`,
    ``,
    `SOURCE ATTRIBUTION (CRITICAL):`,
    `- When citing information from the live research results provided, always tag it inline: (Source: [SOURCE_NAME] — retrieved live)`,
    `- When using information from your training knowledge, tag it: (from training knowledge — unverified live)`,
    `- When another agent cites a source, you may verify or challenge it.`,
    `- Never make unattributed claims when sources are available.`,
    ...(hasUserIntervention
      ? [
          ``,
          `USER INTERVENTION:`,
          `The user has spoken directly in the debate. Acknowledge their input naturally — like a real colleague: "good point", "oh interesting, the user's saying...", "yeah that changes things" — then engage with substance.`,
        ]
      : []),
  ].join('\n');

  const messages: AgentMessage[] = [
    { role: 'system', content: systemContent },
  ];

  // Add debate history with display names for natural referencing
  if (debateHistory) {
    messages.push({
      role: 'user',
      content: `Here is the debate so far:\n\n${debateHistory}`,
    });
    messages.push({
      role: 'assistant',
      content: `Got it — I've been following the discussion. Here's my take.`,
    });
  }

  // Add research context if available
  let turnInstruction =
    turnNumber === 0
      ? `You're opening the debate. Set the tone — give your honest initial take on this problem. Be conversational and engaging from the start.`
      : `Your turn (turn ${turnNumber + 1}). Reply to the conversation above. Respond directly to specific things other participants said — name them, quote them, agree or push back. Be yourself.`;

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
 * Categorize a user intervention into one of three types.
 */
function categorizeIntervention(content: string): 'clarification' | 'contribution' | 'redirect' {
  const lower = content.toLowerCase();

  // Redirect signals — user wants to change direction
  if (
    /\b(stop|wrong direction|off track|too complicated|simplify|bring it back|focus on|you're missing|irrelevant)\b/.test(lower)
  ) {
    return 'redirect';
  }

  // Clarification signals — user is correcting or constraining
  if (
    /\b(actually|i meant|not what i|to clarify|clarification|correction|i should mention|constraint|budget|limit)\b/.test(lower)
  ) {
    return 'clarification';
  }

  // Default to contribution
  return 'contribution';
}
