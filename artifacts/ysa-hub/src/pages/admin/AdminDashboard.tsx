import { useEffect, useState } from "react";
import {
  Users, CheckCircle, ArrowRightLeft, BookOpen, TrendingUp, Clock,
  Bell, Send, Calendar, History, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES, WARDS } from "@/types";
import type { Reminder } from "@/types";
import { getNextSaturday, formatDate, formatDateTime } from "@/utils/utils";
import { toast } from "sonner";

// ── types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalMembers: number;
  totalAttendanceToday: number;
  pendingTransfers: number;
  totalActivities: number;
  activityBreakdown: { name: string; count: number; icon: string }[];
}

interface AttSummary {
  activityId: string;
  name: string;
  icon: string;
  enrolled: number;
  present: number;
  instructorName?: string;
}

type Channel = "email" | "whatsapp" | "both";
type TargetType = "all" | "activity" | "ward";
type ScheduleOption = "now" | "friday-6pm" | "saturday-8am";

interface ReminderDraft {
  title: string;
  message: string;
  channel: Channel;
  targetType: TargetType;
  activityId: string;
  ward: string;
  schedule: ScheduleOption;
}

// ── constants ────────────────────────────────────────────────────────────────

const CHANNEL_PREFIX: Record<Channel, string> = {
  email: "[Email]",
  whatsapp: "[WhatsApp]",
  both: "[Both]",
};

const TEMPLATES = [
  {
    id: "session",
    label: "Saturday Session",
    title: "Saturday Skills Session",
    message:
      "📅 Reminder: Your Saturday Skills session holds tomorrow at 12:00 PM. Please come ready to learn and bring any required materials. We look forward to seeing you!",
  },
  {
    id: "checkin",
    label: "Check-In Notice",
    title: "Remember to Check In",
    message:
      "👋 Please remember to check in with your instructor when you arrive at today's session. Your attendance record is important!",
  },
  {
    id: "update",
    label: "Schedule Update",
    title: "Important Schedule Update",
    message:
      "ℹ️ There is an update to this week's schedule. Please speak with your instructor or contact the admin for full details.",
  },
];

