import React, { useState } from 'react';

function CodePreview({ code, maxLines = 20 }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = code.split('\n');
  const needsTruncation = lines.length > maxLines && !expanded;
  const displayCode = needsTruncation
    ? lines.slice(0, maxLines).join('\n') + '\n...'
    : code;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <span className="code-preview-label">CODE</span>
        <div className="code-preview-actions">
          <button
            className="copy-btn"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="code-preview-content">
        <code>{displayCode}</code>
      </pre>
      {lines.length > maxLines && (
        <button
          className="expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show Less' : `Show All (${lines.length} lines)`}
        </button>
      )}
    </div>
  );
}

export default CodePreview;
