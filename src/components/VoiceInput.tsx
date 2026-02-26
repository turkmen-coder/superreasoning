import React, { useState, useCallback, useRef } from 'react';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
}

type VoiceState = 'idle' | 'listening' | 'unsupported';

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
    const [state, setState] = useState<VoiceState>(
        typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
            ? 'idle' : 'unsupported'
    );
    const recogRef = useRef<any>(null);

    const start = useCallback(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;
        const recog = new SR();
        recog.lang = 'tr-TR';
        recog.interimResults = false;
        recog.continuous = false;
        recog.onstart = () => setState('listening');
        recog.onresult = (e: any) => {
            const transcript = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('');
            onTranscript(transcript);
            setState('idle');
        };
        recog.onerror = () => setState('idle');
        recog.onend = () => setState('idle');
        recogRef.current = recog;
        recog.start();
    }, [onTranscript]);

    const stop = useCallback(() => {
        recogRef.current?.stop();
        setState('idle');
    }, []);

    if (state === 'unsupported') return null;

    return (
        <button
            type="button"
            onClick={state === 'listening' ? stop : start}
            disabled={disabled}
            title={state === 'listening' ? 'Durdurmak için tıkla' : 'Sesle yazmak için tıkla'}
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all duration-200 ${state === 'listening'
                    ? 'border-red-500/60 bg-red-500/10 text-red-400 animate-pulse'
                    : 'border-cyber-border/40 bg-cyber-dark/50 text-gray-500 hover:border-cyber-primary/40 hover:text-cyber-primary'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            {state === 'listening' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
            )}
        </button>
    );
}
