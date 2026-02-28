'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ACCEPT_STRING = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.txt,.csv,.md';

export interface AttachedFile {
  name: string;
  mimeType: string;
  size: number;
  base64: string;
  previewUrl: string | null;
}

export type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error';

export function useFileAttachment() {
  const [file, setFile] = useState<AttachedFile | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';

    // Validate size
    if (selected.size > MAX_FILE_SIZE) {
      setAnalysisError('File too large. Maximum size is 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      const previewUrl = selected.type.startsWith('image/')
        ? URL.createObjectURL(selected)
        : null;

      setFile({ name: selected.name, mimeType: selected.type, size: selected.size, base64, previewUrl });
      setAnalysisError(null);
      setAnalysisStatus('idle');
    };
    reader.onerror = () => setAnalysisError('Failed to read file.');
    reader.readAsDataURL(selected);
  }, []);

  const removeFile = useCallback(() => {
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    setFile(null);
    setAnalysisStatus('idle');
    setAnalysisError(null);
  }, [file]);

  /** Send to /api/analyze-attachment — called on form submit, not on file select. */
  const analyzeFile = useCallback(async (): Promise<string | null> => {
    if (!file) return null;

    setAnalysisStatus('analyzing');
    setAnalysisError(null);

    try {
      const res = await fetch('/api/analyze-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: file.base64, mimeType: file.mimeType, fileName: file.name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(data.error || `Analysis failed (${res.status})`);
      }

      const { content } = await res.json();
      setAnalysisStatus('done');
      return content;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'File analysis failed';
      setAnalysisError(message);
      setAnalysisStatus('error');
      return null;
    }
  }, [file]);

  return {
    file,
    analysisStatus,
    analysisError,
    inputRef,
    acceptString: ACCEPT_STRING,
    openFilePicker,
    handleInputChange,
    removeFile,
    analyzeFile,
  };
}