const DEFAULT_DRAFT: ReminderDraft = {
  title: "",
  message: "",
  channel: "email",
  targetType: "all",
  activityId: "",
  ward: "",
  schedule: "saturday-8am",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function getMostRecentSaturday(): string {
  const today = new Date();
  const day = today.getDay();
  const daysBack = day === 6 ? 0 : ((day + 1) % 7);
  const sat = new Date(today);
  sat.setDate(today.getDate() - daysBack);
  return sat.toISOString().split("T")[0];
}

function getScheduledAt(opt: ScheduleOption): string {
  const now = new Date();
  if (opt === "now") return now.toISOString();
  if (opt === "friday-6pm") {
    const day = now.getDay();
    const daysUntil = (5 - day + 7) % 7 || 7;
    const d = new Date(now);
    d.setDate(now.getDate() + daysUntil);
    d.setHours(18, 0, 0, 0);
    return d.toISOString();
  }
  // saturday-8am
  const sat = getNextSaturday();
  sat.setHours(8, 0, 0, 0);
  return sat.toISOString();
}

function parseChannel(title: string): { badge: string; clean: string } {
  if (title.startsWith("[Both]"))
    return { badge: "Email + WhatsApp", clean: title.replace("[Both] ", "") };
  if (title.startsWith("[WhatsApp]"))
    return { badge: "WhatsApp", clean: title.replace("[WhatsApp] ", "") };
  if (title.startsWith("[Email]"))
    return { badge: "Email", clean: title.replace("[Email] ", "") };
  return { badge: "Email", clean: title };
}

function targetLabel(r: Reminder): string {
  if (r.recipient_type === "activity") {
    const act = ACTIVITIES.find((a) => a.id === r.activity_id);
    return act ? `${act.icon} ${act.name}` : "Skill Group";
  }
  if (r.recipient_type === "specific") {
    return `🏘 ${(r.recipient_ids ?? [])[0] ?? "Ward"}`;
  }
  return "All Members";
}

// ── component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [attSummary, setAttSummary] = useState<AttSummary[]>([]);
  const [pastSessions, setPastSessions] = useState<{ date: string; count: number }[]>([]);
  const [attLoading, setAttLoading] = useState(true);
  const [attDate, setAttDate] = useState(getMostRecentSaturday());

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remLoading, setRemLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<ReminderDraft>(DEFAULT_DRAFT);
  const [deliveryResults, setDeliveryResults] = useState<
    Record<string, { emailCount: number; whatsappCount: number; skipped: number; errors: string[] }>
  >({});
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});

  const nextSat = getNextSaturday();

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadAttendance(); }, [attDate]);
  useEffect(() => { loadReminders(); }, []);

  // ── load stats (existing) ──────────────────────────────────────────────────
  async function loadStats() {
    setStatsLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [members, attendanceToday, transfers, profiles] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }).eq("role", "student"),
      supabase.from("attendance").select("id", { count: "exact" }).eq("session_date", today),
      supabase.from("transfer_requests").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("profiles").select("activity_id").eq("role", "student"),
    ]);
    const breakdown: Record<string, number> = {};
    (profiles.data ?? []).forEach((p) => {
      if (p.activity_id) breakdown[p.activity_id] = (breakdown[p.activity_id] ?? 0) + 1;
    });
    setStats({
      totalMembers: members.count ?? 0,
      totalAttendanceToday: attendanceToday.count ?? 0,
      pendingTransfers: transfers.count ?? 0,
      totalActivities: ACTIVITIES.length,
      activityBreakdown: ACTIVITIES.map((a) => ({
        name: a.name, icon: a.icon, count: breakdown[a.id] ?? 0,
      })).sort((a, b) => b.count - a.count),
    });
    setStatsLoading(false);
  }

  // ── load attendance ────────────────────────────────────────────────────────
  async function loadAttendance() {
    setAttLoading(true);
    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);

    const [attRes, enrolledRes, histRes] = await Promise.all([
      supabase.from("attendance").select("*").eq("session_date", attDate),
      supabase.from("profiles").select("activity_id").eq("role", "student").not("activity_id", "is", null),
      supabase.from("attendance").select("session_date")
        .gte("session_date", fiveWeeksAgo.toISOString().split("T")[0])
        .lt("session_date", attDate)
        .order("session_date", { ascending: false }),
    ]);

    // per-activity present counts & who checked in
    const presentMap: Record<string, number> = {};
    const checkerMap: Record<string, string> = {};
    (attRes.data ?? []).forEach((a) => {
      presentMap[a.activity_id] = (presentMap[a.activity_id] ?? 0) + 1;
      if (a.checked_in_by && !checkerMap[a.activity_id]) checkerMap[a.activity_id] = a.checked_in_by;
    });

    // enrolled per activity
    const enrolledMap: Record<string, number> = {};
    (enrolledRes.data ?? []).forEach((p) => {
      if (p.activity_id) enrolledMap[p.activity_id] = (enrolledMap[p.activity_id] ?? 0) + 1;
    });

    // resolve checker names
    const checkerIds = [...new Set(Object.values(checkerMap))].filter(Boolean);
    const checkerNames: Record<string, string> = {};
    if (checkerIds.length > 0) {
      const { data: cp } = await supabase.from("profiles").select("id, name").in("id", checkerIds);
      (cp ?? []).forEach((c) => { checkerNames[c.id] = c.name; });
    }

    setAttSummary(
      ACTIVITIES.map((a) => ({
        activityId: a.id,
        name: a.name,
        icon: a.icon,
        enrolled: enrolledMap[a.id] ?? 0,
        present: presentMap[a.id] ?? 0,
        instructorName: checkerMap[a.id] ? checkerNames[checkerMap[a.id]] : undefined,
      }))
    );

    // past sessions history
    const histMap: Record<string, number> = {};
    (histRes.data ?? []).forEach((a) => {
      histMap[a.session_date] = (histMap[a.session_date] ?? 0) + 1;
    });
    setPastSessions(
      Object.entries(histMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 5)
        .map(([date, count]) => ({ date, count }))
    );

    setAttLoading(false);
  }

  // ── load reminders ─────────────────────────────────────────────────────────
  async function loadReminders() {
    setRemLoading(true);
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .order("scheduled_for", { ascending: false })
      .limit(8);
    if (data) setReminders(data as Reminder[]);
    setRemLoading(false);
  }

  // ── apply template ─────────────────────────────────────────────────────────
  function applyTemplate(id: string) {
    const t = TEMPLATES.find((t) => t.id === id);
    if (t) setDraft((d) => ({ ...d, title: t.title, message: t.message }));
  }

  // ── send reminder ──────────────────────────────────────────────────────────
  async function handleSend() {
    if (!draft.title.trim() || !draft.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (draft.targetType === "activity" && !draft.activityId) {
      toast.error("Please select a skill class");
      return;
    }
    if (draft.targetType === "ward" && !draft.ward) {
      toast.error("Please select a ward");
      return;
    }

    setSending(true);

    // 1. Fetch matching recipient profiles from Supabase
    let profileQuery = supabase
      .from("profiles")
      .select("id, name, email, phone, notify_email, notify_whatsapp")
      .eq("role", "student");

    if (draft.targetType === "activity") {
      profileQuery = profileQuery.eq("activity_id", draft.activityId);
    } else if (draft.targetType === "ward") {
      profileQuery = profileQuery.eq("ward", draft.ward);
    }

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) {
      toast.error("Failed to load recipients: " + profileError.message);
      setSending(false);
      return;
    }

    const recipients = (profiles ?? []).map((p) => ({
      name: p.name,
      email: p.email ?? undefined,
      phone: p.phone ?? undefined,
    }));

    if (recipients.length === 0) {
      toast.error("No members found for the selected target");
      setSending(false);
      return;
    }

    // 2. Insert the reminder record (sent: false until confirmed)
    const fullTitle = `${CHANNEL_PREFIX[draft.channel]} ${draft.title.trim()}`;
    const { data: inserted, error: insertError } = await supabase
      .from("reminders")
      .insert({
        title: fullTitle,
        message: draft.message.trim(),
        channel: draft.channel,
        target_type: draft.targetType,
        recipient_type: draft.targetType === "ward" ? "specific" : draft.targetType,
        scheduled_for: getScheduledAt(draft.schedule),
        activity_id: draft.targetType === "activity" ? draft.activityId : null,
        recipient_ids: draft.targetType === "ward" ? [draft.ward] : null,
        sent: false,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      toast.error("Failed to save reminder: " + (insertError?.message ?? "unknown error"));
      setSending(false);
      return;
    }

    const reminderId: string = inserted.id;

    // 3. If "send now", call the API server to dispatch emails/WhatsApp
    if (draft.schedule === "now") {
      try {
        const resp = await fetch("/api/reminders/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title.trim(),
            message: draft.message.trim(),
            channel: draft.channel,
            recipients,
          }),
        });

        // Check for non-2xx before trying to parse as delivery result
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({})) as { error?: string };
          throw new Error(errBody.error ?? `Server error (HTTP ${resp.status})`);
        }

        const delivery = await resp.json() as {
          emailCount: number;
          whatsappCount: number;
          errors: string[];
        };

        // 4. Mark sent in Supabase — best effort; log if it fails
        const { error: updateErr } = await supabase
          .from("reminders")
          .update({ sent: true })
          .eq("id", reminderId);
        if (updateErr) {
          console.error("Supabase sent-update failed:", updateErr.message);
        }

        // 5. Store delivery result and immediately mark the reminder as sent in local state.
        // Both ensure the "Sent" badge is shown right away without depending on loadReminders()
        // timing or the best-effort Supabase update above.
        setDeliveryResults((prev) => ({ ...prev, [reminderId]: delivery }));
        setReminders((prev) => {
          const sentReminder: Reminder = { ...(inserted as unknown as Reminder), sent: true };
          const exists = prev.some((r) => r.id === reminderId);
          if (exists) {
            return prev.map((r) => r.id === reminderId ? sentReminder : r);
          }
          return [sentReminder, ...prev];
        });

        const parts: string[] = [];
        if (delivery.emailCount > 0) parts.push(`${delivery.emailCount} email${delivery.emailCount !== 1 ? "s" : ""}`);
        if (delivery.whatsappCount > 0) parts.push(`${delivery.whatsappCount} WhatsApp`);
        const sentMsg = parts.length > 0 ? `Sent: ${parts.join(" + ")}` : "Dispatched (0 delivered — check recipient contact info)";
        const errs = (delivery.errors ?? []).length > 0 ? ` · ${delivery.errors.length} failed` : "";
        toast.success(`${sentMsg}${errs}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Reminder dispatch error:", msg);
        toast.error(`Dispatch failed: ${msg}`);
      }
    } else {
      toast.success(`Reminder scheduled for ${draft.schedule === "friday-6pm" ? "Friday 6 PM" : "Saturday 8 AM"}`);
    }

    setSending(false);
    setDraft(DEFAULT_DRAFT);
    setComposing(false);
    loadReminders();
  }

  async function deleteReminder(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reminder deleted");
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (statsLoading) {
    return (
      <div className="p-6 flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">YSA Skills Hub · Ojodu Stake</p>
      </div>

      {/* ── Next Saturday banner ── */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Next Saturday Session</p>
            <p className="text-xl font-bold">{formatDate(nextSat.toISOString())}</p>
            <p className="text-sm text-white/70 mt-1">12:00 PM – 4:00 PM</p>
          </div>
          <div className="w-12 h-12 bg-amber-400/20 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Students", value: stats?.totalMembers ?? 0, icon: Users, color: "bg-blue-50 text-blue-600" },
          { label: "Checked In Today", value: stats?.totalAttendanceToday ?? 0, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
          { label: "Pending Transfers", value: stats?.pendingTransfers ?? 0, icon: ArrowRightLeft, color: "bg-amber-50 text-amber-600" },
          { label: "Skill Classes", value: stats?.totalActivities ?? 0, icon: BookOpen, color: "bg-purple-50 text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-9 h-9 ${color.split(" ")[0]} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color.split(" ")[1]}`} />
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Students by Skill Class ── */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-sm text-[#0F172A]">Students by Skill Class</h2>
        </div>
        <div className="p-4 space-y-3">
          {stats?.activityBreakdown.map((item) => {
            const pct = (stats.totalMembers ?? 0) > 0
              ? Math.round((item.count / stats.totalMembers) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-[#0F172A]">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.count} students</p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Saturday Attendance Overview (read-only) ── */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-sm text-[#0F172A]">Saturday Attendance</h2>
            <span className="text-xs text-slate-400">read-only · marked by instructors</span>
          </div>
          <input
            type="date"
            value={attDate}
            onChange={(e) => setAttDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {attLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attSummary.map((a) => {
                const pct = a.enrolled > 0 ? Math.round((a.present / a.enrolled) * 100) : 0;
                return (
                  <div key={a.activityId} className="border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">{a.name}</p>
                        {a.instructorName ? (
                          <p className="text-xs text-slate-400">Marked by {a.instructorName}</p>
                        ) : (
                          <p className="text-xs text-slate-300 italic">Not yet marked</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-600">{a.present}</p>
                        <p className="text-xs text-slate-400">/ {a.enrolled}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{pct}% attendance · {a.enrolled - a.present} absent</p>
                  </div>
                );
              })}
            </div>

            {/* Past sessions history */}
            {pastSessions.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Past Sessions</p>
                </div>
                <div className="space-y-1.5">
                  {pastSessions.map(({ date, count }) => (
                    <div key={date} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">{formatDate(date + "T12:00:00")}</span>
                      <span className="font-semibold text-[#0F172A]">{count} checked in</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastSessions.length === 0 && attSummary.every((a) => a.present === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">
                No attendance data for this date. Instructors mark attendance during each session.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Send Reminder ── */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-sm text-[#0F172A]">Send Reminder</h2>
          </div>
          <button
            onClick={() => setComposing((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium bg-[#0F172A] text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {composing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {composing ? "Collapse" : "New Reminder"}
          </button>
        </div>

        {composing && (
          <div className="p-4 border-b border-slate-100 space-y-4">
            {/* Templates */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Quick Templates</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:border-amber-400 hover:text-amber-700 transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Saturday Session Reminder"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Message *</label>
              <textarea
                value={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                rows={3}
                placeholder="Your reminder message…"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            {/* Channel */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Channel</p>
              <div className="flex gap-2 flex-wrap">
                {(["email", "whatsapp", "both"] as Channel[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft((d) => ({ ...d, channel: c }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      draft.channel === c
                        ? "bg-[#0F172A] text-white border-[#0F172A]"
                        : "border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {c === "email" ? "📧 Email" : c === "whatsapp" ? "💬 WhatsApp" : "📧💬 Both"}
                  </button>
                ))}
              </div>
              {(draft.channel === "whatsapp" || draft.channel === "both") && (
                <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-amber-500 text-xs mt-0.5">⚠</span>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>Twilio sandbox:</strong> each recipient must first text{" "}
                    <code className="bg-amber-100 px-1 rounded">join &lt;sandbox-name&gt;</code>{" "}
                    to your Twilio number before they can receive WhatsApp messages. Recipients who haven't opted in will appear as failures.
                  </p>
                </div>
              )}
            </div>

            {/* Target */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Send To</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {([
                  { value: "all", label: "👥 All Members" },
                  { value: "activity", label: "🎓 Skill Group" },
                  { value: "ward", label: "🏘 Specific Ward" },
                ] as { value: TargetType; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDraft((d) => ({ ...d, targetType: opt.value, activityId: "", ward: "" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      draft.targetType === opt.value
                        ? "bg-[#0F172A] text-white border-[#0F172A]"
                        : "border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {draft.targetType === "activity" && (
                <select
                  value={draft.activityId}
                  onChange={(e) => setDraft((d) => ({ ...d, activityId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select skill class…</option>
                  {ACTIVITIES.map((a) => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
              )}
              {draft.targetType === "ward" && (
                <select
                  value={draft.ward}
                  onChange={(e) => setDraft((d) => ({ ...d, ward: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select ward…</option>
                  {WARDS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Schedule */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Schedule</p>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "now", label: "⚡ Send Now" },
                  { value: "friday-6pm", label: "📅 Friday 6 PM" },
                  { value: "saturday-8am", label: "🌅 Saturday 8 AM" },
                ] as { value: ScheduleOption; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDraft((d) => ({ ...d, schedule: opt.value }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      draft.schedule === opt.value
                        ? "bg-amber-400 text-[#0F172A] border-amber-400"
                        : "border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending…" : draft.schedule === "now" ? "Send Now" : "Schedule Reminder"}
            </button>
          </div>
        )}

        {/* Sent reminders log */}
        <div className="p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Recent Reminders</p>
          {remLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No reminders yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => {
                const { badge, clean } = parseChannel(r.title);
                const delivery = deliveryResults[r.id];
                const isSent = r.sent || !!delivery;
                const deliveryParts: string[] = [];
                if (delivery?.emailCount) deliveryParts.push(`${delivery.emailCount} email`);
                if (delivery?.whatsappCount) deliveryParts.push(`${delivery.whatsappCount} WA`);
                const errorsShown = expandedErrors[r.id] ?? false;
                return (
                  <div key={r.id} className="py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="text-sm font-medium text-[#0F172A] truncate">{clean}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${
                            isSent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {isSent ? "✓ Sent" : "Scheduled"}
                          </span>
                          {delivery && deliveryParts.length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                              {deliveryParts.join(" + ")} delivered
                            </span>
                          )}
                          {delivery && delivery.errors.length > 0 && (
                            <button
                              onClick={() => setExpandedErrors((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                              className="text-xs px-1.5 py-0.5 rounded border bg-red-50 text-red-600 border-red-200 shrink-0 hover:bg-red-100 transition-colors"
                            >
                              {delivery.errors.length} failed {errorsShown ? "▲" : "▼"}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{r.message}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{badge}</span>
                          <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{targetLabel(r)}</span>
                          <span className="text-xs text-slate-400">
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {formatDateTime(r.scheduled_for)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteReminder(r.id)}
                        className="shrink-0 w-7 h-7 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {delivery && delivery.errors.length > 0 && errorsShown && (
                      <div className="mt-2 ml-0 bg-red-50 border border-red-100 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-semibold text-red-700 mb-1.5">Delivery failures:</p>
                        {delivery.errors.map((e, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-red-400 text-xs mt-0.5 shrink-0">•</span>
                            <p className="text-xs text-red-700 leading-relaxed break-words">{e}</p>
                          </div>
                        ))}
                        {delivery.skipped > 0 && (
                          <p className="text-xs text-slate-500 mt-1 pt-1 border-t border-red-100">
                            {delivery.skipped} recipient{delivery.skipped !== 1 ? "s" : ""} skipped (no contact info for this channel)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
