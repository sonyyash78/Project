import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MarkdownRenderer = ({ content, className = '' }) => {
  // If the content is empty or null, don't render anything
  if (!content) return null;

  // Some AI models return math surrounded by \( \) instead of $ $ for inline math
  // or \[ \] instead of $$ $$ for block math. Let's sanitize to ensure it works nicely with remark-math.
  // remark-math handles $ and $$, but occasionally we get other formats.
  // Actually, remark-math supports \( and \[ out of the box in recent versions,
  // but to be safe and handle common markdown spacing issues, we just pass the string directly.

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override default elements if needed to match Tailwind styles
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
