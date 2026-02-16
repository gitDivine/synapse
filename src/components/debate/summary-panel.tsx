'use client';

import { motion } from 'motion/react';
import type { DebateSummary, AgentInfo } from '@/hooks/use-debate-stream';

interface SummaryPanelProps {
  summary: DebateSummary;
  agents: AgentInfo[];
}

function agentLabel(agentId: string, agents: AgentInfo[]): string {
  const agent = agents.find((a) => a.id === agentId);
  return agent?.displayName ?? agentId;
}

function agentColor(agentId: string, agents: AgentInfo[]): string {
  const agent = agents.find((a) => a.id === agentId);
  return agent?.color ?? '#71717a';
}

export function SummaryPanel({ summary, agents }: SummaryPanelProps) {
  return (
    <motion.div
      role="region"
      aria-label="Debate summary and verdict"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="mx-auto w-full max-w-3xl border-t border-border bg-surface-raised"
    >
      <div className="p-6">
        {/* Synapse header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20">
            <span className="text-base font-bold text-accent">S</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Synapse&apos;s Verdict
            </h2>
            <p className="text-xs text-text-muted">
              {summary.confidence}
            </p>
          </div>
        </div>

        {/* Narrative verdict */}
        <div className="mb-5 rounded-lg border border-accent/20 bg-accent-soft p-4">
          <p className="text-sm leading-relaxed text-text-primary">
            {summary.verdict}
          </p>
        </div>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Key moments */}
          {summary.keyMoments.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-text-muted">
                Key Moments
              </h3>
              <ul className="space-y-2">
                {summary.keyMoments.map((moment, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    <span
                      className="font-medium"
                      style={{ color: agentColor(moment.agentId, agents) }}
                    >
                      {agentLabel(moment.agentId, agents)}
                    </span>
                    <p className="mt-0.5 text-text-secondary">
                      &ldquo;{moment.excerpt}&rdquo;
                    </p>
                    <p className="mt-0.5 text-text-muted italic">
                      {moment.significance}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dissent */}
          {summary.dissent.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-text-muted">
                Points of Dissent
              </h3>
              <ul className="space-y-2">
                {summary.dissent.map((point, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    <span
                      className="font-medium"
                      style={{ color: agentColor(point.agentId, agents) }}
                    >
                      {agentLabel(point.agentId, agents)}
                    </span>
                    <p className="mt-0.5 text-text-secondary">
                      {point.position}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Open questions + user contributions */}
          <div className="space-y-4">
            {summary.openQuestions.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-text-muted">
                  Open Questions
                </h3>
                <ul className="space-y-1">
                  {summary.openQuestions.map((question, i) => (
                    <li
                      key={i}
                      className="text-xs leading-relaxed text-text-secondary"
                    >
                      <span className="mr-1 text-text-muted">?</span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.userContributions.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-text-muted">
                  Your Impact
                </h3>
                <ul className="space-y-1">
                  {summary.userContributions.map((contribution, i) => (
                    <li
                      key={i}
                      className="text-xs leading-relaxed text-text-secondary"
                    >
                      <span className="mr-1 text-accent">&#x2022;</span>
                      {contribution}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Sources */}
        {summary.sources.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-2 text-xs font-semibold text-text-muted">
              Sources Referenced
            </h3>
            <ul className="space-y-1">
              {summary.sources.map((source, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {source.name}
                  </span>
                  {' — '}
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline hover:text-accent-hover"
                    >
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
