/**
 * AuthPage — Login/Register sayfası (cyberpunk tema).
 * Supabase Auth ile email+password + OAuth (Google/GitHub/Apple).
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { OAuthProvider } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { APP_NAME, APP_VERSION } from '../version';

/* Inline SVG icons for OAuth providers */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.32-3.74 4.25z" />
    </svg>
  );
}

export default function AuthPage() {
  const { signIn, signUp, signInWithOAuth, resetPassword } = useAuth();
  const { t, language } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'forgot') {
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    } else {
      if (password.length < 6) {
        setError(t.ui.authPasswordMin);
        setLoading(false);
        return;
      }
      const result = await signUp(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    setLoading(true);
    const result = await signInWithOAuth(provider);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, browser redirects to OAuth provider
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center relative overflow-hidden">
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,232,249,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,232,249,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,232,249,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo / Baslik */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display text-cyber-primary tracking-wider">
            SUPER REASONING
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-2">
            Meta-Prompt Architect v{APP_VERSION}
          </p>
        </div>

        {/* Kart */}
        <div className="glass-card p-8 shadow-neon-cyan">
          <h2 className="text-xl font-display font-bold text-gray-100 mb-6 text-center tracking-wide">
            {mode === 'login' ? t.ui.authLogin : mode === 'register' ? t.ui.authRegister : t.ui.authForgotPassword}
          </h2>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyber-primary/10 flex items-center justify-center">
                <span className="text-2xl text-cyber-primary">&#10003;</span>
              </div>
              <p className="text-gray-300 font-mono text-sm">
                {mode === 'forgot' ? t.ui.authResetSent : t.ui.authCheckEmail}
              </p>
              <button
                onClick={() => { setMode('login'); setSuccess(false); }}
                className="mt-4 text-cyber-primary hover:text-cyber-primary/80 font-mono text-sm underline"
              >
                {t.ui.authLogin}
              </button>
            </div>
          ) : (
            <>
              {/* OAuth Buttons — hide in forgot mode */}
              {mode !== 'forgot' && (
                <>
                  <div className="space-y-2 mb-5">
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 glass-card p-3 hover:border-cyber-primary/50 hover:bg-cyber-primary/5 transition-all duration-200 disabled:opacity-50 group"
                    >
                      <GoogleIcon className="text-gray-400 group-hover:text-cyber-primary transition-colors" />
                      <span className="text-gray-300 font-mono text-xs tracking-wider group-hover:text-gray-100 transition-colors">
                        {t.ui.authContinueGoogle}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuth('github')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 glass-card p-3 hover:border-cyber-primary/50 hover:bg-cyber-primary/5 transition-all duration-200 disabled:opacity-50 group"
                    >
                      <GitHubIcon className="text-gray-400 group-hover:text-cyber-primary transition-colors" />
                      <span className="text-gray-300 font-mono text-xs tracking-wider group-hover:text-gray-100 transition-colors">
                        {t.ui.authContinueGitHub}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuth('apple')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 glass-card p-3 hover:border-cyber-primary/50 hover:bg-cyber-primary/5 transition-all duration-200 disabled:opacity-50 group"
                    >
                      <AppleIcon className="text-gray-400 group-hover:text-cyber-primary transition-colors" />
                      <span className="text-gray-300 font-mono text-xs tracking-wider group-hover:text-gray-100 transition-colors">
                        {t.ui.authContinueApple}
                      </span>
                    </button>
                  </div>

                  {/* Separator */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-cyber-border/50" />
                    <span className="text-gray-600 font-mono text-[10px] uppercase tracking-wider">
                      {t.ui.authOrContinueWith}
                    </span>
                    <div className="flex-1 h-px bg-cyber-border/50" />
                  </div>
                </>
              )}

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-gray-400 font-mono text-xs mb-1 uppercase tracking-wider">
                      {t.ui.authName}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full glass-input p-3 text-gray-100 font-mono text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-gray-400 font-mono text-xs mb-1 uppercase tracking-wider">
                    {t.ui.authEmail}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full glass-input p-3 text-gray-100 font-mono text-sm"
                    placeholder="you@example.com"
                  />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label className="block text-gray-400 font-mono text-xs mb-1 uppercase tracking-wider">
                      {t.ui.authPassword}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full glass-input p-3 text-gray-100 font-mono text-sm"
                      placeholder="--------"
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); }}
                      className="text-gray-500 hover:text-cyber-primary font-mono text-xs transition-colors"
                    >
                      {t.ui.authForgotPassword}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 font-mono text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyber-primary/10 border border-cyber-primary text-cyber-primary font-mono font-bold py-3 rounded-lg hover:bg-cyber-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed tracking-wider text-sm"
                >
                  {loading
                    ? (mode === 'forgot'
                        ? (language === 'tr' ? 'GÖNDERİLİYOR...' : 'SENDING...')
                        : mode === 'login'
                        ? (language === 'tr' ? 'GİRİŞ YAPILIYOR...' : 'AUTHENTICATING...')
                        : (language === 'tr' ? 'HESAP OLUŞTURULUYOR...' : 'CREATING ACCOUNT...'))
                    : mode === 'forgot' ? t.ui.authForgotPassword : mode === 'login' ? t.ui.authLogin : t.ui.authRegister
                  }
                </button>
              </form>
            </>
          )}

          {/* Mode toggle */}
          {!success && (
            <div className="mt-6 text-center">
              {mode === 'forgot' ? (
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-cyber-primary hover:text-cyber-primary/80 font-mono text-xs underline"
                >
                  {t.ui.authLogin}
                </button>
              ) : (
                <>
                  <span className="text-gray-500 font-mono text-xs">
                    {mode === 'login' ? t.ui.authNoAccount : t.ui.authHasAccount}
                  </span>
                  <button
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
                    className="ml-2 text-cyber-primary hover:text-cyber-primary/80 font-mono text-xs underline"
                  >
                    {mode === 'login' ? t.ui.authRegister : t.ui.authLogin}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Misafir girişi */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="text-gray-600 hover:text-gray-400 font-mono text-xs transition-colors underline"
          >
            {language === 'tr' ? '← Ana sayfaya dön' : '← Back to home'}
          </button>
        </div>

        {/* Alt bilgi */}
        <p className="text-center text-gray-600 font-mono text-xs mt-4">
          {APP_NAME} v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
