/**
 * Judge Ensemble Panel V3 — Skor kartı, bölüm analizi, revize geçmişi, kalibrasyon UI.
 * @see docs/JUDGE_ENSEMBLE.md
 */
import { useState } from 'react';
import { useTranslation } from '../i18n';
import type { JudgeResult, Suggestion } from '../services/judgeEnsemble';
import { JUDGE_CRITERIA } from '../services/judgeEnsemble';

interface Props {
  result: JudgeResult;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-cyber-success';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-cyber-success';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-400';
}

function getSuggestionIcon(type: Suggestion['type']): string {
  if (type === 'critical') return '!!';
  if (type === 'improvement') return '!';
  return 'i';
}

function getSuggestionColor(type: Suggestion['type']): string {
  if (type === 'critical') return 'text-red-400 border-red-500/30';
  if (type === 'improvement') return 'text-yellow-400 border-yellow-500/30';
  return 'text-gray-400 border-glass-border';
}

export default function JudgePanel({ result }: Props) {
  const { language } = useTranslation();
  const tr = language === 'tr';
  const [showDetails, setShowDetails] = useState(false);
  const isPassClass = result.passThreshold ? 'border-cyber-success/40 bg-cyber-success/5' : 'border-red-500/40 bg-red-500/5';

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${isPassClass}`} role="region" aria-label={tr ? 'Hakem Değerlendirmesi' : 'Judge Evaluation'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
            {tr ? 'HAKEM DEĞERLENDİRMESİ' : 'JUDGE ENSEMBLE'}
          </h3>
          {result.iterationCount > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyber-primary/15 text-cyber-primary">
              {tr ? `${result.iterationCount} revize` : `${result.iterationCount} revision(s)`}
            </span>
          )}
          <span className="text-[9px] font-mono text-gray-600">
            {result.durationMs}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-mono ${getScoreColor(result.totalScore)}`}>
            {result.totalScore}
          </span>
          <span className="text-[10px] font-mono text-gray-500">/100</span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${result.passThreshold ? 'bg-cyber-success/20 text-cyber-success' : 'bg-red-500/20 text-red-400'}`}>
            {result.passThreshold ? (tr ? 'GEÇTİ' : 'PASS') : (tr ? 'KALDI' : 'FAIL')}
          </span>
        </div>
      </div>

      {/* Calibration confidence badge */}
      {result.calibration.sampleCount > 0 && (
        <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500">
          <span className={`w-1.5 h-1.5 rounded-full ${
            result.calibration.confidence === 'high' ? 'bg-cyber-success' :
            result.calibration.confidence === 'medium' ? 'bg-yellow-400' : 'bg-gray-500'
          }`} />
          {tr ? 'Kalibrasyon' : 'Calibration'}: {result.calibration.confidence} ({result.calibration.sampleCount} {tr ? 'örnek' : 'samples'})
        </div>
      )}

      {/* Criteria Scores */}
      <div className="space-y-2">
        {result.scores.map((score) => {
          const criterion = JUDGE_CRITERIA.find(c => c.id === score.criterionId);
          return (
            <div key={score.criterionId} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400 uppercase" title={tr ? criterion?.descriptionTr : criterion?.description}>
                  {tr ? criterion?.labelTr : criterion?.label}
                  <span className="text-gray-600 ml-1">({Math.round((result.calibration.weights[score.criterionId] || 0) * 100)}%)</span>
                </span>
                <span className={`text-[10px] font-mono font-bold ${getScoreColor(score.score)}`}>
                  {score.score}
                </span>
              </div>
              <div className="w-full h-1.5 bg-cyber-dark rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(score.score)}`}
                  style={{ width: `${score.score}%` }}
                />
              </div>
              {/* Score reasoning (collapsible) */}
              {showDetails && (
                <p className="text-[9px] font-mono text-gray-500 leading-relaxed pl-1">
                  {tr ? score.reasoningTr : score.reasoning}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Section Analysis */}
      {result.sectionAnalysis.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.sectionAnalysis.map((sa) => (
            <span
              key={sa.name}
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                sa.quality === 'good' ? 'bg-cyber-success/10 text-cyber-success' :
                sa.quality === 'weak' ? 'bg-yellow-400/10 text-yellow-400' :
                'bg-red-500/10 text-red-400'
              }`}
              title={sa.issues.join(' ')}
            >
              {sa.quality === 'good' ? '+' : sa.quality === 'weak' ? '~' : '-'} {sa.name}
            </span>
          ))}
        </div>
      )}

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-[9px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
      >
        {showDetails ? (tr ? '[ - Detayları gizle ]' : '[ - Hide details ]') : (tr ? '[ + Detayları göster ]' : '[ + Show details ]')}
      </button>

      {/* Disagreements */}
      {result.disagreements.length > 0 && (
        <div className="border-t border-glass-border pt-2">
          <p className="text-[10px] font-mono text-orange-400 uppercase mb-1">
            {tr ? 'UYUŞMAZLIKLAR' : 'DISAGREEMENTS'}
          </p>
          {result.disagreements.map((d, i) => (
            <div key={i} className="mb-1">
              <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
                {tr ? d.suggestionTr : d.suggestion}
              </p>
              {showDetails && d.affectedSections.length > 0 && (
                <p className="text-[9px] font-mono text-gray-600 pl-2">
                  {tr ? 'Etkilenen:' : 'Affected:'} {d.affectedSections.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Revision History (V2) */}
      {showDetails && result.revisionHistory.length > 0 && (
        <div className="border-t border-glass-border pt-2">
          <p className="text-[10px] font-mono text-cyber-secondary uppercase mb-1">
            {tr ? 'REVİZE GEÇMİŞİ' : 'REVISION HISTORY'}
          </p>
          {result.revisionHistory.map((rev) => (
            <div key={rev.iteration} className="text-[9px] font-mono text-gray-500 mb-1 pl-2 border-l border-cyber-secondary/30">
              <span className="text-cyber-secondary">#{rev.iteration}</span>
              {' '}{rev.scoresBefore} → {rev.scoresAfter}
              <span className={rev.scoresAfter > rev.scoresBefore ? ' text-cyber-success' : ' text-red-400'}>
                {' '}({rev.scoresAfter > rev.scoresBefore ? '+' : ''}{rev.scoresAfter - rev.scoresBefore})
              </span>
              {showDetails && (
                <p className="text-gray-600 mt-0.5">{rev.appliedFixes.join(' | ')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="border-t border-glass-border pt-2">
          <p className="text-[10px] font-mono text-cyber-primary uppercase mb-1">
            {tr ? 'İYİLEŞTİRME ÖNERİLERİ' : 'IMPROVEMENT SUGGESTIONS'}
          </p>
          <ul className="space-y-1">
            {result.suggestions.slice(0, showDetails ? 10 : 5).map((s, i) => (
              <li key={i} className={`text-[10px] font-mono leading-relaxed pl-2 border-l ${getSuggestionColor(s.type)}`}>
                <span className="font-bold mr-1">[{getSuggestionIcon(s.type)}]</span>
                {tr ? s.messageTr : s.message}
                {s.autoFixable && (
                  <span className="ml-1 text-[8px] px-1 py-0.5 rounded bg-cyber-primary/10 text-cyber-primary">
                    {tr ? 'OTO-FİX' : 'AUTO-FIX'}
                  </span>
                )}
                {showDetails && s.estimatedGain > 0 && (
                  <span className="ml-1 text-[8px] text-gray-600">+{s.estimatedGain}pt</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
