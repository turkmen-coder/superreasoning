/**
 * ChatbotWidget — Floating in-app chatbot with AI-powered assistance.
 * Knows all 18 pages, 57 frameworks, 60+ domains, 9 providers, 1040+ prompts.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  sendChatbotMessage,
  clearChatbotHistory,
  type ChatbotMessage,
  type ChatbotAction,
  type ChatbotContext,
} from '../services/chatbotService';
import type { SidebarPage } from './Sidebar';

interface ChatbotWidgetProps {
  activePage: SidebarPage;
  currentPrompt?: string;
  domainId?: string;
  framework?: string;
  provider?: string;
  onPageChange: (page: SidebarPage) => void;
  onTriggerGeneration?: (params: Record<string, unknown>) => void;
}

export default function ChatbotWidget({
  activePage,
  currentPrompt,
  domainId,
  framework,
  provider,
  onPageChange,
  onTriggerGeneration,
}: ChatbotWidgetProps) {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+Shift+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const buildContext = useCallback((): ChatbotContext => ({
    currentPage: activePage,
    currentPrompt: currentPrompt?.slice(0, 500),
    domainId,
    framework,
    provider,
    language: language as 'en' | 'tr',
  }), [activePage, currentPrompt, domainId, framework, provider, language]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setSuggestions([]);

    const userMsg: ChatbotMessage = {
      role: 'user',
      content: msg,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await sendChatbotMessage(msg, sessionId, buildContext());
      setSessionId(response.sessionId);

      const assistantMsg: ChatbotMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
        actions: response.actions.length > 0 ? response.actions : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setSuggestions(response.suggestions);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      const errorMsg: ChatbotMessage = {
        role: 'assistant',
        content: `${t.ui.chatbotErrorMessage} (${detail})`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, buildContext, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAction = (action: ChatbotAction) => {
    if (action.type === 'navigate' && action.params.page) {
      onPageChange(action.params.page as SidebarPage);
    } else if (action.type === 'generate' && onTriggerGeneration) {
      onTriggerGeneration(action.params);
    }
  };

  const handleClear = async () => {
    if (sessionId) {
      try { await clearChatbotHistory(sessionId); } catch { /* ignore */ }
    }
    setMessages([]);
    setSuggestions([]);
    setSessionId(undefined);
  };

  const chatbotLabel = t.ui.chatbotTitle;

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`
          fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full
          flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${isOpen
            ? 'bg-red-500/80 hover:bg-red-500 rotate-45'
            : 'bg-gradient-to-br from-cyber-primary to-[#00c8e0] hover:shadow-[0_0_25px_rgba(6,232,249,0.4)]'
          }
        `}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
        title="Ctrl+Shift+K"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="black" />
            <circle cx="15" cy="10" r="1" fill="black" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[99] w-[400px] h-[560px] flex flex-col glass-card rounded-xl shadow-2xl shadow-cyber-primary/10 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyber-primary/10 to-transparent border-b border-glass-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-primary animate-pulse" />
              <span className="font-mono text-xs font-bold text-cyber-primary uppercase tracking-wider">
                {chatbotLabel}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="p-1.5 rounded hover:bg-white/5 transition-colors"
                title={t.ui.chatbotClearBtn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 hover:text-gray-300">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded hover:bg-white/5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 hover:text-gray-300">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-cyber-border/30">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-cyber-primary/10 border border-cyber-primary/20 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <p className="font-mono text-[11px] text-gray-400 mb-1">
                  {t.ui.chatbotWelcome}
                </p>
                <p className="font-mono text-[9px] text-gray-600">
                  {t.ui.chatbotHint}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-[11px] font-mono leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyber-primary/15 text-gray-200 border border-cyber-primary/20'
                      : 'bg-[#12121f] text-gray-300 border border-glass-border'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-glass-border">
                      {msg.actions.map((action, j) => (
                        <button
                          key={j}
                          onClick={() => handleAction(action)}
                          className="px-2.5 py-1 rounded bg-cyber-primary/10 text-cyber-primary border border-cyber-primary/30 text-[9px] font-bold uppercase tracking-wider hover:bg-cyber-primary/20 transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#12121f] border border-glass-border rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {suggestions.length > 0 && !loading && (
            <div className="flex flex-wrap gap-1.5 px-4 py-2 border-t border-glass-border">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="px-2.5 py-1 rounded-full bg-cyber-dark border border-glass-border text-[9px] font-mono text-gray-400 hover:text-cyber-primary hover:border-cyber-primary/30 transition-colors truncate max-w-[180px]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-glass-border bg-[#08080f]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.ui.chatbotInputPlaceholder}
                disabled={loading}
                className="flex-1 glass-input px-3 py-2 text-[11px] font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyber-primary/50 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-lg bg-cyber-primary/20 border border-cyber-primary/40 flex items-center justify-center hover:bg-cyber-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
