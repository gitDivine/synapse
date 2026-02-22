import { AnimateOnScroll } from './animate-on-scroll';

const STEPS = [
  {
    number: 1,
    title: 'Submit Your Problem',
    description:
      'Describe any challenge, question, or dilemma. From technical decisions to philosophical discussions.',
  },
  {
    number: 2,
    title: 'Council Assembles',
    description:
      'AI agents with unique personalities and thinking styles form a conversation panel tailored to your problem.',
  },
  {
    number: 3,
    title: 'Truth Emerges',
    description:
      'Watch agents discuss, challenge, and converge in real-time. Get a final verdict that survives scrutiny.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <AnimateOnScroll className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-base text-text-secondary">
            From question to verdict in three steps.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll>
          <div className="flex flex-col gap-8 md:flex-row md:gap-6">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex flex-1 flex-col items-center md:items-center">
                {/* Step content */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-lg font-bold text-accent">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">
                    {step.description}
                  </p>
                </div>

                {/* Connecting line (desktop only, not after last) */}
                {i < STEPS.length - 1 && (
                  <div className="mt-4 hidden h-[1px] w-full bg-gradient-to-r from-transparent via-border to-transparent md:absolute md:left-full md:top-6 md:block md:w-full" />
                )}
              </div>
            ))}
          </div>

          {/* Desktop connecting dashes */}
          <div className="mt-6 hidden items-center justify-center gap-1 md:flex">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
