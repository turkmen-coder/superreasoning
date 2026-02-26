

interface CoTConnectorProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  animated?: boolean;
}

export function CoTConnector({ from, to, color = '#06e8f9', animated = true }: CoTConnectorProps) {
  const midY = (from.y + to.y) / 2;

  const path = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeOpacity="0.4"
      strokeDasharray={animated ? '6 3' : undefined}
    >
      {animated && (
        <animate
          attributeName="stroke-dashoffset"
          from="9"
          to="0"
          dur="1s"
          repeatCount="indefinite"
        />
      )}
    </path>
  );
}
