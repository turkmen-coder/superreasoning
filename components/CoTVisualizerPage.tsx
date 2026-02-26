import { useState, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { GlassCard, Icon, FilterPill } from './ui';
import { CoTNode, NodeType } from './cot/CoTNode';
import { CoTConnector } from './cot/CoTConnector';
import { CoTMiniMap } from './cot/CoTMiniMap';

interface CoTVisualizerPageProps {
  result?: string;
  reasoning?: string;
  intent?: string;
  latencyMs?: number;
  tokensPerSec?: number;
}

interface TraceNode {
  id: string;
  type: NodeType;
  label: string;
  content: string;
  fullContent?: string;
  confidence?: number;
  parentId?: string;
  x: number;
  y: number;
}

// Parse a masterPrompt into CoT trace nodes
function parsePromptToNodes(intent: string, masterPrompt: string, reasoning?: string): TraceNode[] {
  const nodes: TraceNode[] = [];
  const CANVAS_W = 860;
  const ROW_H = 150;

  // Node 0: User input
  nodes.push({
    id: 'n0',
    type: 'input',
    label: 'User Input',
    content: intent.slice(0, 120) || 'User prompt',
    fullContent: intent,
    x: Math.floor(CANVAS_W / 2) - 100,
    y: 20,
    confidence: 100,
  });

  // Split prompt into meaningful sections by markdown headers or double newlines
  const raw = masterPrompt || '';
  const sections = raw
    .split(/\n(?=#{1,3}\s|\*\*|\d+\.\s|[-•]\s)/)
    .map(s => s.trim())
    .filter(s => s.length > 10)
    .slice(0, 8);

  const typeSeq: NodeType[] = ['thought', 'thought', 'evaluation', 'evaluation', 'action', 'action', 'action', 'action'];
  const labelPrefixes = ['Analiz', 'Bağlam', 'Değerlendirme', 'Kısıt', 'Çıktı', 'Yapı', 'Uygulama', 'Sonuç'];

  sections.forEach((sec, i) => {
    const cols = Math.min(sections.length, 4);
    const col = i % cols;
    const row = Math.floor(i / cols) + 1;
    const xSpacing = Math.floor(CANVAS_W / cols);
    nodes.push({
      id: `n${i + 1}`,
      type: typeSeq[i] ?? 'thought',
      label: labelPrefixes[i] ?? `Adım ${i + 1}`,
      content: sec.replace(/^#{1,3}\s*/, '').slice(0, 110),
      fullContent: sec,
      parentId: i < 2 ? 'n0' : `n${Math.max(1, i - 1)}`,
      x: col * xSpacing + Math.floor(xSpacing / 2) - 100,
      y: row * ROW_H,
      confidence: Math.max(75, 98 - i * 3),
    });
  });

  // If reasoning provided, add as final evaluation node
  if (reasoning && reasoning.trim().length > 20) {
    const lastNode = nodes[nodes.length - 1];
    nodes.push({
      id: 'n_reason',
      type: 'evaluation',
      label: 'Reasoning',
      content: reasoning.slice(0, 110),
      fullContent: reasoning,
      parentId: lastNode.id,
      x: Math.floor(CANVAS_W / 2) - 100,
      y: lastNode.y + ROW_H,
      confidence: 96,
    });
  }

  return nodes;
}

const DEMO_NODES: TraceNode[] = [
  { id: '1', type: 'input', label: 'Input Query', content: 'Design a secure API for e-commerce platform with payment processing', fullContent: 'Design a secure API for e-commerce platform with payment processing', x: 400, y: 40, confidence: 100 },
  { id: '2', type: 'thought', label: 'Thought 1', content: 'Analyze security requirements: OAuth 2.0, rate limiting, input validation', fullContent: 'Analyze security requirements: OAuth 2.0, rate limiting, input validation', parentId: '1', x: 200, y: 170, confidence: 92 },
  { id: '3', type: 'thought', label: 'Thought 2', content: 'Consider payment integration: PCI DSS compliance, tokenization, 3D Secure', fullContent: 'Consider payment integration: PCI DSS compliance, tokenization, 3D Secure', parentId: '1', x: 600, y: 170, confidence: 88 },
  { id: '4', type: 'evaluation', label: 'Eval: Auth', content: 'JWT + refresh tokens provide stateless auth with revocation capability', fullContent: 'JWT + refresh tokens provide stateless auth with revocation capability', parentId: '2', x: 100, y: 310, confidence: 95 },
  { id: '5', type: 'evaluation', label: 'Eval: Payment', content: 'Stripe API with webhook verification ensures reliable payment flow', fullContent: 'Stripe API with webhook verification ensures reliable payment flow', parentId: '3', x: 500, y: 310, confidence: 90 },
  { id: '6', type: 'thought', label: 'Thought 3', content: 'API gateway pattern with rate limiting and circuit breaker', fullContent: 'API gateway pattern with rate limiting and circuit breaker', parentId: '3', x: 700, y: 310, confidence: 85 },
  { id: '7', type: 'action', label: 'Action: Schema', content: 'Generate OpenAPI 3.0 specification with security schemes defined', fullContent: 'Generate OpenAPI 3.0 specification with security schemes defined', parentId: '4', x: 100, y: 450, confidence: 97 },
  { id: '8', type: 'action', label: 'Action: Deploy', content: 'Create Kubernetes deployment with network policies and secrets management', fullContent: 'Create Kubernetes deployment with network policies and secrets management', parentId: '5', x: 400, y: 450, confidence: 93 },
  { id: '9', type: 'action', label: 'Action: Monitor', content: 'Set up Prometheus metrics and Grafana dashboards for API health', fullContent: 'Set up Prometheus metrics and Grafana dashboards for API health', parentId: '6', x: 700, y: 450, confidence: 91 },
];

type FilterType = 'all' | 'thought' | 'evaluation' | 'action';

const CoTVisualizerPage = ({ result, reasoning, intent, latencyMs, tokensPerSec }: CoTVisualizerPageProps) => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState<Record<string, boolean>>({});

  const hasRealData = !!(result && result.trim().length > 30);

  const activeNodes = useMemo(() => {
    if (hasRealData) {
      return parsePromptToNodes(intent || '', result!, reasoning);
    }
    return DEMO_NODES;
  }, [hasRealData, result, reasoning, intent]);

  const filteredNodes = useMemo(() => {
    if (activeFilter === 'all') return activeNodes;
    return activeNodes.filter(n => n.type === activeFilter || n.type === 'input');
  }, [activeFilter, activeNodes]);

  const connections = useMemo(() => {
    return filteredNodes
      .filter(n => n.parentId)
      .map(n => {
        const parent = filteredNodes.find(p => p.id === n.parentId);
        if (!parent) return null;
        return { from: { x: parent.x + 100, y: parent.y + 60 }, to: { x: n.x + 100, y: n.y } };
      })
      .filter(Boolean) as { from: { x: number; y: number }; to: { x: number; y: number } }[];
  }, [filteredNodes]);

  const metrics = useMemo(() => {
    const depths = activeNodes.map(n => {
      let d = 0; let cur: TraceNode | undefined = n;
      while (cur?.parentId) { d++; cur = activeNodes.find(x => x.id === cur!.parentId); }
      return d;
    });
    const childCounts = activeNodes.map(n => activeNodes.filter(x => x.parentId === n.id).length);
    const branching = childCounts.filter(c => c > 0);
    return {
      totalNodes: activeNodes.length,
      maxDepth: Math.max(...depths, 0),
      branchFactor: branching.length ? +(branching.reduce((a, b) => a + b, 0) / branching.length).toFixed(1) : 0,
      pruned: 0,
    };
  }, [activeNodes]);

  const canvasH = Math.max(520, (metrics.maxDepth + 2) * 160);
  const canvasW = Math.max(900, filteredNodes.length * 120);

  const filters: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: t.ui.cotFilterAll, icon: 'select_all' },
    { key: 'thought', label: t.ui.cotFilterThoughts, icon: 'psychology' },
    { key: 'evaluation', label: t.ui.cotFilterEvaluations, icon: 'analytics' },
    { key: 'action', label: t.ui.cotFilterActions, icon: 'bolt' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-primary/20 to-cyber-accent/20 border border-cyber-primary/30 flex items-center justify-center shadow-neon-cyan">
            <Icon name="account_tree" size={22} className="text-cyber-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white">{t.ui.cotVisualizerTitle}</h1>
            <p className="text-xs text-gray-500 font-mono">{t.ui.cotVisualizerSubtitle}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          {latencyMs !== undefined && (
            <div className="flex items-center gap-1.5 text-xs">
              <Icon name="speed" size={16} className="text-gray-500" />
              <span className="text-gray-400 font-mono">{latencyMs}ms</span>
            </div>
          )}
          {tokensPerSec !== undefined && (
            <div className="flex items-center gap-1.5 text-xs">
              <Icon name="token" size={16} className="text-gray-500" />
              <span className="text-gray-400 font-mono">{tokensPerSec} tok/s</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-glass-border/50">
        {filters.map(f => (
          <FilterPill
            key={f.key}
            label={f.label}
            icon={f.icon}
            active={activeFilter === f.key}
            onClick={() => setActiveFilter(f.key)}
          />
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-mono">{filteredNodes.length} nodes</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* SVG Canvas */}
        <div className="flex-1 overflow-auto relative bg-[#050505]/50">
          {!hasRealData && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-400">
              Demo — Prompt oluşturun ve CoT Görselleştirici sayfasına geçin
            </div>
          )}
          <svg width={canvasW} height={canvasH} style={{ minWidth: canvasW }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(6,232,249,0.03)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connectors */}
            {connections.map((conn, i) => (
              <CoTConnector key={i} from={conn.from} to={conn.to} />
            ))}

            {/* Nodes */}
            {filteredNodes.map(node => (
              <foreignObject key={node.id} x={node.x} y={node.y} width="200" height="120">
                <CoTNode
                  id={node.id}
                  type={node.type}
                  label={node.label}
                  content={node.content}
                  fullContent={node.fullContent}
                  showFull={showFullContent[node.id] || false}
                  onToggleFull={() => setShowFullContent(prev => ({ ...prev, [node.id]: !prev[node.id] }))}
                  x={node.x}
                  y={node.y}
                  confidence={node.confidence}
                  isActive={selectedNode === node.id}
                  onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                />
              </foreignObject>
            ))}
          </svg>
        </div>

        {/* Right Panel */}
        <div className="w-[280px] border-l border-glass-border overflow-y-auto p-4 space-y-4">
          {/* Tree Metrics */}
          <GlassCard padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="monitoring" size={16} className="text-cyber-primary" />
              <span className="font-display text-sm font-semibold text-white">{t.ui.cotTreeMetrics}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.ui.cotTotalNodes, value: metrics.totalNodes, icon: 'scatter_plot' },
                { label: t.ui.cotMaxDepth, value: metrics.maxDepth, icon: 'layers' },
                { label: t.ui.cotBranchFactor, value: metrics.branchFactor, icon: 'fork_right' },
                { label: t.ui.cotPruned, value: metrics.pruned, icon: 'content_cut' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <Icon name={m.icon} size={16} className="text-gray-500 mb-1" />
                  <p className="font-mono text-lg font-bold text-white">{m.value}</p>
                  <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Active Prompt Info */}
          <GlassCard padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="info" size={16} className="text-cyber-primary" />
              <span className="font-display text-sm font-semibold text-white">{t.ui.cotSessionHistory}</span>
            </div>
            <div className="space-y-2">
              {hasRealData ? (
                <div className="p-2 rounded-lg bg-cyber-primary/5 border border-cyber-primary/20">
                  <p className="text-[10px] text-cyber-primary font-mono mb-1">ACTIVE PROMPT</p>
                  <p className="text-xs text-gray-300 line-clamp-3">{intent || 'Current prompt'}</p>
                  <p className="text-[9px] text-gray-600 font-mono mt-1">{activeNodes.length} nodes generated</p>
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 font-mono">Prompt oluşturun ve bu sayfaya geçin.</p>
              )}
            </div>
          </GlassCard>

          {/* Mini Map */}
          <CoTMiniMap
            nodes={filteredNodes.map(n => ({ id: n.id, type: n.type, x: n.x + 100, y: n.y + 30 }))}
            viewBox={{ x: 0, y: 0, width: canvasW, height: canvasH }}
            canvasSize={{ width: canvasW, height: canvasH }}
          />
        </div>
      </div>
    </div>
  );
};

export default CoTVisualizerPage;
