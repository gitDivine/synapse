'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface UserInterveneBarProps {
  onSend: (message: string, routing?: 'synapse' | 'council') => Promise<boolean>;
  disabled?: boolean;
  mode?: 'intervene' | 'continue';
  interventionQueued?: boolean;
}

export function UserInterveneBar({ onSend, disabled, mode = 'intervene', interventionQueued }: UserInterveneBarProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isContinue = mode === 'continue';

  // Focus input when switching to continue mode
  useEffect(() => {
    if (isContinue) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isContinue]);

  const handleSubmit = async (routing?: 'synapse' | 'council') => {
    const trimmed = message.trim();
    if (!trimmed || sending || disabled || interventionQueued) return;

    setSending(true);
    const ok = await onSend(trimmed, routing);
    if (ok) setMessage('');
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-surface-raised px-4 py-3">
      <AnimatePresence>
        {/* "Queued" banner — shown after user sent intervention, waiting for round to end */}
        {interventionQueued && (
          <motion.div
            key="queued"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mb-2 max-w-3xl overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              <span className="text-xs text-accent">Your message is queued — agents will respond after this round</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(isContinue ? 'council' : undefined);
            }
          }}
          placeholder={
            interventionQueued
              ? 'Message queued — waiting for round to finish...'
              : isContinue
                ? 'Continue the conversation...'
                : 'Jump in — type your message...'
          }
          disabled={disabled || sending || interventionQueued}
          maxLength={2000}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
            interventionQueued
              ? 'border-border/50 bg-surface-overlay text-text-muted cursor-not-allowed opacity-60'
              : 'border-border bg-background text-text-primary placeholder-text-muted focus:border-accent disabled:opacity-50'
          }`}
          aria-label={isContinue ? 'Continue the conversation' : 'Type your message'}
        />

        {!interventionQueued && !isContinue && (
          <button
            onClick={() => handleSubmit()}
            disabled={!message.trim() || sending || disabled}
            className="flex-shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
            aria-label="Send message"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        )}
        {!interventionQueued && isContinue && (
          <>
            <button
              onClick={() => handleSubmit('synapse')}
              disabled={!message.trim() || sending || disabled}
              className="flex-shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
              aria-label="Ask Synapse"
            >
              {sending ? '...' : 'Ask Synapse'}
            </button>
            <button
              onClick={() => handleSubmit('council')}
              disabled={!message.trim() || sending || disabled}
              className="flex-shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
              aria-label="Ask the Council"
            >
              {sending ? '...' : 'Ask Council'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
