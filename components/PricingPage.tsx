/**
 * PricingPage — 3-tier plan: Free / Pro / Team.
 * Pro: $5/ay veya $60/yil. Team: $15/ay.
 * Stripe Checkout'a yonlendirir, aktif aboneler portal'a erisir.
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';

const FREE_FEATURES = {
  en: [
    '10 generations/minute',
    '3 AI providers',
    'Basic prompt linting',
    'Community support',
  ],
  tr: [
    '10 uretim/dakika',
    '3 AI motoru',
    'Temel prompt denetimi',
    'Topluluk destegi',
  ],
};

const PRO_FEATURES = {
  en: [
    'Unlimited generations',
    'All 9 AI providers',
    'Judge Ensemble V3',
    'Priority API access',
    'Prompt versioning',
    'Auto-enrichment',
  ],
  tr: [
    'Sinirsiz uretim',
    'Tum 9 AI motoru',
    'Judge Ensemble V3',
    'Oncelikli API erisimi',
    'Prompt versiyonlama',
    'Otomatik zenginlestirme',
  ],
};

const TEAM_FEATURES = {
  en: [
    'Everything in Pro',
    'Team workspace',
    'Role-based access (RBAC)',
    'Shared prompt library',
    'Advanced analytics',
    'Priority support',
  ],
  tr: [
    'Pro\'daki her sey',
    'Takim calisma alani',
    'Rol bazli erisim (RBAC)',
    'Paylasimli prompt kutuphanesi',
    'Gelismis analitik',
    'Oncelikli destek',
  ],
};

export default function PricingPage({ onBack }: { onBack: () => void }) {
  const { session, profile, signOut } = useAuth();
  const { t, language } = useTranslation();
  const lang = language === 'tr' ? 'tr' : 'en';
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const currentPlan = profile?.plan || 'free';
  const isPaid = currentPlan === 'pro' || currentPlan === 'team';

  const handleSubscribe = async (planId: string) => {
    if (!session?.access_token) return;
    setLoading(planId);
    setError(null);

    try {
      const res = await fetch('/api/v1/create-checkout-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Checkout failed');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    setLoading('manage');
    setError(null);

    try {
      const res = await fetch('/api/v1/create-portal-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Portal session failed');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(null);
    }
  };

  const renderPlanButton = (planId: string, label: string) => {
    const isProCurrent = currentPlan === 'pro' && (planId === 'monthly' || planId === 'yearly');
    const isTeamCurrent = currentPlan === 'team' && planId === 'team';
    const isFreeCurrent = planId === 'free' && currentPlan === 'free';

    if (isFreeCurrent) {
      return (
        <button disabled className="w-full bg-cyber-dark/60 border border-glass-border text-gray-500 font-mono font-bold py-3 rounded-lg tracking-wider text-sm cursor-default">
          {lang === 'tr' ? 'MEVCUT PLAN' : 'CURRENT PLAN'}
        </button>
      );
    }

    if ((isProCurrent || isTeamCurrent) && isPaid) {
      return (
        <button
          onClick={handleManageSubscription}
          disabled={loading !== null}
          className="w-full bg-cyber-primary/10 border border-cyber-primary text-cyber-primary font-mono font-bold py-3 rounded-lg hover:bg-cyber-primary/20 transition-all duration-200 disabled:opacity-50 tracking-wider text-sm"
        >
          {loading === 'manage' ? 'REDIRECTING...' : t.ui.authManageSubscription}
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSubscribe(planId)}
        disabled={loading !== null || isPaid}
        className="w-full bg-cyber-primary/10 border border-cyber-primary text-cyber-primary font-mono font-bold py-3 rounded-lg hover:bg-cyber-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed tracking-wider text-sm"
      >
        {loading === planId ? 'REDIRECTING...' : label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Arka plan */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,232,249,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,232,249,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,232,249,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 w-full max-w-5xl mx-4">
        {/* Geri + Oturum Kapatma */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 font-mono text-sm flex items-center gap-2 transition-colors"
          >
            &larr; {lang === 'tr' ? 'Geri' : 'Back'}
          </button>
          <button
            onClick={signOut}
            className="font-mono text-xs border border-glass-border bg-cyber-dark/80 px-3 py-1 rounded text-gray-500 hover:text-red-400 hover:border-red-400/50 transition-colors"
          >
            {t.ui.authSignOut}
          </button>
        </div>

        {/* Baslik */}
        <h1 className="text-2xl font-bold font-display text-cyber-primary tracking-wider text-center mb-2">
          {t.ui.authPricingTitle}
        </h1>

        {/* Billing interval toggle */}
        <div className="flex items-center justify-center gap-3 mb-8 mt-4">
          <span className={`font-mono text-xs cursor-pointer transition-colors ${billingInterval === 'monthly' ? 'text-cyber-primary' : 'text-gray-500'}`}
            onClick={() => setBillingInterval('monthly')}>
            {t.ui.authBillingMonthly}
          </span>
          <button
            onClick={() => setBillingInterval(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-12 h-6 rounded-full bg-cyber-dark border border-glass-border transition-colors focus:outline-none"
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-cyber-primary transition-transform duration-200 ${billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`font-mono text-xs cursor-pointer transition-colors ${billingInterval === 'yearly' ? 'text-cyber-primary' : 'text-gray-500'}`}
            onClick={() => setBillingInterval('yearly')}>
            {t.ui.authBillingYearly}
            <span className="ml-1 text-cyber-primary/70 text-[10px]">(-17%)</span>
          </span>
        </div>

        {/* Plan kartlari */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE */}
          <div className="glass-card p-6 hover:border-gray-600 transition-all duration-300 flex flex-col">
            <div className="text-center mb-6">
              <h3 className="text-gray-400 font-mono text-xs uppercase tracking-wider mb-2">
                {t.ui.authFreePlan}
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold font-mono text-gray-100">$0</span>
                <span className="text-gray-500 font-mono text-sm">/{lang === 'tr' ? 'ay' : 'mo'}</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {FREE_FEATURES[lang].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-500 mt-0.5 text-sm">-</span>
                  <span className="text-gray-400 font-mono text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            {renderPlanButton('free', t.ui.authFreePlan)}
          </div>

          {/* PRO */}
          <div className="glass-card p-6 border-cyber-primary/40 relative hover:border-cyber-primary/70 transition-all duration-300 flex flex-col shadow-neon-cyan">
            {/* Recommended badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyber-primary/20 border border-cyber-primary/50 rounded-full text-cyber-primary font-mono text-[9px] uppercase tracking-wider whitespace-nowrap">
              {t.ui.authRecommended}
            </div>

            <div className="text-center mb-6">
              <h3 className="text-cyber-primary font-mono text-xs uppercase tracking-wider mb-2">
                {t.ui.authProPlan}
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold font-mono text-gray-100">
                  {billingInterval === 'monthly' ? '$5' : '$60'}
                </span>
                <span className="text-gray-500 font-mono text-sm">
                  /{billingInterval === 'monthly' ? (lang === 'tr' ? 'ay' : 'mo') : (lang === 'tr' ? 'yil' : 'yr')}
                </span>
              </div>
              {billingInterval === 'yearly' && (
                <p className="text-cyber-primary/60 font-mono text-[10px] mt-1">
                  = $5/{lang === 'tr' ? 'ay' : 'mo'}
                </p>
              )}
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {PRO_FEATURES[lang].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyber-primary mt-0.5 text-sm">&#10003;</span>
                  <span className="text-gray-300 font-mono text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            {renderPlanButton(billingInterval, t.ui.authSubscribe)}
          </div>

          {/* TEAM */}
          <div className="glass-card p-6 border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 flex flex-col">
            <div className="text-center mb-6">
              <h3 className="text-purple-400 font-mono text-xs uppercase tracking-wider mb-2">
                {t.ui.authTeamPlan}
              </h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold font-mono text-gray-100">$15</span>
                <span className="text-gray-500 font-mono text-sm">/{lang === 'tr' ? 'ay' : 'mo'}</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {TEAM_FEATURES[lang].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 text-sm">&#10003;</span>
                  <span className="text-gray-300 font-mono text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            {renderPlanButton('team', t.ui.authSubscribe)}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 font-mono text-xs text-center">
            {error}
          </div>
        )}

        {/* Alt bilgi */}
        <p className="text-center text-gray-600 font-mono text-xs mt-8">
          {lang === 'tr'
            ? 'Guvenli odeme Stripe altyapisi ile saglanmaktadir.'
            : 'Secure payments powered by Stripe.'
          }
        </p>
      </div>
    </div>
  );
}
