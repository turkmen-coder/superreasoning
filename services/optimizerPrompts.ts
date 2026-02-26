// MasterPrompt.Developer - AI Prompt Templates & Tool Schemas

import type { WebVitalsMetrics, BundleMetrics, TypeScriptMetrics, BackendMetrics, FrontendLang, BackendLang } from '../types/optimizer';

type Language = 'tr' | 'en';

function getStackContext(frontend: FrontendLang | undefined, backend: BackendLang | undefined, lang: Language): string {
  if (!frontend && !backend) return '';
  const tr = lang === 'tr';
  const frontendMap: Record<string, string> = { 'react-ts': 'React/TypeScript', 'react-js': 'React/JavaScript', 'vue': 'Vue', 'angular': 'Angular', 'svelte': 'Svelte', 'nextjs': 'Next.js', 'nuxt': 'Nuxt', 'sveltekit': 'SvelteKit', 'html-css-js': 'HTML/CSS/JS' };
  const backendMap: Record<string, string> = {
    'node': 'Node.js', 'python': 'Python', 'go': 'Go', 'java': 'Java',
    'csharp': 'C#/.NET', 'php': 'PHP', 'rust': 'Rust',
    'c': 'C', 'cpp': 'C++', 'assembly': 'Assembly (x86/ARM)',
    'swift': 'Swift', 'kotlin': 'Kotlin', 'ruby': 'Ruby',
    'scala': 'Scala', 'dart': 'Dart/Flutter', 'elixir': 'Elixir/OTP',
    'haskell': 'Haskell', 'lua': 'Lua', 'perl': 'Perl',
    'r': 'R', 'zig': 'Zig', 'deno': 'Deno/TypeScript',
  };
  const f = frontend ? frontendMap[frontend] ?? null : null;
  const b = backend ? backendMap[backend] ?? null : null;
  const parts: string[] = [];
  if (f) parts.push(tr ? `Frontend: ${f}. Bu stack'e uygun sözdizimi ve en iyi uygulamaları kullan.` : `Frontend: ${f}. Use syntax and best practices for this stack.`);
  if (b) parts.push(tr ? `Backend bağlamı: ${b}. API çağrıları, tip uyumu ve backend ile uyumlu pattern'leri dikkate al.` : `Backend context: ${b}. Consider API patterns, type alignment, and backend-compatible practices.`);
  if (parts.length === 0) return '';
  const header = tr ? '\n\nStack / Dil bağlamı:\n' : '\n\nStack / language context:\n';
  return header + parts.join('\n') + '\n';
}

// --- Backend-specific optimization rules ---

