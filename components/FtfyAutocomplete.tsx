import { useState, useEffect, useRef } from 'react';
import { fixTextEncoding } from '../services/ftfyService';

interface FtfySuggestion {
  original: string;
  fixed: string;
}

interface FtfyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onApplyFix?: (fixed: string) => void;
}

export default function FtfyAutocomplete({ value, onChange, onApplyFix }: FtfyAutocompleteProps) {
  const [suggestion, setSuggestion] = useState<FtfySuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!value || value.length < 5) {
      setSuggestion(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fixTextEncoding(value);
        if (result.fixed !== result.original) {
          setSuggestion(result);
          setShowPopup(true);
        } else {
          setSuggestion(null);
        }
      } catch {
        setSuggestion(null);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleApply = () => {
    if (suggestion) {
      onChange(suggestion.fixed);
      onApplyFix?.(suggestion.fixed);
      setShowPopup(false);
      setSuggestion(null);
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    setSuggestion(null);
  };

  if (!showPopup || !suggestion) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
      <div className="bg-cyber-dark border border-cyber-primary/50 rounded-lg p-3 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-cyber-primary uppercase tracking-wider mb-1">
              {loading ? 'Checking encoding...' : 'Encoding fix available'}
            </div>
            <div className="text-[10px] text-gray-400 line-through truncate">
              {suggestion.original.slice(0, 50)}...
            </div>
            <div className="text-xs text-green-400 font-mono truncate">
              → {suggestion.fixed.slice(0, 50)}...
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleApply}
              className="px-2 py-1 text-[10px] bg-cyber-primary text-cyber-black rounded font-bold hover:bg-cyber-primary/80"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2 py-1 text-[10px] bg-cyber-dark border border-glass-border text-gray-400 rounded hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
