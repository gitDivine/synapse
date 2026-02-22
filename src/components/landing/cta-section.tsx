'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export function CtaSection() {
  const [problem, setProblem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!problem.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: problem.trim() }),
      });

      if (!res.ok) throw new Error('Failed to create conversation');

      const { sessionId } = await res.json();
      router.push(`/debate/${sessionId}?p=${encodeURIComponent(problem.trim())}`);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="start" className="border-y border-accent/10 bg-accent/[0.03] px-4 py-20">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Ready to find truth?
          </h2>
          <p className="text-base text-text-secondary">
            Describe your problem and let the council discuss.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
              placeholder="Describe your problem, question, or challenge..."
              rows={4}
              maxLength={2000}
              className={cn(
                'w-full resize-none rounded-xl border border-border bg-surface-raised p-4',
                'text-sm text-text-primary placeholder:text-text-muted',
                'transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
                'min-h-[120px]'
              )}
            />
            <span className="absolute bottom-3 right-3 text-xs text-text-muted">
              {problem.length}/2000
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!problem.trim() || isSubmitting}
            className={cn(
              'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl',
              'bg-accent px-6 text-sm font-medium text-white',
              'transition-all hover:bg-accent-hover active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'sm:w-auto'
            )}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Assembling Council...
              </>
            ) : (
              'Start Conversation'
            )}
          </button>

          <p className="text-xs text-text-muted">
            Press{' '}
            <kbd className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl+Enter
            </kbd>{' '}
            to submit
          </p>
        </div>
      </div>
    </section>
  );
}
