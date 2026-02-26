import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from './ui'; // Fallback to basic icons if ui is missing

interface OutputTerminalProps {
    result?: { masterPrompt: string; reasoning?: string };
    loading?: boolean;
    agentAnalyzing?: boolean;
    agentHint?: string | null;
}

export default function OutputTerminal({ result, loading, agentAnalyzing, agentHint }: OutputTerminalProps) {
    const [logs, setLogs] = useState<{ id: string; time: string; text: string; type: 'info' | 'success' | 'process' }[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, result]);

    // Simulate synthetic loading logs
    useEffect(() => {
        if (loading || agentAnalyzing) {
            setLogs([]);
            const msgs = [
                "Processing request...",
                "Fetching data from RAG Engine...",
                "Analyzing intent patterns...",
                "Evaluating context rules...",
                "Generating response..."
            ];
            let i = 0;
            const interval = setInterval(() => {
                if (i < msgs.length) {
                    addLog(msgs[i], 'process');
                    i++;
                }
            }, 800);
            return () => clearInterval(interval);
        } else if (result) {
            addLog("Task completed successfully.", "success");
        }
    }, [loading, agentAnalyzing, result]);

    const addLog = (text: string, type: 'info' | 'success' | 'process' = 'info') => {
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text,
            type
        }]);
    };

    const hasContent = !!result || loading || agentAnalyzing;

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-primary">
                        <polyline points="4 17 10 11 4 5"></polyline>
                        <line x1="12" y1="19" x2="20" y2="19"></line>
                    </svg>
                    <h2 className="font-mono text-xs font-semibold text-gray-300 uppercase tracking-[0.15em]">
                        Output Stream - Live
                    </h2>
                </div>

                {/* Active glowing indicator */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border 
          ${(loading || agentAnalyzing) ? 'border-cyber-primary/50 text-cyber-primary' : 'border-cyber-border text-gray-500'}
        `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${(loading || agentAnalyzing) ? 'bg-cyber-primary animate-pulse' : 'bg-gray-600'}`} />
                    <span className="text-[10px] font-mono tracking-widest uppercase">
                        {(loading || agentAnalyzing) ? 'Processing' : 'Idle'}
                    </span>
                </div>
            </div>

            <div
                className={`flex-1 relative rounded-xl border p-6 bg-[#0a0a10]/80 backdrop-blur-sm overflow-y-auto transition-all duration-300
          ${(loading || agentAnalyzing) ? 'border-cyber-primary/40 glow-processing' : result ? 'border-cyber-primary/30 shadow-glow-primary-soft' : 'border-cyber-border/30'}
        `}
            >
                <div className="font-mono text-[12px] leading-relaxed space-y-2" ref={scrollRef}>
                    {/* Header info */}
                    <div className="text-cyber-primary/70 mb-4 pb-2 border-b border-cyber-border/30">
                        <div>META-ARCH V4 Core Engine [Version 4.0.0]</div>
                        <div>(c) AI Engineering Platform. All rights reserved.</div>
                    </div>

                    {!hasContent && (
                        <div className="text-gray-600 italic">Waiting for input...</div>
                    )}

                    {/* Logs */}
                    <div className="space-y-1">
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-3">
                                <span className="text-gray-600">[{log.time}]</span>
                                <span className={`
                  ${log.type === 'process' ? 'text-cyber-primary animate-pulse' : ''}
                  ${log.type === 'success' ? 'text-[#00ff9f]' : ''}
                  ${log.type === 'info' ? 'text-gray-400' : ''}
                `}>
                                    {log.type === 'process' && <span className="mr-2">...</span>}
                                    {log.text}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Result Block */}
                    {result && (
                        <div className="mt-6 pt-4 border-t border-cyber-primary/20">
                            <div className="text-[#00E5FF] mb-2 font-bold uppercase tracking-widest text-xs drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                                {'>'} FINAL OUTPUT:
                            </div>
                            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed mt-4">
                                <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-cyber-border/50 prose-a:text-cyber-primary prose-code:text-cyber-primary/90">
                                    {result.masterPrompt}
                                </ReactMarkdown>
                            </div>

                            {result.reasoning && (
                                <div className="mt-6 p-4 rounded bg-[#0a0a0f]/80 backdrop-blur-sm border border-cyber-border/30 text-gray-400">
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#7000ff] mb-2 font-bold flex items-center gap-2">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                        </svg>
                                        Thought Process:
                                    </div>
                                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-p:text-gray-400">{result.reasoning}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
