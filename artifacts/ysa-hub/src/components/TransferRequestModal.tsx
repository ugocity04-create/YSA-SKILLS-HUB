import { useState } from "react";
import { X, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { Profile } from "@/types";
import { toast } from "sonner";

interface Props {
  profile: Profile;
  currentActivityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function activityName(id: string): string {
  return ACTIVITIES.find((a) => a.id === id)?.name ?? id.replace(/-/g, " ");
}

export default function TransferRequestModal({ profile, currentActivityId, onClose, onSuccess }: Props) {
  const [toActivity, setToActivity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const availableActivities = ACTIVITIES.filter((a) => a.id !== currentActivityId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toActivity) {
      toast.error("Please select a destination class");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in to submit a transfer request");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("transfer_requests").insert({
      user_id: user.id,
      member_id: profile.id,
      from_activity_id: currentActivityId,
      to_activity_id: toActivity,
      reason: reason.trim() || null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to submit transfer request: " + error.message);
      return;
    }

    fetch("/api/transfer-emails/submitted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentEmail: profile.email,
        studentName: profile.name,
        fromActivity: activityName(currentActivityId),
        toActivity: activityName(toActivity),
        reason: reason.trim() || undefined,
      }),
    }).catch(() => {});

    toast.success("Transfer request submitted! Awaiting admin review.");
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-[#0F172A]">Request Class Transfer</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Class</label>
            <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 capitalize">
              {activityName(currentActivityId)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Transfer To *</label>
            <select
              value={toActivity}
              onChange={(e) => setToActivity(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              <option value="">Select a class</option>
              {availableActivities.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Why do you want to transfer?"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-600 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#0F172A] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60">
              {loading ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
