import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ChevronRight, ChevronLeft, CheckCircle, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { WARDS, ACTIVITIES, STAKE_NAME, getDefaultRedirect } from "@/types";
import { toast } from "sonner";

type SignUpRole = "student" | "instructor";
type ChurchStatus = "member" | "friend" | "";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  // role
  signUpRole: SignUpRole | "";
  // student-specific
  churchStatus: ChurchStatus;
  ward: string;
  referralSource: string;
  activityId: string;
  // instructor-specific
  instructingActivityId: string;
  inviteCode: string;
  // notifications
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
}

export default function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<FormData>({
    email: "", password: "", confirmPassword: "",
    name: "", phone: "", signUpRole: "",
    churchStatus: "", ward: "", referralSource: "", activityId: "",
    instructingActivityId: "",
    inviteCode: "",
    notifyEmail: true, notifyWhatsapp: false,
  });
  const [inviteCodeError, setInviteCodeError] = useState("");

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ─── Validation ─── */
  function validateStep1() {
    if (!form.email || !form.password || !form.confirmPassword) { toast.error("Fill in all fields"); return false; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return false; }
    if (form.password !== form.confirmPassword) { toast.error("Passwords don't match"); return false; }
    return true;
  }

  async function validateStep2(): Promise<boolean> {
    if (!form.name.trim()) { toast.error("Name is required"); return false; }
    if (!form.signUpRole) { toast.error("Choose a role"); return false; }
    if (form.signUpRole === "student") {
      if (!form.churchStatus) { toast.error("Please answer the church membership question"); return false; }
      if (form.churchStatus === "member" && !form.ward) { toast.error("Ward is required for members"); return false; }
      if (!form.activityId) { toast.error("Please choose a skill class"); return false; }
    }
    if (form.signUpRole === "instructor") {
      if (!form.inviteCode.trim()) {
        setInviteCodeError("Invalid instructor code. Please contact your administrator.");
        return false;
      }
      try {
        const res = await fetch("/api/validate-instructor-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: form.inviteCode.trim() }),
        });
        const data = await res.json() as { valid: boolean };
        if (!data.valid) {
          setInviteCodeError("Invalid instructor code. Please contact your administrator.");
          return false;
        }
      } catch {
        setInviteCodeError("Could not verify invite code. Please try again.");
        return false;
      }
      setInviteCodeError("");
      if (!form.ward) { toast.error("Ward is required"); return false; }
      if (!form.instructingActivityId) { toast.error("Please choose the skill you instruct"); return false; }
    }
    return true;
  }

  /* ─── Submit ─── */
  async function handleSubmit() {
    setLoading(true);
    const isInstructor = form.signUpRole === "instructor";
    const profileData = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      ward: (isInstructor || form.churchStatus === "member") ? form.ward : undefined,
      stake: STAKE_NAME,
      role: (isInstructor ? "instructor" : "student") as "instructor" | "student",
      member_status: (isInstructor ? "member" : form.churchStatus) as "member" | "friend",
      activity_id: isInstructor ? undefined : form.activityId || undefined,
      instructing_activity_id: isInstructor ? form.instructingActivityId : undefined,
      referral_source: form.referralSource || undefined,
      notify_email: form.notifyEmail,
      notify_whatsapp: form.notifyWhatsapp,
      created_at: new Date().toISOString(),
    };

    const { error, needsConfirmation } = await signUp(form.email, form.password, profileData);
    setLoading(false);

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("sending confirmation") || msg.includes("sending email") || msg.includes("smtp")) {
        // Account was created but the email service failed — show the email screen
        // with a note so the user knows what happened
        setEmailSent(true);
        toast.error("Account created but confirmation email failed. Check your Supabase SMTP settings — or disable 'Confirm email' in Supabase Auth settings to skip this step.");
        return;
      }
      const friendly =
        msg.includes("rate") || msg.includes("email rate") || msg.includes("over_email")
          ? "Too many sign-up attempts. Please wait a few minutes and try again."
          : msg.includes("already registered") || msg.includes("already exists")
          ? "An account with this email already exists. Please sign in instead."
          : error.message || "Registration failed. Please try again.";
      toast.error(friendly);
      return;
    }
    if (needsConfirmation) { setEmailSent(true); return; }

    toast.success("Welcome to YSA Skills Hub!");
    navigate(getDefaultRedirect(profileData.role));
  }

  /* ─── Email sent screen ─── */
  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-3">Check Your Email</h2>
          <p className="text-slate-500 mb-6">
            We sent a confirmation link to <strong>{form.email}</strong>. Click the link to activate your account, then sign in.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-[#0F172A] text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center flex-1 bg-[#0F172A] text-white px-12">
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center text-[#0F172A] font-bold text-sm">YSA</div>
          <span className="font-semibold">YSA Skills Hub</span>
        </div>
        <h2 className="text-3xl font-bold mb-4">Join the community</h2>
        <p className="text-white/60 mb-8">Register to access Saturday skill classes, track your attendance, and connect with fellow YSA members across Ojodu Stake.</p>
        <div className="space-y-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex items-center gap-3 text-sm ${s <= step ? "text-white" : "text-white/40"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${s < step ? "bg-amber-400 border-amber-400 text-[#0F172A]" : s === step ? "border-amber-400 text-amber-400" : "border-white/20 text-white/30"}`}>
                {s < step ? <CheckCircle className="w-3.5 h-3.5" /> : s}
              </div>
              {s === 1 ? "Account Credentials" : s === 2 ? "Personal Details & Role" : "Preferences"}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-amber-400 font-bold text-xs">YSA</div>
            <span className="font-semibold text-[#0F172A]">YSA Skills Hub</span>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 rounded-full flex-1 transition-all ${s <= step ? "bg-amber-400" : "bg-slate-200"}`} />
            ))}
          </div>

          <h1 className="text-xl font-bold text-[#0F172A] mb-1">
            {step === 1 ? "Create Account" : step === 2 ? "Your Details" : "Preferences"}
          </h1>
          <p className="text-sm text-slate-500 mb-6">Step {step} of 3</p>

          {/* ── STEP 1: Credentials ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required value={form.password} onChange={(e) => set("password", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Min. 6 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <input type="password" required value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Re-enter password" />
              </div>
              <button onClick={() => validateStep1() && setStep(2)}
                className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Details & Role ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Your full name" />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="+234 801 234 5678" />
              </div>

              {/* Role cards */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">I am joining as *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "student" as SignUpRole, emoji: "🎓", label: "Student", desc: "I want to learn a skill" },
                    { value: "instructor" as SignUpRole, emoji: "👨‍🏫", label: "Instructor", desc: "I will teach a skill" },
                  ].map(({ value, emoji, label, desc }) => (
                    <button key={value} type="button" onClick={() => { set("signUpRole", value); set("churchStatus", ""); set("ward", ""); setInviteCodeError(""); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${form.signUpRole === value ? "border-amber-400 bg-amber-400/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="text-2xl mb-1.5">{emoji}</div>
                      <p className={`font-semibold text-sm ${form.signUpRole === value ? "text-amber-700" : "text-[#0F172A]"}`}>{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── STUDENT flow ── */}
              {form.signUpRole === "student" && (
                <div
                  className="space-y-4 overflow-hidden transition-all duration-300"
                  style={{ animation: "slideDown 0.25s ease-out" }}
                >
                  {/* Church membership question */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-3">Are you a member of the Church? *</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "member" as ChurchStatus, emoji: "⛪", label: "Yes, I'm a Member" },
                        { value: "friend" as ChurchStatus, emoji: "🤝", label: "Friend of the Church" },
                      ].map(({ value, emoji, label }) => (
                        <button key={value} type="button" onClick={() => { set("churchStatus", value); set("ward", ""); }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${form.churchStatus === value ? "bg-[#0F172A] border-[#0F172A] text-white" : "border-slate-300 text-slate-600 hover:border-slate-400 bg-white"}`}>
                          <span>{emoji}</span>
                          <span className="text-xs leading-tight">{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Member → Ward */}
                    {form.churchStatus === "member" && (
                      <div className="mt-3 overflow-hidden" style={{ animation: "slideDown 0.2s ease-out" }}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Your Ward *</label>
                        <select value={form.ward} onChange={(e) => set("ward", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                          <option value="">Select your ward</option>
                          {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Friend → Referral */}
                    {form.churchStatus === "friend" && (
                      <div className="mt-3 overflow-hidden" style={{ animation: "slideDown 0.2s ease-out" }}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">How did you hear about us? (optional)</label>
                        <input type="text" value={form.referralSource} onChange={(e) => set("referralSource", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder="e.g. A friend told me, social media…" />
                      </div>
                    )}
                  </div>

                  {/* Skill class picker */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Choose your skill class *</label>
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {ACTIVITIES.map((a) => (
                        <button key={a.id} type="button" onClick={() => set("activityId", a.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-xs text-left border transition-all ${form.activityId === a.id ? "bg-amber-400/10 border-amber-400 text-amber-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          <span>{a.icon}</span> {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── INSTRUCTOR flow ── */}
              {form.signUpRole === "instructor" && (
                <div className="space-y-4" style={{ animation: "slideDown 0.25s ease-out" }}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Instructor Invite Code *</label>
                    <input
                      type="text"
                      value={form.inviteCode}
                      onChange={(e) => { set("inviteCode", e.target.value); setInviteCodeError(""); }}
                      placeholder="Enter your invite code"
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${inviteCodeError ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                    />
                    {inviteCodeError && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">{inviteCodeError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Ward *</label>
                    <select value={form.ward} onChange={(e) => set("ward", e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                      <option value="">Select your ward</option>
                      {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Which skill do you instruct? *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACTIVITIES.map((a) => (
                        <button key={a.id} type="button" onClick={() => set("instructingActivityId", a.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-xs text-left border transition-all ${form.instructingActivityId === a.id ? "bg-amber-400/10 border-amber-400 text-amber-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          <span>{a.icon}</span> {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 border border-slate-300 text-slate-600 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={async () => { if (await validateStep2()) setStep(3); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0F172A] text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preferences ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Notification Preferences</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.notifyEmail} onChange={(e) => set("notifyEmail", e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-sm text-slate-600">Email reminders</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.notifyWhatsapp} onChange={(e) => set("notifyWhatsapp", e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-sm text-slate-600">WhatsApp reminders</span>
                  </label>
                </div>
              </div>

              {/* Summary card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm space-y-1.5">
                <p className="font-semibold text-[#0F172A] mb-2">Registration Summary</p>
                <p className="text-slate-600"><span className="text-slate-400">Name:</span> {form.name}</p>
                <p className="text-slate-600"><span className="text-slate-400">Role:</span> <span className="capitalize">{form.signUpRole}</span></p>
                {form.churchStatus && <p className="text-slate-600"><span className="text-slate-400">Status:</span> {form.churchStatus === "member" ? "⛪ Church Member" : "🤝 Friend of the Church"}</p>}
                {form.ward && <p className="text-slate-600"><span className="text-slate-400">Ward:</span> {form.ward}</p>}
                {form.activityId && <p className="text-slate-600"><span className="text-slate-400">Skill:</span> {ACTIVITIES.find(a => a.id === form.activityId)?.name}</p>}
                {form.instructingActivityId && <p className="text-slate-600"><span className="text-slate-400">Instructs:</span> {ACTIVITIES.find(a => a.id === form.instructingActivityId)?.name}</p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 border border-slate-300 text-slate-600 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-400 text-[#0F172A] font-semibold py-2.5 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-60">
                  {loading ? <div className="w-4 h-4 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-500 text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-amber-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
