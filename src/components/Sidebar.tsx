import React from 'react';

export type SidebarPage =
  | 'dashboard'
  | 'prompts'
  | 'ailab'
  | 'optimizer'
  | 'analytics'
  | 'ragflow'
  | 'settings';

interface SidebarProps {
  activePage: SidebarPage;
  onPageChange: (page: SidebarPage) => void;
}

const NAV_ITEMS: { id: SidebarPage; label: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Prompt Lab',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: 'prompts',
    label: 'Kütüphane',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'ailab',
    label: 'AI Lab',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
    ),
  },
  {
    id: 'optimizer',
    label: 'Optimizer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'ragflow',
    label: 'RAG Engine',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analitik',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-cyber-black border-r border-cyber-border/40 z-50 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-14' : 'w-[200px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-cyber-border/40 bg-cyber-dark flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-cyber-primary/15 rounded-md flex items-center justify-center border border-cyber-primary/30 flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="font-mono font-bold text-[11px] tracking-widest text-white uppercase truncate">
              Super<span className="text-cyber-primary">Reasoning</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-200 hover:bg-cyber-gray transition-colors flex-shrink-0"
          title={isCollapsed ? 'Genişlet' : 'Daralt'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'} rounded-lg transition-all duration-150 group ${
                isActive
                  ? 'bg-cyber-primary/10 text-cyber-primary'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <span className={`transition-colors flex-shrink-0 ${isActive ? 'text-cyber-primary drop-shadow-[0_0_6px_rgba(6,232,249,0.8)]' : 'group-hover:text-gray-300'}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="ml-2.5 font-mono text-[10px] font-bold uppercase tracking-wider truncate">
                  {item.label}
                </span>
              )}
              {!isCollapsed && isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-cyber-primary animate-pulse shadow-[0_0_6px_rgba(6,232,249,1)] flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Version */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-cyber-border/30">
          <span className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">v4.0</span>
        </div>
      )}
    </div>
  );
}
