import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getDefaultRedirect } from "@/types";
import type { UserRole } from "@/types";

const PENDING_PROFILE_KEY = "ysa_pending_profile";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verifying your email…");

  useEffect(() => {
    async function handleCallback() {
      // Supabase exchanges the token from the URL hash automatically
      // Give it a moment to process
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session?.user) {
        setStatus("Verification failed. Redirecting to login…");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const user = session.user;
      setStatus("Setting up your profile…");

      // Try to create the pending profile saved during signup
      const raw = localStorage.getItem(PENDING_PROFILE_KEY);
      if (raw) {
        try {
          const pending = JSON.parse(raw);
          await supabase.from("profiles").upsert({
            id: user.id,
            email: pending.email,
            ...pending.profileData,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
          localStorage.removeItem(PENDING_PROFILE_KEY);
        } catch {
          // if parse fails just continue
        }
      }

      // Fetch role and redirect
      setStatus("Almost there…");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = (profile?.role as UserRole) ?? "student";
      navigate(getDefaultRedirect(role), { replace: true });
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">{status}</p>
    </div>
  );
}
