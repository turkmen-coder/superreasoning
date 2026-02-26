import { useState, useEffect, useCallback } from 'react';

export interface PromptHistoryEntry {
    id: string;
    intent: string;
    masterPrompt: string;
    reasoning?: string;
    provider: string;
    framework: string;
    domainId: string;
    createdAt: string;
    score?: number;
}

const STORAGE_KEY = 'sr_prompt_history';
const MAX_ENTRIES = 50;

function loadHistory(): PromptHistoryEntry[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveHistory(entries: PromptHistoryEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function usePromptHistory() {
    const [history, setHistory] = useState<PromptHistoryEntry[]>(loadHistory);

    useEffect(() => { saveHistory(history); }, [history]);

    const addEntry = useCallback((entry: Omit<PromptHistoryEntry, 'id' | 'createdAt'>) => {
        const newEntry: PromptHistoryEntry = {
            ...entry,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
        };
        setHistory(prev => [newEntry, ...prev].slice(0, MAX_ENTRIES));
    }, []);

    const removeEntry = useCallback((id: string) => {
        setHistory(prev => prev.filter(e => e.id !== id));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return { history, addEntry, removeEntry, clearHistory };
}
