import { useState, useEffect } from "react";
import { User, Phone, MapPin, Bell, Save, LogOut, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { WARDS, ACTIVITIES } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { profile, signOut, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isInstructor = profile?.role === "instructor";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    ward: "",
    activity_id: "",
    instructing_activity_id: "",
    notify_email: true,
    notify_whatsapp: false,
  });

  // Sync form whenever profile loads or changes
  useEffect(() => {
    setForm({
      name: profile?.name ?? "",
      phone: profile?.phone ?? "",
      ward: profile?.ward ?? "",
      activity_id: profile?.activity_id ?? "",
      instructing_activity_id: profile?.instructing_activity_id ?? "",
      notify_email: profile?.notify_email ?? true,
      notify_whatsapp: profile?.notify_whatsapp ?? false,
    });
  }, [profile]);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const uid = profile?.id ?? user?.id;
    if (!uid) { toast.error("Not signed in"); return; }
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: uid,
      email: profile?.email ?? user?.email ?? "",
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      ward: form.ward || null,
      activity_id: isInstructor ? null : (form.activity_id || null),
      instructing_activity_id: isInstructor ? (form.instructing_activity_id || null) : null,
      notify_email: form.notify_email,
      notify_whatsapp: form.notify_whatsapp,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      await refreshProfile();
      setEditing(false);
      toast.success("Profile saved!");
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  // Instructors show the class they teach; students show the class they attend
  const currentActivity = ACTIVITIES.find((a) =>
    isInstructor
      ? a.id === (profile?.instructing_activity_id ?? form.instructing_activity_id)
      : a.id === (profile?.activity_id ?? form.activity_id)
  );
  const displayEmail = profile?.email ?? user?.email ?? "—";
  const displayName = profile?.name ?? "Not set";

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
          <User className="w-5 h-5 text-amber-500" /> Profile
        </h1>
      </div>

      {/* Avatar / name card */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-6 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center text-[#0F172A] text-xl font-bold uppercase shrink-0">
          {(profile?.name ?? displayEmail).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-lg">{displayName}</p>
          <p className="text-sm text-white/60">{displayEmail}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {profile?.role && (
              <span className="bg-amber-400/20 text-amber-400 text-xs px-2 py-0.5 rounded-full capitalize">
                {profile.role}
              </span>
            )}
            {profile?.member_status && (
              <span className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full capitalize">
                {profile.member_status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* No profile row yet — prompt to fill in */}
      {!profile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-amber-800 font-medium">Profile not set up yet</p>
          <p className="text-xs text-amber-700 mt-1">Fill in your details below and tap Save to create your profile.</p>
          <button onClick={() => setEditing(true)} className="mt-2 text-xs font-semibold text-amber-700 underline">
            Fill in now →
          </button>
        </div>
      )}

      {/* Skill class info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
          {isInstructor ? "Skill You Instruct" : "Skill Class"}
        </p>
        {currentActivity ? (
          <div className="flex items-center gap-3">
            <div className="text-2xl">{currentActivity.icon}</div>
            <div>
              <p className="font-semibold text-[#0F172A]">{currentActivity.name}</p>
              <p className="text-xs text-slate-400 capitalize">
                {isInstructor ? "Instructor" : (profile?.member_status ?? "Student")}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No skill class assigned — edit profile to set one</p>
        )}
      </div>

      {/* Editable fields */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="p-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0F172A]">Personal Information</p>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-amber-600 font-medium">Edit</button>
          ) : (
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500">Cancel</button>
          )}
        </div>

        {editing ? (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Full Name *</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="+234 801 234 5678" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ward</label>
              <select value={form.ward} onChange={(e) => update("ward", e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                <option value="">Select your ward</option>
                {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-2 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {isInstructor ? "Skill You Instruct" : "Skill Class"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITIES.map((a) => {
                  const activeId = isInstructor ? form.instructing_activity_id : form.activity_id;
                  const isActive = activeId === a.id;
                  return (
                    <button key={a.id} type="button"
                      onClick={() => update(isInstructor ? "instructing_activity_id" : "activity_id", a.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg text-xs text-left border transition-all ${isActive ? "bg-amber-400/10 border-amber-400 text-amber-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      <span>{a.icon}</span> {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Notifications</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.notify_email} onChange={(e) => update("notify_email", e.target.checked)} className="accent-amber-500 w-4 h-4" />
                  <span className="text-sm text-slate-600">Email reminders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.notify_whatsapp} onChange={(e) => update("notify_whatsapp", e.target.checked)} className="accent-amber-500 w-4 h-4" />
                  <span className="text-sm text-slate-600">WhatsApp reminders</span>
                </label>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        ) : (
          <>
            {[
              { icon: User, label: "Name", value: profile?.name || "Not set" },
              { icon: Phone, label: "Phone", value: profile?.phone || "Not provided" },
              { icon: MapPin, label: "Ward", value: profile?.ward || "Not set" },
              { icon: Bell, label: "Email Notifications", value: profile?.notify_email ? "Enabled" : "Disabled" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm text-[#0F172A] font-medium">{value}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut}
        className="mt-4 w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium">
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
