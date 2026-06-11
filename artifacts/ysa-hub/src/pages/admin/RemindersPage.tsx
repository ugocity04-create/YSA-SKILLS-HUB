import { useEffect, useState } from "react";
import { Clock, Plus, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { Reminder } from "@/types";
import { formatDateTime } from "@/utils/utils";
import { toast } from "sonner";

interface ReminderForm {
  title: string;
  message: string;
  scheduled_for: string;
  recipient_type: "all" | "activity" | "specific";
  activity_id: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReminderForm>({
    title: "",
    message: "",
    scheduled_for: "",
    recipient_type: "all",
    activity_id: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("reminders").select("*").order("scheduled_for", { ascending: false });
    if (data) setReminders(data as Reminder[]);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.message || !form.scheduled_for) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reminders").insert({
      title: form.title,
      message: form.message,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      recipient_type: form.recipient_type,
      activity_id: form.recipient_type === "activity" ? form.activity_id : null,
      sent: false,
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to create reminder");
    } else {
      toast.success("Reminder scheduled!");
      setShowForm(false);
      setForm({ title: "", message: "", scheduled_for: "", recipient_type: "all", activity_id: "" });
      load();
    }
  }

  async function deleteReminder(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reminder deleted");
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Reminders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Schedule session reminders for members</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Plus className="w-4 h-4" /> New Reminder
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-[#0F172A]">Schedule Reminder</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. Saturday Session Reminder" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message *</label>
                <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  placeholder="Your reminder message…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Send At *</label>
                <input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm((p) => ({ ...p, scheduled_for: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Recipients</label>
                <select value={form.recipient_type} onChange={(e) => setForm((p) => ({ ...p, recipient_type: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                  <option value="all">All Members</option>
                  <option value="activity">Specific Class</option>
                </select>
              </div>
              {form.recipient_type === "activity" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Skill Class</label>
                  <select value={form.activity_id} onChange={(e) => setForm((p) => ({ ...p, activity_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                    <option value="">Select class</option>
                    {ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-600 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0F172A] text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  {saving ? "Saving…" : "Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No reminders yet. Schedule one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm text-[#0F172A]">{r.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${r.sent ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {r.sent ? "Sent" : "Scheduled"}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">{r.recipient_type}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{r.message}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDateTime(r.scheduled_for)}
                  </p>
                </div>
                <button onClick={() => deleteReminder(r.id)}
                  className="shrink-0 w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
