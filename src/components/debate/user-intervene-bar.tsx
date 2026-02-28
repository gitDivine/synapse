'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFileAttachment } from '@/hooks/use-file-attachment';
import { AttachmentChip } from '@/components/shared/attachment-chip';

interface UserInterveneBarProps {
  onSend: (message: string, routing?: 'synapse' | 'council') => Promise<boolean>;
  disabled?: boolean;
  mode?: 'intervene' | 'continue';
  interventionQueued?: boolean;
}

export function UserInterveneBar({ onSend, disabled, mode = 'intervene', interventionQueued }: UserInterveneBarProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendLabel, setSendLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    file, analysisStatus, analysisError,
    inputRef: fileInputRef, acceptString,
    openFilePicker, handleInputChange, removeFile, analyzeFile,
  } = useFileAttachment();

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
    if ((!trimmed && !file) || sending || disabled || interventionQueued) return;

    setSending(true);

    try {
      let fullMessage = trimmed;

      if (file) {
        setSendLabel('Analyzing file...');
        const extracted = await analyzeFile();
        if (!extracted) {
          setSending(false);
          setSendLabel('');
          return;
        }
        const prefix = `--- ATTACHED FILE: ${file.name} ---\n${extracted}\n--- END ATTACHED FILE ---`;
        fullMessage = fullMessage ? `${prefix}\n\n${fullMessage}` : prefix;
      }

      setSendLabel('Sending...');
      const ok = await onSend(fullMessage, routing);
      if (ok) {
        setMessage('');
        removeFile();
      }
    } finally {
      setSending(false);
      setSendLabel('');
    }

    inputRef.current?.focus();
  };

  const canSend = (message.trim() || file) && !sending && !disabled && !interventionQueued;

  return (
    <div className="border-t border-border bg-surface-raised px-4 py-3">
      <AnimatePresence>
        {/* "Queued" banner */}
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

      {/* Attachment chip above input */}
      <AnimatePresence>
        {file && (
          <motion.div
            key="chip"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mb-2 max-w-3xl overflow-hidden"
          >
            <AttachmentChip file={file} status={analysisStatus} error={analysisError} onRemove={removeFile} />
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {/* Paperclip button */}
        <button
          onClick={openFilePicker}
          disabled={sending || disabled || interventionQueued}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-accent/40 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Attach a file"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M13.5 7.5l-5.793 5.793a3 3 0 01-4.243 0v0a3 3 0 010-4.243L9.88 2.636a2 2 0 012.828 0v0a2 2 0 010 2.828L6.293 11.88a1 1 0 01-1.414 0v0a1 1 0 010-1.414L10.5 4.843" />
          </svg>
        </button>

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
              : file
                ? 'Add a question about the file (optional)...'
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
            disabled={!canSend}
            className="flex-shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
            aria-label="Send message"
          >
            {sending ? (sendLabel || 'Sending...') : 'Send'}
          </button>
        )}
        {!interventionQueued && isContinue && (
          <>
            <button
              onClick={() => handleSubmit('synapse')}
              disabled={!canSend}
              className="flex-shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
              aria-label="Ask Synapse"
            >
              {sending ? (sendLabel || '...') : 'Ask Synapse'}
            </button>
            <button
              onClick={() => handleSubmit('council')}
              disabled={!canSend}
              className="flex-shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
              aria-label="Ask the Council"
            >
              {sending ? (sendLabel || '...') : 'Ask Council'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
