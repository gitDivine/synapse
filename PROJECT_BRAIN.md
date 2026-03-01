# SYNAPSE — Project Brain

## Project Summary
Multi-agent AI debate platform where diverse AI models argue, critique, and converge on answers to user problems through psychologically-driven structured debate. Users watch the live debate and can intervene mid-discussion.

## Current State
- **Phase**: Phase 3+ COMPLETE → ready for Phase 4 (Polish)
- **Status**: Full debate platform with live research, Synapse identity, narrative verdicts, post-debate follow-ups, and enhanced interventions
- **Blockers**: None

## Architecture
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4
- **Backend**: Next.js API Routes (Route Handlers)
- **Streaming**: SSE via ReadableStream + EventSource
- **State Management**: Zustand
- **Animation**: Motion (Framer Motion)
- **AI Integration**: Custom provider-agnostic agent interface (not Vercel AI SDK)
- **Session Storage**: In-memory Map with 2-hour TTL

## Active Tasks
- [x] Phase 1: Foundation (MVP single-agent flow) — COMPLETE
- [x] Phase 2: Multi-Agent Debate Engine — COMPLETE
  - [x] Orchestrator (async generator, turn management)
  - [x] Council assembler (agent selection by capability)
  - [x] Psychological state engine (8 traits, nudge templates, transitions)
  - [x] Multi-agent turn loop with debate history
  - [x] Consensus detection (heuristic scoring)
  - [x] Context/memory log for cross-turn references
  - [x] Summary generation via strongest agent
  - [x] Debate sidebar + consensus meter + summary panel UI
- [x] Phase 3: Advanced Features — COMPLETE
  - [x] User intervention (mid-debate messaging via POST /api/debate/[id]/intervene)
  - [x] Intervention queue in session store (push/drain pattern)
  - [x] Orchestrator checks intervention queue before each turn
  - [x] Dedicated summary generator module (structured JSON output with agent attribution)
  - [x] Richer summary UI (agent-colored key moments, attributed dissent)
  - [x] User intervention bar + user message rendering in feed
- [ ] Phase 4: Polish (all states, animations, mobile, a11y)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-16 | Next.js + Tailwind over plain HTML | Real-time chat UI needs component architecture, SSR, API routes |
| 2026-02-16 | Custom agent interface, not Vercel AI SDK | Full control over psych nudges, custom SSE events, prompt construction |
| 2026-02-16 | In-memory session store | Debates are ephemeral; no DB complexity for MVP |
| 2026-02-16 | SSE over WebSockets | Unidirectional streaming is sufficient; simpler implementation |
| 2026-02-16 | User-provided API keys (localStorage) | No server-side secret management needed |

## Session Log

### Session 1 — 2026-02-16
**Done:**
- Created global CLAUDE.md with engineering instructions
- Read and analyzed SYNAPSE product concept document
- Designed full 4-phase implementation plan
- Installed Node.js (v24.13.1), scaffolded Next.js project
- Installed core deps (clsx, tailwind-merge, zustand, motion, nanoid)
- Configured Tailwind v4 design tokens (dark theme, agent colors, animations)
- Created .env.local/.env.example for API keys
- Created cn() utility and typed env access

**Completed Phase 1:**
- Agent abstraction layer (types, registry, 5 provider adapters: OpenAI, Anthropic, Google, Groq, OpenRouter)
- Agent config system (5 pre-configured models)
- SSE streaming infrastructure (event types, encoder, client hook)
- Session store (in-memory Map with 2-hour TTL)
- API routes (POST /api/debate, GET /api/debate/[id]/stream)
- Landing page (hero section with problem input)
- Debate page (message feed with streaming, agent avatars, psych badges)
- Build verified: `npm run build` passes with zero errors

