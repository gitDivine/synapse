'use client';

import { useState, useRef } from 'react';

interface UserInterveneBarProps {
  onSend: (message: string) => Promise<boolean>;
  disabled?: boolean;
}

export function UserInterveneBar({ onSend, disabled }: UserInterveneBarProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    const ok = await onSend(trimmed);
    if (ok) {
      setMessage('');
    }
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-surface-raised px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
          <span className="text-xs text-accent">You</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Intervene in the debate..."
          disabled={disabled || sending}
          maxLength={1000}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent disabled:opacity-50"
          aria-label="Type your intervention message"
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || sending || disabled}
          className="flex-shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
          aria-label="Send intervention"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
