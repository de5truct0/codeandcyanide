import React from 'react';
import { extractCodeBlocks } from '../services/ai';

/**
 * Individual chat message component
 * Handles rendering of user/assistant messages with code block detection
 */
function ChatMessage({ message, onInsertCode }) {
  const { role, content } = message;
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  // Parse content to separate text and code blocks
  const renderContent = () => {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```(?:javascript|js)?\n[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      // Check if this is a code block
      const codeMatch = part.match(/```(?:javascript|js)?\n([\s\S]*?)```/);

      if (codeMatch) {
        const code = codeMatch[1].trim();
        return (
          <div key={idx} className="chat-code-block">
            <pre><code>{code}</code></pre>
            {isAssistant && onInsertCode && (
              <button
                className="insert-code-btn"
                onClick={() => onInsertCode(code)}
                title="Insert this code into editor"
              >
                INSERT
              </button>
            )}
          </div>
        );
      }

      // Regular text - render with basic markdown
      if (part.trim()) {
        return (
          <div key={idx} className="chat-text">
            {part.split('\n').map((line, lineIdx) => (
              <p key={lineIdx}>{line || '\u00A0'}</p>
            ))}
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-header">
        <span className="message-role">{isUser ? 'YOU' : 'AI'}</span>
      </div>
      <div className="message-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default ChatMessage;