export function getBackendOptimizationRules(lang: BackendLang): string {
  const rules: Record<BackendLang, string> = {
    node: `Node.js Optimization Rules:
- Detect event loop blocking (crypto.*, fs.readFileSync, JSON.parse on large data) → move to worker threads or async
- Use connection pooling for DB connections (pg pool, mongoose poolSize)
- Prefer streams for large data processing (fs.createReadStream, pipeline)
- Use cluster mode or PM2 for multi-core utilization
- Avoid global variable accumulation (memory leaks in closures, event listeners without removeListener)
- Use proper error handling with async/await (no unhandled promise rejections)`,

    python: `Python Optimization Rules:
- Use type hints throughout (PEP 484/526)
- Prefer async/await for I/O (asyncio, aiohttp, httpx) over synchronous requests
- Use generators/itertools for large sequences instead of list comprehensions
- Employ context managers (with statement) for file/connection handling
- Profile memory with tracemalloc; avoid large in-memory collections
- Use connection pooling (SQLAlchemy pool, aiohttp connector)
- Prefer dataclasses or Pydantic models over plain dicts`,

    go: `Go Optimization Rules:
- Manage goroutine lifecycle (context cancellation, proper cleanup with defer)
- Use sync.Pool for frequently allocated objects
- Propagate context.Context for cancellation and timeouts
- Use proper error wrapping (fmt.Errorf with %w)
- Prefer buffered channels where appropriate
- Use io.Reader/io.Writer interfaces for streaming
- Profile with pprof; check for goroutine leaks`,

    java: `Java Optimization Rules:
- Use Stream API for collection processing (parallel streams for CPU-bound work)
- Employ connection pooling (HikariCP, c3p0)
- Close resources with try-with-resources (streams, connections, readers)
- Avoid static collections that grow unbounded (memory leaks)
- Use CompletableFuture for async operations
- Prefer StringBuilder for string concatenation in loops
- Consider GC-friendly patterns (object reuse, avoid excessive autoboxing)`,

    csharp: `C#/.NET Optimization Rules:
- Use async/await throughout (avoid .Result or .Wait() blocking calls)
- Employ dependency injection and IDisposable pattern
- Use Span<T>/Memory<T> for high-performance buffer operations
- Connection pooling via HttpClientFactory
- Use ValueTask for hot paths that often complete synchronously
- Prefer records for immutable data; use ref structs for stack allocation`,

    php: `PHP Optimization Rules:
- Use opcache for bytecode caching
- Prefer PDO with prepared statements; use persistent connections
- Use generators (yield) for large dataset iteration
- Avoid loading entire files into memory (use streams/chunks)
- Implement proper caching (Redis/Memcached) for repeated queries
- Use strict_types declaration; type-hint all parameters and returns`,

    rust: `Rust Optimization Rules:
- Minimize unnecessary clone() — prefer borrowing and references
- Use Box/Rc/Arc appropriately (Box for heap allocation, Arc for thread-safe sharing)
- Prefer iterators over manual loops (zero-cost abstraction)
- Use lifetime elision where possible; avoid explicit lifetime annotations when not needed
- Employ tokio/async-std for async I/O; avoid blocking in async contexts
- Use Cow<str> for conditionally owned strings
- Profile with cargo flamegraph; check for allocation hotspots`,

    c: `C Optimization Rules:
- Minimize dynamic allocation (malloc/free); prefer stack allocation where possible
- Use restrict keyword for pointer aliasing hints to help compiler optimization
- Prefer sizeof(*ptr) over sizeof(Type) for maintainability
- Use inline functions instead of macros where type safety matters
- Enable compiler optimizations (-O2/-O3) and use __builtin hints (likely/unlikely)
- Avoid undefined behavior: null pointer deref, signed overflow, buffer overrun
- Use valgrind/AddressSanitizer for memory leak and bounds checking`,

    cpp: `C++ Optimization Rules:
- Use RAII (Resource Acquisition Is Initialization) for all resource management
- Prefer smart pointers (unique_ptr, shared_ptr) over raw pointers
- Use move semantics (std::move) to avoid unnecessary copies
- Prefer constexpr and consteval for compile-time computation
- Use std::string_view instead of const std::string& for read-only string parameters
- Employ STL algorithms (<algorithm>) over hand-written loops
- Use reserve() on vectors when size is known; avoid push_back in tight loops`,

    assembly: `Assembly (x86/ARM) Optimization Rules:
- Minimize memory accesses — keep frequently used values in registers
- Use SIMD instructions (SSE/AVX on x86, NEON on ARM) for data parallelism
- Align data and code to cache line boundaries (64 bytes) for optimal cache usage
- Reduce branch mispredictions: use conditional moves (cmov) where possible
- Unroll tight loops to reduce branch overhead and enable instruction-level parallelism
- Use lea for address computation instead of mul/add combinations
- Avoid pipeline stalls: reorder instructions to prevent data hazards
- Profile with perf/VTune; focus on hot loops and cache misses
- Minimize function call overhead in hot paths — inline critical sections
- Use appropriate calling conventions (System V ABI / Microsoft x64)`,

    swift: `Swift Optimization Rules:
- Use value types (struct) over reference types (class) for performance-critical data
- Employ copy-on-write semantics for large value types
- Use @inlinable and @frozen for library/module boundary optimizations
- Prefer Array over NSArray; use ContiguousArray for non-class element types
- Use lazy properties and lazy sequences for deferred computation
- Avoid retain cycles with [weak self] or [unowned self] in closures
- Use Instruments (Time Profiler, Allocations) for profiling`,

    kotlin: `Kotlin Optimization Rules:
- Use inline functions for lambdas in performance-critical paths (avoids object allocation)
- Prefer sequences over collections for chained operations (lazy evaluation)
- Use value classes (inline classes) for type-safe wrappers without allocation overhead
- Employ coroutines (suspend/launch/async) for concurrent I/O operations
- Use sealed classes for exhaustive when expressions (compiler optimization)
- Avoid unnecessary boxing: use IntArray instead of Array<Int>
- Use buildList/buildMap for efficient collection construction`,

    ruby: `Ruby Optimization Rules:
- Use frozen string literals (# frozen_string_literal: true) to reduce object allocation
- Prefer Symbol over String for hash keys and identifiers
- Use Enumerator::Lazy for chained operations on large collections
- Employ connection pooling for database access (ActiveRecord pool)
- Avoid N+1 queries — use includes/preload/eager_load in ActiveRecord
- Use Ractor for true parallelism (Ruby 3+); Thread for I/O concurrency
- Profile with ruby-prof or stackprof; benchmark with Benchmark.ips`,

    scala: `Scala Optimization Rules:
- Use value classes (extends AnyVal) for zero-allocation type wrappers
- Prefer immutable collections; use mutable collections only in localized scopes
- Use lazy val for expensive computations that may not be needed
- Employ pattern matching with sealed traits for exhaustive, optimized dispatch
- Use Futures/ZIO/Cats Effect for async I/O composition
- Avoid implicit conversions in hot paths — prefer explicit methods
- Use @tailrec annotation for recursive functions to ensure TCO`,

    dart: `Dart/Flutter Optimization Rules:
- Use const constructors for immutable widgets to enable widget caching
- Minimize rebuilds: use const, Keys, and selective setState
- Prefer ListView.builder over ListView for long lists (lazy rendering)
- Use isolates for CPU-intensive computations (avoid blocking UI thread)
- Employ code splitting with deferred loading (deferred as)
- Profile with Flutter DevTools (widget rebuild tracker, memory profiler)
- Use final and const wherever possible for compiler optimizations`,

    elixir: `Elixir/OTP Optimization Rules:
- Use GenServer/Agent for stateful processes; avoid shared mutable state
- Employ Task.async_stream for concurrent I/O operations
- Use ETS (Erlang Term Storage) for in-memory key-value caching
- Prefer pattern matching in function heads over conditional logic
- Use Stream module for lazy enumeration of large datasets
- Employ supervision trees for fault-tolerant process management
- Minimize message passing overhead in hot paths; batch messages when possible`,

    haskell: `Haskell Optimization Rules:
- Use strict evaluation (BangPatterns, $!) for data that will always be needed
- Prefer Data.Text over String (linked list) for text processing
- Use Data.Vector instead of lists for random-access and bulk operations
- Employ fusion (stream fusion) via rewrite rules in libraries
- Use STRef/IORef for mutable state in performance-critical local scopes
- Profile with +RTS -p; use cost centre annotations for hotspot detection
- Avoid space leaks: use seq/deepseq strategically`,

    lua: `Lua Optimization Rules:
- Use local variables instead of global (6x faster access)
- Pre-compute table sizes with table.create or initial table constructors
- Avoid table.insert in tight loops — use direct index assignment
- Cache frequently accessed global functions in local variables
- Use string.buffer (LuaJIT) or table.concat for string building
- Minimize garbage collection pressure: reuse tables where possible
- Use LuaJIT FFI for performance-critical native interop`,

    perl: `Perl Optimization Rules:
- Use strict and warnings pragmas for early error detection
- Prefer hash lookups over repeated regex matching for known patterns
- Use Memoize or manual caching for expensive pure functions
- Employ DBI with prepare/execute for parameterized DB queries
- Use Storable or Sereal for fast serialization/deserialization
- Prefer while(<FH>) over slurping for large file processing
- Use Benchmark module to compare implementation alternatives`,

    r: `R Optimization Rules:
- Vectorize operations — avoid explicit for loops; use apply/sapply/vapply
- Pre-allocate vectors/matrices instead of growing them in loops
- Use data.table or dplyr over base R for large data frame operations
- Employ Rcpp for C++ integration in performance-critical sections
- Use parallel package (mclapply/parLapply) for CPU-bound parallel tasks
- Prefer readr/vroom over read.csv for fast file I/O
- Profile with profvis; use microbenchmark for timing comparisons`,

    zig: `Zig Optimization Rules:
- Use comptime for compile-time computation and type-level programming
- Prefer slices over pointers for bounds-safe array access
- Use errdefer for clean resource management on error paths
- Employ SIMD builtins (@Vector) for data-parallel operations
- Use allocators explicitly — choose arena/page allocators for hot paths
- Avoid unnecessary allocations: prefer stack allocation and comptime buffers
- Profile with Tracy or perf; use @setRuntimeSafety(false) only after profiling`,

    deno: `Deno/TypeScript Backend Optimization Rules:
- Use Web Streams API for large data processing (ReadableStream/WritableStream)
- Employ Web Workers for CPU-intensive tasks (avoid blocking event loop)
- Use Deno.serve() for high-performance HTTP servers
- Prefer URL imports with lock file for dependency management
- Use TypeScript strict mode and explicit return types throughout
- Employ connection pooling for database access (deno-postgres pool)
- Cache expensive computations with Map/WeakMap; use Deno KV for persistence`,
  };
  return rules[lang] ?? '';
}

