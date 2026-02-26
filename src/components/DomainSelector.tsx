import React from 'react';
import { useTranslation } from '../i18n';

interface DomainSelectorProps {
    selectedDomainId: string;
    onSelect: (domainId: string) => void;
}

export default function DomainSelector({ selectedDomainId, onSelect }: DomainSelectorProps) {
    const { t } = useTranslation();

    // First row (Dev Ops, System Arch, Frontend, Backend)
    // Second row (others, hidden or shown based on a 'show all' toggle if needed, or just keep them all for 4x2 grid)
    const domains = [
        { id: 'devops', label: t.domains['devops']?.name || 'DevOps', iconPath: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" },
        { id: 'system-architecture', label: t.domains['system-architecture']?.name || 'System Arch', iconPath: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
        { id: 'frontend', label: t.domains['frontend']?.name || 'Frontend', iconPath: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
        { id: 'security', label: t.domains['security']?.name || 'Security', iconPath: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
        { id: 'software-engineering', label: t.domains['software-engineering']?.name || 'Software', iconPath: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        { id: 'data-science', label: t.domains['data-science']?.name || 'Data', iconPath: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
        { id: 'backend', label: t.domains['backend']?.name || 'Backend', iconPath: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" },
        { id: 'auto', label: t.domains.auto?.name || 'Auto', iconPath: "M13 10V3L4 14h7v7l9-11h-7z" },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {domains.map((domain) => (
                <button
                    key={domain.id}
                    onClick={() => onSelect(domain.id)}
                    className={`
            relative p-2.5 rounded-lg border flex flex-col items-center justify-center gap-2 group transition-all duration-300
            ${selectedDomainId === domain.id
                            ? 'bg-cyber-primary/5 border-cyber-primary/40 text-cyber-primary shadow-glow-primary-subtle'
                            : 'bg-transparent border-cyber-border/30 text-gray-500 hover:border-cyber-primary/30 hover:bg-cyber-gray/50 hover:text-gray-300'
                        }
          `}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-5 h-5 ${selectedDomainId === domain.id ? 'text-cyber-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]' : 'text-gray-500 group-hover:text-gray-400'} transition-all duration-300`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d={domain.iconPath} />
                    </svg>

                    <span className="font-mono text-[9px] font-medium uppercase tracking-widest text-center">
                        {domain.label}
                    </span>
                </button>
            ))}
        </div>
    );
}
