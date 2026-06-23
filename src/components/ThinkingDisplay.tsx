'use client';

import { useState } from 'react';

interface ThinkingDisplayProps {
  history: string[];
  isPartial?: boolean;
  /** Optional className overrides for the outer wrapper (theme-aware surfaces). */
  className?: string;
}

const PREVIEW_CHAR_BUDGET = 80;

/**
 * Collapsible AI-thinking widget. Collapsed by default — shows a compact
 * one-line preview of the latest thought (truncated to ~80 chars) so the
 * user can glance at progress without the chain-of-thought eating bubble
 * height. Click the chevron to expand into the numbered full history.
 *
 * Used in all four voice surfaces so model chain-of-thought stays visible
 * without crowding the answer bubble.
 */
export function ThinkingDisplay({ history, isPartial, className = '' }: ThinkingDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  if (!history || history.length === 0) return null;

  const latest = history[history.length - 1];
  const previewSource = latest.replace(/\s+/g, ' ').trim();
  const preview =
    previewSource.length > PREVIEW_CHAR_BUDGET
      ? `${previewSource.slice(0, PREVIEW_CHAR_BUDGET).trimEnd()}…`
      : previewSource;

  return (
    <div
      className={`mb-2 px-2 py-1.5 bg-surface-hover border-l-2 border-primary/50 rounded text-xs text-text-muted italic ${className}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 text-primary font-semibold not-italic cursor-pointer hover:text-primary-hover w-full text-left"
        aria-expanded={expanded}
      >
        <svg
          className={`w-3 h-3 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>thinking{isPartial ? '…' : ''}</span>
        <span className="text-primary/60 font-normal">({history.length})</span>
        {!expanded && (
          <span className="ml-1 text-text-dim italic font-normal truncate min-w-0">
            {preview}
          </span>
        )}
      </button>
      {expanded && (
        <ol className="mt-1 space-y-1.5 pl-4 list-decimal list-inside marker:text-primary/40 whitespace-pre-wrap">
          {history.map((entry, i) => (
            <li
              key={i}
              className={i === history.length - 1 ? 'text-text-secondary' : 'text-text-dim'}
            >
              {entry}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
