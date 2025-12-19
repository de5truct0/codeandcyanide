import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
}

const GUEST_SESSION_KEY = 'strudel_guest_session';

function getGuestSession(): AuthUser | null {
  try {
    const stored = localStorage.getItem(GUEST_SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return null;
}

function createGuestSession(): AuthUser {
  const guest: AuthUser = {
    id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: null,
    username: 'Guest',
    avatarUrl: null,
    isGuest: true,
  };
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guest));
  return guest;
}

function clearGuestSession(): void {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email || null,
    username: user.user_metadata?.name || user.email?.split('@')[0] || null,
    avatarUrl: user.user_metadata?.avatar_url || null,
    isGuest: false,
  };
}

export async function signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (data.user) {
    clearGuestSession();
    return { user: mapSupabaseUser(data.user), error: null };
  }

  return { user: null, error: 'Sign up failed' };
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (data.user) {
    clearGuestSession();
    return { user: mapSupabaseUser(data.user), error: null };
  }

  return { user: null, error: 'Sign in failed' };
}

export async function signInWithGitHub(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase not configured' };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    return { error: error.message };
  }

  clearGuestSession();
  return { error: null };
}

export function continueAsGuest(): AuthUser {
  const existing = getGuestSession();
  if (existing) {
    return existing;
  }
  return createGuestSession();
}

export async function signOut(): Promise<void> {
  clearGuestSession();
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Check for guest session first
  const guest = getGuestSession();

  if (!isSupabaseConfigured()) {
    return guest;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    clearGuestSession();
    return mapSupabaseUser(user);
  }

  return guest;
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  if (!isSupabaseConfigured()) {
    // Return no-op unsubscribe
    const guest = getGuestSession();
    setTimeout(() => callback(guest), 0);
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      clearGuestSession();
      callback(mapSupabaseUser(session.user));
    } else {
      const guest = getGuestSession();
      callback(guest);
    }
  });

  return () => subscription.unsubscribe();
}
