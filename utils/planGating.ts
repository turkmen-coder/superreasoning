/**
 * Plan-based feature gating utility.
 * useFeatureAccess() hook for checking plan-based feature access.
 */

import { useAuth } from '../contexts/AuthContext';

export type Feature =
  | 'unlimited_generations'
  | 'all_providers'
  | 'judge_ensemble'
  | 'prompt_versioning'
  | 'auto_enrichment'
  | 'team_workspace'
  | 'advanced_analytics'
  | 'code_optimizer'
  | 'vibe_coding';

const PLAN_FEATURES: Record<string, Feature[]> = {
  free: [],
  pro: [
    'unlimited_generations',
    'all_providers',
    'judge_ensemble',
    'prompt_versioning',
    'auto_enrichment',
    'code_optimizer',
    'vibe_coding',
  ],
  team: [
    'unlimited_generations',
    'all_providers',
    'judge_ensemble',
    'prompt_versioning',
    'auto_enrichment',
    'code_optimizer',
    'vibe_coding',
    'team_workspace',
    'advanced_analytics',
  ],
};

export function useFeatureAccess() {
  const { profile } = useAuth();
  const plan = profile?.plan || 'free';
  const role = profile?.role || 'viewer';
  const isAdmin = role === 'admin' || role === 'owner';

  const hasFeature = (feature: Feature): boolean => {
    if (isAdmin) return true;
    return PLAN_FEATURES[plan]?.includes(feature) ?? false;
  };

  const isPaid = isAdmin || plan === 'pro' || plan === 'team';

  return { hasFeature, plan, isPaid, isAdmin };
}
