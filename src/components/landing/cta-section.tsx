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
              placeholder={file ? 'Add a question about the file (optional)...' : 'Describe your problem, question, or challenge...'}
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
                'inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4',
                'text-sm font-medium text-text-secondary',
                'transition-all hover:border-accent/40 hover:text-text-primary active:scale-[0.98]',
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
                'bg-accent px-6 text-sm font-medium text-white',
                'transition-all hover:bg-accent-hover active:scale-[0.98]',
                'disabled:cursor-not-allowed disabled:opacity-50',
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
