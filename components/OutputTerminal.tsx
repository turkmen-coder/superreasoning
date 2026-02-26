import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import type { PromptResponse } from '../types';
import ReactMarkdown from 'react-markdown';

interface OutputTerminalProps {
  result: PromptResponse | null;
  loading: boolean;
  agentAnalyzing?: boolean;
  agentHint?: string | null;
  streamSpeed?: number;
}

const OutputTerminal: React.FC<OutputTerminalProps> = ({ result, loading, agentAnalyzing, agentHint, streamSpeed = 1.4 }) => {
  const { t } = useTranslation();
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const lastResultIdRef = useRef<string | null>(null);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Return all non-empty lines from the single unified prompt
  const extractUserContent = (prompt: string): string[] =>
    prompt.split('\n').filter(Boolean);

  // Streaming effect for result — only stream on NEW generations, not on enhance-apply
  useEffect(() => {
    if (!result) {
      setDisplayedLines([]);
      lastResultIdRef.current = null;
      return;
    }

    // Use reasoning as a stable ID — it doesn't change on enhance-apply
    const resultId = result.reasoning || result.masterPrompt.slice(0, 50);
    const isNewGeneration = lastResultIdRef.current !== resultId;

    if (isNewGeneration) {
      // New generation: stream lines with animation
      lastResultIdRef.current = resultId;
      const lines = extractUserContent(result.masterPrompt);
      let currentIdx = 0;
      setDisplayedLines([]);

      const interval = setInterval(() => {
        if (currentIdx < lines.length) {
          setDisplayedLines((prev) => [...prev, lines[currentIdx]]);
          currentIdx++;
        } else {
          clearInterval(interval);
        }
      }, 60);

      return () => clearInterval(interval);
    } else {
      // Enhance-apply: show all lines immediately without re-streaming
      const lines = extractUserContent(result.masterPrompt);
      setDisplayedLines(lines);
    }
  }, [result]);

  // Idle terminal content
  const idleContent = [
    { type: 'heading', text: '# VIEW_STREAM READY' },
    { type: 'blank', text: '' },
    { type: 'task', label: 'INPUT BUS:', text: ' Send goal + constraints to initialize output orchestration.' },
    { type: 'blank', text: '' },
    { type: 'step', number: '1.', label: 'Intent parse:', text: ' Analyze user objective and risk level.' },
    { type: 'step', number: '2.', label: 'Routing:', text: ' Select domain + reasoning framework.' },
    { type: 'step', number: '3.', label: 'Synthesis:', text: ' Build architecture-grade prompt structure.' },
    { type: 'step', number: '4.', label: 'Stream:', text: ' Deliver output in staged terminal frames.' },
    { type: 'blank', text: '' },
    { type: 'status', text: '_ Waiting for pipeline trigger ...' },
  ];

  const totalLines = result ? extractUserContent(result.masterPrompt).length : 0;
  const streamedLines = displayedLines.length;
  const completion = totalLines > 0 ? Math.round((streamedLines / totalLines) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-cyber-primary uppercase tracking-wider font-bold">VIEW_STREAM</span>
          <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
            {t.ui.flowTitle}
          </span>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="flex-1 glass-card overflow-hidden relative" style={{ padding: 0 }}>
        {/* Traffic Light Dots */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-success/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-primary/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-primary/40" />
        </div>

        {/* Terminal Content */}
        <div className="p-5 h-full overflow-y-auto font-mono text-xs leading-relaxed custom-scrollbar">
          {agentAnalyzing ? (
            <div className="space-y-2">
              <p className="text-gray-600">/// OUTPUT ORCHESTRATION PRECHECK ///</p>
              <p className="text-emerald-400 animate-pulse">_ Input signal is being profiled for routing...</p>
              <div className="mt-3 space-y-1.5 text-[10px]">
                <p className="text-emerald-500/70">[✓] Input fingerprint extracted</p>
                <p className="text-emerald-400 animate-pulse">[~] Domain/strategy route selection in progress...</p>
                <p className="text-gray-600">[  ] Architecture synthesis queued</p>
                <p className="text-gray-600">[  ] Output stream framing pending</p>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              <p className="text-gray-600">/// ARCHITECTURE SYNTHESIS RUN ///</p>
              <p className="text-cyber-primary animate-pulse">_ Building output graph and stream frames...</p>
              <div className="mt-3 space-y-1.5 text-[10px]">
                <p className="text-emerald-500/70">[✓] Routing resolved{agentHint ? ` — ${agentHint.slice(0, 60)}` : ''}</p>
                <p className="text-emerald-500/70">[✓] Framework handshake complete</p>
                <p className="text-cyber-primary animate-pulse">[~] Master architecture generation in progress...</p>
                <p className="text-gray-600">[  ] Stream finalization pending</p>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-3/4 bg-cyber-dark/60 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-cyber-dark/60 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-cyber-dark/60 rounded animate-pulse" />
              </div>
            </div>
          ) : result ? (
            <div className="space-y-1">
              <p className="text-emerald-500/80 text-[10px]">/// STREAM FINALIZED ///</p>
              <div className="markdown-output text-gray-300">
                {displayedLines.map((line, idx) => (
                  <div key={idx} className="mb-0.5">
                    <ReactMarkdown>{line}</ReactMarkdown>
                  </div>
                ))}
              </div>
              {displayedLines.length > 0 && (
                <>
                  <div className="mt-6 border border-glass-border rounded px-4 py-2.5 bg-cyber-dark/30">
                    <p className="text-gray-400 italic text-[11px]">
                      "Good output flow is not faster text; it is ordered reasoning in motion."
                    </p>
                  </div>
                  <p className="mt-4 text-gray-600 text-[10px]">
                    Lines streamed: {streamedLines}/{totalLines || streamedLines} | completion: {completion}% | rate profile: x{streamSpeed}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {idleContent.map((line, idx) => {
                if (line.type === 'blank') return <div key={idx} className="h-3" />;
                if (line.type === 'comment') return <p key={idx} className="text-gray-600">{line.text}</p>;
                if (line.type === 'heading') return <p key={idx} className="text-cyber-primary font-bold">{line.text}</p>;
                if (line.type === 'task') return (
                  <p key={idx}>
                    <span className="text-cyber-primary font-bold">{line.label}</span>
                    <span className="text-gray-400">{line.text}</span>
                  </p>
                );
                if (line.type === 'step') return (
                  <p key={idx} className="pl-4">
                    <span className="text-gray-500 mr-2">{line.number}</span>
                    <span className="text-cyber-primary">{line.label}</span>
                    <span className="text-gray-400">{line.text}</span>
                  </p>
                );
                if (line.type === 'status') return (
                  <p key={idx} className="text-gray-500">
                    {line.text}
                    {cursorVisible && <span className="text-cyber-primary ml-0.5">|</span>}
                  </p>
                );
                return null;
              })}

              <div className="mt-6 border border-glass-border rounded px-4 py-2.5 bg-cyber-dark/30">
                <p className="text-gray-400 italic text-[11px]">
                  "Good output flow is not faster text; it is ordered reasoning in motion."
                </p>
              </div>

              <p className="mt-4 text-gray-600 text-[10px]">
                Stream protocol armed | rate profile: x{streamSpeed}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutputTerminal;
