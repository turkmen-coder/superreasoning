import React from 'react';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

export type SidebarPage = 'dashboard' | 'prompts' | 'testing' | 'ailab' | 'optimizer' | 'vibecoding' | 'analytics' | 'settings';

interface SidebarProps {
  activePage: SidebarPage;
  onPageChange: (page: SidebarPage) => void;
}

const NAV_ITEMS: { id: SidebarPage; labelTr: string; labelEn: string; subTr?: string; subEn?: string; badgeColor?: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    labelTr: 'Dashboard',
    labelEn: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'prompts',
    labelTr: 'Prompt Kutuphanesi',
    labelEn: 'Prompt Library',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    id: 'testing',
    labelTr: 'Prompt CI/CD',
    labelEn: 'Prompt CI/CD',
    subTr: 'Test & Pipeline',
    subEn: 'Test & Pipeline',
    badgeColor: 'bg-purple-500',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
      </svg>
    ),
  },
  {
    id: 'ailab',
    labelTr: 'AI Lab',
    labelEn: 'AI Lab',
    subTr: 'OpenAI Agents SDK',
    subEn: 'OpenAI Agents SDK',
    badgeColor: 'bg-emerald-500',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 'optimizer',
    labelTr: 'Kod Optimizasyonu',
    labelEn: 'Code Optimizer',
    subTr: 'V2 Algorithm',
    subEn: 'V2 Algorithm',
    badgeColor: 'bg-amber-500',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: 'vibecoding',
    labelTr: 'Vibe Coding',
    labelEn: 'Vibe Coding',
    subTr: 'Plan & Agent Modu',
    subEn: 'Plan & Agent Mode',
    badgeColor: 'bg-violet-500',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    labelTr: 'Analitik',
    labelEn: 'Analytics',
    subTr: 'Kullanim & A/B',
    subEn: 'Usage & A/B',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    labelTr: 'Ayarlar',
    labelEn: 'Settings',
    subTr: 'API & Profil',
    subEn: 'API & Profile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange }) => {
  const { language } = useTranslation();
  const { profile } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#070710] border-r border-cyber-border/50 flex flex-col z-50 sidebar-transition">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-primary/30 to-cyber-accent/30 border border-cyber-primary/40 flex items-center justify-center relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold text-white tracking-wider">META-ARCH</h1>
            <p className="font-mono text-[8px] text-gray-500 tracking-[0.2em] uppercase">V4.0 Quantum</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyber-primary/5 to-transparent border border-cyber-primary/10">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[8px] text-emerald-400/80 uppercase tracking-wider">
            {language === 'tr' ? 'Sistem Aktif' : 'System Active'}
          </span>
        </div>
      </div>

      {/* Plan Badge */}
      {profile && (
        <div className="mx-4 mb-2 px-3 py-1.5 rounded-md bg-cyber-dark/60 border border-cyber-border/30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] text-gray-500 uppercase tracking-wider">Plan</span>
            <span className={`font-mono text-[9px] font-bold uppercase tracking-wider ${
              profile.plan === 'team' ? 'text-purple-400' :
              profile.plan === 'pro' ? 'text-cyber-primary' :
              'text-gray-500'
            }`}>
              {profile.plan === 'team' ? 'TEAM' : profile.plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 overflow-y-auto" role="navigation" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPageChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md font-mono text-xs tracking-wide transition-all duration-200 text-left group
                    ${isActive
                      ? 'bg-cyber-primary/10 text-cyber-primary border border-cyber-primary/20 shadow-[0_0_10px_rgba(0,229,255,0.08)]'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent'
                    }
                  `}
                >
                  <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-cyber-primary' : 'text-gray-600 group-hover:text-gray-400'}`}>
                    {item.icon}
                  </span>
                  <span className="flex flex-col items-start min-w-0 flex-1">
                    <span className="flex items-center gap-2 w-full">
                      <span className="truncate">{language === 'tr' ? item.labelTr : item.labelEn}</span>
                      {item.badgeColor && (
                        <span className={`w-1.5 h-1.5 rounded-full ${item.badgeColor} flex-shrink-0`} />
                      )}
                    </span>
                    {item.subTr && (
                      <span className={`font-mono text-[8px] mt-0.5 transition-colors ${isActive ? 'text-cyber-primary/50' : 'text-gray-700 group-hover:text-gray-600'}`}>
                        {language === 'tr' ? item.subTr : item.subEn}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-cyber-primary flex-shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-3">
        <div className="relative w-full h-[100px] rounded-xl overflow-hidden bg-gradient-to-br from-cyber-accent/5 via-cyber-primary/5 to-transparent border border-cyber-border/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyber-primary/15 to-cyber-accent/15 border border-cyber-primary/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#brain-grad)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00f0ff" />
                      <stop offset="100%" stopColor="#7000ff" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                  <line x1="10" y1="21" x2="14" y2="21" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="12" y1="6" x2="12" y2="12" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyber-primary/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyber-accent/60 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="font-mono text-[7px] text-gray-600 uppercase tracking-widest">
              {language === 'tr' ? 'Quantum Reasoning Motor' : 'Quantum Reasoning Engine'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-4 border-t border-cyber-border/20 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-gray-700 uppercase tracking-widest">v3.2.0</span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            <span className="font-mono text-[7px] text-gray-700">
              {language === 'tr' ? '9 Saglayici' : '9 Providers'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
