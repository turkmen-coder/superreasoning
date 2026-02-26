import { useState, useCallback } from 'react';
import { Icon } from './ui';
import type {
  OptimizerProvider,
  VibeCodingPlan,
  VibeCodingTask,
  VibeCodingAgentResult,
  ProjectScale,
  VibeCodingMode,
} from '../types/optimizer';
import { generateVibeCodingPlan, executeAgentTask } from '../services/vibeCodingService';
import {
  PHASE_LABELS,
  SCALE_OPTIONS,
  COMPLEXITY_COLORS,
  PRIORITY_COLORS,
} from '../services/vibeCodingPrompts';
import { useTranslation } from '../i18n';
import { getAuthHeaders } from '../services/apiClient';

const ENRICH_API = import.meta.env?.VITE_API_BASE_URL ?? '/api/v1';

const PROVIDERS: { id: OptimizerProvider; label: string; icon: string }[] = [
  { id: 'gemini', label: 'Gemini', icon: '♊' },
  { id: 'openai', label: 'OpenAI', icon: '◎' },
  { id: 'deepseek', label: 'DeepSeek', icon: '◈' },
];

export default function VibeCodingPanel() {
  const { language } = useTranslation();
  const lang = language as 'tr' | 'en';

  // Mode
  const [mode, setMode] = useState<VibeCodingMode>('plan');

  // Plan Input
  const [projectDesc, setProjectDesc] = useState('');
  const [scale, setScale] = useState<ProjectScale>('startup');
  const [provider, setProvider] = useState<OptimizerProvider>('gemini');
  const [techFrontend, setTechFrontend] = useState('');
  const [techBackend, setTechBackend] = useState('');
  const [techDatabase, setTechDatabase] = useState('');
  const [techDeployment, setTechDeployment] = useState('');

  // State
  const [plan, setPlan] = useState<VibeCodingPlan | null>(null);
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Agent Mode
  const [agentResults, setAgentResults] = useState<Map<string, VibeCodingAgentResult>>(new Map());
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showPrd, setShowPrd] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate Plan
  const handleGeneratePlan = useCallback(async () => {
    if (!projectDesc.trim()) {
      setError(lang === 'tr' ? 'Proje aciklamasi gerekli.' : 'Project description is required.');
      return;
    }
    setError(null);
    setRunning(true);
    setPlan(null);
    setAgentResults(new Map());

    try {
      const result = await generateVibeCodingPlan({
        projectDescription: projectDesc,
        scale,
        techPreferences: {
          frontend: techFrontend || undefined,
          backend: techBackend || undefined,
          database: techDatabase || undefined,
          deployment: techDeployment || undefined,
        },
        provider,
        language: lang,
        onStatusChange: setStatusText,
      });
      setPlan(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      setStatusText('');
    }
  }, [projectDesc, scale, provider, techFrontend, techBackend, techDatabase, techDeployment, lang]);

  // Execute Agent Task
  const handleExecuteTask = useCallback(async (task: VibeCodingTask) => {
    if (!plan) return;
    setRunningTaskId(task.id);
    setError(null);

    try {
      const result = await executeAgentTask({
        task,
        projectContext: plan.projectDescription,
        techStack: plan.techStack,
        provider,
        language: lang,
        onStatusChange: setStatusText,
      });
      setAgentResults(prev => new Map(prev).set(task.id, result));
      setExpandedTask(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningTaskId(null);
      setStatusText('');
    }
  }, [plan, provider, lang]);

  // Copy prompt
  const handleCopyPrompt = useCallback(async (taskId: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(taskId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }, []);

  // Copy all prompts
  const handleCopyAllPrompts = useCallback(async () => {
    if (!plan) return;
    const allPrompts = plan.phases
      .flatMap(p => p.tasks)
      .map(t => `--- ${t.id}: ${t.title} ---\n${t.agentPrompt}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(allPrompts);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }, [plan]);

  // Enrich single task prompt
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const handleEnrichTask = useCallback(async (taskId: string, agentPrompt: string) => {
    setEnrichingId(taskId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${ENRICH_API}/enrich`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPrompt: agentPrompt, mode: 'fast', language: lang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.integratedPrompts?.length > 0 && plan) {
          const updated = { ...plan, phases: plan.phases.map(phase => ({
            ...phase,
            tasks: phase.tasks.map(t =>
              t.id === taskId ? { ...t, agentPrompt: data.enrichedPrompt } : t
            ),
          }))};
          setPlan(updated);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setEnrichingId(null);
    }
  }, [plan, lang]);

  const totalTasks = plan?.phases.reduce((sum, p) => sum + p.tasks.length, 0) || 0;
  const completedTasks = agentResults.size;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 via-cyber-primary/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center">
          <Icon name="lightbulb" size={20} className="text-violet-400" />
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-gray-200 uppercase tracking-wider">
            Vibe Coding Master
          </h2>
          <p className="font-mono text-[10px] text-gray-500">
            {lang === 'tr' ? 'AI Destekli Proje Planlama & Agent Gorev Uretimi' : 'AI-Powered Project Planning & Agent Task Generation'}
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('plan')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
            mode === 'plan'
              ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
              : 'border-glass-border text-gray-500 hover:border-glass-border/60'
          }`}
        >
          <Icon name="assignment" size={14} />
          {lang === 'tr' ? 'Plan Modu' : 'Plan Mode'}
        </button>
        <button
          onClick={() => setMode('agent')}
          disabled={!plan}
          className={`flex-1 py-2.5 px-4 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
            mode === 'agent'
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
              : 'border-glass-border text-gray-500 hover:border-glass-border/60'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <Icon name="bolt" size={14} />
          {lang === 'tr' ? 'Agent Modu' : 'Agent Mode'}
          {plan && <span className="ml-1 text-[8px] opacity-60">({totalTasks})</span>}
        </button>
      </div>

      {/* =========== PLAN MODE =========== */}
      {mode === 'plan' && (
        <div className="space-y-4">
          {/* Input Card */}
          <div className="glass-card p-4 space-y-4">
            {/* Project Description */}
            <div>
              <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                {lang === 'tr' ? 'Proje Aciklamasi' : 'Project Description'}
              </label>
              <textarea
                value={projectDesc}
                onChange={e => { setProjectDesc(e.target.value); setError(null); }}
                placeholder={lang === 'tr'
                  ? 'Projenizi detayli olarak aciklayin... (orn: E-ticaret sitesi, kullanici girisi, urun katalogu, odeme sistemi)'
                  : 'Describe your project in detail... (e.g. E-commerce site with user auth, product catalog, payment system)'}
                rows={5}
                className="w-full glass-input px-4 py-3 font-mono text-[11px] text-gray-200 placeholder-gray-700 resize-y"
                spellCheck={false}
              />
            </div>

            {/* Scale Selection */}
            <div>
              <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                {lang === 'tr' ? 'Proje Olcegi' : 'Project Scale'}
              </label>
              <div className="flex gap-2">
                {SCALE_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setScale(s.id)}
                    className={`flex-1 py-2 px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-all text-left ${
                      scale === s.id
                        ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                        : 'border-glass-border text-gray-500 hover:border-glass-border/60'
                    }`}
                  >
                    <span className="block font-bold">{lang === 'tr' ? s.tr : s.en}</span>
                    <span className="block text-[8px] opacity-60 mt-0.5 normal-case">{lang === 'tr' ? s.desc_tr : s.desc_en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tech Stack Preferences */}
            <div>
              <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                {lang === 'tr' ? 'Teknoloji Tercihleri (Opsiyonel)' : 'Tech Preferences (Optional)'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={techFrontend}
                  onChange={e => setTechFrontend(e.target.value)}
                  placeholder="Frontend (React, Vue...)"
                  className="glass-input px-3 py-2 font-mono text-[10px] text-gray-200 placeholder-gray-700"
                />
                <input
                  value={techBackend}
                  onChange={e => setTechBackend(e.target.value)}
                  placeholder="Backend (Node, Python...)"
                  className="glass-input px-3 py-2 font-mono text-[10px] text-gray-200 placeholder-gray-700"
                />
                <input
                  value={techDatabase}
                  onChange={e => setTechDatabase(e.target.value)}
                  placeholder="Database (PostgreSQL...)"
                  className="glass-input px-3 py-2 font-mono text-[10px] text-gray-200 placeholder-gray-700"
                />
                <input
                  value={techDeployment}
                  onChange={e => setTechDeployment(e.target.value)}
                  placeholder="Deploy (Vercel, AWS...)"
                  className="glass-input px-3 py-2 font-mono text-[10px] text-gray-200 placeholder-gray-700"
                />
              </div>
            </div>

            {/* Provider + Generate */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                  AI Engine
                </label>
                <div className="flex gap-1.5">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={`flex-1 py-2 px-3 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-all ${
                        provider === p.id
                          ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                          : 'border-glass-border text-gray-500 hover:border-glass-border/60 hover:text-gray-400'
                      }`}
                    >
                      <span className="mr-1">{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={running || !projectDesc.trim()}
                className="px-6 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/40 text-violet-400 hover:from-violet-500/30 hover:to-pink-500/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {running ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                    {statusText || (lang === 'tr' ? 'OLUSTURULUYOR...' : 'GENERATING...')}
                  </span>
                ) : (
                  lang === 'tr' ? 'PLAN OLUSTUR' : 'GENERATE PLAN'
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-3">
              <p className="font-mono text-[10px] text-red-400">{error}</p>
            </div>
          )}

          {/* Plan Results */}
          {plan && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* Plan Header */}
              <div className="bg-gradient-to-r from-violet-500/5 to-pink-500/5 border border-violet-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-sm font-bold text-violet-400 uppercase tracking-wider">
                    {plan.projectName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-gray-500">
                      {totalTasks} {lang === 'tr' ? 'gorev' : 'tasks'} | {plan.phases.length} {lang === 'tr' ? 'faz' : 'phases'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[8px] uppercase border ${
                      plan.scale === 'mvp' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                      plan.scale === 'startup' ? 'text-violet-400 border-violet-500/30 bg-violet-500/10' :
                      'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    }`}>
                      {plan.scale}
                    </span>
                  </div>
                </div>

                {/* Tech Stack */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(plan.techStack).filter(([,v]) => v).map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 rounded glass-card font-mono text-[8px] text-gray-400">
                      <span className="text-gray-600 uppercase">{k}:</span> {v}
                    </span>
                  ))}
                </div>

                {/* PRD Toggle */}
                <button
                  onClick={() => setShowPrd(!showPrd)}
                  className="font-mono text-[9px] text-violet-400 hover:text-violet-300 uppercase tracking-wider transition-colors"
                >
                  {showPrd ? '▼' : '▶'} PRD ({lang === 'tr' ? 'Urun Gereksinim Belgesi' : 'Product Requirements Document'})
                </button>
                {showPrd && (
                  <div className="mt-3 glass-card p-4 font-mono text-[10px] text-gray-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                    {plan.prd}
                  </div>
                )}
              </div>

              {/* Copy All Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCopyAllPrompts}
                  className="font-mono text-[9px] px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors uppercase tracking-wider"
                >
                  {copiedId === 'all' ? (lang === 'tr' ? 'KOPYALANDI!' : 'COPIED!') : (lang === 'tr' ? 'TUM PROMPTLARI KOPYALA' : 'COPY ALL PROMPTS')}
                </button>
              </div>

              {/* Phases */}
              {plan.phases.map((phase, pi) => {
                const phaseInfo = PHASE_LABELS[phase.phase] || PHASE_LABELS.implementation;
                return (
                  <div key={pi} className="space-y-2">
                    {/* Phase Header */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg border font-mono text-[9px] uppercase tracking-wider ${phaseInfo.color}`}>
                        {phaseInfo.icon} {lang === 'tr' ? phaseInfo.tr : phaseInfo.en}
                      </span>
                      <span className="font-mono text-[9px] text-gray-600">
                        {phase.tasks.length} {lang === 'tr' ? 'gorev' : 'tasks'}
                      </span>
                      <span className="font-mono text-[8px] text-gray-700 truncate flex-1">
                        {phase.description}
                      </span>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-1.5 ml-2">
                      {phase.tasks.map(task => {
                        const isExpanded = expandedTask === task.id;
                        const result = agentResults.get(task.id);
                        const isRunning = runningTaskId === task.id;
                        const complexityColor = COMPLEXITY_COLORS[task.estimatedComplexity] || COMPLEXITY_COLORS.moderate;
                        const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

                        return (
                          <div key={task.id} className="glass-card overflow-hidden">
                            {/* Task Header */}
                            <button
                              onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                            >
                              <span className="font-mono text-[8px] text-gray-600 w-10 flex-shrink-0">{task.id}</span>
                              <span className="font-mono text-[10px] text-gray-300 flex-1 truncate">{task.title}</span>
                              <span className={`px-1.5 py-0.5 rounded border font-mono text-[7px] uppercase ${priorityColor}`}>
                                {task.priority}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded border font-mono text-[7px] uppercase ${complexityColor}`}>
                                {task.estimatedComplexity}
                              </span>
                              {result && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                              )}
                              <Icon name="expand_more" size={12} className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Task Detail */}
                            {isExpanded && (
                              <div className="border-t border-glass-border px-3 py-3 space-y-3">
                                <p className="font-mono text-[10px] text-gray-400">{task.description}</p>

                                {task.dependencies.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[8px] text-gray-600 uppercase">{lang === 'tr' ? 'Bagimlilik:' : 'Deps:'}</span>
                                    {task.dependencies.map(dep => (
                                      <span key={dep} className="px-1.5 py-0.5 rounded glass-card font-mono text-[8px] text-gray-500">
                                        {dep}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Agent Prompt */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-[8px] text-gray-600 uppercase tracking-wider">Agent Prompt</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleEnrichTask(task.id, task.agentPrompt)}
                                        disabled={enrichingId === task.id}
                                        className="font-mono text-[8px] text-purple-400 hover:text-purple-300 transition-colors uppercase disabled:opacity-50"
                                      >
                                        {enrichingId === task.id ? '...' : (lang === 'tr' ? 'Zenginlestir' : 'Enrich')}
                                      </button>
                                      <span className="text-gray-700">|</span>
                                      <button
                                        onClick={() => handleCopyPrompt(task.id, task.agentPrompt)}
                                        className="font-mono text-[8px] text-violet-400 hover:text-violet-300 transition-colors uppercase"
                                      >
                                        {copiedId === task.id ? (lang === 'tr' ? 'Kopyalandi!' : 'Copied!') : (lang === 'tr' ? 'Kopyala' : 'Copy')}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="glass-card p-3 font-mono text-[10px] text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                    {task.agentPrompt}
                                  </div>
                                </div>

                                {/* Execute Button */}
                                <button
                                  onClick={() => handleExecuteTask(task)}
                                  disabled={isRunning || !!runningTaskId}
                                  className="w-full py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  {isRunning ? (
                                    <>
                                      <span className="w-3 h-3 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                                      {statusText || (lang === 'tr' ? 'CALISTIRILIYOR...' : 'EXECUTING...')}
                                    </>
                                  ) : result ? (
                                    lang === 'tr' ? 'TEKRAR CALISTIR' : 'RE-EXECUTE'
                                  ) : (
                                    <>
                                      <Icon name="bolt" size={12} />
                                      {lang === 'tr' ? 'AGENT ILE CALISTIR' : 'EXECUTE WITH AGENT'}
                                    </>
                                  )}
                                </button>

                                {/* Agent Result */}
                                {result && (
                                  <div className="space-y-2 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[8px] text-emerald-400 uppercase tracking-wider">
                                        {lang === 'tr' ? 'Agent Ciktisi' : 'Agent Output'}
                                      </span>
                                      <span className="font-mono text-[8px] text-gray-600">
                                        {(result.durationMs / 1000).toFixed(1)}s | {result.provider}
                                      </span>
                                    </div>

                                    {result.codeBlocks.length > 0 ? (
                                      <div className="space-y-2">
                                        {result.codeBlocks.map((block, bi) => (
                                          <div key={bi} className="glass-card border-emerald-500/20 overflow-hidden">
                                            {block.filename && (
                                              <div className="px-3 py-1.5 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-between">
                                                <span className="font-mono text-[9px] text-emerald-400">{block.filename}</span>
                                                <span className="font-mono text-[8px] text-gray-600">{block.language}</span>
                                              </div>
                                            )}
                                            <pre className="p-3 font-mono text-[10px] text-gray-300 overflow-x-auto max-h-[300px] overflow-y-auto">
                                              <code>{block.code}</code>
                                            </pre>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="glass-card p-3 font-mono text-[10px] text-gray-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                        {result.response}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========== AGENT MODE =========== */}
      {mode === 'agent' && plan && (
        <div className="space-y-4">
          {/* Agent Dashboard */}
          <div className="bg-gradient-to-r from-emerald-500/5 to-cyber-primary/5 border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-bold text-emerald-400 uppercase tracking-wider">
                {lang === 'tr' ? 'Agent Gorev Paneli' : 'Agent Task Board'}
              </h3>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-gray-500">
                  {completedTasks}/{totalTasks} {lang === 'tr' ? 'tamamlandi' : 'completed'}
                </span>
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyber-primary rounded-full transition-all duration-500"
                    style={{ width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* Error in agent mode */}
            {error && (
              <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-2 mb-3">
                <p className="font-mono text-[10px] text-red-400">{error}</p>
              </div>
            )}

            {/* Task Queue */}
            <div className="space-y-1.5">
              {plan.phases.flatMap(p => p.tasks).map(task => {
                const result = agentResults.get(task.id);
                const isRunning = runningTaskId === task.id;
                const phaseInfo = PHASE_LABELS[task.phase] || PHASE_LABELS.implementation;

                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      result
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : isRunning
                        ? 'bg-amber-500/5 border-amber-500/20 animate-pulse'
                        : 'glass-card'
                    }`}
                  >
                    {/* Status */}
                    <span className="flex-shrink-0">
                      {result ? (
                        <Icon name="check_circle" size={14} className="text-emerald-400" />
                      ) : isRunning ? (
                        <span className="w-3 h-3 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin block" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-gray-700 block" />
                      )}
                    </span>

                    <span className="font-mono text-[8px] text-gray-600 w-10 flex-shrink-0">{task.id}</span>
                    <span className={`px-1.5 py-0.5 rounded border font-mono text-[7px] uppercase ${phaseInfo.color} flex-shrink-0`}>
                      {lang === 'tr' ? phaseInfo.tr : phaseInfo.en}
                    </span>
                    <span className="font-mono text-[10px] text-gray-300 flex-1 truncate">{task.title}</span>

                    {!result && !isRunning && (
                      <button
                        onClick={() => handleExecuteTask(task)}
                        disabled={!!runningTaskId}
                        className="font-mono text-[8px] text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider disabled:opacity-30 flex-shrink-0"
                      >
                        {lang === 'tr' ? 'Calistir' : 'Execute'}
                      </button>
                    )}

                    {result && (
                      <span className="font-mono text-[8px] text-gray-600 flex-shrink-0">
                        {(result.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Results Viewer */}
          {agentResults.size > 0 && (
            <div className="glass-card p-4">
              <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-3">
                {lang === 'tr' ? 'Tamamlanan Gorev Sonuclari' : 'Completed Task Results'}
              </p>
              <div className="space-y-2">
                {Array.from(agentResults.entries()).map(([taskId, result]) => {
                  const task = plan.phases.flatMap(p => p.tasks).find(t => t.id === taskId);
                  if (!task) return null;
                  return (
                    <details key={taskId} className="group">
                      <summary className="flex items-center gap-2 cursor-pointer font-mono text-[10px] text-gray-300 hover:text-gray-200 transition-colors list-none">
                        <Icon name="chevron_right" size={12} className="text-gray-600 transition-transform group-open:rotate-90" />
                        <span className="text-emerald-400">{task.id}</span>
                        <span>{task.title}</span>
                        <span className="text-gray-600 text-[8px] ml-auto">{result.codeBlocks.length} {lang === 'tr' ? 'dosya' : 'files'}</span>
                      </summary>
                      <div className="mt-2 ml-5 space-y-2">
                        {result.codeBlocks.map((block, bi) => (
                          <div key={bi} className="glass-card overflow-hidden">
                            {block.filename && (
                              <div className="px-3 py-1 bg-white/5 border-b border-glass-border/10">
                                <span className="font-mono text-[9px] text-emerald-400">{block.filename}</span>
                              </div>
                            )}
                            <pre className="p-3 font-mono text-[9px] text-gray-300 overflow-x-auto max-h-[200px] overflow-y-auto">
                              <code>{block.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
