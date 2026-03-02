'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-20% 0px' });
  const prefersReduced = useReducedMotion();

  return (
    <section id="how-it-works" className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <AnimateOnScroll variant="fade-blur" className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-base text-text-secondary">
            From question to verdict in three steps.
          </p>
        </AnimateOnScroll>

        <div ref={sectionRef} className="relative">
          {/* SVG connecting line (desktop) */}
          <svg
            className="pointer-events-none absolute left-0 top-6 hidden h-[2px] w-full md:block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.line
              x1="17%"
              y1="1"
              x2="83%"
              y2="1"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="600"
              initial={{ strokeDashoffset: 600 }}
              animate={isInView && !prefersReduced ? { strokeDashoffset: 0 } : {}}
              transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
            />
          </svg>

          {/* Vertical connecting line (mobile) */}
          <svg
            className="pointer-events-none absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 md:hidden"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.line
              x1="1"
              y1="24"
              x2="1"
              y2="100%"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeOpacity="0.15"
              strokeDasharray="800"
              initial={{ strokeDashoffset: 800 }}
              animate={isInView && !prefersReduced ? { strokeDashoffset: 0 } : {}}
              transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
            />
          </svg>

          <div className="flex flex-col gap-12 md:flex-row md:gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative flex flex-1 flex-col items-center text-center"
                initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 18,
                  delay: 0.2 + i * 0.2,
                }}
              >
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-lg font-bold text-accent">
                    {step.number}
                  </div>
                  {/* Subtle glow behind circle */}
                  <div className="absolute inset-0 -z-10 rounded-full bg-accent/10 blur-lg" aria-hidden="true" />
                </div>
                <motion.h3
                  className="mt-4 text-lg font-semibold text-text-primary"
                  initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.2 }}
                >
                  {step.title}
                </motion.h3>
                <motion.p
                  className="mt-2 max-w-xs text-sm leading-relaxed text-text-secondary"
                  initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6 + i * 0.2 }}
                >
                  {step.description}
                </motion.p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
