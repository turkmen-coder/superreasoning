/**
 * Standards Compliance Service — Automated compliance checking and monitoring.
 * Implements industry standards validation for WCAG, OWASP, GDPR, etc.
 *
 * Checks marked [REAL] perform actual codebase/runtime inspection.
 * Checks marked [MOCK] return demonstration data (need external tools for real results).
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ComplianceCheck {
  id: string;
  name: string;
  nameTr: string;
  category: 'accessibility' | 'security' | 'performance' | 'privacy';
  standard: string;
  description: string;
  descriptionTr: string;
  automated: boolean;
  /** Whether this check uses real codebase inspection vs mock data */
  realCheck: boolean;
  checkFunction: () => Promise<ComplianceResult>;
}

export interface ComplianceResult {
  checkId: string;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
  score: number; // 0-100
  issues: ComplianceIssue[];
  details?: Record<string, unknown>;
  /** Whether this result was derived from real inspection */
  isRealCheck: boolean;
  timestamp: Date;
}

export interface ComplianceIssue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  rule: string;
  description: string;
  descriptionTr: string;
  recommendation: string;
  recommendationTr: string;
  evidence?: string;
  automatedFix?: boolean;
}

export interface ComplianceReport {
  overallScore: number;
  categoryScores: Record<string, number>;
  checks: ComplianceResult[];
  summary: {
    totalChecks: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    criticalIssues: number;
    realChecks: number;
    mockChecks: number;
  };
  generatedAt: Date;
}

/** Resolve project root (works from server/ context) */
function getProjectRoot(): string {
  return process.cwd();
}

/** Safely read a file, return null if not found */
function safeReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * WCAG 2.1 AA Accessibility Checks [MOCK]
 * Real WCAG checks require browser DOM access (axe-core, Lighthouse).
 */
class WCAGComplianceChecker {
  static async checkColorContrast(): Promise<ComplianceResult> {
    return {
      checkId: 'wcag-color-contrast',
      status: 'not-applicable',
      score: 0,
      issues: [{
        id: 'contrast-needs-browser',
        severity: 'medium',
        rule: 'WCAG 1.4.3 Contrast',
        description: 'Color contrast check requires browser DOM. Run axe-core or Lighthouse for real results.',
        descriptionTr: 'Renk kontrast kontrolu tarayici DOM gerektirir. Gercek sonuclar icin axe-core veya Lighthouse calistirin.',
        recommendation: 'Run: npx lighthouse --only-categories=accessibility <URL>',
        recommendationTr: 'Calistirin: npx lighthouse --only-categories=accessibility <URL>',
        automatedFix: false,
      }],
      isRealCheck: false,
      timestamp: new Date(),
    };
  }

  static async checkKeyboardNavigation(): Promise<ComplianceResult> {
    return {
      checkId: 'wcag-keyboard-navigation',
      status: 'not-applicable',
      score: 0,
      issues: [{
        id: 'keyboard-needs-browser',
        severity: 'medium',
        rule: 'WCAG 2.1.1 Keyboard',
        description: 'Keyboard navigation check requires browser interaction testing.',
        descriptionTr: 'Klavye navigasyon kontrolu tarayici etkilesim testi gerektirir.',
        recommendation: 'Run Playwright/Cypress accessibility tests or use axe-core.',
        recommendationTr: 'Playwright/Cypress erisilebilirlik testleri veya axe-core kullanin.',
        automatedFix: false,
      }],
      isRealCheck: false,
      timestamp: new Date(),
    };
  }

