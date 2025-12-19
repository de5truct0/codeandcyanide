import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { streamChat, isConfigured } from '../services/ai';

/**
 * AI Chat Sidebar Component
 * Provides chat interface for Strudel coding assistance
 */
function ChatSidebar({ isOpen, onClose, currentCode, onInsertCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    // Create assistant message placeholder for streaming
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Setup abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const allMessages = [...messages, userMessage];

      // Stream the response
      for await (const chunk of streamChat(allMessages, currentCode, abortControllerRef.current.signal)) {
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
        // User cancelled, remove empty assistant message
        setMessages(prev => prev.slice(0, -1));
      } else {
        setError(err.message);
        // Remove empty assistant message on error
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
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  const configured = isConfigured();

  return (
    <div className="chat-sidebar">
      <div className="chat-header">
        <span>AI ASSISTANT</span>
        <div className="chat-header-actions">
          <button onClick={handleClear} title="Clear chat">CLR</button>
          <button onClick={onClose} title="Close chat">X</button>
        </div>
      </div>

      {!configured ? (
        <div className="chat-not-configured">
          <p>AI not configured.</p>
          <p>Add VITE_CHUTES_API_KEY to your .env file.</p>
        </div>
      ) : (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p>Ask me anything about Strudel!</p>
                <p className="chat-suggestions">Try:</p>
                <ul>
                  <li>"Make a techno beat"</li>
                  <li>"Add a bassline to my pattern"</li>
                  <li>"Explain what .lpf() does"</li>
                  <li>"Make it more interesting"</li>
                </ul>
              </div>
            )}
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={msg}
                onInsertCode={onInsertCode}
              />
            ))}
            {error && (
              <div className="chat-error">
                Error: {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about music, patterns, effects..."
              disabled={isLoading}
              rows={2}
            />
            <div className="chat-input-actions">
              {isLoading ? (
                <button type="button" onClick={handleCancel} className="cancel-btn">
                  STOP
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()}>
                  SEND
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default ChatSidebar;
