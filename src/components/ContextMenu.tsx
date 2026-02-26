import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon: string;
    action: () => void;
    divider?: boolean;
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    x: number;
    y: number;
    onClose: () => void;
}

export default function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', keyHandler);
        return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler); };
    }, [onClose]);

    // Adjust position to stay within viewport
    const adjustedX = Math.min(x, window.innerWidth - 180);
    const adjustedY = Math.min(y, window.innerHeight - items.length * 38 - 16);

    return (
        <div ref={ref} className="fixed z-[200] min-w-[160px] glass-card border border-cyber-border/50 rounded-xl py-1.5 shadow-2xl animate-in zoom-in-95 fade-in duration-100"
            style={{ left: adjustedX, top: adjustedY }}>
            {items.map((item, i) => (
                <React.Fragment key={item.id}>
                    {item.divider && i > 0 && <div className="h-px bg-cyber-border/30 my-1 mx-2" />}
                    <button type="button" onClick={() => { item.action(); onClose(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-mono text-[10px] text-gray-400 hover:bg-cyber-primary/10 hover:text-white transition-colors">
                        <span className="text-sm flex-shrink-0">{item.icon}</span>
                        {item.label}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}

/* Hook for context menu state */
export function useContextMenu() {
    const [menu, setMenu] = React.useState<{ x: number; y: number } | null>(null);
    const open = (e: React.MouseEvent) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); };
    const close = () => setMenu(null);
    return { menu, open, close };
}
