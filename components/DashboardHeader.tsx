import React from 'react';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

interface DashboardHeaderProps {
  systemActive: boolean;
  loading: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ systemActive, loading }) => {
  const { language, toggleLanguage } = useTranslation();
  const { profile, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-cyber-border/40 bg-[#0a0a10]/60 backdrop-blur-lg">
      {/* Left: Title + Version + Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-xs font-semibold text-white tracking-wider uppercase">
            Super Reasoning
          </h2>
          <span className="font-mono text-[10px] font-bold text-cyber-primary border border-cyber-primary/40 px-1.5 py-0.5 rounded bg-cyber-primary/5">
            V4.0
          </span>
        </div>
        <span className="text-cyber-border">|</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${systemActive
            ? 'border-cyber-success/40 bg-cyber-success/5 text-cyber-success'
            : loading
              ? 'border-yellow-500/40 bg-yellow-500/5 text-yellow-400'
              : 'border-cyber-border bg-cyber-dark text-gray-500'
          }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${systemActive ? 'bg-cyber-success animate-pulse' : loading ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
            }`} />
          <span>
            {loading
              ? 'Processing'
              : systemActive
                ? 'System Status: Active'
                : 'System Status: Standby'
            }
          </span>
        </div>
      </div>

      {/* Right: Search + Language + User */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={language === 'tr' ? 'Mimari ara...' : 'Search architecture...'}
            className="w-[180px] bg-cyber-dark/60 border border-cyber-border/50 rounded-lg pl-9 pr-3 py-1.5 font-mono text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyber-primary/50 focus:shadow-[0_0_10px_rgba(0,240,255,0.1)] transition-all"
          />
        </div>

        {/* Language Toggle */}
        <button
          type="button"
          onClick={toggleLanguage}
          aria-label={language === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
          className="font-mono text-[10px] border border-cyber-border bg-cyber-dark/60 px-2.5 py-1 rounded text-gray-500 hover:text-white hover:border-cyber-primary/50 transition-colors uppercase tracking-widest"
        >
          {language === 'tr' ? 'EN' : 'TR'} / <span className="text-cyber-primary">{language === 'tr' ? 'TR' : 'EN'}</span>
        </button>

        {/* User Badge */}
        {profile && (
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="font-mono text-[10px] text-gray-400 leading-none">Arch_Node_01</p>
              <p className="font-mono text-[8px] text-gray-600 leading-none mt-0.5">
                {profile.plan === 'pro' || profile.plan === 'team' ? 'Pro' : 'Free'}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-primary/20 to-cyber-accent/20 border border-cyber-primary/30 flex items-center justify-center hover:border-cyber-primary/60 transition-colors"
              aria-label="User menu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
