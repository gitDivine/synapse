'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils/cn';

const ORBITAL_PARTICLES = [
  { color: 'var(--agent-blue)', radius: 80, duration: 18, size: 8, opacity: 0.5 },
  { color: 'var(--agent-red)', radius: 120, duration: 22, size: 6, opacity: 0.4 },
  { color: 'var(--agent-green)', radius: 160, duration: 28, size: 10, opacity: 0.35 },
  { color: 'var(--agent-amber)', radius: 200, duration: 32, size: 7, opacity: 0.3 },
  { color: 'var(--agent-purple)', radius: 100, duration: 20, size: 5, opacity: 0.45 },
  { color: 'var(--agent-cyan)', radius: 180, duration: 26, size: 9, opacity: 0.35 },
];

const HEADLINE_WORDS = ['Where', 'AI', 'Minds', 'Collide'];

export function HeroSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4">
      {/* Grid texture overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Layered depth glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        {/* Layer 1: Large ambient glow */}
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px] animate-pulse-glow" />
        {/* Layer 2: Medium purple-cyan ellipse */}
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[400px] -translate-x-1/2 -translate-y-[60%] rounded-full blur-[100px] animate-pulse-glow" style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.08), rgba(6,182,212,0.05), transparent)', animationDelay: '-2s' }} />
        {/* Layer 3: Small focused hotspot */}
        <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[60px]" />
      </div>

      {/* Orbital agent particles */}
      {ORBITAL_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-orbit"
          style={{
            '--orbit-radius': `${p.radius}px`,
            '--orbit-duration': `${p.duration}s`,
            animationDelay: `${-i * 3}s`,
          } as React.CSSProperties}
          aria-hidden="true"
        >
          <div
            className="rounded-full"
            style={{
              width: p.size,
              height: p.size,
              border: `1.5px solid ${p.color}`,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}40`,
            }}
          />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-3xl space-y-6 text-center">
        {/* Glass badge pill */}
        <motion.div
          className="inline-flex items-center gap-2 rounded-full glass px-3 py-1"
          initial={prefersReduced ? false : { opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-green-400"
            animate={prefersReduced ? {} : { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-text-secondary">
            Multi-Agent AI Conversation Platform
          </span>
        </motion.div>

        {/* Kinetic headline */}
        <h1 className="text-5xl font-bold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
          <span className="flex flex-wrap items-center justify-center gap-x-[0.3em]">
            {HEADLINE_WORDS.map((word, i) => (
              <motion.span
                key={word}
                className={cn(word === 'Collide' && 'tracking-tight')}
                initial={prefersReduced ? false : { opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  type: 'spring',
                  stiffness: 80,
                  damping: 18,
                  delay: 0.3 + i * 0.08,
                }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          <br />
          <motion.span
            className="gradient-text animate-gradient-shift"
            initial={prefersReduced ? false : { opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              type: 'spring',
              stiffness: 80,
              damping: 18,
              delay: 0.7,
            }}
          >
            to Find Truth
          </motion.span>
        </h1>

        {/* Subheading */}
        <motion.p
          className="mx-auto max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg"
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.9 }}
        >
          Submit any problem. A council of AI agents will discuss, challenge,
          and converge on the strongest answer — one that survives real scrutiny.
        </motion.p>

        {/* Dual CTAs */}
        <motion.div
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 1.1 }}
        >
          <motion.a
            href="#start"
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-xl',
              'bg-gradient-to-r from-accent via-purple-500 to-cyan-600 px-6 text-sm font-medium text-white',
              'transition-shadow hover:shadow-[0_0_40px_rgba(99,102,241,0.25)]',
              'w-full sm:w-auto'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Start a Conversation
            <span aria-hidden="true">&rarr;</span>
          </motion.a>
          <motion.a
            href="#how-it-works"
            className={cn(
              'inline-flex h-11 items-center justify-center rounded-xl',
              'glass px-6 text-sm font-medium text-text-secondary',
              'transition-all hover:border-accent/30 hover:text-text-primary hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]',
              'w-full sm:w-auto'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            See How It Works
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
