
import { NodeType } from './CoTNode';

interface MiniMapNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
}

interface CoTMiniMapProps {
  nodes: MiniMapNode[];
  viewBox: { x: number; y: number; width: number; height: number };
  canvasSize: { width: number; height: number };
}

const TYPE_COLORS: Record<NodeType, string> = {
  input: '#06e8f9',
  thought: '#8b5cf6',
  evaluation: '#f59e0b',
  action: '#34d399',
};

export function CoTMiniMap({ nodes, viewBox, canvasSize }: CoTMiniMapProps) {
  const mapWidth = 160;
  const mapHeight = 100;
  const scaleX = mapWidth / canvasSize.width;
  const scaleY = mapHeight / canvasSize.height;

  const vpX = viewBox.x * scaleX;
  const vpY = viewBox.y * scaleY;
  const vpW = viewBox.width * scaleX;
  const vpH = viewBox.height * scaleY;

  return (
    <div className="glass-card p-2 w-[176px]">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 12 }} aria-hidden="true">map</span>
        <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">Mini Map</span>
      </div>
      <svg width={mapWidth} height={mapHeight} className="bg-[#0a0a0f]/60 rounded-lg border border-glass-border">
        {nodes.map((node) => (
          <circle
            key={node.id}
            cx={node.x * scaleX}
            cy={node.y * scaleY}
            r={3}
            fill={TYPE_COLORS[node.type]}
            opacity={0.8}
          />
        ))}
        <rect
          x={vpX}
          y={vpY}
          width={vpW}
          height={vpH}
          fill="none"
          stroke="#06e8f9"
          strokeWidth="1"
          strokeOpacity="0.5"
          rx="2"
        />
      </svg>
    </div>
  );
}
