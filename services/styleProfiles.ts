/**
 * Interactive Teaching Mode: stil profilleri (örneklerle üslup/tone öğretimi)
 * localStorage ile kalıcı; aktif profil üretimde kullanılır.
 */

import type { StyleProfile, StyleExample } from '../types';

const STORAGE_KEY = 'sr_style_profiles';
const ACTIVE_PROFILE_KEY = 'sr_style_active_profile_id';
const MAX_PROFILES = 20;
const MAX_EXAMPLES_PER_PROFILE = 10;

export function getStyleProfiles(): StyleProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveStyleProfile(profile: Omit<StyleProfile, 'createdAt'> & { createdAt?: string }): StyleProfile {
  const full: StyleProfile = {
    ...profile,
    createdAt: profile.createdAt ?? new Date().toISOString(),
  };
  const list = getStyleProfiles();
  const idx = list.findIndex((p) => p.id === full.id);
  const next = idx >= 0 ? list.map((p, i) => (i === idx ? full : p)) : [full, ...list].slice(0, MAX_PROFILES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return full;
}

export function deleteStyleProfile(id: string): void {
  const list = getStyleProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  if (getActiveProfileId() === id) setActiveProfileId('');
}

export function getActiveProfileId(): string {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id ?? '');
  } catch {} // eslint-disable-line no-empty
}

export function getActiveProfile(): StyleProfile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return getStyleProfiles().find((p) => p.id === id) ?? null;
}

/** Profilden üretimde kullanılacak kısa stil bağlamı metni (system/user prompt'a eklenecek) */
export function buildStyleContext(profile: StyleProfile | null, maxExampleChars = 600): string {
  if (!profile || profile.examples.length === 0) return '';
  const parts: string[] = [];
  if (profile.toneKeywords?.length) {
    parts.push(`Tone keywords: ${profile.toneKeywords.join(', ')}.`);
  }
  if (profile.description) {
    parts.push(`Style: ${profile.description}`);
  }
  const exampleSummaries = profile.examples.slice(0, 3).map((ex) => {
    const out = ex.output.slice(0, maxExampleChars);
    return `Example output style:\n${out}${ex.output.length > maxExampleChars ? '…' : ''}`;
  });
  if (exampleSummaries.length) {
    parts.push('Match the following output style (user-taught examples):');
    parts.push(exampleSummaries.join('\n---\n'));
  }
  return parts.join('\n');
}

export function addExampleToProfile(profileId: string, example: StyleExample): StyleProfile | null {
  const list = getStyleProfiles();
  const profile = list.find((p) => p.id === profileId);
  if (!profile) return null;
  const examples = [...profile.examples, example].slice(-MAX_EXAMPLES_PER_PROFILE);
  const updated: StyleProfile = { ...profile, examples };
  saveStyleProfile(updated);
  return updated;
}
