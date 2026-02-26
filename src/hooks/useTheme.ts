import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'sr_theme';

function getInitialTheme(): Theme {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch { }
    return 'dark';
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);

        if (theme === 'light') {
            root.style.setProperty('--bg-primary', '#f8fafc');
            root.style.setProperty('--bg-card', '#ffffff');
            root.style.setProperty('--text-primary', '#0f172a');
            root.style.setProperty('--text-muted', '#64748b');
            root.style.setProperty('--border', 'rgba(0,0,0,0.1)');
            document.body.style.backgroundColor = '#f0f4f8';
            document.body.style.color = '#0f172a';
        } else {
            root.style.setProperty('--bg-primary', '#050505');
            root.style.setProperty('--bg-card', 'rgba(25,25,25,0.4)');
            root.style.setProperty('--text-primary', '#e5e7eb');
            root.style.setProperty('--text-muted', '#9ca3af');
            root.style.setProperty('--border', 'rgba(6,232,249,0.1)');
            document.body.style.backgroundColor = '#050505';
            document.body.style.color = '#e5e7eb';
        }
    }, [theme]);

    const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return { theme, setTheme, toggle };
}