  static async checkScreenReaderSupport(): Promise<ComplianceResult> {
    // [REAL] Scan component files for aria-label usage
    const root = getProjectRoot();
    const componentsDir = path.join(root, 'components');
    let totalComponents = 0;
    let componentsWithAria = 0;

    try {
      const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
      totalComponents = files.length;

      for (const file of files) {
        const content = safeReadFile(path.join(componentsDir, file));
        if (content && /aria-label|aria-labelledby|aria-describedby|role=/.test(content)) {
          componentsWithAria++;
        }
      }
    } catch {
      return {
        checkId: 'wcag-screen-reader',
        status: 'not-applicable',
        score: 0,
        issues: [],
        isRealCheck: false,
        timestamp: new Date(),
      };
    }

    const coverage = totalComponents > 0 ? Math.round((componentsWithAria / totalComponents) * 100) : 0;
    const issues: ComplianceIssue[] = [];

    if (coverage < 80) {
      issues.push({
        id: 'aria-coverage-low',
        severity: coverage < 50 ? 'high' : 'medium',
        rule: 'WCAG 1.3.1 Info and Relationships',
        description: `Only ${componentsWithAria}/${totalComponents} components use ARIA attributes (${coverage}% coverage)`,
        descriptionTr: `${totalComponents} bilesenden sadece ${componentsWithAria} tanesi ARIA ozellikleri kullaniyor (%${coverage} kapsam)`,
        recommendation: 'Add aria-label to interactive elements in remaining components',
        recommendationTr: 'Kalan bilesenlerdeki etkilesimli ogelere aria-label ekleyin',
        automatedFix: false,
      });
    }

    return {
      checkId: 'wcag-screen-reader',
      status: coverage >= 80 ? 'compliant' : coverage >= 50 ? 'partial' : 'non-compliant',
      score: coverage,
      issues,
      details: { totalComponents, componentsWithAria, ariaCoverage: coverage },
      isRealCheck: true,
      timestamp: new Date(),
    };
  }
}

/**
 * OWASP Security Checks [REAL]
 * Scans actual middleware files and server configuration.
 */
class OWASPComplianceChecker {
  static async checkAuthenticationSecurity(): Promise<ComplianceResult> {
    const root = getProjectRoot();
    const issues: ComplianceIssue[] = [];
    let score = 100;
    const details: Record<string, unknown> = {};

    // Check 1: Auth middleware exists and uses timing-safe compare
    const authMiddleware = safeReadFile(path.join(root, 'server', 'middleware', 'auth.ts'));
    if (authMiddleware) {
      details.authMiddlewarePresent = true;
      details.timingSafeCompare = /secureCompare|timingSafeEqual|constant.time/i.test(authMiddleware);
      if (!details.timingSafeCompare) {
        score -= 20;
        issues.push({
          id: 'auth-timing-attack',
          severity: 'high',
          rule: 'OWASP A07:2021 Authentication Failures',
          description: 'API key comparison does not use timing-safe comparison',
          descriptionTr: 'API key karsilastirmasi zamanlama-guvenli karsilastirma kullanmiyor',
          recommendation: 'Use crypto.timingSafeEqual or constant-time string comparison',
          recommendationTr: 'crypto.timingSafeEqual veya sabit zamanli string karsilastirmasi kullanin',
        });
      }
    } else {
      details.authMiddlewarePresent = false;
      score -= 30;
    }

    // Check 2: JWT verification present
    const supabaseAuth = safeReadFile(path.join(root, 'server', 'middleware', 'supabaseAuth.ts'));
    if (supabaseAuth) {
      details.jwtVerification = /jwtVerify|verify.*token/i.test(supabaseAuth);
      if (!details.jwtVerification) {
        score -= 15;
        issues.push({
          id: 'auth-no-jwt',
          severity: 'high',
          rule: 'OWASP A07:2021',
          description: 'No JWT verification found in auth middleware',
          descriptionTr: 'Auth middleware\'da JWT dogrulama bulunamadi',
          recommendation: 'Implement JWT signature verification',
          recommendationTr: 'JWT imza dogrulamasi uygulayin',
        });
      }
    }

    // Check 3: No hardcoded test keys
    const allAuth = (authMiddleware ?? '') + (supabaseAuth ?? '');
    details.noHardcodedKeys = !/DEFAULT_TEST_KEY|hardcoded.*key|test-key-\d{4}/i.test(allAuth);
    if (!details.noHardcodedKeys) {
      score -= 25;
      issues.push({
        id: 'auth-hardcoded-key',
        severity: 'high',
        rule: 'OWASP A07:2021',
        description: 'Hardcoded test API key found in auth middleware',
        descriptionTr: 'Auth middleware\'da hardcoded test API key bulundu',
        recommendation: 'Remove all hardcoded keys; use environment variables only',
        recommendationTr: 'Tum hardcoded keyleri kaldirin; sadece ortam degiskenleri kullanin',
      });
    }

    // Check 4: Auth bypass guarded by NODE_ENV
    if (authMiddleware && /DISABLE_API_KEY_AUTH/.test(authMiddleware)) {
      details.bypassGuarded = /NODE_ENV.*production|IS_PRODUCTION/i.test(authMiddleware);
      if (!details.bypassGuarded) {
        score -= 20;
        issues.push({
          id: 'auth-bypass-unguarded',
          severity: 'high',
          rule: 'OWASP A01:2021 Broken Access Control',
          description: 'Auth bypass (DISABLE_API_KEY_AUTH) not guarded by NODE_ENV check',
          descriptionTr: 'Auth bypass (DISABLE_API_KEY_AUTH) NODE_ENV kontrolu ile korunmuyor',
          recommendation: 'Ensure auth bypass only works in non-production environments',
          recommendationTr: 'Auth bypass\'in sadece uretim disi ortamlarda calistigini garantileyin',
        });
      }
    }

    return {
      checkId: 'owasp-auth-security',
      status: score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant',
      score: Math.max(0, score),
      issues,
      details,
      isRealCheck: true,
      timestamp: new Date(),
    };
  }

