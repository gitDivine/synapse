'use client';

import { useToast } from '@/components/shared/toast';

interface ReplayPlayerProps {
  playing: boolean;
  speed: 0.5 | 1 | 2 | 4;
  progress: number;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (progress: number) => void;
  onChangeSpeed: (speed: 0.5 | 1 | 2 | 4) => void;
  sessionId: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const SPEEDS: Array<0.5 | 1 | 2 | 4> = [0.5, 1, 2, 4];

export function ReplayPlayer({
  playing,
  speed,
  progress,
  currentTime,
  totalDuration,
  onPlay,
  onPause,
  onSeek,
  onChangeSpeed,
  sessionId,
}: ReplayPlayerProps) {
  const { toast } = useToast();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) / 100;
    onSeek(value);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/debate/${sessionId}/replay`;
    navigator.clipboard.writeText(url);
    toast('Replay link copied!', 'success');
  };

  return (
    <div className="border-t border-border bg-surface-raised px-4 py-3">
      {/* Row 1: Play button + timeline */}
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={playing ? onPause : onPlay}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        {/* Time display */}
        <span className="flex-shrink-0 text-xs tabular-nums text-text-muted">
          {formatTime(currentTime)}
        </span>

        {/* Timeline slider */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={Math.round(progress * 1000) / 10}
          onChange={handleSliderChange}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-overlay accent-accent"
          aria-label="Replay timeline"
        />

        {/* Total time */}
        <span className="flex-shrink-0 text-xs tabular-nums text-text-muted">
          {formatTime(totalDuration)}
        </span>
      </div>

      {/* Row 2: Speed selector + share button */}
      <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                speed === s
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="rounded-lg bg-surface-overlay px-3 py-1.5 text-[10px] font-medium text-text-secondary transition-colors hover:bg-surface-overlay/80"
          aria-label="Copy replay link"
        >
          Share
        </button>
      </div>

      {/* Label */}
      <p className="mt-1 text-center text-[10px] text-text-muted">
        Replaying conversation...
      </p>
    </div>
  );
}
