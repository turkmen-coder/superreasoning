// MasterPrompt.Developer - Web Vitals Heuristic Analyzer V2
// Static analysis of component code to estimate Core Web Vitals metrics
// V2: FID→INP, sigmoid saturation, barrel detection, async waterfall, gzip, dedup

import type {
  ComponentInput,
  OptimizationInput,
  WebVitalsMetrics,
  WebVitalsDetail,
  BundleMetrics,
  TypeScriptMetrics,
  BackendMetrics,
  BackendLang,
} from '../types/optimizer';
import { CWV_THRESHOLDS } from '../types/optimizer';

// --- Sigmoid saturation (prevents unbounded accumulation) ---

function sigmoid(x: number, maxVal: number, midpoint: number, steepness: number = 6): number {
  return maxVal / (1 + Math.exp(-steepness * (x - midpoint) / maxVal));
}

// --- Heavy dependency catalog (estimated KB per full import) ---

const HEAVY_DEPS: Record<string, number> = {
  '@mui/material': 320,
  '@mui/icons-material': 180,
  '@ant-design/icons': 180,
  'antd': 420,
  'lodash': 72,
  'moment': 67,
  'dayjs': 35,
  '@emotion/styled': 45,
  '@emotion/react': 25,
  'chart.js': 65,
  'recharts': 110,
  'three': 580,
  'd3': 240,
  'firebase': 150,
  'aws-sdk': 280,
  '@fortawesome/fontawesome-svg-core': 60,
  'react-pdf': 220,
  'xlsx': 180,
  'pdfjs-dist': 450,
  'monaco-editor': 380,
  'ace-builds': 320,
};

const LIGHT_DEPS: Record<string, number> = {
  'react': 6,
  'react-dom': 40,
  'react-router-dom': 14,
  'clsx': 1,
  'zustand': 3,
  'date-fns': 8,
};

// --- Helper: normalize dependency name to base package ---

function getBaseDep(dep: string): string {
  if (dep.startsWith('@')) {
    const parts = dep.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dep;
  }
  return dep.split('/')[0];
}

// --- LCP Estimation (sigmoid saturation) ---

