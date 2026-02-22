import { AnimateOnScroll } from './animate-on-scroll';

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <circle cx="5" cy="18" r="3" />
        <circle cx="19" cy="18" r="3" />
        <path d="M12 12v2M8.5 16.5L10 14M15.5 16.5L14 14" />
      </svg>
    ),
    title: 'Multi-Agent Council',
    description: 'Diverse AI models from different providers form a conversation panel with unique perspectives.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a9 9 0 0 1 9 9c0 3.9-3 7.5-9 11.5C6 18.5 3 14.9 3 11a9 9 0 0 1 9-9z" />
        <circle cx="12" cy="11" r="3" />
      </svg>
    ),
    title: 'Psychological Dynamics',
    description: 'Agents develop real cognitive states — analytical, skeptical, curious, devil\'s advocate.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: 'Real-Time Consensus',
    description: 'Watch agreement emerge organically as agents challenge and refine each other\'s arguments.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M8 11h6M11 8v6" />
      </svg>
    ),
    title: 'Live Research',
    description: 'Agents search the web mid-conversation to back their arguments with real evidence.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
        <circle cx="15" cy="15" r="2" />
      </svg>
    ),
    title: 'Influence Mapping',
    description: 'See exactly which arguments shaped the final verdict with visual heat maps.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
        <path d="M19 3v18" />
      </svg>
    ),
    title: 'Shareable Replays',
    description: 'Record every conversation and share replay links with full playback controls.',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <AnimateOnScroll className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Everything you need for rigorous AI reasoning
          </h2>
          <p className="mt-3 text-base text-text-secondary">
            A complete toolkit for multi-perspective problem solving.
          </p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <AnimateOnScroll
              key={feature.title}
              delay={(i % 3) * 100}
            >
              <div className="group rounded-xl border border-border bg-surface-raised p-6 transition-colors hover:border-accent/30">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
