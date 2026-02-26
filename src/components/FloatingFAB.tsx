import React, { useState, useEffect } from 'react';

interface FloatingFABProps {
    onClick: () => void;
    loading: boolean;
    scrollThreshold?: number;
}

export default function FloatingFAB({ onClick, loading, scrollThreshold = 300 }: FloatingFABProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const main = document.querySelector('main') || window;
        const handler = () => {
            const scrollY = main instanceof Window ? main.scrollY : (main as Element).scrollTop;
            setVisible(scrollY > scrollThreshold);
        };
        main.addEventListener('scroll', handler, { passive: true });
        return () => main.removeEventListener('scroll', handler);
    }, [scrollThreshold]);

    if (!visible) return null;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className="fixed bottom-6 right-6 z-[100] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 animate-in zoom-in-75 fade-in"
            style={{
                background: 'linear-gradient(135deg, #06e8f9 0%, #9d00ff 100%)',
                boxShadow: loading ? 'none' : '0 0 20px rgba(6,232,249,0.4)',
            }}
            title="Generate (Ctrl+Enter)"
        >
            {loading ? (
                <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            )}
        </button>
    );
}
