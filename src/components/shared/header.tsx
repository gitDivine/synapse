'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="SYNAPSE home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            SYNAPSE
          </span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <a
            href="#features"
            className={cn(
              'hidden rounded-lg px-3 py-1.5 text-sm text-text-secondary sm:inline-block',
              'transition-colors hover:bg-surface-raised hover:text-text-primary'
            )}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className={cn(
              'hidden rounded-lg px-3 py-1.5 text-sm text-text-secondary sm:inline-block',
              'transition-colors hover:bg-surface-raised hover:text-text-primary'
            )}
          >
            How It Works
          </a>
          <button
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm text-text-secondary',
              'transition-colors hover:bg-surface-raised hover:text-text-primary'
            )}
          >
            API Keys
          </button>
        </nav>
      </div>
    </header>
  );
}
