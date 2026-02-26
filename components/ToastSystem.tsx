import React, { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            aria-live="assertive"
            className={`
              pointer-events-auto min-w-[300px] p-4 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] 
              border flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300
              ${toast.type === 'success' ? 'bg-cyber-dark border-cyber-success/50 text-white' : ''}
              ${toast.type === 'error' ? 'bg-cyber-dark border-red-500/50 text-white' : ''}
              ${toast.type === 'info' ? 'bg-cyber-dark border-cyber-primary/50 text-white' : ''}
            `}
          >
            <div className={`
              w-2 h-2 rounded-full animate-pulse
              ${toast.type === 'success' ? 'bg-cyber-success' : ''}
              ${toast.type === 'error' ? 'bg-red-500' : ''}
              ${toast.type === 'info' ? 'bg-cyber-primary' : ''}
            `} />
            <div className="flex-1">
              <p className="font-mono text-xs uppercase tracking-wider opacity-60 mb-0.5">
                 {toast.type === 'success' ? 'SUCCESS' : toast.type === 'error' ? 'ERROR' : 'INFO'}
              </p>
              <p className="font-mono text-sm">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};