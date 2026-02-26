import React, { useEffect, useState } from 'react';

interface OnboardingModalProps {
    onDone: () => void;
}

const STEPS = [
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
        ),
        title: 'API Key Seç',
        desc: 'Ayarlar → API Key Yönetimi\'nden bir provider seç ve API keyini gir. Groq ücretsiz başlamak için harika!',
        tip: '💡 İpucu: Groq API key almak ücretsiz ve saniyeler içinde yapılabilir.',
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9d00ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
            </svg>
        ),
        title: 'Domain & Framework Seç',
        desc: 'Prompt Lab\'de ne geliştirdiğini seç: Frontend, Backend, Security... Ardından düşünce çerçeveni belirle: COT, REACT, APE...',
        tip: '💡 İpucu: Emin değilsen Auto\'yu seç — sistem en iyisini seçer.',
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff9f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
        ),
        title: 'İlk Promptunu Yaz',
        desc: 'Textarea\'ya ne yapmak istediğini yaz ve "Generate" butonuna bas. Ctrl+Enter da çalışır!',
        tip: '💡 İpucu: Şablonlar arasından seçim yaparak hızlı başlayabilirsin.',
    },
];

export default function OnboardingModal({ onDone }: OnboardingModalProps) {
    const [step, setStep] = useState(0);
    const [leaving, setLeaving] = useState(false);

    const next = () => {
        if (step < STEPS.length - 1) setStep(s => s + 1);
        else finish();
    };
    const finish = () => {
        setLeaving(true);
        localStorage.setItem('sr_onboarding_done', '1');
        setTimeout(onDone, 400);
    };

    const current = STEPS[step];

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-400 ${leaving ? 'opacity-0' : 'opacity-100'}`}>
            <div className="glass-card w-full max-w-md mx-4 p-8 space-y-6 animate-in zoom-in-95 duration-300">
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-cyber-primary' : 'w-2 h-2 bg-cyber-border/60'}`} />
                    ))}
                </div>

                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-cyber-dark border border-cyber-border/40 flex items-center justify-center">
                        {current.icon}
                    </div>
                </div>

                {/* Content */}
                <div className="text-center space-y-2">
                    <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider">{current.title}</h2>
                    <p className="font-mono text-[11px] text-gray-400 leading-relaxed">{current.desc}</p>
                </div>

                {/* Tip */}
                <div className="px-4 py-3 rounded-lg bg-cyber-primary/5 border border-cyber-primary/20">
                    <p className="font-mono text-[10px] text-cyber-primary/80">{current.tip}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button type="button" onClick={finish} className="font-mono text-[10px] text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wider">
                        Atla
                    </button>
                    <button type="button" onClick={next}
                        className="px-6 py-2 rounded-lg bg-cyber-primary/20 border border-cyber-primary/40 text-cyber-primary font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-cyber-primary/30 transition-all flex items-center gap-1.5">
                        {step < STEPS.length - 1 ? 'İleri' : 'Başla 🚀'}
                        {step < STEPS.length - 1 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function useOnboarding() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (!localStorage.getItem('sr_onboarding_done')) {
            const t = setTimeout(() => setShow(true), 800);
            return () => clearTimeout(t);
        }
    }, []);
    return { show, done: () => setShow(false) };
}
