/**
 * Cache Status — Semantic cache durum göstergesi.
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §7
 */
import { useTranslation } from '../i18n';
import type { CacheStats } from '../services/semanticCache';

interface Props {
  stats: CacheStats;
  lastHit: boolean;
}

export default function CacheStatus({ stats, lastHit }: Props) {
  const { language } = useTranslation();

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-cyber-dark/50 border border-glass-border rounded-lg" role="status" aria-label={language === 'tr' ? 'Cache durumu' : 'Cache status'}>
      {/* Cache indicator */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${lastHit ? 'bg-cyber-success animate-pulse' : 'bg-gray-600'}`} />
        <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
          {language === 'tr' ? 'CACHE' : 'CACHE'}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
        <span>{stats.totalEntries} {language === 'tr' ? 'giriş' : 'entries'}</span>
        <span className="text-cyber-success">{stats.totalHits} hit</span>
        <span>{stats.totalMisses} miss</span>
        <span className={`font-bold ${stats.hitRate > 50 ? 'text-cyber-success' : 'text-gray-400'}`}>
          {stats.hitRate}%
        </span>
      </div>

      {/* Last hit indicator */}
      {lastHit && (
        <span className="text-[10px] font-mono font-bold text-cyber-success px-1.5 py-0.5 bg-cyber-success/10 border border-cyber-success/30 rounded">
          HIT
        </span>
      )}
    </div>
  );
}
