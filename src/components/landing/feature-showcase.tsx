import { AnimateOnScroll } from './animate-on-scroll';

/* ── Mock data for static UI previews ────────────────────────── */

const MOCK_MESSAGES = [
  {
    name: 'Dr. Nexus',
    color: 'var(--agent-blue)',
    avatar: 'N',
    text: 'The evidence strongly suggests that a microservices architecture would introduce unnecessary complexity at this stage. A modular monolith gives us the same separation of concerns without the operational overhead.',
    badge: 'Analytical',
    badgeColor: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  },
  {
    name: 'Aria Voss',
    color: 'var(--agent-red)',
    avatar: 'A',
    text: 'I disagree. You\'re underestimating the scaling bottlenecks. When traffic spikes hit, that monolith becomes a single point of failure.',
    badge: 'Skeptical',
    badgeColor: 'bg-red-500/15 text-red-400 border border-red-500/20',
    replyTo: 'Dr. Nexus',
    reactions: { '🔥': 3, '👍': 2 },
  },
  {
    name: 'Kai Mercer',
    color: 'var(--agent-green)',
    avatar: 'K',
    text: 'What if we start with a modular monolith but design the module boundaries as future service boundaries? We get simplicity now with a clear migration path.',
    badge: 'Synthesizing',
    badgeColor: 'bg-green-500/15 text-green-400 border border-green-500/20',
    reactions: { '💡': 4, '👍': 5 },
  },
];

const MOCK_AGENTS = [
  { name: 'Dr. Nexus', avatar: 'N', color: 'var(--agent-blue)', badge: 'Analytical', badgeColor: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  { name: 'Aria Voss', avatar: 'A', color: 'var(--agent-red)', badge: 'Skeptical', badgeColor: 'bg-red-500/15 text-red-400 border border-red-500/20' },
];

/* ── Mock UI components with glass treatment ─────────────────── */

function MockMessageFeed() {
  return (
    <div className="overflow-hidden rounded-xl glass">
      {MOCK_MESSAGES.map((msg, i) => (
        <div key={i} className="flex gap-3 border-b border-white/[0.04] px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.02]">
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
              <span className="text-sm font-semibold" style={{ color: msg.color }}>{msg.name}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${msg.badgeColor}`}>
                {msg.badge}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-200">{msg.text}</p>
            {msg.reactions && (
              <div className="mt-2 flex gap-1.5">
                {Object.entries(msg.reactions).map(([emoji, count]) => (
                  <span key={emoji} className="inline-flex items-center gap-1 rounded-full glass-subtle px-2 py-0.5 text-[10px]">
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
    <div className="overflow-hidden rounded-xl glass">
      {/* Consensus */}
      <div className="border-b border-white/[0.04] p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Consensus</h4>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-amber-400">67%</span>
          <span className="text-[10px] text-text-muted">Converging</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.04]">
          <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400" />
        </div>
      </div>

      {/* Momentum */}
      <div className="border-b border-white/[0.04] p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Momentum</h4>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-orange-400">45%</span>
          <span className="text-[10px] text-orange-400">↑ Heating</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.04]">
          <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-orange-500/60 to-red-500" />
        </div>
      </div>

      {/* Agents */}
      <div className="p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Council Members</h4>
        <div className="space-y-2">
          {MOCK_AGENTS.map((agent) => (
            <div key={agent.name} className="flex items-center gap-2 rounded-lg glass-subtle p-2.5">
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
    <div className="overflow-hidden rounded-xl glass">
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
            <div className="rounded-lg glass-subtle px-3 py-1.5">
              <span className="text-[10px] font-medium" style={{ color: msg.color }}>{msg.name}</span>
              <p className="text-[11px] leading-relaxed text-neutral-300">{msg.text.slice(0, 80)}...</p>
            </div>
          </div>
        ))}
      </div>

      {/* Player bar */}
      <div className="border-t border-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
              <path d="M2.5 1v10l8-5z" />
            </svg>
          </div>
          <span className="text-[10px] tabular-nums text-text-muted">1:24</span>
          <div className="relative flex-1">
            <div className="h-1 rounded-full bg-white/[0.04]">
              <div className="h-full w-[31%] rounded-full bg-accent" />
            </div>
            {/* Glowing dot at progress position */}
            <div className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_6px_rgba(99,102,241,0.5)]" style={{ left: '31%' }} />
          </div>
          <span className="text-[10px] tabular-nums text-text-muted">4:30</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {[0.5, 1, 2, 4].map((s) => (
              <span
                key={s}
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  s === 1 ? 'glass border-accent/30 text-accent' : 'text-text-muted'
                }`}
              >
                {s}x
              </span>
            ))}
          </div>
          <span className="glass-subtle rounded-lg px-2.5 py-1 text-[9px] font-medium text-text-secondary">
            Share
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Showcase sections ───────────────────────────────────────── */

const SECTIONS = [
  {
    title: 'Watch the Conversation Unfold',
    description:
      'Follow the conversation in real-time as AI agents present arguments, challenge each other, and build on ideas. React with emojis, see reply threading, and intervene as the moderator whenever you want.',
    mock: <MockMessageFeed />,
    textVariant: 'slide-left' as const,
    mockVariant: 'scale-in' as const,
  },
  {
    title: 'Track Real-Time Dynamics',
    description:
      'Monitor consensus as it forms, watch conversation momentum shift between heating and cooling, and see each agent\'s psychological state evolve throughout the discussion.',
    mock: <MockSidebar />,
    reverse: true,
    textVariant: 'slide-right' as const,
    mockVariant: 'scale-in' as const,
  },
  {
    title: 'Replay Any Conversation',
    description:
      'Every conversation is automatically recorded. Share replay links with anyone — they can watch the full conversation unfold with adjustable playback speed and full timeline control.',
    mock: <MockReplayPlayer />,
    textVariant: 'slide-left' as const,
    mockVariant: 'scale-in' as const,
  },
];

export function FeatureShowcase() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-5xl space-y-24">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className={`flex flex-col items-center gap-8 md:gap-12 ${
              section.reverse ? 'md:flex-row-reverse' : 'md:flex-row'
            }`}
          >
            {/* Text side */}
            <AnimateOnScroll variant={section.textVariant} className="flex-1 space-y-4">
              <h3 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                {section.title}
              </h3>
              <p className="text-base leading-relaxed text-text-secondary">
                {section.description}
              </p>
            </AnimateOnScroll>

            {/* Mock UI side */}
            <AnimateOnScroll variant={section.mockVariant} delay={150} className="relative w-full flex-1">
              {/* Subtle glow behind mock UI */}
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-accent/[0.04] blur-2xl" aria-hidden="true" />
              {section.mock}
            </AnimateOnScroll>
          </div>
        ))}
      </div>
    </section>
  );
}
