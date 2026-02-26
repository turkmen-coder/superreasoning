import React, { useState } from 'react';

export interface Persona {
    id: string;
    name: string;
    icon: string;
    role: string;
    systemPrompt: string;
}

const BUILT_IN_PERSONAS: Persona[] = [
    { id: 'senior-dev', name: 'Senior Developer', icon: '👨‍💻', role: 'Engineering', systemPrompt: 'You are a senior software engineer with 15+ years of experience. You prioritize clean code, scalability, and SOLID principles. Always consider edge cases, performance implications, and security.' },
    { id: 'ux-researcher', name: 'UX Researcher', icon: '🎨', role: 'Design', systemPrompt: 'You are a UX researcher and product designer focused on user-centered design. You always think about user journeys, accessibility (WCAG 2.1 AA), and data-driven design decisions.' },
    { id: 'data-scientist', name: 'Data Scientist', icon: '📊', role: 'Data', systemPrompt: 'You are an expert data scientist specializing in ML/AI. You provide rigorous statistical analysis, cite relevant research, and always consider model bias, data quality, and reproducibility.' },
    { id: 'security-expert', name: 'Security Expert', icon: '🔒', role: 'Security', systemPrompt: 'You are a cybersecurity expert specializing in application security (OWASP) and threat modeling. Always approach problems through the lens of attack vectors, defense in depth, and zero trust.' },
    { id: 'product-manager', name: 'Product Manager', icon: '📋', role: 'Product', systemPrompt: 'You are a product manager focused on user value and business impact. You frame everything in terms of user stories, KPIs, OKRs, and prioritization frameworks like RICE or MoSCoW.' },
    { id: 'content-writer', name: 'Content Writer', icon: '✍️', role: 'Content', systemPrompt: 'You are a professional content writer and copywriter. You create engaging, SEO-optimized, and brand-consistent content. You adapt tone based on audience — from technical to executive to consumer.' },
    { id: 'devops-engineer', name: 'DevOps Engineer', icon: '⚙️', role: 'Ops', systemPrompt: 'You are a DevOps/SRE engineer focused on reliability, CI/CD pipelines, infrastructure as code, and observability. You think in terms of uptime, incident response, and automation.' },
    { id: 'ml-engineer', name: 'ML Engineer', icon: '🤖', role: 'AI/ML', systemPrompt: 'You are a machine learning engineer specializing in production ML systems, model deployment, feature engineering, and MLOps. You balance research innovations with production constraints.' },
];

interface PersonaLibraryProps {
    activePersonaId?: string;
    onApply: (persona: Persona) => void;
    onClear: () => void;
}

export default function PersonaLibrary({ activePersonaId, onApply, onClear }: PersonaLibraryProps) {
    const [open, setOpen] = useState(false);
    const active = BUILT_IN_PERSONAS.find(p => p.id === activePersonaId);

    return (
        <div className="glass-card p-4 space-y-3">
            <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm">{active ? active.icon : '🎭'}</span>
                    <div>
                        <span className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                            Persona
                        </span>
                        {active && <span className="ml-2 font-mono text-[9px] text-cyber-primary">{active.name}</span>}
                        {!active && <span className="ml-2 font-mono text-[9px] text-gray-600">Seçilmedi</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {active && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="font-mono text-[9px] text-gray-600 hover:text-red-400 transition-colors px-1">
                            Kaldır ✕
                        </button>
                    )}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </button>

            {open && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                    {BUILT_IN_PERSONAS.map((p) => (
                        <button key={p.id} type="button" onClick={() => { onApply(p); setOpen(false); }}
                            className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all ${activePersonaId === p.id
                                    ? 'border-cyber-primary/60 bg-cyber-primary/10'
                                    : 'border-cyber-border/30 hover:border-cyber-border/60 hover:bg-white/2'
                                }`}>
                            <span className="text-base flex-shrink-0">{p.icon}</span>
                            <div>
                                <div className="font-mono text-[9px] font-bold text-gray-300">{p.name}</div>
                                <div className="font-mono text-[8px] text-gray-600">{p.role}</div>
                            </div>
                            {activePersonaId === p.id && <span className="ml-auto text-cyber-primary text-[9px]">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
