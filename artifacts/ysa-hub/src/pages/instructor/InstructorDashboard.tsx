import { useEffect, useState } from "react";
import { Users, CheckCircle, Clock, Send, MessageCircle, BarChart2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { Profile, Attendance } from "@/types";
import { getNextSaturday, formatDate } from "@/utils/utils";
import { toast } from "sonner";

interface StudentWithStats extends Profile {
  attendanceCount: number;
  attendanceRate: number;
}

interface WeeklyCount { label: string; count: number; date: string }

function getLastNSaturdays(n: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  const day = d.getDay();
  // go to most recent Saturday (or today if Saturday)
  d.setDate(d.getDate() - ((day + 1) % 7));
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    dates.unshift(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() - 7);
  }
  return dates;
}

export default function InstructorDashboard() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [checkedInToday, setCheckedInToday] = useState<Set<string>>(new Set());
  const [weeklyData, setWeeklyData] = useState<WeeklyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const activityId = profile?.instructing_activity_id;
  const activity = ACTIVITIES.find((a) => a.id === activityId);
  const todayStr = new Date().toISOString().split("T")[0];
  const nextSat = getNextSaturday();
  const last8 = getLastNSaturdays(8);

  useEffect(() => {
    if (profile?.instructing_activity_id) loadData();
  }, [profile]);

  async function loadData() {
    if (!activityId) return;
    setLoading(true);

    const [studentsRes, todayAttRes, histAttRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("activity_id", activityId).eq("role", "student"),
      supabase.from("attendance").select("member_id").eq("activity_id", activityId).eq("session_date", todayStr),
      supabase.from("attendance").select("member_id, session_date").eq("activity_id", activityId).in("session_date", last8),
    ]);

    const rawStudents = (studentsRes.data ?? []) as Profile[];
    const todaySet = new Set((todayAttRes.data ?? []).map((a: any) => a.member_id));
    setCheckedInToday(todaySet);

    // Per-student attendance over last 8 weeks
    const attMap: Record<string, Set<string>> = {};
    (histAttRes.data ?? []).forEach((a: any) => {
      if (!attMap[a.member_id]) attMap[a.member_id] = new Set();
      attMap[a.member_id].add(a.session_date);
    });

    const enriched: StudentWithStats[] = rawStudents.map((s) => {
      const count = attMap[s.id]?.size ?? 0;
      return { ...s, attendanceCount: count, attendanceRate: Math.round((count / 8) * 100) };
    });
    setStudents(enriched);

    // Weekly chart: count distinct members per Saturday
    const weekCounts: WeeklyCount[] = last8.map((date) => {
      const count = (histAttRes.data ?? []).filter((a: any) => a.session_date === date).length;
      const d = new Date(date);
      const label = d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
      return { label, count, date };
    });
    setWeeklyData(weekCounts);
    setLoading(false);
  }

  async function toggleCheckIn(student: Profile) {
    const alreadyIn = checkedInToday.has(student.id);
    setCheckingIn(student.id);
    if (alreadyIn) {
      await supabase.from("attendance").delete()
        .eq("member_id", student.id).eq("activity_id", activityId!).eq("session_date", todayStr);
      setCheckedInToday((prev) => { const s = new Set(prev); s.delete(student.id); return s; });
    } else {
      await supabase.from("attendance").insert({
        member_id: student.id, activity_id: activityId,
        check_in_time: new Date().toISOString(), session_date: todayStr,
      });
      setCheckedInToday((prev) => new Set([...prev, student.id]));
    }
    setCheckingIn(null);
  }

  async function sendReminder() {
    if (!profile || !activityId) return;
    const nextSatStr = formatDate(nextSat.toISOString());
    const { error } = await supabase.from("reminders").insert({
      title: `${activity?.name} – Saturday Reminder`,
      message: `Hi! Just a reminder that the ${activity?.name} class holds this Saturday, ${nextSatStr} at 12:00 PM. See you there!`,
      scheduled_for: new Date().toISOString(),
      recipient_type: "activity",
      activity_id: activityId,
      sent: false,
      created_at: new Date().toISOString(),
    });
    if (error) toast.error("Failed to schedule reminder");
    else toast.success("Reminder scheduled for all your students!");
  }

  const maxCount = Math.max(...weeklyData.map((w) => w.count), 1);
  const checkedInCount = checkedInToday.size;
  const capacity = activity?.capacity ?? 0;

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Welcome banner */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Instructor Dashboard</p>
            <h1 className="text-xl font-bold">Welcome, {profile?.name?.split(" ")[0]} 👋</h1>
            <p className="text-sm text-white/70 mt-1 flex items-center gap-2">
              <span className="text-lg">{activity?.icon}</span>
              {activity?.name ?? "Unassigned"} Instructor
            </p>
          </div>
          <div className="w-11 h-11 bg-amber-400/20 rounded-xl flex items-center justify-center">
            <span className="text-2xl">{activity?.icon ?? "🎓"}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-white/60">
            <Calendar className="w-3.5 h-3.5" /> Next: {formatDate(nextSat.toISOString())}
          </div>
          <button onClick={sendReminder}
            className="flex items-center gap-1.5 bg-amber-400 text-[#0F172A] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-300 transition-colors">
            <Send className="w-3.5 h-3.5" /> Send Reminder
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Students", value: `${students.length}${capacity ? `/${capacity}` : ""}`, icon: Users, color: "bg-blue-50 text-blue-600" },
          { label: "Checked In Today", value: checkedInCount, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
          { label: "Absent Today", value: students.length - checkedInCount, icon: Clock, color: "bg-amber-50 text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className={`w-7 h-7 ${color.split(" ")[0]} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-4 h-4 ${color.split(" ")[1]}`} />
            </div>
            <p className="text-lg font-bold text-[#0F172A]">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Today's check-in panel */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <CheckCircle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-sm text-[#0F172A]">Today's Check-In</h2>
            <span className="ml-auto text-xs text-slate-400">{todayStr}</span>
          </div>
          {students.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">No students enrolled yet.</p>
          ) : (
            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {students.map((s) => {
                const present = checkedInToday.has(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold uppercase shrink-0 ${present ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                      {s.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.member_status === "member" ? "⛪ Member" : "🤝 Friend"}</p>
                    </div>
                    <button
                      onClick={() => toggleCheckIn(s)}
                      disabled={checkingIn === s.id}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${present ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {checkingIn === s.id ? "…" : present ? "✓ Present" : "Mark Present"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attendance history chart */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <BarChart2 className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-sm text-[#0F172A]">Attendance — Last 8 Weeks</h2>
          </div>
          <div className="p-4">
            <div className="flex items-end gap-2 h-32">
              {weeklyData.map((w) => {
                const pct = maxCount > 0 ? (w.count / maxCount) * 100 : 0;
                const isToday = w.date === todayStr;
                return (
                  <div key={w.date} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs text-slate-500 font-medium">{w.count}</p>
                    <div className="w-full rounded-t-sm transition-all relative group" style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: isToday ? "#F59E0B" : "#0F172A", opacity: isToday ? 1 : 0.7 }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                        {w.count} present
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center leading-tight">{w.label}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">Amber bar = today</p>
          </div>
        </div>
      </div>

      {/* Student roster */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100">
          <Users className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-sm text-[#0F172A]">Student Roster</h2>
          <span className="ml-auto text-xs text-slate-400">{students.length} students</span>
        </div>
        {students.length === 0 ? (
          <p className="p-8 text-sm text-slate-400 text-center">No students enrolled in your class yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium hidden sm:table-cell">Ward</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-700 font-semibold text-xs uppercase shrink-0">
                          {s.name?.charAt(0) ?? "?"}
                        </div>
                        <span className="font-medium text-[#0F172A]">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{s.ward ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.member_status === "member" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                        {s.member_status === "member" ? "⛪ Member" : "🤝 Friend"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${s.attendanceRate}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{s.attendanceRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
