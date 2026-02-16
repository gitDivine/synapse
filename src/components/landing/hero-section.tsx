import { cn } from '@/lib/utils/cn';

const AGENT_DOTS = [
  { color: 'bg-agent-blue', size: 'h-3 w-3', top: '15%', left: '10%', delay: '0s' },
  { color: 'bg-agent-red', size: 'h-2.5 w-2.5', top: '25%', right: '12%', delay: '1s' },
  { color: 'bg-agent-green', size: 'h-2 w-2', bottom: '30%', left: '15%', delay: '2s' },
  { color: 'bg-agent-amber', size: 'h-3.5 w-3.5', top: '60%', right: '8%', delay: '3s' },
  { color: 'bg-agent-purple', size: 'h-2 w-2', top: '10%', right: '25%', delay: '1.5s' },
  { color: 'bg-agent-cyan', size: 'h-2.5 w-2.5', bottom: '20%', right: '20%', delay: '4s' },
];

export function HeroSection() {
  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4">
      {/* Background glow orb */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px] animate-hero-glow sm:h-[500px] sm:w-[500px]" />

      {/* Floating agent dots (decorative) */}
      {AGENT_DOTS.map((dot, i) => (
        <div
          key={i}
          className={cn(
            'pointer-events-none absolute rounded-full opacity-40 animate-float',
            dot.color,
            dot.size
          )}
          style={{
            top: dot.top,
            left: dot.left,
            right: dot.right,
            bottom: dot.bottom,
            animationDelay: dot.delay,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-3xl space-y-6 text-center">
        {/* Badge pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-xs font-medium text-text-secondary">
            Multi-Agent AI Debate Platform
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl font-bold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
          Where AI Minds Collide
          <br />
          <span className="text-accent">to Find Truth</span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
          Submit any problem. A council of AI agents will debate, challenge,
          and converge on the strongest answer — one that survives real scrutiny.
        </p>

        {/* Dual CTAs */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#start"
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-xl',
              'bg-accent px-6 text-sm font-medium text-white',
              'transition-all hover:bg-accent-hover active:scale-[0.98]',
              'w-full sm:w-auto'
            )}
          >
            Start a Debate
            <span aria-hidden="true">&rarr;</span>
          </a>
          <a
            href="#how-it-works"
            className={cn(
              'inline-flex h-11 items-center justify-center rounded-xl',
              'border border-border px-6 text-sm font-medium text-text-secondary',
              'transition-all hover:border-border-light hover:text-text-primary active:scale-[0.98]',
              'w-full sm:w-auto'
            )}
          >
            See How It Works
          </a>
        </div>
      </div>
    </section>
  );
}
