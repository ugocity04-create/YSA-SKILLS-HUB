import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QrCode, Calendar, Bell, ArrowRight, Clock, CheckCircle, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getNextSaturday, formatDate, formatDateTime } from "@/utils/utils";
import type { Attendance, TransferRequest } from "@/types";
import { ACTIVITIES as ACTIVITY_LIST } from "@/types";
import TransferRequestModal from "@/components/TransferRequestModal";

export default function MemberDashboard() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [pendingTransfer, setPendingTransfer] = useState<TransferRequest | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const nextSaturday = getNextSaturday();
  // Look up activity directly from the constant — no DB query needed
  const activity = ACTIVITY_LIST.find((a) => a.id === profile?.activity_id) ?? null;

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    try {
      const [attRes, transRes, notifRes] = await Promise.all([
        supabase.from("attendance").select("*").eq("member_id", profile.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("transfer_requests").select("*").eq("member_id", profile.id).eq("status", "pending").maybeSingle(),
        supabase.from("notifications").select("id").eq("user_id", profile.id).eq("read", false),
      ]);
      if (attRes.data) setAttendance(attRes.data as Attendance[]);
      if (transRes.data) setPendingTransfer(transRes.data as TransferRequest);
      if (notifRes.data) setUnreadCount(notifRes.data.length);
    } finally {
      setLoading(false);
    }
  }

  const totalSessions = attendance.length;
  const thisMonth = attendance.filter((a) => new Date(a.session_date).getMonth() === new Date().getMonth()).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F172A]">
          Welcome back, {profile?.name?.split(" ")[0] ?? "Member"} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{profile?.ward} · {profile?.stake}</p>
      </div>

      {/* Next session card */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Next Session</p>
            <p className="text-lg font-bold">{formatDate(nextSaturday.toISOString())}</p>
            <p className="text-sm text-white/70 mt-1">
              {activity ? `${activity.name}` : "No class assigned yet"} · 12:00 PM
            </p>
          </div>
          <div className="w-10 h-10 bg-amber-400/20 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4 text-xs text-white/60">
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 12:00 PM – 4:00 PM</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Sessions", value: totalSessions, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "This Month", value: thisMonth, icon: Calendar, color: "text-blue-600 bg-blue-50" },
          { label: "Notifications", value: unreadCount, icon: Bell, color: "text-amber-600 bg-amber-50" },
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link to="/qr-code" className="bg-amber-400 text-[#0F172A] rounded-xl p-4 flex items-center justify-between hover:bg-amber-300 transition-colors">
          <div>
            <p className="font-semibold text-sm">My QR Code</p>
            <p className="text-xs opacity-70 mt-0.5">For check-in</p>
          </div>
          <QrCode className="w-6 h-6 opacity-70" />
        </Link>
        <button onClick={() => setShowTransferModal(true)} className="bg-white border border-slate-200 text-[#0F172A] rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div>
            <p className="font-semibold text-sm">Transfer Class</p>
            <p className="text-xs text-slate-500 mt-0.5">Request a switch</p>
          </div>
          <ArrowRightLeft className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      {/* Pending transfer banner */}
      {pendingTransfer && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Transfer Request Pending</p>
          </div>
          <p className="text-xs text-amber-700">
            Awaiting admin review for your transfer request.
          </p>
        </div>
      )}

      {/* Recent attendance */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold text-sm text-[#0F172A]">Recent Attendance</h2>
          <span className="text-xs text-slate-400">{totalSessions} sessions</span>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No attendance records yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {attendance.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{ACTIVITY_LIST.find(ac => ac.id === a.activity_id)?.name ?? "Session"}</p>
                    <p className="text-xs text-slate-400">{formatDate(a.session_date)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{formatDateTime(a.check_in_time).split(",")[1]?.trim() ?? ""}</p>
              </div>
            ))}
          </div>
        )}
        {attendance.length > 5 && (
          <div className="p-3 border-t border-slate-100 text-center">
            <button className="text-xs text-amber-600 font-medium flex items-center gap-1 mx-auto">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {showTransferModal && profile && (
        <TransferRequestModal
          profile={profile}
          currentActivityId={profile.activity_id ?? ""}
          onClose={() => setShowTransferModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
