

interface FilterPillProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: string;
}

export function FilterPill({ label, active = false, onClick, icon }: FilterPillProps) {
  return (
    <button
      className={`filter-pill ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {icon && (
        <span className="material-symbols-outlined mr-1" style={{ fontSize: 16 }} aria-hidden="true">
          {icon}
        </span>
      )}
      {label}
    </button>
  );
}
