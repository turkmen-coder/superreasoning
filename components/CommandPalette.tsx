/**
 * Command Palette — Ctrl+K to quickly access actions
 * Inspired by VS Code / Linear / Raycast
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '../i18n';
import type { SidebarPage } from './Sidebar';

interface CommandAction {
  id: string;
  labelTr: string;
  labelEn: string;
  shortcut?: string;
  icon: string;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: SidebarPage) => void;
  onGenerate: () => void;
  onToggleLanguage: () => void;
  hasResult: boolean;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen, onClose, onNavigate, onGenerate, onToggleLanguage, hasResult: _hasResult,
}) => {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions: CommandAction[] = useMemo(() => [
    { id: 'generate', labelTr: 'Prompt Oluştur', labelEn: 'Generate Prompt', shortcut: 'Ctrl+Enter', icon: '⚡', action: () => { onClose(); onGenerate(); }, category: 'Actions' },
    { id: 'nav-dashboard', labelTr: 'Dashboard\'a Git', labelEn: 'Go to Dashboard', icon: '◻', action: () => { onClose(); onNavigate('dashboard'); }, category: 'Navigation' },
    { id: 'nav-prompts', labelTr: 'Prompt Kütüphanesi', labelEn: 'Prompt Library', icon: '📖', action: () => { onClose(); onNavigate('prompts'); }, category: 'Navigation' },
    { id: 'nav-ailab', labelTr: 'AI Lab', labelEn: 'AI Lab', icon: '🔬', action: () => { onClose(); onNavigate('ailab'); }, category: 'Navigation' },
    { id: 'nav-analytics', labelTr: 'Analitik', labelEn: 'Analytics', icon: '📊', action: () => { onClose(); onNavigate('analytics'); }, category: 'Navigation' },
    { id: 'nav-settings', labelTr: 'Ayarlar', labelEn: 'Settings', icon: '⚙', action: () => { onClose(); onNavigate('settings'); }, category: 'Navigation' },
    { id: 'toggle-lang', labelTr: 'Dil Değiştir (EN)', labelEn: 'Toggle Language (TR)', icon: '🌐', action: () => { onClose(); onToggleLanguage(); }, category: 'Settings' },
  ], [onClose, onGenerate, onNavigate, onToggleLanguage]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(a =>
      a.labelTr.toLowerCase().includes(q) ||
      a.labelEn.toLowerCase().includes(q) ||
      a.id.includes(q)
    );
  }, [query, actions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" role="presentation">
      <div
        className="absolute inset-0 bg-cyber-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="relative w-full max-w-md glass-card-xl shadow-[0_0_60px_rgba(6,232,249,0.15)] overflow-hidden animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-glass-border">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.ui.commandPaletteHint}
            className="flex-1 bg-transparent text-gray-200 font-mono text-sm placeholder-gray-600 outline-none"
            aria-label={t.ui.commandPaletteHint}
          />
          <kbd className="text-[9px] font-mono text-gray-600 px-1.5 py-0.5 rounded bg-cyber-black/50 border border-glass-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-gray-600 text-xs font-mono text-center py-6">
              {t.ui.commandPaletteEmpty}
            </p>
          ) : (
            filtered.map((action, idx) => (
              <button
                key={action.id}
                type="button"
                onClick={action.action}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-cyber-primary/10 text-white'
                    : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                }`}
              >
                <span className="text-sm w-5 text-center shrink-0">{action.icon}</span>
                <span className="flex-1 font-mono text-xs">
                  {language === 'tr' ? action.labelTr : action.labelEn}
                </span>
                {action.shortcut && (
                  <kbd className="text-[9px] font-mono text-gray-600 px-1.5 py-0.5 rounded bg-cyber-black/50 border border-glass-border">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-glass-border flex items-center gap-3 text-[9px] font-mono text-gray-600">
          <span>↑↓ {language === 'tr' ? 'gezin' : 'navigate'}</span>
          <span>↵ {language === 'tr' ? 'çalıştır' : 'execute'}</span>
          <span>esc {language === 'tr' ? 'kapat' : 'close'}</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
