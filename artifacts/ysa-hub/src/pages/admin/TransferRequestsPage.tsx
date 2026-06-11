import { useEffect, useState } from "react";
import { ArrowRightLeft, Check, X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { TransferRequest, Profile } from "@/types";
import { formatDateTime } from "@/utils/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function TransferRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    let query = supabase.from("transfer_requests")
      .select("*, profiles(name, ward, email), from_activity:activities!transfer_requests_from_activity_id_fkey(name), to_activity:activities!transfer_requests_to_activity_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    if (data) setRequests(data as TransferRequest[]);
    setLoading(false);
  }

  async function handleAction(id: string, action: "approved" | "rejected", request: TransferRequest) {
    const { error } = await supabase.from("transfer_requests").update({
      status: action,
      reviewed_by: profile?.id,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { toast.error("Action failed"); return; }

    // If approved, update member's activity
    if (action === "approved") {
      await supabase.from("profiles").update({ activity_id: request.to_activity_id }).eq("id", request.member_id);

      // Send in-app notification
      const memberProfile = request.profiles as Profile;
      if (memberProfile) {
        const toName = ACTIVITIES.find((a) => a.id === request.to_activity_id)?.name ?? request.to_activity_id;
        await supabase.from("notifications").insert({
          user_id: request.member_id,
          title: "Transfer Approved!",
          message: `Your transfer to ${toName} has been approved. Welcome to the class!`,
          type: "success",
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    } else {
      const toName = ACTIVITIES.find((a) => a.id === request.to_activity_id)?.name ?? request.to_activity_id;
      await supabase.from("notifications").insert({
        user_id: request.member_id,
        title: "Transfer Request Update",
        message: `Your transfer request to ${toName} was not approved at this time.`,
        type: "warning",
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    toast.success(`Request ${action}`);
    load();
  }

  const statusColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-amber-500" /> Transfer Requests
        </h1>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${statusFilter === s ? "bg-[#0F172A] text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            {s}
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
            const from = (req.from_activity as any)?.name ?? req.from_activity_id?.replace(/-/g, " ");
            const to = (req.to_activity as any)?.name ?? req.to_activity_id?.replace(/-/g, " ");
            const member = req.profiles as Profile;
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
                    <p className="text-xs text-slate-500 mb-1">{member?.ward}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <span className="capitalize">{from}</span>
                      <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                      <span className="font-medium capitalize">{to}</span>
                    </div>
                    {req.reason && <p className="text-xs text-slate-500 mt-1.5 italic">"{req.reason}"</p>}
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDateTime(req.created_at)}
                    </p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleAction(req.id, "approved", req)}
                        className="w-8 h-8 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAction(req.id, "rejected", req)}
                        className="w-8 h-8 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
