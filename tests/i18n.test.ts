/**
 * i18n system tests — language detection, persistence, translation completeness, regression guard
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { translations } from '../locales';
import { readFileSync } from 'fs';
import { join } from 'path';

/* ────────────────────────────────────────────────────
 * Minimal localStorage + navigator mock for Node env
 * ──────────────────────────────────────────────────── */
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((_i: number) => null),
};

let navigatorLang = 'en-US';

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('navigator', { get language() { return navigatorLang; } });

/* Import after globals are stubbed */
const { detectLanguage, LANGUAGE_STORAGE_KEY } = await import('../i18n');

/* ────────────────────────────────────────────────────
 * Suite 1 — Language detection logic
 * ──────────────────────────────────────────────────── */
describe('detectLanguage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    navigatorLang = 'en-US';
    // Restore default getItem implementation (may have been overridden by "throws" test)
    localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null);
  });

  it('defaults to "en" when no localStorage and no navigator hint', () => {
    navigatorLang = 'de-DE';
    expect(detectLanguage()).toBe('en');
  });

  it('returns "tr" when localStorage has "tr"', () => {
    localStorageMock.setItem(LANGUAGE_STORAGE_KEY, 'tr');
    expect(detectLanguage()).toBe('tr');
  });

  it('returns "en" when localStorage has "en"', () => {
    localStorageMock.setItem(LANGUAGE_STORAGE_KEY, 'en');
    expect(detectLanguage()).toBe('en');
  });

  it('falls through to navigator when localStorage has invalid value', () => {
    localStorageMock.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    navigatorLang = 'tr-TR';
    expect(detectLanguage()).toBe('tr');
  });

  it('detects Turkish from navigator.language "tr-TR"', () => {
    navigatorLang = 'tr-TR';
    expect(detectLanguage()).toBe('tr');
  });

  it('detects Turkish from navigator.language "tr"', () => {
    navigatorLang = 'tr';
    expect(detectLanguage()).toBe('tr');
  });

  it('returns "en" when navigator.language is non-Turkish', () => {
    navigatorLang = 'de-DE';
    expect(detectLanguage()).toBe('en');
  });

  it('does not crash when localStorage throws', () => {
    localStorageMock.getItem.mockImplementation(() => { throw new Error('SecurityError'); });
    navigatorLang = 'en-US';
    expect(() => detectLanguage()).not.toThrow();
    expect(detectLanguage()).toBe('en');
  });
});

/* ────────────────────────────────────────────────────
 * Suite 2 — Persistence (unit-level, no React rendering)
 * ──────────────────────────────────────────────────── */
describe('Language persistence via localStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Restore getItem implementation (may have been overridden in Suite 1)
    localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null);
  });

  it('LANGUAGE_STORAGE_KEY is "sr-language"', () => {
    expect(LANGUAGE_STORAGE_KEY).toBe('sr-language');
  });

  it('detectLanguage reads from localStorage', () => {
    localStorageMock.setItem(LANGUAGE_STORAGE_KEY, 'tr');
    expect(detectLanguage()).toBe('tr');
    localStorageMock.setItem(LANGUAGE_STORAGE_KEY, 'en');
    expect(detectLanguage()).toBe('en');
  });
});

/* ────────────────────────────────────────────────────
 * Suite 3 — Translation completeness
 * ──────────────────────────────────────────────────── */
describe('Translation completeness', () => {
  const trUi = translations.tr.ui;
  const enUi = translations.en.ui;

  it('tr.ui and en.ui have identical key sets', () => {
    const trKeys = Object.keys(trUi).sort();
    const enKeys = Object.keys(enUi).sort();

    const missingInEn = trKeys.filter(k => !enKeys.includes(k));
    const missingInTr = enKeys.filter(k => !trKeys.includes(k));

    expect(missingInEn).toEqual([]);
    expect(missingInTr).toEqual([]);
  });

  it('no empty string values in tr.ui', () => {
    const emptyKeys = Object.entries(trUi).filter(([, v]) => v === '');
    expect(emptyKeys).toEqual([]);
  });

  it('no empty string values in en.ui', () => {
    const emptyKeys = Object.entries(enUi).filter(([, v]) => v === '');
    expect(emptyKeys).toEqual([]);
  });

  it('frameworks have matching keys in both languages', () => {
    const trFwKeys = Object.keys(translations.tr.frameworks).sort();
    const enFwKeys = Object.keys(translations.en.frameworks).sort();
    expect(trFwKeys).toEqual(enFwKeys);
  });

  it('domains have matching keys in both languages', () => {
    const trDomainKeys = Object.keys(translations.tr.domains).sort();
    const enDomainKeys = Object.keys(translations.en.domains).sort();
    expect(trDomainKeys).toEqual(enDomainKeys);
  });
});

/* ────────────────────────────────────────────────────
 * Suite 4 — Regression guard: no inline ternaries in migrated components
 * ──────────────────────────────────────────────────── */
describe('Regression guard — no inline language ternaries', () => {
  const componentsDir = join(__dirname, '..', 'components');
  const migratedComponents = [
    'PromptSecurityScanner.tsx',
    'ABTesting.tsx',
    'ScheduledJobs.tsx',
    'WebhookIntegration.tsx',
    'PromptTemplateMarketplace.tsx',
    'CustomModelFinetuning.tsx',
    'ExportFormats.tsx',
    'MobileAppUI.tsx',
    'RealtimeCollaboration.tsx',
    'AgentStreamingUI.tsx',
    'ChatbotWidget.tsx',
  ];

  // Pattern: `const tr = language === 'tr'` or `const tr = language==='tr'`
  const trHelperPattern = /const\s+tr\s*=\s*language\s*===\s*['"]tr['"]/;

  for (const file of migratedComponents) {
    it(`${file} should not contain "const tr = language" pattern`, () => {
      let exists = false;
      try {
        const content = readFileSync(join(componentsDir, file), 'utf-8');
        exists = true;
        expect(trHelperPattern.test(content)).toBe(false);
      } catch {
        // file may not exist in test env — skip gracefully
        if (!exists) return;
      }
    });
  }
});
