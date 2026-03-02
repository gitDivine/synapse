'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils/cn';

const VARIANTS = {
  'fade-up': {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-blur': {
    hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
  'scale-in': {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
  'slide-left': {
    hidden: { opacity: 0, x: -32 },
    visible: { opacity: 1, x: 0 },
  },
  'slide-right': {
    hidden: { opacity: 0, x: 32 },
    visible: { opacity: 1, x: 0 },
  },
} as const;

interface AnimateOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: keyof typeof VARIANTS;
  once?: boolean;
}

export function AnimateOnScroll({
  children,
  className,
  delay = 0,
  variant = 'fade-up',
  once = true,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: '-15% 0px' });
  const prefersReduced = useReducedMotion();

  const v = VARIANTS[variant];

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={prefersReduced ? false : v.hidden}
      animate={isInView ? v.visible : v.hidden}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: delay / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}