// --- Meta-framework-specific rules ---

function getMetaFrameworkRules(frontend: FrontendLang): string {
  const rules: Partial<Record<FrontendLang, string>> = {
    nextjs: `Next.js Rules:
- Choose SSR/SSG/ISR appropriately (getStaticProps for static, getServerSideProps for dynamic)
- Use next/image for automatic image optimization with width/height
- Leverage API routes for BFF pattern; use middleware for auth/redirects
- Dynamic imports with next/dynamic for code splitting
- Use App Router (app/) with Server Components where possible`,

    nuxt: `Nuxt Rules:
- Use auto-imports (composables, components) — avoid manual import statements
- useFetch/useAsyncData for data fetching with SSR hydration
- Server routes (server/api/) for backend logic
- Use definePageMeta for route-level configuration
- Prefer Nuxt modules over custom plugins`,

    sveltekit: `SvelteKit Rules:
- Use load functions (+page.server.ts) for server-side data fetching
- Form actions for mutations instead of API calls
- Leverage streaming with +page.ts for non-critical data
- Use $app/stores for page, navigating, updated stores
- Prerender static pages with export const prerender = true`,
  };
  return rules[frontend] ?? '';
}

export function getOptimizerSystemInstruction(lang: Language, frontendLang?: FrontendLang, backendLang?: BackendLang): string {
  const stackBlock = getStackContext(frontendLang, backendLang, lang);
  const backendRules = backendLang ? getBackendOptimizationRules(backendLang) : '';
  const metaRules = frontendLang ? getMetaFrameworkRules(frontendLang) : '';
  const extraRules = [backendRules, metaRules].filter(Boolean).join('\n\n');
  const extraBlock = extraRules ? `\n\n${extraRules}` : '';

  if (lang === 'tr') {
    return `[SYSTEM -- MasterPrompt.Developer Optimizer v3.0]

Rol: Bileşen kodunu üretim için optimize et. Her değişiklikte tek net iyileştirme yap; işlevselliği bozma.${stackBlock}${extraBlock}

Optimizasyon Öncelikleri:
1) Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
2) Paket Boyutu: Tree-shaking, lazy loading, kod bölme, barrel import eliminasyonu
3) TypeScript: Katı mod uyumluluğu, doğru tiplendirme
4) Temiz Mimari: Modüler, bağımsız, test edilebilir, async waterfall önleme

Kurallar:
- Çıktı geçerli, çalıştırılabilir TypeScript/JSX olmalı
- import * as MUI yerine named import kullan; React.lazy + Suspense kullan
- useMemo/useCallback ile gereksiz render önle; görsellerde width, height, fetchpriority
- any kullanma; Props için interface ekle; ağır işleri useEffect'te yap
- changes içinde her öğe için "impact" ver (critical|high|medium|low)
- SADECE JSON çıktı ver, açıklama ekleme

Çıktı Formatı (SADECE bu JSON):
{
  "components": [
    {
      "name": "string",
      "dependencies": ["string"],
      "code": "string",
      "optimizations": ["string"]
    }
  ],
  "folderStructure": { ... },
  "changes": [
    {
      "type": "lazy-loading|tree-shaking|code-splitting|import-optimization|typescript-strict|clean-architecture|cwv-optimization|backend-optimization|db-query-optimization|memory-optimization|api-optimization",
      "description": "string",
      "descriptionTr": "string",
      "file": "string",
      "before": "string",
      "after": "string",
      "impact": "critical" | "high" | "medium" | "low"
    }
  ]
}`;
  }

  return `[SYSTEM -- MasterPrompt.Developer Optimizer v3.0]

Role: Optimize component code for production readiness. Apply ONE clear improvement per change; avoid breaking functionality.${stackBlock}${extraBlock}

Optimization Priorities (in order):
1) Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
2) Bundle Size: Tree-shaking, lazy loading, code splitting, barrel import elimination
3) TypeScript: Strict mode compliance, proper typing, no \`any\`
4) Clean Architecture: Modular, independent, no async waterfalls

Concrete Rules:
- Output MUST be valid, runnable TypeScript/JSX.
- Replace \`import * as MUI from '@mui/material'\` with named imports: \`import { Box, Typography } from '@mui/material'\`.
- For route-level or heavy components use \`React.lazy(() => import('./Component'))\` and wrap with \`<Suspense fallback={...}>\`.
- Use \`useMemo\` for derived data from props/state; \`useCallback\` for handlers passed to children or used in effects.
- Images: add \`width\`, \`height\`, and \`fetchpriority="high"\` for above-the-fold; use \`loading="lazy"\` for below-fold.
- Avoid \`any\`; use \`unknown\` or proper interfaces. Add \`interface Props { ... }\` for component props.
- No synchronous \`fetch\` or heavy work in render; move to \`useEffect\` or data loaders.
- For each change in \`changes\`, set \`impact\` to one of: "critical" | "high" | "medium" | "low".

Output Format (JSON ONLY, no markdown or commentary):
{
  "components": [
    {
      "name": "string",
      "dependencies": ["string"],
      "code": "string",
      "optimizations": ["string"]
    }
  ],
  "folderStructure": { ... },
  "changes": [
    {
      "type": "lazy-loading|tree-shaking|code-splitting|import-optimization|typescript-strict|clean-architecture|cwv-optimization|backend-optimization|db-query-optimization|memory-optimization|api-optimization",
      "description": "string",
      "descriptionTr": "string",
      "file": "string",
      "before": "string",
      "after": "string",
      "impact": "critical" | "high" | "medium" | "low"
    }
  ]
}`;
}

