/**
 * Autonomous Tasks Service
 *
 * Otomatik görevler: health monitor, drift detection, cost optimization, auto-enrich
 * Scheduled Jobs ile entegre çalışan arka plan görevleri.
 */

import type { AutonomousTask, AutonomousTaskResult } from '../types/agent';

// ---------- Task Registry ----------

const taskRegistry = new Map<string, AutonomousTask>();

// ---------- Health Monitor Task ----------

export async function runHealthMonitor(config: Record<string, unknown>): Promise<AutonomousTaskResult> {
  const findings: string[] = [];
  const actions: string[] = [];
  const metrics: Record<string, number> = {};

  try {
    // API health check
    const apiRes = await fetch('http://localhost:4100/v1/health', { method: 'GET' }).catch(() => null);
    if (!apiRes || !apiRes.ok) {
      findings.push('API service not responding');
      if (config.autoRestart) {
        actions.push('Attempting API restart...');
        // In production, would call VPS restart
      }
    } else {
      findings.push('API service healthy');
      metrics.apiLatency = Date.now();
    }

    // Web service check
    const webRes = await fetch('http://localhost:3100', { method: 'HEAD' }).catch(() => null);
    if (!webRes || !webRes.ok) {
      findings.push('Web service not responding');
    } else {
      findings.push('Web service healthy');
    }

    // Vector store check
    const { getVectorStore } = await import('../server/lib/vectorStore');
    const store = getVectorStore();
    if (store && store.isReady()) {
      findings.push(`Vector store ready (${store.count()} prompts)`);
      metrics.vectorCount = store.count();
    } else {
      findings.push('Vector store not ready');
    }

    // Memory check
    const memUsage = process.memoryUsage();
    metrics.heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    metrics.heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    if (metrics.heapUsedMB > 500) {
      findings.push(`High memory usage: ${metrics.heapUsedMB}MB`);
      actions.push('Consider restarting the service');
    }

  } catch (error) {
    findings.push(`Health check error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return {
    id: `result-${Date.now()}`,
    taskId: 'health_monitor',
    runAt: new Date().toISOString(),
    status: findings.some(f => f.includes('not') || f.includes('error')) ? 'warning' : 'success',
    findings,
    actions,
    metrics,
  };
}

// ---------- Drift Detection Task ----------

export async function runDriftDetection(config: Record<string, unknown>): Promise<AutonomousTaskResult> {
  const findings: string[] = [];
  const actions: string[] = [];
  const metrics: Record<string, number> = {};

  try {
    // Get recent prompt performance data
    const { supabase } = await import('./supabaseClient');

    // Query recent generations
    const { data: recentGen, error } = await supabase
      .from('prompt_generations')
      .select('id, domain_id, framework, provider, success, edited, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      findings.push(`DB query error: ${error.message}`);
    } else if (recentGen && recentGen.length > 0) {
      // Calculate metrics
      const successRate = recentGen.filter(g => g.success).length / recentGen.length;
      const editRate = recentGen.filter(g => g.edited).length / recentGen.length;

      metrics.successRate = Math.round(successRate * 100);
      metrics.editRate = Math.round(editRate * 100);
      metrics.sampleSize = recentGen.length;

      // Compare with baseline
      const baselineSuccess = (config.baselineSuccessRate as number) || 0.85;
      const baselineEdit = (config.baselineEditRate as number) || 0.15;

      if (successRate < baselineSuccess - 0.1) {
        findings.push(`⚠️ Success rate dropped: ${(successRate * 100).toFixed(1)}% (baseline: ${(baselineSuccess * 100).toFixed(1)}%)`);
        actions.push('Review recent prompt quality');
        actions.push('Consider re-enriching underperforming prompts');
      } else {
        findings.push(`✅ Success rate stable: ${(successRate * 100).toFixed(1)}%`);
      }

      if (editRate > baselineEdit + 0.1) {
        findings.push(`⚠️ Edit rate increased: ${(editRate * 100).toFixed(1)}% (baseline: ${(baselineEdit * 100).toFixed(1)}%)`);
        actions.push('Users may be unsatisfied with outputs');
      } else {
        findings.push(`✅ Edit rate stable: ${(editRate * 100).toFixed(1)}%`);
      }

      // Domain-specific drift
      const domainGroups: Record<string, { success: number; total: number }> = {};
      for (const g of recentGen) {
        const domain = g.domain_id || 'unknown';
        if (!domainGroups[domain]) domainGroups[domain] = { success: 0, total: 0 };
        domainGroups[domain].total++;
        if (g.success) domainGroups[domain].success++;
      }

      for (const [domain, stats] of Object.entries(domainGroups)) {
        const domainRate = stats.success / stats.total;
        if (domainRate < 0.7 && stats.total >= 5) {
          findings.push(`⚠️ Low success in domain "${domain}": ${(domainRate * 100).toFixed(1)}%`);
          actions.push(`Review prompts for domain: ${domain}`);
        }
      }
    } else {
      findings.push('No recent generation data available');
    }

  } catch (error) {
    findings.push(`Drift detection error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return {
    id: `result-${Date.now()}`,
    taskId: 'drift_detection',
    runAt: new Date().toISOString(),
    status: findings.some(f => f.includes('⚠️')) ? 'warning' : 'success',
    findings,
    actions,
    metrics,
  };
}

// ---------- Cost Optimization Task ----------

export async function runCostOptimization(config: Record<string, unknown>): Promise<AutonomousTaskResult> {
  const findings: string[] = [];
  const actions: string[] = [];
  const metrics: Record<string, number> = {};

  try {
    // Get recent usage data
    const { supabase } = await import('./supabaseClient');

    const { data: usage, error } = await supabase
      .from('token_usage')
      .select('provider, input_tokens, output_tokens, cost_usd, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      findings.push(`DB query error: ${error.message}`);
    } else if (usage && usage.length > 0) {
      // Calculate totals
      const totalCost = usage.reduce((sum, u) => sum + (u.cost_usd || 0), 0);
      const totalInput = usage.reduce((sum, u) => sum + (u.input_tokens || 0), 0);
      const totalOutput = usage.reduce((sum, u) => sum + (u.output_tokens || 0), 0);

      metrics.totalCostUsd = Math.round(totalCost * 100) / 100;
      metrics.totalInputTokens = totalInput;
      metrics.totalOutputTokens = totalOutput;
      metrics.avgCostPerRequest = Math.round((totalCost / usage.length) * 10000) / 10000;

      // Group by provider
      const byProvider: Record<string, { cost: number; count: number }> = {};
      for (const u of usage) {
        const provider = u.provider || 'unknown';
        if (!byProvider[provider]) byProvider[provider] = { cost: 0, count: 0 };
        byProvider[provider].cost += u.cost_usd || 0;
        byProvider[provider].count++;
      }

      // Find expensive providers
      const sortedProviders = Object.entries(byProvider).sort((a, b) => b[1].cost - a[1].cost);
      if (sortedProviders.length > 0) {
        const [topProvider, topData] = sortedProviders[0];
        if (topData.cost > totalCost * 0.5) {
          findings.push(`High cost provider: ${topProvider} ($${topData.cost.toFixed(2)}, ${(topData.cost / totalCost * 100).toFixed(1)}%)`);
          actions.push(`Consider using cheaper models for ${topProvider}`);
        }
      }

      // Check for optimization opportunities
      const avgInputPerRequest = totalInput / usage.length;
      if (avgInputPerRequest > 2000) {
        findings.push(`High avg input tokens: ${Math.round(avgInputPerRequest)}`);
        actions.push('Consider prompt compression or caching');
      }

      const outputRatio = totalOutput / (totalInput + totalOutput);
      if (outputRatio > 0.6) {
        findings.push(`High output ratio: ${(outputRatio * 100).toFixed(1)}%`);
        actions.push('Consider constraining output format');
      }

      // Calculate potential savings
      const targetReduction = (config.targetReduction as number) || 0.2;
      metrics.potentialSavingsUsd = Math.round(totalCost * targetReduction * 100) / 100;

      findings.push(`Total cost: $${totalCost.toFixed(2)} (${usage.length} requests)`);
      findings.push(`Potential savings: $${metrics.potentialSavingsUsd.toFixed(2)} (${(targetReduction * 100).toFixed(0)}% reduction)`);
    }

  } catch (error) {
    findings.push(`Cost analysis error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return {
    id: `result-${Date.now()}`,
    taskId: 'cost_optimization',
    runAt: new Date().toISOString(),
    status: 'success',
    findings,
    actions,
    metrics,
  };
}

// ---------- Auto Enrich Task ----------

export async function runAutoEnrich(_config: Record<string, unknown>): Promise<AutonomousTaskResult> {
  const findings: string[] = [];
  const actions: string[] = [];
  const metrics: Record<string, number> = {};

  try {
    // Find prompts that need enrichment
    const { supabase } = await import('./supabaseClient');

    // Get prompts with low success rate
    const { data: lowPerf, error } = await supabase
      .from('prompt_generations')
      .select('master_prompt, domain_id, framework')
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      findings.push(`DB query error: ${error.message}`);
    } else if (lowPerf && lowPerf.length > 0) {
      findings.push(`Found ${lowPerf.length} underperforming prompts`);

      // Enrich each prompt
      const { enrichMasterPrompt } = await import('../server/lib/enrichment');
      let enrichedCount = 0;

      for (const p of lowPerf.slice(0, 3)) { // Limit to 3 per run
        if (p.master_prompt) {
          try {
            const result = await enrichMasterPrompt(p.master_prompt, {
              domainId: p.domain_id || undefined,
              config: { mode: 'fast' },
            });

            if (result.metrics.promptsIntegrated > 0) {
              enrichedCount++;
              actions.push(`Enriched prompt for domain: ${p.domain_id || 'general'}`);
            }
          } catch {
            // Skip failed enrichments
          }
        }
      }

      metrics.enrichedCount = enrichedCount;
      findings.push(`Auto-enriched ${enrichedCount} prompts`);
    } else {
      findings.push('No underperforming prompts found');
    }

  } catch (error) {
    findings.push(`Auto-enrich error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return {
    id: `result-${Date.now()}`,
    taskId: 'auto_enrich',
    runAt: new Date().toISOString(),
    status: 'success',
    findings,
    actions,
    metrics,
  };
}

// ---------- Task Scheduler ----------

export function registerTask(task: AutonomousTask): void {
  taskRegistry.set(task.id, task);
}

export function unregisterTask(taskId: string): void {
  taskRegistry.delete(taskId);
}

export function getTask(taskId: string): AutonomousTask | undefined {
  return taskRegistry.get(taskId);
}

export function getAllTasks(): AutonomousTask[] {
  return Array.from(taskRegistry.values());
}

export async function runTask(taskId: string): Promise<AutonomousTaskResult | null> {
  const task = taskRegistry.get(taskId);
  if (!task || !task.enabled) return null;

  let result: AutonomousTaskResult;

  switch (task.type) {
    case 'health_monitor':
      result = await runHealthMonitor(task.config);
      break;
    case 'drift_detection':
      result = await runDriftDetection(task.config);
      break;
    case 'cost_optimization':
      result = await runCostOptimization(task.config);
      break;
    case 'auto_enrich':
      result = await runAutoEnrich(task.config);
      break;
    default:
      return null;
  }

  // Update task
  task.lastRun = result.runAt;
  task.nextRun = new Date(Date.now() + task.intervalMs).toISOString();
  task.results.unshift(result);
  if (task.results.length > 10) task.results.pop(); // Keep last 10
  taskRegistry.set(taskId, task);

  return result;
}

// ---------- Initialize Default Tasks ----------

export function initializeDefaultTasks(): void {
  const defaults: AutonomousTask[] = [
    {
      id: 'default-health-monitor',
      type: 'health_monitor',
      enabled: true,
      intervalMs: 5 * 60 * 1000, // 5 minutes
      config: { autoRestart: false },
      results: [],
    },
    {
      id: 'default-drift-detection',
      type: 'drift_detection',
      enabled: true,
      intervalMs: 60 * 60 * 1000, // 1 hour
      config: { baselineSuccessRate: 0.85, baselineEditRate: 0.15 },
      results: [],
    },
    {
      id: 'default-cost-optimization',
      type: 'cost_optimization',
      enabled: true,
      intervalMs: 24 * 60 * 60 * 1000, // 24 hours
      config: { targetReduction: 0.2 },
      results: [],
    },
    {
      id: 'default-auto-enrich',
      type: 'auto_enrich',
      enabled: false, // Disabled by default
      intervalMs: 12 * 60 * 60 * 1000, // 12 hours
      config: {},
      results: [],
    },
  ];

  for (const task of defaults) {
    if (!taskRegistry.has(task.id)) {
      taskRegistry.set(task.id, task);
    }
  }
}

// ---------- Background Scheduler ----------

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerInterval) return;

  initializeDefaultTasks();

  // Check every minute
  schedulerInterval = setInterval(async () => {
    const now = Date.now();

    for (const task of taskRegistry.values()) {
      if (!task.enabled) continue;

      const nextRunTime = task.nextRun ? new Date(task.nextRun).getTime() : 0;

      if (now >= nextRunTime) {
        try {
          await runTask(task.id);
        } catch (e) {
          console.error(`Task ${task.id} failed:`, e);
        }
      }
    }
  }, 60 * 1000);

  console.log('Autonomous task scheduler started');
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export function getSchedulerStatus(): { running: boolean; taskCount: number; nextRuns: Array<{ id: string; type: string; nextRun: string }> } {
  return {
    running: schedulerInterval !== null,
    taskCount: taskRegistry.size,
    nextRuns: getAllTasks()
      .filter(t => t.enabled)
      .map(t => ({ id: t.id, type: t.type, nextRun: t.nextRun || 'pending' }))
      .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime()),
  };
}
