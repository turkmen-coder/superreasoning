/**
 * Budget Panel — Token/cost analizi UI.
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §12
 */
import { useTranslation } from '../i18n';
import type { BudgetAnalysis } from '../services/budgetOptimizer';

interface Props {
  analysis: BudgetAnalysis;
}

export default function BudgetPanel({ analysis }: Props) {
  const { language } = useTranslation();

  const formatCost = (usd: number) => {
    if (usd < 0.001) return '<$0.001';
    return `$${usd.toFixed(4)}`;
  };

  return (
    <div className="border border-glass-border rounded-lg p-4 space-y-3" role="region" aria-label={language === 'tr' ? 'Bütçe Analizi' : 'Budget Analysis'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
          {language === 'tr' ? 'BÜTÇE ANALİZİ' : 'BUDGET ANALYSIS'}
        </h3>
        <span className="text-[10px] font-mono text-gray-500 uppercase">
          {analysis.estimatedCost.model}
        </span>
      </div>

      {/* Token Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-cyber-dark/50 rounded p-2 text-center">
          <p className="text-[10px] font-mono text-gray-500 uppercase">{language === 'tr' ? 'Giriş' : 'Input'}</p>
          <p className="text-sm font-mono font-bold text-cyber-primary">{analysis.inputTokens.toLocaleString()}</p>
          <p className="text-[10px] font-mono text-gray-600">{formatCost(analysis.estimatedCost.inputCostUsd)}</p>
        </div>
        <div className="bg-cyber-dark/50 rounded p-2 text-center">
          <p className="text-[10px] font-mono text-gray-500 uppercase">{language === 'tr' ? 'Çıkış' : 'Output'}</p>
          <p className="text-sm font-mono font-bold text-cyber-accent">{analysis.outputTokens.toLocaleString()}</p>
          <p className="text-[10px] font-mono text-gray-600">{formatCost(analysis.estimatedCost.outputCostUsd)}</p>
        </div>
        <div className="bg-cyber-dark/50 rounded p-2 text-center">
          <p className="text-[10px] font-mono text-gray-500 uppercase">{language === 'tr' ? 'Toplam' : 'Total'}</p>
          <p className="text-sm font-mono font-bold text-white">{analysis.totalTokens.toLocaleString()}</p>
          <p className="text-[10px] font-mono text-gray-600">{formatCost(analysis.estimatedCost.totalCostUsd)}</p>
        </div>
      </div>

      {/* Optimizations */}
      {analysis.optimizations.length > 0 && (
        <div className="border-t border-glass-border pt-2">
          <p className="text-[10px] font-mono text-cyber-primary uppercase mb-1.5">
            {language === 'tr' ? 'OPTİMİZASYON ÖNERİLERİ' : 'OPTIMIZATION TIPS'}
          </p>
          {analysis.optimizations.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between py-1">
              <span className="text-[10px] font-mono text-gray-400">
                {language === 'tr' ? opt.labelTr : opt.label}
              </span>
              <span className="text-[10px] font-mono text-cyber-success">
                -{opt.tokenSaved} tokens
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Savings */}
      {analysis.savings.savedPercentage > 0 && (
        <div className="bg-cyber-success/10 border border-cyber-success/30 rounded p-2 text-center">
          <p className="text-[10px] font-mono text-cyber-success uppercase">
            {language === 'tr'
              ? `%${analysis.savings.savedPercentage} tasarruf potansiyeli (${analysis.savings.savedTokens} token)`
              : `${analysis.savings.savedPercentage}% potential savings (${analysis.savings.savedTokens} tokens)`}
          </p>
        </div>
      )}
    </div>
  );
}
