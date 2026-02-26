
interface IconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
}

export function Icon({ name, size = 20, className = '', filled = false }: IconProps) {
  if (!name) {
    return (
      <span
        className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`.trim()}
        style={{ fontSize: size }}
        aria-hidden="true"
      >
        help
      </span>
    );
  }

  return (
    <span
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`.trim()}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
