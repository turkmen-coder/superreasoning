/**
 * React auth context — Env-based admin authentication.
 * Login: VITE_ADMIN_EMAIL + VITE_ADMIN_PASSWORD (from .env)
 * Session: localStorage persistence
 * No Supabase dependency.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserProfile {
  userId: string;
  email: string;
  orgId: string;
  plan: string;
  role: string;
  name?: string;
}

export type OAuthProvider = 'google' | 'github' | 'apple';

interface AuthState {
  session: { access_token: string } | null;
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@neomagic.org';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
const AUTH_STORAGE_KEY = 'sr_auth_session';

function buildAdminProfile(email: string, name?: string): UserProfile {
  return {
    userId: 'admin-' + email.replace(/[^a-z0-9]/gi, ''),
    email,
    orgId: 'default-org',
    plan: 'team',
    role: 'admin',
    name: name || email.split('@')[0],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no admin password configured, grant open access
    if (!ADMIN_PASSWORD) {
      const p = buildAdminProfile(ADMIN_EMAIL, 'Admin');
      setUser({ id: p.userId, email: p.email });
      setSession({ access_token: 'open-access' });
      setProfile(p);
      setLoading(false);
      return;
    }

    // Check localStorage for persisted session
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { email: string; name?: string; ts: number };
        // Session expires after 24 hours
        if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
          const p = buildAdminProfile(parsed.email, parsed.name);
          setUser({ id: p.userId, email: p.email });
          setSession({ access_token: 'local-session' });
          setProfile(p);
        }
      }
    } catch { /* ignore parse errors */ }
    setLoading(false);
  }, []);

  const signUp = async (_email: string, _password: string, _name?: string) => {
    return { error: 'Registration is disabled. Contact admin.' };
  };

  const signIn = async (email: string, password: string) => {
    // Validate against env credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return { error: 'Invalid login credentials' };
    }

    const p = buildAdminProfile(email);
    setUser({ id: p.userId, email: p.email });
    setSession({ access_token: 'local-session' });
    setProfile(p);

    // Persist to localStorage
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ email, ts: Date.now() }));
    } catch { /* storage unavailable */ }

    return {};
  };

  const signInWithOAuth = async (_provider: OAuthProvider) => {
    return { error: 'OAuth is not configured. Use email/password login.' };
  };

  const resetPassword = async (_email: string) => {
    return { error: 'Password reset is not available. Contact admin.' };
  };

  const signOut = async () => {
    setProfile(null);
    setSession(null);
    setUser(null);
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, signInWithOAuth, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