  static async checkAPIRateLimiting(): Promise<ComplianceResult> {
    const root = getProjectRoot();
    const issues: ComplianceIssue[] = [];
    let score = 100;
    const details: Record<string, unknown> = {};

    // Check rate limit middleware existence
    const rateLimitFile = safeReadFile(path.join(root, 'server', 'middleware', 'rateLimit.ts'));
    details.rateLimitMiddlewarePresent = !!rateLimitFile;

    if (!rateLimitFile) {
      score -= 40;
      issues.push({
        id: 'no-rate-limit',
        severity: 'high',
        rule: 'OWASP API4:2023 Unrestricted Resource Consumption',
        description: 'No rate limiting middleware found',
        descriptionTr: 'Hiz sinirlandirma middleware bulunamadi',
        recommendation: 'Install express-rate-limit and apply to all endpoints',
        recommendationTr: 'express-rate-limit yukleyin ve tum endpoint\'lere uygulayin',
      });
    } else {
      // Check for per-user rate limiting
      details.perUserLimiting = /authUser|userId|user\.id/i.test(rateLimitFile);
      if (!details.perUserLimiting) {
        score -= 15;
        issues.push({
          id: 'no-per-user-limit',
          severity: 'medium',
          rule: 'OWASP API4:2023',
          description: 'Rate limiting is not per-user; only IP-based',
          descriptionTr: 'Hiz sinirlandirma kullanici bazli degil; sadece IP bazli',
          recommendation: 'Add user-based rate limiting for authenticated endpoints',
          recommendationTr: 'Kimlik dogrulanmis endpoint\'ler icin kullanici bazli hiz sinirlandirma ekleyin',
        });
      }

      // Check for tiered limits
      details.tieredLimits = /plan.*pro|role.*admin|tier|subscription/i.test(rateLimitFile);
    }

    // Check if rate limiter is applied to main router
    const indexRoute = safeReadFile(path.join(root, 'server', 'routes', 'index.ts'));
    if (indexRoute) {
      details.rateLimitApplied = /rateLimiter|rateLimit/i.test(indexRoute);
      if (!details.rateLimitApplied) {
        score -= 20;
        issues.push({
          id: 'rate-limit-not-applied',
          severity: 'high',
          rule: 'OWASP API4:2023',
          description: 'Rate limiter imported but not applied to routes',
          descriptionTr: 'Rate limiter import edilmis ama route\'lara uygulanmamis',
          recommendation: 'Apply rate limiter middleware to all API routes',
          recommendationTr: 'Rate limiter middleware\'ini tum API route\'larina uygulayin',
        });
      }
    }

    return {
      checkId: 'owasp-api-rate-limit',
      status: score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant',
      score: Math.max(0, score),
      issues,
      details,
      isRealCheck: true,
      timestamp: new Date(),
    };
  }

