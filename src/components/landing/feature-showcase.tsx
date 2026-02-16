import { AnimateOnScroll } from './animate-on-scroll';

/* ── Mock data for static UI previews ────────────────────────── */

const MOCK_MESSAGES = [
  {
    name: 'Dr. Nexus',
    color: 'var(--agent-blue)',
    avatar: 'N',
    text: 'The evidence strongly suggests that a microservices architecture would introduce unnecessary complexity at this stage. A modular monolith gives us the same separation of concerns without the operational overhead.',
    badge: 'Analytical',
    badgeColor: 'bg-blue-500/15 text-blue-400',
  },
  {
    name: 'Aria Voss',
    color: 'var(--agent-red)',
    avatar: 'A',
    text: 'I disagree. You\'re underestimating the scaling bottlenecks. When traffic spikes hit, that monolith becomes a single point of failure.',
    badge: 'Skeptical',
    badgeColor: 'bg-red-500/15 text-red-400',
    replyTo: 'Dr. Nexus',
    reactions: { '🔥': 3, '👍': 2 },
  },
  {
    name: 'Kai Mercer',
    color: 'var(--agent-green)',
    avatar: 'K',
    text: 'What if we start with a modular monolith but design the module boundaries as future service boundaries? We get simplicity now with a clear migration path.',
    badge: 'Synthesizing',
    badgeColor: 'bg-green-500/15 text-green-400',
    reactions: { '💡': 4, '👍': 5 },
  },
];

const MOCK_AGENTS = [
  { name: 'Dr. Nexus', avatar: 'N', color: 'var(--agent-blue)', badge: 'Analytical', badgeColor: 'bg-blue-500/15 text-blue-400' },
  { name: 'Aria Voss', avatar: 'A', color: 'var(--agent-red)', badge: 'Skeptical', badgeColor: 'bg-red-500/15 text-red-400' },
];

/* ── Showcase Sections ───────────────────────────────────────── */

function MockMessageFeed() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {MOCK_MESSAGES.map((msg, i) => (
        <div key={i} className="flex gap-3 border-b border-border/50 px-4 py-3 last:border-b-0">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: msg.color }}
          >
            {msg.avatar}
          </div>
          <div className="min-w-0 flex-1">
            {msg.replyTo && (
              <div className="mb-1 flex items-center gap-1 text-[10px] text-text-muted">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 3L3 3L3 7" />
                </svg>
                Replying to {msg.replyTo}
              </div>
            )}
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: msg.color }}>{msg.name}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${msg.badgeColor}`}>
                {msg.badge}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-200">{msg.text}</p>
            {msg.reactions && (
              <div className="mt-2 flex gap-1.5">
                {Object.entries(msg.reactions).map(([emoji, count]) => (
                  <span key={emoji} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[10px]">
                    {emoji} <span className="text-text-muted">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MockSidebar() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      {/* Consensus */}
      <div className="border-b border-border p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Consensus</h4>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-amber-400">67%</span>
          <span className="text-[10px] text-text-muted">Converging</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface-overlay">
          <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
        </div>
      </div>

      {/* Momentum */}
      <div className="border-b border-border p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Momentum</h4>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-orange-400">45%</span>
          <span className="text-[10px] text-orange-400">↑ Heating</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface-overlay">
          <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
        </div>
      </div>

      {/* Agents */}
      <div className="p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Council Members</h4>
        <div className="space-y-2">
          {MOCK_AGENTS.map((agent) => (
            <div key={agent.name} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: agent.color }}
              >
                {agent.avatar}
              </div>
              <div>
                <p className="text-xs font-medium text-text-primary">{agent.name}</p>
                <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-medium ${agent.badgeColor}`}>
                  {agent.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockReplayPlayer() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      {/* Mock messages area */}
      <div className="space-y-2 p-4">
        {MOCK_MESSAGES.slice(0, 2).map((msg, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: msg.color }}
            >
              {msg.avatar}
            </div>
            <div className="rounded-lg bg-background px-3 py-1.5">
              <span className="text-[10px] font-medium" style={{ color: msg.color }}>{msg.name}</span>
              <p className="text-[11px] leading-relaxed text-neutral-300">{msg.text.slice(0, 80)}...</p>
            </div>
          </div>
        ))}
      </div>

      {/* Player bar */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <path d="M2.5 1v10l8-5z" />
            </svg>
          </div>
          <span className="text-[10px] tabular-nums text-text-muted">1:24</span>
          <div className="flex-1">
            <div className="h-1 rounded-full bg-surface-overlay">
              <div className="h-full w-[31%] rounded-full bg-accent" />
            </div>
          </div>
          <span className="text-[10px] tabular-nums text-text-muted">4:30</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {[0.5, 1, 2, 4].map((s) => (
              <span
                key={s}
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  s === 1 ? 'bg-accent/15 text-accent' : 'text-text-muted'
                }`}
              >
                {s}x
              </span>
            ))}
          </div>
          <span className="rounded-lg bg-surface-overlay px-2.5 py-1 text-[9px] font-medium text-text-secondary">
            Share
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Showcase sections data ──────────────────────────────────── */

const SECTIONS = [
  {
    title: 'Watch the Debate Unfold',
    description:
      'Follow the conversation in real-time as AI agents present arguments, challenge each other, and build on ideas. React with emojis, see reply threading, and intervene as the moderator whenever you want.',
    mock: <MockMessageFeed />,
  },
  {
    title: 'Track Real-Time Dynamics',
    description:
      'Monitor consensus as it forms, watch debate momentum shift between heating and cooling, and see each agent\'s psychological state evolve throughout the discussion.',
    mock: <MockSidebar />,
    reverse: true,
  },
  {
    title: 'Replay Any Debate',
    description:
      'Every debate is automatically recorded. Share replay links with anyone — they can watch the full debate unfold with adjustable playback speed and full timeline control.',
    mock: <MockReplayPlayer />,
  },
];

export function FeatureShowcase() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-5xl space-y-24">
        {SECTIONS.map((section, i) => (
          <AnimateOnScroll key={section.title}>
            <div
              className={`flex flex-col items-center gap-8 md:gap-12 ${
                section.reverse ? 'md:flex-row-reverse' : 'md:flex-row'
              }`}
            >
              {/* Text side */}
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                  {section.title}
                </h3>
                <p className="text-base leading-relaxed text-text-secondary">
                  {section.description}
                </p>
              </div>

              {/* Mock UI side */}
              <div className="w-full flex-1">
                {section.mock}
              </div>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </section>
  );
}
