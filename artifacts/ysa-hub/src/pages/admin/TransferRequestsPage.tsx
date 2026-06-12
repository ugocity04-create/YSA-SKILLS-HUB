import { useEffect, useState, useCallback } from "react";
import { ArrowRightLeft, Check, X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { TransferRequest, Profile } from "@/types";
import { formatDateTime } from "@/utils/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function activityName(id: string): string {
  return ACTIVITIES.find((a) => a.id === id)?.name ?? id.replace(/-/g, " ");
}

export default function TransferRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const [rejectTarget, setRejectTarget] = useState<{ id: string; request: TransferRequest } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("transfer_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load transfer requests: " + error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as TransferRequest[];
    setRequests(rows);

    const memberIds = [...new Set(rows.map((r) => r.member_id).filter(Boolean))];
    if (memberIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name, ward, email, activity_id")
        .in("id", memberIds);
      const map: Record<string, Profile> = {};
      (profileData ?? []).forEach((p: Profile) => { map[p.id] = p; });
      setProfiles(map);
    } else {
      setProfiles({});
    }

    setLoading(false);
  }, [statusFilter]);

  async function loadPendingCount() {
    const { count } = await supabase
      .from("transfer_requests")
      .select("id", { count: "exact" })
      .eq("status", "pending");
    setPendingCount(count ?? 0);
  }

  useEffect(() => {
    load();
    loadPendingCount();
  }, [load]);

  async function handleApprove(id: string, request: TransferRequest) {
    setActionLoading(true);
    const { error } = await supabase.from("transfer_requests").update({
      status: "approved",
      reviewed_by: profile?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) {
      toast.error("Action failed: " + error.message);
      setActionLoading(false);
      return;
    }

    await supabase.from("profiles")
      .update({ activity_id: request.to_activity_id })
      .eq("id", request.member_id);

    const member = profiles[request.member_id];
    const toName = activityName(request.to_activity_id);
    const fromName = activityName(request.from_activity_id);

    await supabase.from("notifications").insert({
      user_id: request.member_id,
      title: "Transfer Approved!",
      message: `Your transfer to ${toName} has been approved. Welcome to the class!`,
      type: "success",
      read: false,
      created_at: new Date().toISOString(),
    });

    if (member?.email) {
      fetch("/api/transfer-emails/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentEmail: member.email,
          studentName: member.name,
          fromActivity: fromName,
          toActivity: toName,
          decision: "approved",
        }),
      }).catch(() => {});
    }

    toast.success("Transfer approved");
    setActionLoading(false);
    load();
    loadPendingCount();
  }

  async function handleReject() {
    if (!rejectTarget) return;
    const { id, request } = rejectTarget;
    setActionLoading(true);

    const { error } = await supabase.from("transfer_requests").update({
      status: "rejected",
      reviewed_by: profile?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) {
      toast.error("Action failed: " + error.message);
      setActionLoading(false);
      return;
    }

    const member = profiles[request.member_id];
    const toName = activityName(request.to_activity_id);
    const fromName = activityName(request.from_activity_id);

    await supabase.from("notifications").insert({
      user_id: request.member_id,
      title: "Transfer Request Update",
      message: `Your transfer request to ${toName} was not approved at this time.${rejectNote ? ` Admin note: ${rejectNote}` : ""}`,
      type: "warning",
      read: false,
      created_at: new Date().toISOString(),
    });

    if (member?.email) {
      fetch("/api/transfer-emails/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentEmail: member.email,
          studentName: member.name,
          fromActivity: fromName,
          toActivity: toName,
          decision: "rejected",
          note: rejectNote.trim() || undefined,
        }),
      }).catch(() => {});
    }

    toast.success("Transfer rejected");
    setRejectTarget(null);
    setRejectNote("");
    setActionLoading(false);
    load();
    loadPendingCount();
  }

  const statusColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" /> Transfer Requests
          </h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 mt-0.5 font-medium">{pendingCount} pending review</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${statusFilter === s ? "bg-[#0F172A] text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            {s}
            {s === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-400 text-[#0F172A] rounded-full px-1.5 py-0.5 text-xs font-bold">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ArrowRightLeft className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No {statusFilter === "all" ? "" : statusFilter} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const fromName = activityName(req.from_activity_id);
            const toName = activityName(req.to_activity_id);
            const member = profiles[req.member_id];
            const isRejectTarget = rejectTarget?.id === req.id;
            return (
              <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-sm text-[#0F172A]">{member?.name ?? "Unknown Member"}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColors[req.status]}`}>
                        {req.status}
                      </span>
                    </div>
                    {member?.ward && <p className="text-xs text-slate-500 mb-1">{member.ward}</p>}
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap mb-1">
                      <span className="capitalize font-medium">{fromName}</span>
                      <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-amber-700 capitalize">{toName}</span>
                    </div>
                    {req.reason && <p className="text-xs text-slate-500 mt-1 italic">"{req.reason}"</p>}
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDateTime(req.created_at)}
                    </p>
                  </div>
                  {req.status === "pending" && !isRejectTarget && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(req.id, req)}
                        disabled={actionLoading}
                        className="w-8 h-8 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors disabled:opacity-50">
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setRejectTarget({ id: req.id, request: req }); setRejectNote(""); }}
                        disabled={actionLoading}
                        className="w-8 h-8 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {isRejectTarget && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-600 mb-1.5">Rejection note (optional)</p>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={2}
                      placeholder="Add a note for the student…"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setRejectTarget(null); setRejectNote(""); }}
                        className="flex-1 border border-slate-300 text-slate-600 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
                        {actionLoading ? "Rejecting…" : "Confirm Reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
