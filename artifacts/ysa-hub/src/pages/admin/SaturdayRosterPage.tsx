import { useEffect, useState } from "react";
import { Calendar, Download, CheckCircle, Clock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { Profile, Attendance } from "@/types";
import { getNextSaturday } from "@/utils/utils";

interface RosterEntry { member: Profile; checkedIn: boolean; checkInTime?: string }

function formatDateInput(d: Date) { return d.toISOString().split("T")[0]; }

export default function SaturdayRosterPage() {
  const [selectedActivity, setSelectedActivity] = useState<string>(ACTIVITIES[0].id);
  const [selectedDate, setSelectedDate] = useState(formatDateInput(getNextSaturday()));
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [selectedActivity, selectedDate]);

  async function load() {
    setLoading(true);
    const [membersRes, attRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("activity_id", selectedActivity).eq("role", "student").order("name"),
      supabase.from("attendance").select("*").eq("activity_id", selectedActivity).eq("session_date", selectedDate),
    ]);
    const members = (membersRes.data ?? []) as Profile[];
    const attendance = (attRes.data ?? []) as Attendance[];
    const attendanceMap = new Map(attendance.map((a) => [a.member_id, a.check_in_time]));
    setRoster(members.map((m) => ({ member: m, checkedIn: attendanceMap.has(m.id), checkInTime: attendanceMap.get(m.id) })));
    setLoading(false);
  }

  function exportCsv() {
    const rows = [["Name", "Ward", "Status", "Check-In Time"]];
    roster.forEach((r) => rows.push([r.member.name, r.member.ward ?? "", r.checkedIn ? "Present" : "Absent", r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : ""]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const actName = ACTIVITIES.find((a) => a.id === selectedActivity)?.name ?? selectedActivity;
    a.download = `roster-${actName.replace(/\s+/g, "-").toLowerCase()}-${selectedDate}.csv`;
    a.click();
  }

  const checkedInCount = roster.filter((r) => r.checkedIn).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-500" /> Saturday Roster</h1>
          <p className="text-sm text-slate-500 mt-0.5">Attendance sheet for each session</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 border border-slate-300 text-slate-600 text-sm px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          {ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
        </select>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total", value: roster.length, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Present", value: checkedInCount, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "Absent", value: roster.length - checkedInCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className={`w-7 h-7 rounded-lg ${color.split(" ")[1]} flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-4 h-4 ${color.split(" ")[0]}`} />
            </div>
            <p className="text-lg font-bold text-[#0F172A]">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : roster.length === 0 ? (
        <div className="text-center py-12 text-slate-400"><Users className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">No students in this class</p></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50">
          {roster.map(({ member, checkedIn, checkInTime }) => (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold uppercase shrink-0 ${checkedIn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                {member.name?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F172A]">{member.name}</p>
                <p className="text-xs text-slate-400">{member.ward} · {member.member_status === "member" ? "⛪ Member" : "🤝 Friend"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {checkedIn ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">
                      {checkInTime ? new Date(checkInTime).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : "Present"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                    Absent
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