**Completed Phase 2:**
- Psychological state engine (8 traits, nudge templates, state transitions with devil's advocate rotation)
- Council assembler (greedy set-cover, 2-5 agents by capability coverage)
- Turn manager (round-robin with rotation, max 12 turns / 3 rounds, convergence termination)
- Context/memory log (cross-turn debate history injection into prompts)
- Consensus detector (heuristic scoring: stance shifts 3x > substantive agreement 2x > raw agreement 1x)
- Orchestrator (async generator running full debate loop: assemble → assign psych → debate turns → consensus check → summarize)
- Updated SSE stream route to use orchestrator, merging server-side + client API keys
- Updated useDebateStream hook with psych:state_change, consensus:update, debate:summary events
- 3 new provider adapters (Cohere, Together AI, HuggingFace) + 6 pre-configured agents
- Debate sidebar (agent roster with live psych states), consensus meter (animated), summary panel
- Build verified: `npm run build` passes with zero errors

**Completed Phase 3:**
- User intervention system: POST /api/debate/[id]/intervene endpoint with intervention queue in session store
- Orchestrator drains intervention queue before each turn, injects into memory as context for agents
- Dedicated SummaryGenerator class with structured JSON output (agent-attributed key moments, dissent, open questions)
- Richer summary panel with agent-colored names and attributed excerpts
- User intervention bar at bottom of debate view (appears during active debate)
- Message bubble + feed updated to render user messages with "Moderator" badge and accent background
- useDebateStream hook: added sendIntervention callback and user:intervention SSE event handler
- Build verified: `npm run build` passes with zero errors

### Session 2 — 2026-02-16
**Done — Live World Engine + Synapse Identity:**
- 8 external source adapters: Wikipedia, Reddit, DuckDuckGo, HackerNews, StackExchange, arXiv, GitHub, PubMed
- Source infrastructure: types, registry (parallel search with graceful failure), search router (heuristic decision engine, 6 search budget per debate)
- SearchRouter detects: contestable claims, recency signals, technical topics, science/medical, community opinion, knowledge gaps
- Orchestrator rewritten: integrates SearchRouter for live research, yields `research:results` SSE events
- Synapse identity: orchestrator AI named "Synapse", present in agent system prompts and UI
- Explicit source attribution: agents instructed to cite "(Source: X — retrieved live)" vs "(from training knowledge — unverified live)"
- Enhanced user intervention: categorization (clarification/contribution/redirect), agent acknowledgment instructions
- Summary generator rewritten: narrative verdict from Synapse (not bullet points), plain-language confidence, source compilation, user contribution acknowledgment
- Post-debate follow-up: POST /api/debate/[id]/followup endpoint, streaming SSE response from Synapse
- useDebateStream hook updated: research messages, followup streaming, SSE parsing for standard event/data format
- UI updates: summary panel (Synapse's Verdict, sources, user impact), message bubble (research messages with cyan badge), followup bar (post-debate Q&A with Synapse), debate container integration
- Fixed SSE parsing mismatch in askFollowup (event: line + data: line vs single data: line)
- Build verified: `npm run build` passes with zero errors

**Key files added/rewritten:**
- `src/lib/sources/` — types.ts, registry.ts, search-router.ts, adapters/ (8 files)
- `src/lib/orchestrator/orchestrator.ts` — rewritten with search + Synapse
- `src/lib/summary/generator.ts` — rewritten for narrative verdict
- `src/app/api/debate/[sessionId]/followup/route.ts` — new endpoint
- `src/components/debate/followup-bar.tsx` — new component
- Updated: event-types.ts, session types, use-debate-stream.ts, summary-panel, message-bubble, message-feed, debate-container

**Next Steps (Phase 4):**
- UI state coverage (loading/empty/error/success for all components)
- Spring physics animations, GPU-composited
- Mobile responsive (375px+), bottom sheets, 44px touch targets
- Accessibility (WCAG AA, focus rings, aria-labels, keyboard nav, screen reader live regions)
- Performance (dynamic imports, message list virtualization, SSE reconnect with backoff)

### Session — 2026-03-01
**Done — Gemini Council Agent + Multi-Key Rotation:**
- Added Gemini Flash as 4th council debate agent (id: gemini-flash, blue, avatar GF)
- Google provider now supports comma-separated `GOOGLE_AI_API_KEY` with round-robin rotation on 429 rate-limit errors
- Key separation: council Gemini uses keys[0..N-1], Synapse moderator uses keys[last] — separate quotas
- File analysis (analyze-attachment) also uses the dedicated last key
- With a single key, both share it gracefully (backwards compatible)
- TypeScript check passed, deployed to Vercel

**Key files modified:**
- `src/lib/agents/configs.ts` — added gemini-flash council config
- `src/lib/agents/providers/google.ts` — multi-key rotation on 429
- `src/lib/agents/synapse-agent.ts` — uses last key from comma-separated list
- `src/app/api/analyze-attachment/route.ts` — uses last key for file analysis

**Architecture note:**
- 4 council agents: Llama 3 (Groq), Mistral Small (Mistral), Command A (Cohere), Gemini Flash (Google)
- Synapse moderator: Gemini 2.5 Flash (Google, dedicated last key)
- `computeDebateParams(4)` returns `{ maxTurns: 4, maxRounds: 1 }` — fits within 60s Vercel limit
