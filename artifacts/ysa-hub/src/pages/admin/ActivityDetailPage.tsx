import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, CheckCircle, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { Profile, Attendance } from "@/types";
import { formatDate, formatDateTime } from "@/utils/utils";
import { toast } from "sonner";

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const activity = ACTIVITIES.find((a) => a.id === id);
  const [members, setMembers] = useState<Profile[]>([]);
  const [instructor, setInstructor] = useState<Profile | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInId, setCheckInId] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function load() {
    setLoading(true);
    const [membersRes, instructorRes, attRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("activity_id", id).eq("role", "student"),
      supabase.from("profiles").select("*").eq("instructing_activity_id", id).eq("role", "instructor").maybeSingle(),
      supabase.from("attendance").select("*, profiles(name, ward)").eq("activity_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (membersRes.data) setMembers(membersRes.data as Profile[]);
    if (instructorRes.data) setInstructor(instructorRes.data as Profile);
    if (attRes.data) setRecentAttendance(attRes.data as Attendance[]);
    setLoading(false);
  }

  async function handleManualCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!checkInId.trim()) return;
    setCheckingIn(true);
    const today = new Date().toISOString().split("T")[0];
    const { data: member } = await supabase.from("profiles").select("id").eq("id", checkInId.trim()).maybeSingle();
    if (!member) { toast.error("Member not found"); setCheckingIn(false); return; }
    const { error } = await supabase.from("attendance").insert({
      member_id: member.id, activity_id: id,
      check_in_time: new Date().toISOString(), session_date: today,
    });
    setCheckingIn(false);
    if (error) { toast.error("Check-in failed"); return; }
    toast.success("Member checked in!");
    setCheckInId("");
    load();
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link to="/admin/activities" className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F172A] mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Skills
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="text-4xl">{activity?.icon ?? "📚"}</div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">{activity?.name ?? id}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{members.length} students enrolled</p>
          {instructor && (
            <p className="text-sm text-slate-500 mt-0.5">👨‍🏫 Instructor: <span className="font-medium text-[#0F172A]">{instructor.name}</span></p>
          )}
        </div>
      </div>

      {/* Check-in panel */}
      <div className="bg-[#0F172A] text-white rounded-xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-4 h-4 text-amber-400" />
          <p className="font-semibold text-sm">Manual Attendance Check-In</p>
        </div>
        <form onSubmit={handleManualCheckIn} className="flex gap-2">
          <input value={checkInId} onChange={(e) => setCheckInId(e.target.value)}
            placeholder="Paste member user ID from QR scan…"
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button type="submit" disabled={checkingIn}
            className="bg-amber-400 text-[#0F172A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60">
            {checkingIn ? "…" : "Check In"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-sm text-[#0F172A]">Students ({members.length})</h2>
            </div>
            {members.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No students enrolled yet.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-700 font-semibold text-sm uppercase">
                      {m.name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{m.name}</p>
                      <p className="text-xs text-slate-400">
                        {m.ward ?? "—"} · {m.member_status === "member" ? "⛪ Member" : "🤝 Friend"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-sm text-[#0F172A]">Recent Check-ins</h2>
            </div>
            {recentAttendance.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No attendance records yet.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentAttendance.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{(a.profiles as Profile)?.name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-400">{formatDate(a.session_date)}</p>
                    </div>
                    <p className="text-xs text-slate-400">{formatDateTime(a.check_in_time).split(",")[1]?.trim()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
