'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Headers with proper styling
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-text mt-6 mb-3 first:mt-0 pb-2 border-b border-border">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-text mt-5 mb-2 first:mt-0 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-text mt-4 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-text-secondary mt-3 mb-1">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <div className="text-text-secondary leading-relaxed mb-3 last:mb-0">
              {children}
            </div>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-1.5 mb-3 ml-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 mb-3 ml-1 list-decimal list-inside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-text-secondary flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="flex-1">{children}</span>
            </li>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-text">{children}</strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-text-muted">{children}</em>
          ),

          // Code blocks
          pre: ({ children }) => (
            <pre className="bg-background rounded-lg p-4 my-3 overflow-x-auto border border-border">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-surface-hover text-primary px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="text-sm font-mono text-text-secondary" {...props}>
                {children}
              </code>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 my-3 py-1 bg-primary/5 rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-t border-border" />
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-hover">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-text">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-text-secondary">{children}</td>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover underline"
            >
              {children}
            </a>
          ),

          // Images (for diagrams and illustrations) - only render if src is valid
          img: ({ src, alt }) => {
            if (!src) return null;
            return (
              <div className="my-4">
                <img
                  src={src}
                  alt={alt || 'Diagram'}
                  className="max-w-full h-auto rounded-lg border border-border shadow-lg"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                  loading="lazy"
                />
                {alt && alt !== 'Diagram' && (
                  <p className="text-xs text-text-muted text-center mt-2 italic">
                    {alt}
                  </p>
                )}
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
