import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { UserRole } from "@/types";
import { getDefaultRedirect } from "@/types";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast.error(error.message || "Invalid email or password");
      return;
    }
    // Fetch role to redirect correctly
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        const role = (profile?.role as UserRole) ?? "student";
        navigate(getDefaultRedirect(role));
        return;
      }
    } catch {
      // fall through
    }
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center flex-1 bg-[#0F172A] text-white px-12">
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center text-[#0F172A] font-bold text-sm">YSA</div>
          <span className="font-semibold">YSA Skills Hub</span>
        </div>
        <h2 className="text-3xl font-bold mb-4">Welcome back!</h2>
        <p className="text-white/60 mb-8">Sign in to track your attendance, view your QR code, and stay connected with the YSA community.</p>
        <div className="space-y-4">
          {["Track your Saturday attendance", "View your personal QR code", "Request skill class transfers", "Get session reminders"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-white/70">
              <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-amber-400 font-bold text-xs">YSA</div>
            <span className="font-semibold text-[#0F172A]">YSA Skills Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-1">Sign In</h1>
          <p className="text-sm text-slate-500 mb-8">Enter your credentials to access your account.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-amber-600 font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
