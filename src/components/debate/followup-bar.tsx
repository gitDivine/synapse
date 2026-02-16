'use client';

import { useState, useRef } from 'react';

interface FollowupBarProps {
  onAsk: (question: string) => Promise<boolean>;
  response: string;
  loading: boolean;
}

export function FollowupBar({ onAsk, response, loading }: FollowupBarProps) {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setError('');
    const success = await onAsk(trimmed);
    if (!success) {
      setError('Failed to send follow-up. Please try again.');
    } else {
      setQuestion('');
    }
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-surface-raised">
      {/* Synapse's follow-up response */}
      {response && (
        <div className="border-b border-border px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20">
                <span className="text-[10px] font-bold text-accent">S</span>
              </div>
              <span className="text-xs font-medium text-accent">Synapse</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
              {response}
              {loading && (
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />
              )}
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="border-b border-error/20 bg-error/5 px-4 py-2">
          <p className="mx-auto max-w-3xl text-xs text-error">{error}</p>
        </div>
      )}

      {/* Follow-up input */}
      <div className="px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/20">
            <span className="text-[10px] font-bold text-accent">S</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask Synapse a follow-up question..."
            disabled={loading}
            maxLength={1000}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent disabled:opacity-50"
            aria-label="Ask Synapse a follow-up question"
          />
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || loading}
            className="flex-shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
            aria-label="Send follow-up question"
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
}
