import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null); // eslint-disable-line react-refresh/only-export-components


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isMockMode = !supabase;

  useEffect(() => {
    if (isMockMode) {
      const stored = localStorage.getItem('lovcore:mock-session');
      if (stored) {
        try {
          const s = JSON.parse(stored);
          setSession(s); // eslint-disable-line react-hooks/set-state-in-effect
          setUser(s.user);
        } catch {
          // ignore
        }
      }
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, [isMockMode]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isMockMode || !supabase) {
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: email,
        created_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
      } as User;
      const s = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: mockUser,
      } as Session;
      setUser(mockUser);
      setSession(s);
      localStorage.setItem('lovcore:mock-session', JSON.stringify(s));
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [isMockMode]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (isMockMode || !supabase) {
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000000',
        email: email,
        created_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
      } as User;
      const s = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: mockUser,
      } as Session;
      setUser(mockUser);
      setSession(s);
      localStorage.setItem('lovcore:mock-session', JSON.stringify(s));
      return { error: null, needsEmailConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !error && !data.session,
    };
  }, [isMockMode]);

  const resetPassword = useCallback(async (email: string) => {
    if (isMockMode || !supabase) {
      return { error: null };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error: error?.message ?? null };
  }, [isMockMode]);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (isMockMode || !supabase) {
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, [isMockMode]);

  const signOut = useCallback(async () => {
    if (isMockMode) {
      setUser(null);
      setSession(null);
      localStorage.removeItem('lovcore:mock-session');
      return;
    }
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [isMockMode]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      signOut,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