export function getRoundRefinementPrompt(
  round: number,
  metrics: WebVitalsMetrics,
  bundle: BundleMetrics,
  typescript: TypeScriptMetrics,
  lang: Language,
  backendMetrics?: BackendMetrics,
): string {
  const gaps: string[] = [];
  const hints: string[] = [];

  if (!metrics.lcpPass) {
    gaps.push(`LCP: ${metrics.lcp}s (target: <2.5s)`);
    hints.push('Replace wildcard imports with named imports; add fetchpriority="high" for hero images; move data fetch to useEffect.');
  }
  if (!metrics.inpPass) {
    gaps.push(`INP: ${metrics.inp}ms (target: <200ms)`);
    hints.push('Wrap expensive computations in useMemo; event handlers in useCallback; avoid heavy work in render.');
  }
  if (!metrics.clsPass) {
    gaps.push(`CLS: ${metrics.cls} (target: <0.1)`);
    hints.push('Add width/height to images; reserve space for conditional content; avoid dangerouslySetInnerHTML without dimensions.');
  }
  if (bundle.reductionPercent < 20 && bundle.treeShaken.length > 0) {
    gaps.push(`Bundle: ${bundle.reductionPercent}% reduction, ${bundle.treeShaken.length} component(s) with tree-shakeable imports`);
    hints.push('Replace import * with named imports; use React.lazy for heavy or route-level components.');
  }
  if (!typescript.strictModeCompliant) {
    gaps.push(`TypeScript: ${typescript.anyUsageCount} "any" usages, ${typescript.issues.length} issue(s)`);
    hints.push('Replace any with proper types or unknown; add Props interface for components.');
  }
  // Backend metric gaps
  if (backendMetrics) {
    if (backendMetrics.ttfbMs > 500) {
      gaps.push(`TTFB: ${backendMetrics.ttfbMs}ms (target: <500ms)`);
      hints.push('Add connection pooling; move sync I/O to async; add caching for repeated queries.');
    }
    if (backendMetrics.memoryPatterns.length > 0) {
      gaps.push(`Memory: ${backendMetrics.memoryPatterns.length} pattern(s) detected`);
      hints.push(`Fix memory issues: ${backendMetrics.memoryPatterns.slice(0, 2).join('; ')}`);
    }
    if (backendMetrics.dbQueryIssues.length > 0) {
      gaps.push(`DB Queries: ${backendMetrics.dbQueryIssues.length} issue(s)`);
      hints.push(`Fix DB issues: ${backendMetrics.dbQueryIssues.slice(0, 2).join('; ')}`);
    }
    if (backendMetrics.apiPatterns.length > 0) {
      gaps.push(`API: ${backendMetrics.apiPatterns.length} anti-pattern(s)`);
      hints.push(`Fix API patterns: ${backendMetrics.apiPatterns.slice(0, 2).join('; ')}`);
    }
  }

  const gapText = gaps.length > 0 ? gaps.join('\n- ') : 'All thresholds met - focus on further optimization';
  const hintText = hints.length > 0 ? '\nSuggested fixes: ' + hints.join(' ') : '';

  if (lang === 'tr') {
    return `[TUR ${round} -- İyileştirme]

Önceki tur metrikleri hala eşik altında. Kapatılacak boşluklar:
- ${gapText}
${hintText}

Önceki turdaki kodu bu yönde iyileştir. Her değişiklik için "before", "after" ve "impact" ver. SADECE JSON çıktı ver.`;
  }

  return `[ROUND ${round} -- Refinement]

Previous round metrics still below thresholds. Close these gaps:
- ${gapText}
${hintText}

Further optimize the code from the previous round. For each change provide "before", "after", and "impact". Output JSON ONLY.`;
}