function estimateLCP(
  components: ComponentInput[]
): { value: number; details: WebVitalsDetail[] } {
  const baselineMs = 800;
  let penaltyRaw = 0;
  const details: WebVitalsDetail[] = [];

  for (const comp of components) {
    // Wildcard imports add significant bundle weight
    const wildcardImports = (comp.code.match(/import\s+\*\s+as\s+(?!React)\w+\s+from/g) || []);
    if (wildcardImports.length > 0) {
      penaltyRaw += wildcardImports.length * 400;
      details.push({
        metric: 'lcp',
        issue: `Wildcard import detected (${wildcardImports.length}x) - blocks tree-shaking`,
        severity: 'critical',
        component: comp.name,
      });
    }

    // Heavy dependencies add parse + eval time
    for (const dep of comp.dependencies) {
      const baseDep = getBaseDep(dep);
      const sizeKb = HEAVY_DEPS[baseDep];
      if (sizeKb) {
        penaltyRaw += sizeKb * 1.5;
        details.push({
          metric: 'lcp',
          issue: `Heavy dependency "${baseDep}" (~${sizeKb}KB) increases initial load`,
          severity: sizeKb > 200 ? 'critical' : 'warning',
          component: comp.name,
        });
      }
    }

    // Synchronous fetch/data loading in component body (outside useEffect)
    if (/fetch\s*\(/.test(comp.code) && !/useEffect|componentDidMount/.test(comp.code)) {
      penaltyRaw += 500;
      details.push({
        metric: 'lcp',
        issue: 'Synchronous fetch call outside useEffect blocks rendering',
        severity: 'critical',
        component: comp.name,
      });
    }

    // Missing fetchpriority on hero images
    const imgTags = comp.code.match(/<img[^>]*>/g) || [];
    const hasHeroImg = imgTags.length > 0;
    if (hasHeroImg && !/fetchpriority\s*=\s*["']high["']/i.test(comp.code)) {
      penaltyRaw += 200;
      details.push({
        metric: 'lcp',
        issue: 'Missing fetchpriority="high" on hero/above-the-fold image',
        severity: 'warning',
        component: comp.name,
      });
    }

    // Large inline styles or CSS-in-JS
    const inlineStyleCount = (comp.code.match(/style=\{\{/g) || []).length;
    if (inlineStyleCount > 5) {
      penaltyRaw += inlineStyleCount * 20;
      details.push({
        metric: 'lcp',
        issue: `${inlineStyleCount} inline style objects trigger frequent re-renders`,
        severity: 'warning',
        component: comp.name,
      });
    }

    // No dynamic import for heavy deps (opportunity for code splitting)
    const hasHeavyDep = comp.dependencies.some(d => HEAVY_DEPS[getBaseDep(d)]);
    const hasDynamicImport = /import\s*\(|React\.lazy|lazy\s*\(/.test(comp.code);
    if (hasHeavyDep && !hasDynamicImport && comp.dependencies.length > 2) {
      details.push({
        metric: 'lcp',
        issue: 'Heavy dependencies without lazy/dynamic import increase initial load',
        severity: 'info',
        component: comp.name,
      });
    }
  }

  // Sigmoid saturation: max additional penalty ~4000ms
  const saturatedPenalty = sigmoid(penaltyRaw, 4000, 2000);
  const lcpMs = baselineMs + saturatedPenalty;

  return { value: lcpMs / 1000, details };
}

// --- INP Estimation (replaces FID, March 2024+) ---

function estimateINP(
  components: ComponentInput[]
): { value: number; details: WebVitalsDetail[] } {
  const baselineMs = 40;
  let penaltyRaw = 0;
  const details: WebVitalsDetail[] = [];

  for (const comp of components) {
    // Nested iterations (O(n^2) or worse)
    const nestedMaps = (comp.code.match(/\.map\([^)]*\.map\(/g) || []).length;
    if (nestedMaps > 0) {
      penaltyRaw += nestedMaps * 30;
      details.push({
        metric: 'inp',
        issue: `Nested .map() chains (${nestedMaps}x) may block main thread`,
        severity: 'warning',
        component: comp.name,
      });
    }

    // Heavy computation in render path (regex, JSON.parse, sort on large arrays)
    const heavyOps = (comp.code.match(/JSON\.parse|\.sort\(|new RegExp|\.reduce\(/g) || []).length;
    if (heavyOps > 2) {
      penaltyRaw += heavyOps * 20;
      details.push({
        metric: 'inp',
        issue: `${heavyOps} heavy operations in render path may delay interaction response`,
        severity: 'warning',
        component: comp.name,
      });
    }

    // Synchronous event handlers with await
    if (/on\w+=\{[^}]*await\s/s.test(comp.code)) {
      penaltyRaw += 60;
      details.push({
        metric: 'inp',
        issue: 'Async operations directly in event handler props block interaction',
        severity: 'critical',
        component: comp.name,
      });
    }

    // Sequential awaits that should be parallelized (async waterfall)
    const sequentialAwaits = (comp.code.match(/await\s+\w+[^;]*;\s*\n\s*(?:const|let|var)\s+\w+\s*=\s*await/g) || []).length;
    if (sequentialAwaits > 0) {
      penaltyRaw += sequentialAwaits * 40;
      details.push({
        metric: 'inp',
        issue: `${sequentialAwaits} sequential await(s) could be parallelized with Promise.all`,
        severity: 'warning',
        component: comp.name,
      });
    }

    // Missing useTransition for expensive state updates
    const setStateCalls = (comp.code.match(/set\w+\(/g) || []).length;
    const hasUseTransition = /useTransition/.test(comp.code);
    if (setStateCalls > 5 && !hasUseTransition) {
      penaltyRaw += 30;
      details.push({
        metric: 'inp',
        issue: `${setStateCalls} state updates without useTransition may cause jank`,
        severity: 'info',
        component: comp.name,
      });
    }

    // Expensive computation in render without useMemo
    const hasExpensiveInRender = (/\.filter\(|\.map\(|\.sort\(|\.reduce\(/.test(comp.code) && /useMemo/.test(comp.code) === false);
    if (hasExpensiveInRender && (comp.code.match(/\.(filter|map|sort|reduce)\(/g) || []).length >= 2) {
      penaltyRaw += 25;
      details.push({
        metric: 'inp',
        issue: 'Array operations in render path without useMemo may block interaction',
        severity: 'warning',
        component: comp.name,
      });
    }

    // Inline object/array in JSX (new ref every render)
    const inlineObjInJsx = (comp.code.match(/=\{\{\s*[^}]+\}\}|=\{\s*\[/g) || []).length;
    if (inlineObjInJsx > 4) {
      penaltyRaw += 15;
      details.push({
        metric: 'inp',
        issue: `${inlineObjInJsx} inline object/array in JSX cause unnecessary re-renders`,
        severity: 'info',
        component: comp.name,
      });
    }

    // Large state objects that trigger full re-renders
    const useStateCount = (comp.code.match(/useState/g) || []).length;
    if (useStateCount > 8) {
      penaltyRaw += (useStateCount - 8) * 12;
      details.push({
        metric: 'inp',
        issue: `${useStateCount} useState hooks suggest oversized component state`,
        severity: 'info',
        component: comp.name,
      });
    }
  }

  // Sigmoid saturation: max additional penalty ~350ms
  const saturatedPenalty = sigmoid(penaltyRaw, 350, 175);
  const inpMs = baselineMs + saturatedPenalty;

  return { value: Math.round(inpMs), details };
}

// --- CLS Estimation (sigmoid saturation) ---

function estimateCLS(
  components: ComponentInput[]
): { value: number; details: WebVitalsDetail[] } {
  const baseline = 0.02;
  let penaltyRaw = 0;
  const details: WebVitalsDetail[] = [];

  for (const comp of components) {
    // Dynamic HTML insertion
    if (/dangerouslySetInnerHTML|innerHTML/.test(comp.code)) {
      penaltyRaw += 50;
      details.push({
        metric: 'cls',
        issue: 'dangerouslySetInnerHTML/innerHTML causes unpredictable layout shifts',
        severity: 'critical',
        component: comp.name,
      });
    }

    // Images without explicit dimensions
    const imgTags = comp.code.match(/<img[^>]*>/g) || [];
    for (const img of imgTags) {
      if (!/width/.test(img) || !/height/.test(img)) {
        penaltyRaw += 30;
        details.push({
          metric: 'cls',
          issue: '<img> without explicit width/height causes layout shift on load',
          severity: 'warning',
          component: comp.name,
        });
      }
    }

    // Dynamic content insertion (conditional rendering without reserved space)
    const conditionalRenders = (comp.code.match(/\{[^}]*&&\s*</g) || []).length;
    if (conditionalRenders > 3) {
      penaltyRaw += conditionalRenders * 8;
      details.push({
        metric: 'cls',
        issue: `${conditionalRenders} conditional renders may cause layout shifts`,
        severity: 'info',
        component: comp.name,
      });
    }

    // Font loading without display:swap
    if (/@import\s+url|@font-face/.test(comp.code) && !/font-display:\s*swap/.test(comp.code)) {
      penaltyRaw += 40;
      details.push({
        metric: 'cls',
        issue: 'Font loading without font-display:swap causes text shift',
        severity: 'warning',
        component: comp.name,
      });
    }
  }

  // Sigmoid saturation: max additional CLS ~0.35
  const saturatedPenalty = sigmoid(penaltyRaw, 350, 175) / 1000;
  const cls = baseline + saturatedPenalty;

  return { value: Math.round(cls * 1000) / 1000, details };
}

// --- Public API ---

export function analyzeWebVitals(components: ComponentInput[]): WebVitalsMetrics {
  const lcp = estimateLCP(components);
  const inp = estimateINP(components);
  const cls = estimateCLS(components);

  const lcpPass = lcp.value < CWV_THRESHOLDS.lcp;
  const inpPass = inp.value < CWV_THRESHOLDS.inp;
  const clsPass = cls.value < CWV_THRESHOLDS.cls;

  return {
    lcp: Math.round(lcp.value * 100) / 100,
    inp: Math.round(inp.value),
    cls: cls.value,
    lcpPass,
    inpPass,
    clsPass,
    allPass: lcpPass && inpPass && clsPass,
    details: [...lcp.details, ...inp.details, ...cls.details],
  };
}

export function analyzeBundleMetrics(input: OptimizationInput): BundleMetrics {
  let totalSizeKb = 0;
  const allDeps = new Set<string>();
  const countedDeps = new Set<string>();
  let lazyCount = 0;
  const treeShakeable: string[] = [];
  const barrelImports: string[] = [];
  const duplicatedDeps: string[] = [];

  // First pass: collect all deps to detect duplicates
  const depComponentMap = new Map<string, string[]>();
  for (const comp of input.components) {
    for (const dep of comp.dependencies) {
      const baseDep = getBaseDep(dep);
      const existing = depComponentMap.get(baseDep) || [];
      depComponentMap.set(baseDep, [...existing, comp.name]);
    }
  }

  // Find duplicated deps (counted in multiple components)
  for (const [dep, comps] of depComponentMap.entries()) {
    if (comps.length > 1) {
      duplicatedDeps.push(`${dep} (${comps.join(', ')})`);
    }
  }

  for (const comp of input.components) {
    // Estimate code size
    totalSizeKb += comp.code.length / 1024 * 0.8;

    for (const dep of comp.dependencies) {
      const baseDep = getBaseDep(dep);
      allDeps.add(baseDep);

      // Deduplicate: only count each dep once in bundle size
      if (!countedDeps.has(baseDep)) {
        countedDeps.add(baseDep);
        const heavySize = HEAVY_DEPS[baseDep];
        const lightSize = LIGHT_DEPS[baseDep];
        if (heavySize) {
          totalSizeKb += heavySize;
        } else if (lightSize) {
          totalSizeKb += lightSize;
        } else {
          totalSizeKb += 15;
        }
      }
    }

    // Detect lazy loading
    if (/React\.lazy|lazy\(/.test(comp.code)) {
      lazyCount++;
    }

    // Detect wildcard imports (tree-shakeable)
    if (/import\s+\*\s+as/.test(comp.code)) {
      treeShakeable.push(comp.name);
    }

    // Detect barrel file imports (index re-exports that pull entire module)
    const barrelMatches = comp.code.match(/from\s+['"][^'"]*\/index['"]/g) || [];
    if (barrelMatches.length > 0) {
      barrelImports.push(`${comp.name}: ${barrelMatches.length} barrel import(s)`);
    }

    // Also detect imports from package root that are known barrel patterns
    const rootImports = comp.code.match(/from\s+['"](@[^/'"]+\/[^/'"]+|[^./'"@][^/'"]*)['"]/g) || [];
    for (const ri of rootImports) {
      // Filter out type-only imports
      const lineIdx = comp.code.indexOf(ri);
      if (lineIdx > 0) {
        const lineStart = comp.code.lastIndexOf('\n', lineIdx) + 1;
        const line = comp.code.slice(lineStart, lineIdx + ri.length);
        if (/import\s+type\b/.test(line)) continue;
      }
      const pkg = ri.match(/from\s+['"]([^'"]+)['"]/)?.[1];
      if (pkg && HEAVY_DEPS[getBaseDep(pkg)]) {
        // Heavy package imported from root - likely barrel
        if (!barrelImports.some(b => b.includes(pkg))) {
          barrelImports.push(`${comp.name}: root import from "${pkg}" (potential barrel)`);
        }
      }
    }
  }

  // Count folder structure files as chunks
  const chunksCount = countFiles(input.folderStructure);

  // Gzip estimate (~35% of minified size for JS)
  const gzipSizeKb = Math.round(totalSizeKb * 0.35);

  return {
    originalSizeKb: Math.round(totalSizeKb),
    optimizedSizeKb: Math.round(totalSizeKb),
    gzipSizeKb,
    reductionPercent: 0,
    chunksCount,
    lazyLoadedCount: lazyCount,
    treeShaken: treeShakeable,
    barrelImports,
    duplicatedDeps,
  };
}

function countFiles(node: Record<string, unknown>): number {
  let count = 0;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'object' && value !== null) {
      count += countFiles(value as Record<string, unknown>);
    }
  }
  return count;
}

export function analyzeTypeScript(components: ComponentInput[]): TypeScriptMetrics {
  let anyCount = 0;
  let interfaceCount = 0;
  let typeCount = 0;
  const issues: string[] = [];
  let strictCompliant = true;

  for (const comp of components) {
    // Count `any` usage
    const anyMatches = comp.code.match(/:\s*any\b/g) || [];
    anyCount += anyMatches.length;
    if (anyMatches.length > 0) {
      strictCompliant = false;
      issues.push(`${comp.name}: ${anyMatches.length} "any" type usage(s)`);
    }

    // Count interfaces and types
    interfaceCount += (comp.code.match(/\binterface\s+\w+/g) || []).length;
    typeCount += (comp.code.match(/\btype\s+\w+\s*=/g) || []).length;

    // Check for missing return types on functions
    const untyped = (comp.code.match(/(?:function|const)\s+\w+\s*=?\s*\([^)]*\)\s*(?:=>)?\s*\{/g) || []).length;
    const typed = (comp.code.match(/(?:function|const)\s+\w+\s*=?\s*\([^)]*\)\s*:\s*\w+/g) || []).length;
    if (untyped > typed + 1) {
      issues.push(`${comp.name}: ${untyped - typed} functions missing return type annotations`);
    }

    // Check for non-null assertions (risky in strict mode)
    const nonNullAssertions = (comp.code.match(/!\./g) || []).length;
    if (nonNullAssertions > 2) {
      issues.push(`${comp.name}: ${nonNullAssertions} non-null assertion(s) (!) - prefer optional chaining`);
    }
  }

  return {
    strictModeCompliant: strictCompliant,
    interfacesCount: interfaceCount,
    typesCount: typeCount,
    anyUsageCount: anyCount,
    issues,
  };
}

// --- Diff Utility ---

export function computeDiff(original: string, optimized: string): { lines: Array<{ lineNumber: number; type: 'added' | 'removed' | 'unchanged'; content: string }>; stats: { added: number; removed: number; unchanged: number } } {
  const origLines = original.split('\n');
  const optLines = optimized.split('\n');
  const maxLen = Math.max(origLines.length, optLines.length);
  const lines: Array<{ lineNumber: number; type: 'added' | 'removed' | 'unchanged'; content: string }> = [];
  let added = 0, removed = 0, unchanged = 0;

  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const opt = optLines[i];

    if (orig === undefined && opt !== undefined) {
      lines.push({ lineNumber: i + 1, type: 'added', content: opt });
      added++;
    } else if (orig !== undefined && opt === undefined) {
      lines.push({ lineNumber: i + 1, type: 'removed', content: orig });
      removed++;
    } else if (orig === opt) {
      lines.push({ lineNumber: i + 1, type: 'unchanged', content: orig! });
      unchanged++;
    } else {
      lines.push({ lineNumber: i + 1, type: 'removed', content: orig! });
      lines.push({ lineNumber: i + 1, type: 'added', content: opt! });
      added++;
      removed++;
    }
  }

  return { lines, stats: { added, removed, unchanged } };
}

/* ================================================================== */
/*  Backend Code Analysis — Heuristic                                 */
/* ================================================================== */

export function analyzeBackendCode(code: string, lang: BackendLang): BackendMetrics {
  // const lc = code.toLowerCase(); // reserved for future heuristics
  let ttfbMs = 100; // base TTFB
  const memoryPatterns: string[] = [];
  const dbQueryIssues: string[] = [];
  const apiPatterns: string[] = [];

  // --- TTFB estimation ---
  // Synchronous DB calls
  if (/\.query\s*\(/.test(code) && /(for\s*\(|while\s*\(|\.forEach|\.map\s*\()/.test(code)) {
    ttfbMs += 300;
    dbQueryIssues.push('N+1 query pattern: DB query inside a loop');
  }
  if (/readFileSync|readSync|read_file\b/.test(code)) {
    ttfbMs += 100;
    memoryPatterns.push('Synchronous file I/O detected');
  }
  if (/SELECT\s+\*/i.test(code)) {
    ttfbMs += 50;
    dbQueryIssues.push('SELECT * usage — fetch only needed columns');
  }
  if (!/(pool|Pool|connection_pool|ConnectionPool|HikariCP|create_pool)/i.test(code) && /connect|createConnection|getConnection/i.test(code)) {
    ttfbMs += 150;
    dbQueryIssues.push('Missing connection pooling');
  }
  if (/(OFFSET\s+\d+|LIMIT\s+\d+)/i.test(code) === false && /SELECT/i.test(code) && /WHERE/i.test(code)) {
    dbQueryIssues.push('Missing pagination — large result sets possible');
  }

  // --- Memory patterns ---
  if (lang === 'node' || lang === 'python' || lang === 'java') {
    if (/global\s|window\.|static\s+.*(?:List|Array|Map|Set|dict)/.test(code)) {
      memoryPatterns.push('Global/static mutable collection — potential memory leak');
    }
  }
  if (lang === 'node') {
    if (/addEventListener|\.on\(/.test(code) && !/removeEventListener|\.off\(|\.removeListener/.test(code)) {
      memoryPatterns.push('Event listener without cleanup — potential leak');
    }
    if (/createReadStream|createWriteStream/.test(code) && !/\.destroy\(|\.close\(|pipeline/.test(code)) {
      memoryPatterns.push('Stream without proper cleanup');
    }
  }
  if (lang === 'python') {
    if (/\[.*for\s+.*in\s+.*\]/.test(code) && code.length > 500) {
      memoryPatterns.push('Large list comprehension — consider generator');
    }
    if (/open\s*\(/.test(code) && !/with\s+open/.test(code)) {
      memoryPatterns.push('File open without context manager (with statement)');
    }
  }
  if (lang === 'go') {
    if (/go\s+func/.test(code) && !/context\.Context|ctx\.Done|select\s*\{/.test(code)) {
      memoryPatterns.push('Goroutine without context/cancellation — potential goroutine leak');
    }
    if (!/defer\s/.test(code) && /(\.Close\(|\.Release\()/.test(code)) {
      memoryPatterns.push('Resource close without defer');
    }
  }
  if (lang === 'rust') {
    const cloneCount = (code.match(/\.clone\(\)/g) ?? []).length;
    if (cloneCount > 3) {
      memoryPatterns.push(`Excessive .clone() usage (${cloneCount} instances) — prefer borrowing`);
    }
  }
  if (lang === 'java' || lang === 'kotlin') {
    if (/(InputStream|OutputStream|Reader|Writer|Connection|Statement)\s+\w+\s*=/.test(code) && !/try\s*\(/.test(code)) {
      memoryPatterns.push('Unclosed resource — use try-with-resources');
    }
  }
  if (lang === 'c' || lang === 'cpp') {
    const mallocCount = (code.match(/malloc\s*\(|calloc\s*\(|realloc\s*\(/g) ?? []).length;
    const freeCount = (code.match(/free\s*\(/g) ?? []).length;
    if (mallocCount > freeCount) {
      memoryPatterns.push(`Potential memory leak: ${mallocCount} allocation(s) vs ${freeCount} free(s)`);
    }
    if (lang === 'cpp') {
      const newCount = (code.match(/\bnew\s+/g) ?? []).length;
      const smartPtrCount = (code.match(/unique_ptr|shared_ptr|make_unique|make_shared/g) ?? []).length;
      if (newCount > 0 && smartPtrCount === 0) {
        memoryPatterns.push('Raw new without smart pointers — prefer unique_ptr/shared_ptr');
      }
    }
    if (/gets\s*\(|sprintf\s*\(|strcpy\s*\(/.test(code)) {
      memoryPatterns.push('Unsafe C function (gets/sprintf/strcpy) — use bounded alternatives');
    }
  }
  if (lang === 'assembly') {
    if (/push\s+/g.test(code) && !/pop\s+/g.test(code)) {
      memoryPatterns.push('Stack imbalance: push without corresponding pop');
    }
    if (!/align\s+\d+/i.test(code) && /section\s+\.data/i.test(code)) {
      memoryPatterns.push('Missing data alignment — align to cache line boundaries');
    }
  }
  if (lang === 'swift') {
    if (/\{\s*\[?\s*self[.\s]/.test(code) && !/\[weak\s+self\]|\[unowned\s+self\]/.test(code)) {
      memoryPatterns.push('Closure captures self strongly — potential retain cycle');
    }
  }
  if (lang === 'ruby') {
    if (!/frozen_string_literal:\s*true/.test(code)) {
      memoryPatterns.push('Missing frozen_string_literal pragma — excess string allocation');
    }
  }
  if (lang === 'elixir') {
    if (/Enum\.(map|filter|reduce)/.test(code) && !/Stream\./.test(code) && code.length > 500) {
      memoryPatterns.push('Eager Enum operations on large data — consider Stream for lazy evaluation');
    }
  }
  if (lang === 'haskell') {
    if (/\bString\b/.test(code) && !/Text/.test(code)) {
      memoryPatterns.push('Using String (linked list) instead of Data.Text — significant memory overhead');
    }
  }
  if (lang === 'lua') {
    const globalAccess = (code.match(/^[a-zA-Z_]\w*\s*=/gm) ?? []).length;
    if (globalAccess > 3 && !/\blocal\b/.test(code)) {
      memoryPatterns.push('Excessive global variable usage — use local for 6x faster access');
    }
  }
  if (lang === 'dart') {
    if (/setState\s*\(/.test(code) && !/const\s+\w+/.test(code)) {
      memoryPatterns.push('Missing const constructors — causes unnecessary widget rebuilds');
    }
  }
  if (lang === 'zig') {
    if (/std\.heap\.page_allocator/.test(code) && !/arena/.test(code)) {
      memoryPatterns.push('Using page allocator — consider arena allocator for hot paths');
    }
  }

  // --- API patterns ---
  if (!/rate.?limit|throttle|RateLimit/i.test(code) && /(router|app)\.(get|post|put|delete)\s*\(/.test(code)) {
    apiPatterns.push('Missing rate limiting on API endpoints');
  }
  if (!/cache|Cache|redis|Redis|memcache/i.test(code) && /fetch\s*\(|http\.get|requests\./i.test(code)) {
    apiPatterns.push('No caching for external API calls');
  }
  if (/(await\s+fetch|await\s+http|await\s+requests)/.test(code)) {
    const awaitCount = (code.match(/await\s+(?:fetch|http|requests)/g) ?? []).length;
    if (awaitCount > 2 && !/Promise\.all|asyncio\.gather|WaitGroup/.test(code)) {
      apiPatterns.push(`${awaitCount} sequential external API calls — consider parallel execution`);
      ttfbMs += awaitCount * 100;
    }
  }
  if (!/try|catch|rescue|recover|except/i.test(code) && /(fetch|http|request)/i.test(code)) {
    apiPatterns.push('Missing error handling for external calls');
  }

  // --- Score calculation ---
  const issueCount = memoryPatterns.length + dbQueryIssues.length + apiPatterns.length;
  const ttfbPenalty = Math.min(ttfbMs / 20, 30); // max 30 points penalty from TTFB
  const issuePenalty = Math.min(issueCount * 8, 50); // max 50 points penalty from issues
  const score = Math.max(0, Math.round(100 - ttfbPenalty - issuePenalty));

  return { ttfbMs, memoryPatterns, dbQueryIssues, apiPatterns, score };
}