  static async checkDataValidation(): Promise<ComplianceResult> {
    const root = getProjectRoot();
    const issues: ComplianceIssue[] = [];
    let score = 100;
    const details: Record<string, unknown> = {};

    // Check 1: Security headers in app.ts
    const appFile = safeReadFile(path.join(root, 'server', 'app.ts'));
    if (appFile) {
      const headers = {
        xContentTypeOptions: /X-Content-Type-Options.*nosniff/i.test(appFile),
        xFrameOptions: /X-Frame-Options.*(DENY|SAMEORIGIN)/i.test(appFile),
        xssProtection: /X-XSS-Protection/i.test(appFile),
        hsts: /Strict-Transport-Security/i.test(appFile),
        csp: /Content-Security-Policy/i.test(appFile),
        referrerPolicy: /Referrer-Policy/i.test(appFile),
        permissionsPolicy: /Permissions-Policy/i.test(appFile),
      };
      details.securityHeaders = headers;

      const headerCount = Object.values(headers).filter(Boolean).length;
      const totalHeaders = Object.keys(headers).length;

      if (headerCount < totalHeaders) {
        const missing = Object.entries(headers).filter(([, v]) => !v).map(([k]) => k);
        score -= (totalHeaders - headerCount) * 5;
        issues.push({
          id: 'missing-security-headers',
          severity: headerCount < 4 ? 'high' : 'medium',
          rule: 'OWASP A05:2021 Security Misconfiguration',
          description: `Missing security headers: ${missing.join(', ')}`,
          descriptionTr: `Eksik guvenlik basliklari: ${missing.join(', ')}`,
          recommendation: 'Add missing headers. Consider using the helmet middleware.',
          recommendationTr: 'Eksik basliklari ekleyin. helmet middleware kullanmayi dusunun.',
        });
      }

      // Check 2: CSRF protection
      details.csrfProtection = /csrf|csurf/i.test(appFile);
      if (!details.csrfProtection) {
        score -= 10;
        issues.push({
          id: 'no-csrf',
          severity: 'medium',
          rule: 'OWASP A01:2021 CSRF',
          description: 'No CSRF protection middleware detected',
          descriptionTr: 'CSRF koruma middleware\'i tespit edilemedi',
          recommendation: 'Add CSRF protection for state-changing endpoints',
          recommendationTr: 'Durum degistiren endpoint\'ler icin CSRF korumasi ekleyin',
        });
      }

      // Check 3: JSON body limit
      details.jsonBodyLimit = /json\s*\(\s*\{[^}]*limit/i.test(appFile);
      if (!details.jsonBodyLimit) {
        score -= 5;
      }
    }

    // Check 4: Parameterized queries (check for SQL injection prevention)
    const routeFiles = ['index.ts', 'auth.ts', 'team.ts', 'packs.ts', 'builder.ts'];
    let parameterizedCount = 0;
    let rawQueryCount = 0;

    for (const file of routeFiles) {
      const content = safeReadFile(path.join(root, 'server', 'routes', file));
      if (content) {
        // Count parameterized queries ($1, $2, etc.)
        parameterizedCount += (content.match(/\$\d+/g) || []).length;
        // Check for string interpolation in SQL (potential injection)
        rawQueryCount += (content.match(/`SELECT.*\$\{|`INSERT.*\$\{|`UPDATE.*\$\{|`DELETE.*\$\{/g) || []).length;
      }
    }

    details.parameterizedQueries = parameterizedCount;
    details.potentialSqlInjection = rawQueryCount;

    if (rawQueryCount > 0) {
      score -= 15;
      issues.push({
        id: 'potential-sql-injection',
        severity: 'high',
        rule: 'OWASP A03:2021 Injection',
        description: `Found ${rawQueryCount} potential SQL injection point(s) using string interpolation in queries`,
        descriptionTr: `Sorgularda string interpolasyon kullanan ${rawQueryCount} potansiyel SQL injection noktasi bulundu`,
        recommendation: 'Use parameterized queries ($1, $2) instead of template literals in SQL',
        recommendationTr: 'SQL\'de template literal yerine parametreli sorgular ($1, $2) kullanin',
      });
    }

    return {
      checkId: 'owasp-data-validation',
      status: score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant',
      score: Math.max(0, score),
      issues,
      details,
      isRealCheck: true,
      timestamp: new Date(),
    };
  }
}

/**
 * Performance Standards Checks [PARTIALLY REAL]
 */
class PerformanceComplianceChecker {
  static async checkCoreWebVitals(): Promise<ComplianceResult> {
    // Core Web Vitals require browser measurement — mark as not-applicable
    return {
      checkId: 'core-web-vitals',
      status: 'not-applicable',
      score: 0,
      issues: [{
        id: 'cwv-needs-browser',
        severity: 'low',
        rule: 'Google Core Web Vitals',
        description: 'Core Web Vitals require browser measurement. Run Lighthouse for real results.',
        descriptionTr: 'Core Web Vitals tarayici olcumu gerektirir. Gercek sonuclar icin Lighthouse calistirin.',
        recommendation: 'Run: npx lighthouse <URL> --output json --output-path ./cwv-report.json',
        recommendationTr: 'Calistirin: npx lighthouse <URL> --output json --output-path ./cwv-report.json',
        automatedFix: false,
      }],
      isRealCheck: false,
      timestamp: new Date(),
    };
  }

  static async checkBundleSize(): Promise<ComplianceResult> {
    // [REAL] Scan dist/ folder for actual bundle sizes
    const root = getProjectRoot();
    const distDir = path.join(root, 'dist');
    const assetsDir = path.join(distDir, 'assets');
    const issues: ComplianceIssue[] = [];
    const details: Record<string, unknown> = {};

    try {
      if (!fs.existsSync(assetsDir)) {
        return {
          checkId: 'bundle-size',
          status: 'not-applicable',
          score: 0,
          issues: [{
            id: 'no-build',
            severity: 'low',
            rule: 'Performance Budget',
            description: 'No dist/assets/ directory found. Run `npm run build` first.',
            descriptionTr: 'dist/assets/ dizini bulunamadi. Once `npm run build` calistirin.',
            recommendation: 'Run npm run build to generate production bundle',
            recommendationTr: 'Uretim paketi olusturmak icin npm run build calistirin',
            automatedFix: false,
          }],
          isRealCheck: true,
          timestamp: new Date(),
        };
      }

      const files = fs.readdirSync(assetsDir);
      let totalJsSize = 0;
      let totalCssSize = 0;
      const jsFiles: { name: string; sizeKb: number }[] = [];

      for (const file of files) {
        const stat = fs.statSync(path.join(assetsDir, file));
        const sizeKb = Math.round(stat.size / 1024);
        if (file.endsWith('.js')) {
          totalJsSize += sizeKb;
          jsFiles.push({ name: file, sizeKb });
        } else if (file.endsWith('.css')) {
          totalCssSize += sizeKb;
        }
      }

      details.jsFiles = jsFiles;
      details.totalJsSizeKb = totalJsSize;
      details.totalCssSizeKb = totalCssSize;
      details.totalSizeKb = totalJsSize + totalCssSize;

      let score = 100;
      const BUDGET_JS_KB = 500; // 500KB uncompressed budget
      const BUDGET_TOTAL_KB = 700;

      if (totalJsSize > BUDGET_JS_KB) {
        score -= Math.min(30, Math.round(((totalJsSize - BUDGET_JS_KB) / BUDGET_JS_KB) * 30));
        issues.push({
          id: 'js-bundle-large',
          severity: totalJsSize > BUDGET_JS_KB * 2 ? 'high' : 'medium',
          rule: 'Performance Budget',
          description: `JS bundle (${totalJsSize}KB) exceeds ${BUDGET_JS_KB}KB budget`,
          descriptionTr: `JS paketi (${totalJsSize}KB) ${BUDGET_JS_KB}KB butcesini asiyor`,
          recommendation: 'Use code splitting, tree-shaking, and lazy loading to reduce bundle size',
          recommendationTr: 'Paket boyutunu azaltmak icin code splitting, tree-shaking ve lazy loading kullanin',
          automatedFix: false,
        });
      }

      if (totalJsSize + totalCssSize > BUDGET_TOTAL_KB) {
        score -= 10;
      }

      return {
        checkId: 'bundle-size',
        status: score >= 90 ? 'compliant' : score >= 70 ? 'partial' : 'non-compliant',
        score: Math.max(0, score),
        issues,
        details,
        isRealCheck: true,
        timestamp: new Date(),
      };
    } catch {
      return {
        checkId: 'bundle-size',
        status: 'not-applicable',
        score: 0,
        issues: [],
        isRealCheck: false,
        timestamp: new Date(),
      };
    }
  }
}

/**
 * Privacy and GDPR Compliance Checks [REAL]
 */
class PrivacyComplianceChecker {
  static async checkDataRetention(): Promise<ComplianceResult> {
    // [REAL] Check if .env has data retention config, and if DB has retention mechanisms
    const root = getProjectRoot();
    const issues: ComplianceIssue[] = [];
    let score = 100;
    const details: Record<string, unknown> = {};

    // Check for data retention configuration
    const envExample = safeReadFile(path.join(root, '.env.example'));
    const envFile = safeReadFile(path.join(root, '.env'));
    const envContent = envExample || envFile || '';
    details.retentionConfigExists = /DATA_RETENTION|RETENTION_DAYS|PURGE_AFTER/i.test(envContent);

    if (!details.retentionConfigExists) {
      score -= 25;
      issues.push({
        id: 'no-retention-config',
        severity: 'high',
        rule: 'GDPR Article 5(1)(e)',
        description: 'No data retention configuration found in environment variables',
        descriptionTr: 'Ortam degiskenlerinde veri saklama yapilandirmasi bulunamadi',
        recommendation: 'Add DATA_RETENTION_DAYS environment variable and implement cleanup job',
        recommendationTr: 'DATA_RETENTION_DAYS ortam degiskeni ekleyin ve temizlik gorevi uygulayin',
        automatedFix: false,
      });
    }

    // Check for user data deletion capability
    const authRoute = safeReadFile(path.join(root, 'server', 'routes', 'auth.ts'));
    details.userDeleteEndpoint = authRoute ? /delete.*account|DELETE.*user|gdpr.*delete/i.test(authRoute) : false;

    if (!details.userDeleteEndpoint) {
      score -= 25;
      issues.push({
        id: 'no-delete-account',
        severity: 'high',
        rule: 'GDPR Article 17 Right to Erasure',
        description: 'No user account deletion endpoint found',
        descriptionTr: 'Kullanici hesap silme endpoint\'i bulunamadi',
        recommendation: 'Implement DELETE /v1/auth/account endpoint for GDPR right to erasure',
        recommendationTr: 'GDPR silme hakki icin DELETE /v1/auth/account endpoint\'i uygulayin',
      });
    }

    return {
      checkId: 'gdpr-data-retention',
      status: score >= 90 ? 'compliant' : score >= 50 ? 'partial' : 'non-compliant',
      score: Math.max(0, score),
      issues,
      details,
      isRealCheck: true,
      timestamp: new Date(),
    };
  }

  static async checkCookieConsent(): Promise<ComplianceResult> {
    // [REAL] Check if cookie consent mechanism exists in frontend
    const root = getProjectRoot();
    const details: Record<string, unknown> = {};

    // Scan index.html and main App.tsx for consent references
    const indexHtml = safeReadFile(path.join(root, 'index.html'));
    const appTsx = safeReadFile(path.join(root, 'App.tsx'));
    const combined = (indexHtml || '') + (appTsx || '');

    details.consentLibrary = /cookie.*consent|osano|trust.*badge|gdpr.*banner|CookieConsent/i.test(combined);
    details.localStorageConsent = /localStorage.*consent|consent.*localStorage/i.test(combined);

    const hasConsent = details.consentLibrary || details.localStorageConsent;

    return {
      checkId: 'gdpr-cookie-consent',
      status: hasConsent ? 'compliant' : 'partial',
      score: hasConsent ? 90 : 50,
      issues: hasConsent ? [] : [{
        id: 'no-cookie-consent',
        severity: 'medium',
        rule: 'GDPR & ePrivacy Directive',
        description: 'No cookie consent mechanism detected in the application',
        descriptionTr: 'Uygulamada cerez onay mekanizmasi tespit edilemedi',
        recommendation: 'Add a cookie consent banner using a GDPR-compliant library',
        recommendationTr: 'GDPR uyumlu bir kutuphane kullanarak cerez onay banner\'i ekleyin',
      }],
      details,
      isRealCheck: true,
      timestamp: new Date(),
    };
  }
}

/**
 * Main compliance service
 */
export class StandardsComplianceService {
  private static checks: ComplianceCheck[] = [
    // WCAG Accessibility Checks
    {
      id: 'wcag-color-contrast',
      name: 'Color Contrast Compliance',
      nameTr: 'Renk Kontrast Uyumlulugu',
      category: 'accessibility',
      standard: 'WCAG 2.1 AA',
      description: 'Ensures text has sufficient contrast for readability',
      descriptionTr: 'Metnin okunabilirlik icin yeterli kontrasta sahip olmasini saglar',
      automated: true,
      realCheck: false,
      checkFunction: WCAGComplianceChecker.checkColorContrast,
    },
    {
      id: 'wcag-keyboard-navigation',
      name: 'Keyboard Navigation',
      nameTr: 'Klavye Navigasyonu',
      category: 'accessibility',
      standard: 'WCAG 2.1 AA',
      description: 'Ensures all functionality is available via keyboard',
      descriptionTr: 'Tum islevselligin klavye ile erisilebilir olmasini saglar',
      automated: true,
      realCheck: false,
      checkFunction: WCAGComplianceChecker.checkKeyboardNavigation,
    },
    {
      id: 'wcag-screen-reader',
      name: 'Screen Reader Support (ARIA coverage)',
      nameTr: 'Ekran Okuyucu Destegi (ARIA kapsami)',
      category: 'accessibility',
      standard: 'WCAG 2.1 AA',
      description: 'Scans components for ARIA attribute usage',
      descriptionTr: 'Bilesenleri ARIA ozellik kullanimi icin tarar',
      automated: true,
      realCheck: true,
      checkFunction: WCAGComplianceChecker.checkScreenReaderSupport,
    },

    // OWASP Security Checks
    {
      id: 'owasp-auth-security',
      name: 'Authentication Security',
      nameTr: 'Kimlik Dogrulama Guvenligi',
      category: 'security',
      standard: 'OWASP Top 10 2021',
      description: 'Inspects auth middleware for timing-safe compare, JWT verification, and bypass guards',
      descriptionTr: 'Auth middleware\'ini zamanlama-guvenli karsilastirma, JWT dogrulama ve bypass korumalari icin inceler',
      automated: true,
      realCheck: true,
      checkFunction: OWASPComplianceChecker.checkAuthenticationSecurity,
    },
    {
      id: 'owasp-api-rate-limit',
      name: 'API Rate Limiting',
      nameTr: 'API Hiz Sinirlandirmasi',
      category: 'security',
      standard: 'OWASP API Security Top 10',
      description: 'Verifies rate limiting middleware is present and applied to routes',
      descriptionTr: 'Rate limiting middleware\'inin mevcut olup route\'lara uygulandigini dogrular',
      automated: true,
      realCheck: true,
      checkFunction: OWASPComplianceChecker.checkAPIRateLimiting,
    },
    {
      id: 'owasp-data-validation',
      name: 'Data Validation & Security Headers',
      nameTr: 'Veri Dogrulama ve Guvenlik Basliklari',
      category: 'security',
      standard: 'OWASP Top 10 2021',
      description: 'Checks security headers, CSRF protection, and SQL injection prevention',
      descriptionTr: 'Guvenlik basliklarini, CSRF korumasini ve SQL injection onlemesini kontrol eder',
      automated: true,
      realCheck: true,
      checkFunction: OWASPComplianceChecker.checkDataValidation,
    },

    // Performance Checks
    {
      id: 'core-web-vitals',
      name: 'Core Web Vitals',
      nameTr: 'Temel Web Vitali',
      category: 'performance',
      standard: 'Google Core Web Vitals',
      description: 'Requires browser measurement (Lighthouse)',
      descriptionTr: 'Tarayici olcumu gerektirir (Lighthouse)',
      automated: true,
      realCheck: false,
      checkFunction: PerformanceComplianceChecker.checkCoreWebVitals,
    },
    {
      id: 'bundle-size',
      name: 'Bundle Size Analysis',
      nameTr: 'Paket Boyutu Analizi',
      category: 'performance',
      standard: 'Web Performance Best Practices',
      description: 'Scans dist/assets/ for actual JS/CSS file sizes',
      descriptionTr: 'Gercek JS/CSS dosya boyutlari icin dist/assets/ klasorunu tarar',
      automated: true,
      realCheck: true,
      checkFunction: PerformanceComplianceChecker.checkBundleSize,
    },

    // Privacy Checks
    {
      id: 'gdpr-data-retention',
      name: 'Data Retention Policy',
      nameTr: 'Veri Saklama Politikasi',
      category: 'privacy',
      standard: 'GDPR',
      description: 'Checks for retention configuration and user deletion capability',
      descriptionTr: 'Saklama yapilandirmasini ve kullanici silme yetenegini kontrol eder',
      automated: true,
      realCheck: true,
      checkFunction: PrivacyComplianceChecker.checkDataRetention,
    },
    {
      id: 'gdpr-cookie-consent',
      name: 'Cookie Consent Management',
      nameTr: 'Cerez Onay Yonetimi',
      category: 'privacy',
      standard: 'GDPR & ePrivacy Directive',
      description: 'Detects cookie consent mechanisms in frontend code',
      descriptionTr: 'Frontend kodunda cerez onay mekanizmalarini tespit eder',
      automated: true,
      realCheck: true,
      checkFunction: PrivacyComplianceChecker.checkCookieConsent,
    },
  ];

  static async runFullAudit(): Promise<ComplianceReport> {
    const results = await Promise.all(
      this.checks.map(async (check) => {
        try {
          return await check.checkFunction();
        } catch (error) {
          return {
            checkId: check.id,
            status: 'non-compliant' as const,
            score: 0,
            issues: [{
              id: `${check.id}-error`,
              severity: 'high' as const,
              rule: 'System Error',
              description: `Failed to run check: ${error instanceof Error ? error.message : String(error)}`,
              descriptionTr: `Kontrol calistirilamadi: ${error instanceof Error ? error.message : String(error)}`,
              recommendation: 'Check system configuration and try again',
              recommendationTr: 'Sistem yapilandirmasini kontrol edin ve tekrar deneyin',
            }],
            isRealCheck: check.realCheck,
            timestamp: new Date(),
          };
        }
      }),
    );

    const compliant = results.filter((r) => r.status === 'compliant').length;
    const partial = results.filter((r) => r.status === 'partial').length;
    const nonCompliant = results.filter((r) => r.status === 'non-compliant').length;
    const criticalIssues = results.flatMap((r) => r.issues).filter((i) => i.severity === 'high').length;
    const realChecks = results.filter((r) => r.isRealCheck).length;

    // Only score checks that actually ran (not 'not-applicable')
    const scorableResults = results.filter((r) => r.status !== 'not-applicable');
    const overallScore =
      scorableResults.length > 0
        ? Math.round(scorableResults.reduce((sum, r) => sum + r.score, 0) / scorableResults.length)
        : 0;

    const categoryScores: Record<string, number> = {};
    for (const cat of ['accessibility', 'security', 'performance', 'privacy']) {
      const catResults = scorableResults.filter(
        (r) => this.checks.find((c) => c.id === r.checkId)?.category === cat,
      );
      if (catResults.length > 0) {
        categoryScores[cat] = Math.round(catResults.reduce((s, r) => s + r.score, 0) / catResults.length);
      }
    }

    return {
      overallScore,
      categoryScores,
      checks: results,
      summary: {
        totalChecks: results.length,
        compliant,
        partial,
        nonCompliant,
        criticalIssues,
        realChecks,
        mockChecks: results.length - realChecks,
      },
      generatedAt: new Date(),
    };
  }

  static async runCheck(checkId: string): Promise<ComplianceResult> {
    const check = this.checks.find((c) => c.id === checkId);
    if (!check) {
      throw new Error(`Compliance check not found: ${checkId}`);
    }
    return check.checkFunction();
  }

  static getAvailableChecks(): ComplianceCheck[] {
    return this.checks;
  }

  static getChecksByCategory(category: string): ComplianceCheck[] {
    return this.checks.filter((check) => check.category === category);
  }
}
