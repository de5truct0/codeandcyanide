import React, { useState, useRef, useEffect } from 'react';
import { streamChat, isConfigured, extractCodeBlocks } from '../services/ai';

/**
 * Terminal-style AI Chat Component
 * Positioned below the code editor with command-line aesthetic
 */
function ChatTerminal({ currentCode, onInsertCode, files = [], currentFileName = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [filePickerIndex, setFilePickerIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [pendingCode, setPendingCode] = useState(null); // For accept/reject feature
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingCode]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Parse @filename references from input
  const parseFileReferences = (text) => {
    const regex = /@(\S+)/g;
    const refs = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      refs.push(match[1]);
    }
    return refs;
  };

  // Get context files based on @ references
  const getContextFiles = (text) => {
    const refs = parseFileReferences(text);
    const contextFiles = [];

    for (const ref of refs) {
      const file = files.find(f =>
        f.name.toLowerCase() === ref.toLowerCase() ||
        f.name.toLowerCase().startsWith(ref.toLowerCase())
      );
      if (file) {
        contextFiles.push({ name: file.name, code: file.code });
      }
    }

    return contextFiles;
  };

  // Filter files for autocomplete based on current @ query
  const getFilteredFiles = () => {
    const beforeCursor = input.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\S*)$/);

    if (!atMatch) return [];

    const query = atMatch[1].toLowerCase();
    return files.filter(f =>
      f.name.toLowerCase().includes(query) &&
      f.name !== currentFileName
    );
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setInput(value);
    setCursorPosition(pos);

    // Check if we should show file picker
    const beforeCursor = value.slice(0, pos);
    const atMatch = beforeCursor.match(/@(\S*)$/);
    setShowFilePicker(!!atMatch);
    setFilePickerIndex(0);
  };

  const handleFileSelect = (fileName) => {
    const beforeCursor = input.slice(0, cursorPosition);
    const afterCursor = input.slice(cursorPosition);
    const atMatch = beforeCursor.match(/@(\S*)$/);

    if (atMatch) {
      const newBefore = beforeCursor.slice(0, -atMatch[0].length) + '@' + fileName + ' ';
      setInput(newBefore + afterCursor);
      setCursorPosition(newBefore.length);
    }

    setShowFilePicker(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    const contextFiles = getContextFiles(userInput);

    // Clean input by removing @references for display
    const cleanInput = userInput.replace(/@\S+\s*/g, '').trim();

    const userMessage = {
      role: 'user',
      content: userInput,
      displayContent: cleanInput,
      contextFiles: contextFiles.map(f => f.name),
      targetFile: currentFileName // Track which file this query is about
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);
    setShowFilePicker(false);

    // Create assistant message placeholder for streaming
    const assistantMessage = { role: 'assistant', content: '', targetFile: currentFileName };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const allMessages = [...messages, { role: 'user', content: cleanInput }];

      // Stream the response with context files
      for await (const chunk of streamChat(
        allMessages,
        currentCode,
        contextFiles,
        abortControllerRef.current.signal
      )) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content + chunk
          };
          return updated;
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } else {
        console.error('AI Error:', err);
        setError(err.message);
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setPendingCode(null);
  };

  const handleKeyDown = (e) => {
    if (showFilePicker) {
      const filteredFiles = getFilteredFiles();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFilePickerIndex(i => Math.min(i + 1, filteredFiles.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFilePickerIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (filteredFiles.length > 0) {
          e.preventDefault();
          handleFileSelect(filteredFiles[filePickerIndex].name);
        }
      } else if (e.key === 'Escape') {
        setShowFilePicker(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Show code in diff view for accept/reject
  const handleReviewCode = (code) => {
    setPendingCode(code);
  };

  // Accept the pending code change
  const handleAcceptCode = () => {
    if (pendingCode) {
      onInsertCode?.(pendingCode);
      setPendingCode(null);
    }
  };

  // Reject the pending code change
  const handleRejectCode = () => {
    setPendingCode(null);
  };

  const configured = isConfigured();
  const filteredFiles = getFilteredFiles();

  // Render a message with code block detection
  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    const content = msg.content;

    // Split content into text and code blocks
    const parts = [];
    let lastIndex = 0;
    const codeBlockRegex = /```(?:javascript|js)?\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      // Add code block
      parts.push({ type: 'code', content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return (
      <div key={idx} className={`terminal-message ${isUser ? 'user' : 'assistant'}`}>
        <span className="terminal-prompt">{isUser ? '>' : '$'}</span>
        <div className="terminal-content">
          {isUser && msg.contextFiles?.length > 0 && (
            <span className="terminal-context">
              [{msg.contextFiles.join(', ')}]
            </span>
          )}
          {parts.length === 0 ? (
            <span>{content || (isUser ? '' : <span className="terminal-thinking">thinking...</span>)}</span>
          ) : (
            parts.map((part, i) => (
              part.type === 'code' ? (
                <div key={i} className="terminal-code-block">
                  <pre>{part.content}</pre>
                  <div className="terminal-code-actions">
                    <button
                      className="terminal-review-btn"
                      onClick={() => handleReviewCode(part.content)}
                    >
                      REVIEW
                    </button>
                    <button
                      className="terminal-append-btn"
                      onClick={() => onInsertCode?.(part.content, 'append')}
                    >
                      APPEND
                    </button>
                    <button
                      className="terminal-replace-btn"
                      onClick={() => onInsertCode?.(part.content, 'replace')}
                    >
                      REPLACE
                    </button>
                  </div>
                </div>
              ) : (
                <span key={i}>{part.content}</span>
              )
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`chat-terminal ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="terminal-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="terminal-title">
          <span className="terminal-indicator">●</span>
          AI TERMINAL
          {currentFileName && <span className="terminal-current-file">[ {currentFileName} ]</span>}
          {isLoading && <span className="terminal-loading">...</span>}
        </span>
        <div className="terminal-actions" onClick={e => e.stopPropagation()}>
          <button onClick={handleClear} title="Clear">CLR</button>
          <button onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {!configured ? (
            <div className="terminal-not-configured">
              <span className="terminal-prompt">!</span>
              <span>VITE_CHUTES_API_KEY not set. Check .env file.</span>
            </div>
          ) : (
            <>
              <div className="terminal-messages">
                {messages.length === 0 && (
                  <div className="terminal-welcome">
                    <div className="terminal-message system">
                      <span className="terminal-prompt">$</span>
                      <span>
                        Strudel AI ready. Working on: <strong>{currentFileName || 'no file'}</strong>
                        <br />
                        <span className="terminal-hint">Type @ to reference other files. Use REVIEW to preview changes.</span>
                      </span>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => renderMessage(msg, idx))}
                {error && (
                  <div className="terminal-message error">
                    <span className="terminal-prompt">!</span>
                    <span>Error: {error}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending Code Review Panel */}
              {pendingCode && (
                <div className="terminal-review-panel">
                  <div className="review-header">
                    <span>Review changes for {currentFileName}</span>
                    <div className="review-actions">
                      <button className="review-accept" onClick={handleAcceptCode}>
                        ✓ ACCEPT
                      </button>
                      <button className="review-reject" onClick={handleRejectCode}>
                        ✗ REJECT
                      </button>
                    </div>
                  </div>
                  <div className="review-diff">
                    <div className="diff-old">
                      <div className="diff-label">CURRENT</div>
                      <pre>{currentCode || '// Empty file'}</pre>
                    </div>
                    <div className="diff-new">
                      <div className="diff-label">NEW</div>
                      <pre>{pendingCode}</pre>
                    </div>
                  </div>
                </div>
              )}

              <form className="terminal-input-area" onSubmit={handleSubmit}>
                <span className="terminal-input-prompt">{'>'}</span>
                <div className="terminal-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isLoading ? 'Generating...' : `Ask about ${currentFileName || 'music patterns'}...`}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  {showFilePicker && filteredFiles.length > 0 && (
                    <div className="terminal-file-picker">
                      {filteredFiles.map((file, idx) => (
                        <div
                          key={file.name}
                          className={`file-picker-item ${idx === filePickerIndex ? 'selected' : ''}`}
                          onClick={() => handleFileSelect(file.name)}
                        >
                          @{file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isLoading ? (
                  <button type="button" onClick={handleCancel} className="terminal-btn cancel">
                    ^C
                  </button>
                ) : (
                  <button type="submit" disabled={!input.trim()} className="terminal-btn">
                    RUN
                  </button>
                )}
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ChatTerminal;
