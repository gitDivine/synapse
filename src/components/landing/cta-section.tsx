'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import { useFileAttachment } from '@/hooks/use-file-attachment';
import { AttachmentChip } from '@/components/shared/attachment-chip';

export function CtaSection() {
  const [problem, setProblem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState('');
  const router = useRouter();

  const {
    file, analysisStatus, analysisError,
    inputRef, acceptString,
    openFilePicker, handleInputChange, removeFile, analyzeFile,
  } = useFileAttachment();

  const canSubmit = (problem.trim() || file) && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      let fullProblem = problem.trim();

      if (file) {
        setSubmitLabel('Analyzing file...');
        const extracted = await analyzeFile();
        if (!extracted) {
          setIsSubmitting(false);
          setSubmitLabel('');
          return;
        }
        const prefix = `--- ATTACHED FILE: ${file.name} ---\n${extracted}\n--- END ATTACHED FILE ---`;
        fullProblem = fullProblem ? `${prefix}\n\n${fullProblem}` : prefix;
      }

      setSubmitLabel('Assembling Council...');

      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: fullProblem }),
      });

      if (!res.ok) throw new Error('Failed to create conversation');

      const { sessionId } = await res.json();
      router.push(`/debate/${sessionId}?p=${encodeURIComponent(fullProblem)}`);
    } catch {
      setIsSubmitting(false);
      setSubmitLabel('');
    }
  };

  return (
    <section id="start" className="relative overflow-hidden px-4 py-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Gradient top/bottom borders */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--accent), transparent)', opacity: 0.15 }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--accent), transparent)', opacity: 0.15 }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Ready to find <span className="gradient-text">truth</span>?
          </h2>
          <p className="text-base text-text-secondary">
            Describe your problem and let the council discuss.
          </p>
        </div>

        <div className="space-y-3">
          {/* Gradient border wrapper for textarea */}
          <div className="relative rounded-xl p-[1px] transition-all duration-500 [background:linear-gradient(var(--surface-raised),var(--surface-raised))] focus-within:[background:linear-gradient(135deg,rgba(99,102,241,0.3),rgba(168,85,247,0.3),rgba(6,182,212,0.3))]">
            <div className="relative">
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
                placeholder={file ? 'Add a question about the file (optional)...' : 'Describe your problem, question, or challenge...'}
                rows={4}
                maxLength={2000}
                className={cn(
                  'w-full resize-none rounded-xl border-0 bg-surface-raised p-4',
                  'text-sm text-text-primary placeholder:text-text-muted',
                  'focus:outline-none',
                  'min-h-[120px]'
                )}
              />
              <span className="absolute bottom-3 right-3 text-xs text-text-muted">
                {problem.length}/2000
              </span>
            </div>
          </div>

          <AnimatePresence>
            {file && (
              <div className="mx-auto max-w-md">
                <AttachmentChip file={file} status={analysisStatus} error={analysisError} onRemove={removeFile} />
              </div>
            )}
          </AnimatePresence>

          <input
            ref={inputRef}
            type="file"
            accept={acceptString}
            onChange={handleInputChange}
            className="hidden"
            aria-hidden="true"
          />

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={openFilePicker}
              disabled={isSubmitting}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-xl glass px-4',
                'text-sm font-medium text-text-secondary',
                'transition-all hover:border-accent/30 hover:text-text-primary active:scale-[0.98]',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              aria-label="Attach a file"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13.5 7.5l-5.793 5.793a3 3 0 01-4.243 0v0a3 3 0 010-4.243L9.88 2.636a2 2 0 012.828 0v0a2 2 0 010 2.828L6.293 11.88a1 1 0 01-1.414 0v0a1 1 0 010-1.414L10.5 4.843" />
              </svg>
              Attach
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-xl',
                'bg-gradient-to-r from-accent via-purple-500 to-cyan-600 px-6 text-sm font-medium text-white',
                'transition-all hover:shadow-[0_0_40px_rgba(99,102,241,0.25)] active:scale-[0.98]',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none',
                'sm:min-w-[180px]'
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {submitLabel || 'Assembling Council...'}
                </>
              ) : (
                'Start Conversation'
              )}
            </button>
          </div>

          <p className="text-xs text-text-muted">
            Press{' '}
            <kbd className="glass-subtle rounded px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl+Enter
            </kbd>{' '}
            to submit
          </p>
        </div>
      </div>
    </section>
  );
}
