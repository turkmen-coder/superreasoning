import { useState, useEffect } from 'react';

export interface ApiKeys {
    gemini: string;
    openai: string;
    anthropic: string;
    groq: string;
    deepseek: string;
    huggingface: string;
    openrouter: string;
}

const STORAGE_KEY = 'sr_api_keys';
const defaultKeys: ApiKeys = { gemini: '', openai: '', anthropic: '', groq: '', deepseek: '', huggingface: '', openrouter: '' };

function loadKeys(): ApiKeys {
    try {
        return { ...defaultKeys, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
        return defaultKeys;
    }
}

export function useApiKeys() {
    const [keys, setKeys] = useState<ApiKeys>(loadKeys);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
        // Sync to env-like globals for services to pick up
        if (keys.gemini) (window as any).__SR_GEMINI_KEY = keys.gemini;
        if (keys.openai) (window as any).__SR_OPENAI_KEY = keys.openai;
        if (keys.anthropic) (window as any).__SR_CLAUDE_KEY = keys.anthropic;
        if (keys.groq) (window as any).__SR_GROQ_KEY = keys.groq;
        if (keys.deepseek) (window as any).__SR_DEEPSEEK_KEY = keys.deepseek;
        if (keys.huggingface) (window as any).__SR_HF_KEY = keys.huggingface;
        if (keys.openrouter) (window as any).__SR_OR_KEY = keys.openrouter;
    }, [keys]);

    const setKey = (provider: keyof ApiKeys, value: string) => {
        setKeys(prev => ({ ...prev, [provider]: value }));
    };

    return { keys, setKey };
}
