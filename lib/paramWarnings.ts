/**
 * Çift modlu parametre yönetimi: sistem uyarıları (otomatik) + kullanıcı uyarıları (yapılandırılabilir).
 * CLI ve UI tarafından kullanılır.
 */

export type Severity = 'error' | 'warn' | 'info';

export interface ParamWarning {
  code: string;
  severity: Severity;
  message: string;
  source: 'system' | 'user';
  param?: string;
}

export interface ParamWarningOptions {
  /** Kullanıcı tanımlı: minimum niyet karakter sayısı (varsayılan 10) */
  minIntentLength?: number;
  /** Kullanıcı tanımlı: maksimum niyet karakter (0 = sınırsız) */
  maxIntentLength?: number;
  /** API key zorunlu mu (sistem) */
  requireApiKey?: boolean;
  /** Desteklenen framework listesi (sistem) */
  allowedFrameworks?: string[];
  /** Desteklenen provider listesi (sistem) */
  allowedProviders?: string[];
}

const DEFAULT_OPTIONS: Required<Omit<ParamWarningOptions, 'allowedFrameworks' | 'allowedProviders'>> = {
  minIntentLength: 10,
  maxIntentLength: 0,
  requireApiKey: true,
};

/**
 * Sistem uyarıları: API key, framework, provider vb. otomatik kontroller.
 */
export function collectSystemWarnings(params: {
  intent?: string;
  framework?: string;
  provider?: string;
  apiKey?: string;
  apiBaseUrl?: string;
}, opts: ParamWarningOptions = {}): ParamWarning[] {
  const warnings: ParamWarning[] = [];
  const requireKey = opts.requireApiKey ?? DEFAULT_OPTIONS.requireApiKey;
  const allowedFrameworks = opts.allowedFrameworks ?? ['AUTO', 'KERNEL', 'CO_STAR', 'RISEN', 'RTF', 'BAB', 'TAG', 'CARE'];
  const allowedProviders = opts.allowedProviders ?? ['groq', 'gemini', 'huggingface', 'claude', 'claude-opus', 'openrouter', 'deepseek'];

  if (requireKey && !params.apiKey?.trim()) {
    warnings.push({
      code: 'MISSING_API_KEY',
      severity: 'warn',
      message: 'SR_API_KEY veya API_KEY ortam değişkeni yok; sunucu auth bypass kullanıyorsa çalışabilir.',
      source: 'system',
      param: 'apiKey',
    });
  }

  if (params.apiBaseUrl && !/^https?:\/\//.test(params.apiBaseUrl)) {
    warnings.push({
      code: 'INVALID_API_URL',
      severity: 'warn',
      message: 'SR_API_URL geçerli bir HTTP(S) adresi değil.',
      source: 'system',
      param: 'apiBaseUrl',
    });
  }

  if (params.framework && !allowedFrameworks.includes(params.framework)) {
    warnings.push({
      code: 'UNKNOWN_FRAMEWORK',
      severity: 'info',
      message: `Framework "${params.framework}" tanınmadı; sunucu AUTO kullanacak.`,
      source: 'system',
      param: 'framework',
    });
  }

  if (params.provider && !allowedProviders.includes(params.provider)) {
    warnings.push({
      code: 'UNKNOWN_PROVIDER',
      severity: 'info',
      message: `Provider "${params.provider}" tanınmadı; sunucu groq kullanacak.`,
      source: 'system',
      param: 'provider',
    });
  }

  return warnings;
}

/**
 * Kullanıcı uyarıları: min/max intent uzunluğu vb. yapılandırılabilir kurallar.
 */
export function collectUserWarnings(params: {
  intent?: string;
}, opts: ParamWarningOptions = {}): ParamWarning[] {
  const warnings: ParamWarning[] = [];
  const minLen = opts.minIntentLength ?? DEFAULT_OPTIONS.minIntentLength;
  const maxLen = opts.maxIntentLength ?? DEFAULT_OPTIONS.maxIntentLength;
  const intent = params.intent ?? '';
  const len = intent.length;

  if (len > 0 && len < minLen) {
    warnings.push({
      code: 'INTENT_TOO_SHORT',
      severity: 'warn',
      message: `Niyet ${len} karakter; önerilen minimum ${minLen}.`,
      source: 'user',
      param: 'intent',
    });
  }

  if (maxLen > 0 && len > maxLen) {
    warnings.push({
      code: 'INTENT_TOO_LONG',
      severity: 'warn',
      message: `Niyet ${len} karakter; maksimum ${maxLen} önerilir.`,
      source: 'user',
      param: 'intent',
    });
  }

  return warnings;
}

/**
 * Tüm uyarıları toplar (sistem + kullanıcı).
 */
export function collectParamWarnings(
  params: { intent?: string; framework?: string; provider?: string; apiKey?: string; apiBaseUrl?: string },
  opts: ParamWarningOptions = {}
): ParamWarning[] {
  return [
    ...collectSystemWarnings(params, opts),
    ...collectUserWarnings(params, opts),
  ];
}

/**
 * Hata seviyesinde uyarı var mı (işlemi durdurmak için).
 */
export function hasErrors(warnings: ParamWarning[]): boolean {
  return warnings.some(w => w.severity === 'error');
}
