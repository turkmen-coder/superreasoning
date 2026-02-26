import React, { useState, useCallback } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactElement;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export default function Tooltip({ content, children, placement = 'top', delay = 400 }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

    const show = useCallback(() => {
        timerRef.current = setTimeout(() => setVisible(true), delay);
    }, [delay]);

    const hide = useCallback(() => {
        clearTimeout(timerRef.current);
        setVisible(false);
    }, []);

    const placementStyles: Record<string, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
            {children}
            {visible && content && (
                <div className={`absolute z-[100] pointer-events-none ${placementStyles[placement]}`}>
                    <div className="bg-gray-900 border border-cyber-border/60 text-gray-200 font-mono text-[9px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl max-w-[200px] text-center leading-relaxed">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
}
