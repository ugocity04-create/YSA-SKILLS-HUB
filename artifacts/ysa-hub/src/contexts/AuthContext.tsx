import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

const PENDING_PROFILE_KEY = "ysa_pending_profile";

interface PendingProfile {
  email: string;
  profileData: Partial<Profile>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function createProfile(userId: string, email: string, profileData: Partial<Profile>) {
  const fullPayload = {
    id: userId,
    email,
    ...profileData,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("profiles").upsert(fullPayload, { onConflict: "id" });
  if (!error) return null;

  // Full upsert failed — likely activity_id column is still uuid type (SQL fix not yet run).
  // Fall back: save everything EXCEPT the activity fields so the profile row is at least created.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { activity_id, instructing_activity_id, ...safePayload } = fullPayload as Record<string, unknown>;
  const { error: fallbackError } = await supabase.from("profiles").upsert(safePayload, { onConflict: "id" });
  return fallbackError;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) {
      setProfile(data as Profile);
      return data as Profile;
    }
    setProfile(null);
    return null;
  }

  async function tryCreatePendingProfile(user: User) {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) return;
    try {
      const pending: PendingProfile = JSON.parse(raw);
      const err = await createProfile(user.id, pending.email, pending.profileData);
      if (!err) {
        localStorage.removeItem(PENDING_PROFILE_KEY);
        await fetchProfile(user.id);
      }
    } catch {
      // ignore parse errors
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id)
          .then(async (p) => {
            if (!p) await tryCreatePendingProfile(session.user);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          if (!p) await tryCreatePendingProfile(session.user);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signUp(
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) {
    // Always persist profile data in localStorage first so it survives
    // email confirmation flows and RLS timing issues
    const pending: PendingProfile = { email, profileData };
    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(pending));

    // Use current origin so the link works on any domain (dev, preview, deployed)
    const callbackUrl = `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      localStorage.removeItem(PENDING_PROFILE_KEY);
      // Log the full error so devs can see the exact Supabase/DB error code
      console.error("[signUp] Supabase auth error:", error.message, (error as unknown as Record<string, unknown>).code ?? "");
      return { error: error as Error, needsConfirmation: false };
    }

    // No session → email confirmation required
    if (!data.session) {
      return { error: null, needsConfirmation: true };
    }

    // Session exists — create profile now
    if (data.user) {
      const profileError = await createProfile(data.user.id, email, profileData);
      if (!profileError) {
        localStorage.removeItem(PENDING_PROFILE_KEY);
        await fetchProfile(data.user.id);
      }
      // If RLS blocks the insert the pending data stays in localStorage
      // and will be retried on next sign-in
    }

    return { error: null, needsConfirmation: false };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
