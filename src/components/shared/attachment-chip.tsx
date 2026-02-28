'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';
import type { AttachedFile, AnalysisStatus } from '@/hooks/use-file-attachment';

interface AttachmentChipProps {
  file: AttachedFile;
  status: AnalysisStatus;
  error?: string | null;
  onRemove: () => void;
}

export function AttachmentChip({ file, status, error, onRemove }: AttachmentChipProps) {
  const isImage = file.mimeType.startsWith('image/');
  const sizeLabel = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(0)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        'bg-surface-raised transition-colors',
        status === 'error' ? 'border-error/40' : status === 'analyzing' ? 'border-accent/40' : 'border-border',
      )}
    >
      {/* Preview / icon */}
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded">
        {isImage && file.previewUrl ? (
          <img src={file.previewUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-overlay text-text-muted">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" />
              <path d="M9 1v4h4" />
            </svg>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text-primary">{file.name}</p>
        <p className={cn('text-[10px]', status === 'error' ? 'text-error' : 'text-text-muted')}>
          {status === 'analyzing' ? 'Analyzing...' : status === 'error' ? (error || 'Failed') : sizeLabel}
        </p>
      </div>

      {/* Status indicator */}
      {status === 'analyzing' && (
        <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      )}
      {status === 'done' && (
        <svg className="h-4 w-4 flex-shrink-0 text-success" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8.5l3.5 3.5L13 4" />
        </svg>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        disabled={status === 'analyzing'}
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
          'text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary',
          'disabled:opacity-30',
        )}
        aria-label="Remove attachment"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2l6 6M8 2l-6 6" />
        </svg>
      </button>
    </motion.div>
  );
}
