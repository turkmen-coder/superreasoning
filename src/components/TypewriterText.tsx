import React, { useEffect, useRef, useState } from 'react';

interface TypewriterTextProps {
    text: string;
    speed?: number; // ms per character
    onDone?: () => void;
    className?: string;
}

export default function TypewriterText({ text, speed = 8, onDone, className }: TypewriterTextProps) {
    const [displayed, setDisplayed] = useState('');
    const indexRef = useRef(0);
    const prevTextRef = useRef('');

    useEffect(() => {
        if (text === prevTextRef.current) return;
        // If new text starts with prev, continue from where we left off
        if (text.startsWith(prevTextRef.current)) {
            indexRef.current = prevTextRef.current.length;
        } else {
            indexRef.current = 0;
            setDisplayed('');
        }
        prevTextRef.current = text;

        const interval = setInterval(() => {
            if (indexRef.current >= text.length) {
                clearInterval(interval);
                onDone?.();
                return;
            }
            // Chunk: print 3-5 chars at a time for snappier feel
            const chunk = Math.min(3 + Math.floor(Math.random() * 3), text.length - indexRef.current);
            setDisplayed(text.slice(0, indexRef.current + chunk));
            indexRef.current += chunk;
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, onDone]);

    return (
        <span className={className}>
            {displayed}
            {displayed.length < text.length && (
                <span className="inline-block w-0.5 h-3.5 bg-cyber-primary ml-0.5 animate-pulse align-text-bottom" />
            )}
        </span>
    );
}
