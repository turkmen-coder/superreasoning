/**
 * Otomatik İyileştirme (Reinforcement via Human Feedback).
 * Kullanıcı onayıyla başarılı prompt varyantları öneri havuzuna eklenir.
 * Minimal insan-in-the-loop: tek tık "Öneri havuzuna ekle" + onay.
 * GDPR: Kişisel veri yok; yalnızca anonim prompt metni ve domain/framework.
 */

import { Framework } from '../types';

export interface SuggestionVariant {
  id: string;
  masterPrompt: string;
  reasoning: string;
  domainId: string;
  framework: Framework;
  /** Kullanıcı etiketlemediyse boş */
  intentHint?: string;
  addedAt: number;
}

const STORAGE_KEY = 'sr_suggestion_pool';
const MAX_SUGGESTIONS = 50;

export function getSuggestionPool(): SuggestionVariant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SuggestionVariant[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addToSuggestionPool(
  variant: Omit<SuggestionVariant, 'id' | 'addedAt'>
): void {
  const pool = getSuggestionPool();
  const newItem: SuggestionVariant = {
    ...variant,
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    addedAt: Date.now(),
  };
  const updated = [newItem, ...pool].slice(0, MAX_SUGGESTIONS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {} // eslint-disable-line no-empty
}

export function removeFromSuggestionPool(id: string): void {
  const pool = getSuggestionPool().filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pool));
  } catch {} // eslint-disable-line no-empty
}
