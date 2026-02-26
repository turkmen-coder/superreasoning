import React from 'react';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  isLoading?: boolean;
}

const CyberButton: React.FC<CyberButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "relative px-8 py-4 font-mono font-bold uppercase tracking-widest transition-all duration-300 clip-path-polygon group overflow-hidden border-none outline-none focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black";
  
  const colors = {
    primary: "bg-cyber-primary text-cyber-black hover:bg-white hover:shadow-[0_0_25px_rgba(6,232,249,0.6)]",
    secondary: "bg-cyber-secondary text-white hover:bg-white hover:text-cyber-secondary hover:shadow-[0_0_25px_rgba(255,0,60,0.6)]",
    accent: "bg-cyber-accent text-white hover:bg-white hover:text-cyber-accent hover:shadow-[0_0_25px_rgba(112,0,255,0.6)]",
    danger: "bg-red-600 text-white hover:bg-red-500"
  };

  const disabledStyles = "opacity-40 cursor-not-allowed filter grayscale";

  return (
    <button
      className={`${baseStyles} ${colors[variant]} ${disabled || isLoading ? disabledStyles : ''} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-3">
        {isLoading && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </span>
      <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 pointer-events-none" />
    </button>
  );
};

export default CyberButton;