// --- Function Calling / Tool Schemas ---

export const OPTIMIZER_FUNCTION_DEFS = [
  {
    name: 'optimize_component',
    description: 'Optimize a React component for performance and TypeScript compliance',
    parameters: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Optimized component name' },
        optimizedCode: { type: 'string' as const, description: 'Full optimized TypeScript code' },
        optimizations: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'List of applied optimizations',
        },
        dependencies: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'Optimized dependency list',
        },
      },
      required: ['name', 'optimizedCode', 'optimizations', 'dependencies'],
    },
  },
  {
    name: 'update_folder_structure',
    description: 'Update folder structure with optimized file layout including vendor chunks',
    parameters: {
      type: 'object' as const,
      properties: {
        structure: {
          type: 'object' as const,
          description: 'New folder structure object',
        },
      },
      required: ['structure'],
    },
  },
];

// Gemini tool format
export const GEMINI_OPTIMIZER_TOOLS = [
  {
    functionDeclarations: OPTIMIZER_FUNCTION_DEFS,
  },
];

// --- Sample Input ---

export const SAMPLE_INPUT = {
  components: [
    {
      name: 'Header',
      dependencies: ['@mui/material', 'react-router-dom'],
      code: `import * as MUI from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  return (
    <MUI.AppBar position="static">
      <MUI.Toolbar>
        <MUI.Typography variant="h6" style={{ flexGrow: 1 }}>
          My App
        </MUI.Typography>
        <MUI.Button color="inherit" onClick={() => navigate('/about')}>
          About
        </MUI.Button>
        <MUI.Button color="inherit" onClick={() => navigate('/contact')}>
          Contact
        </MUI.Button>
      </MUI.Toolbar>
    </MUI.AppBar>
  );
}`,
    },
    {
      name: 'Footer',
      dependencies: ['@mui/material'],
      code: `import * as MUI from '@mui/material';

export default function Footer() {
  return (
    <MUI.Box component="footer" style={{ padding: '20px', textAlign: 'center' }}>
      <MUI.Typography variant="body2">
        \u00A9 2024 My App. All rights reserved.
      </MUI.Typography>
    </MUI.Box>
  );
}`,
    },
  ],
  folderStructure: {
    src: {
      components: ['Header.tsx', 'Footer.tsx'],
      pages: ['Home.tsx', 'About.tsx', 'Contact.tsx'],
    },
  },
};
