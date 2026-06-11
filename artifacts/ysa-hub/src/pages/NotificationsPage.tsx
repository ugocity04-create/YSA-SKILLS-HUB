import { useEffect, useState } from "react";
import { Bell, Info, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types";
import { formatDateTime } from "@/utils/utils";
import { toast } from "sonner";

const typeConfig = {
  info: { icon: Info, color: "text-blue-500 bg-blue-50 border-blue-100" },
  success: { icon: CheckCircle, color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
  warning: { icon: AlertTriangle, color: "text-amber-500 bg-amber-50 border-amber-100" },
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    if (data) setNotifications(data as Notification[]);
    setLoading(false);

    // mark all as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
  }

  async function deleteNotification(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification deleted");
  }

  async function clearAll() {
    if (!profile) return;
    await supabase.from("notifications").delete().eq("user_id", profile.id);
    setNotifications([]);
    toast.success("All notifications cleared");
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" /> Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{notifications.filter((n) => !n.read).length} unread</p>
        </div>
        {notifications.length > 0 && (
          <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-medium text-slate-600 mb-1">No notifications</p>
          <p className="text-sm text-slate-400">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const config = typeConfig[n.type] ?? typeConfig.info;
            const Icon = config.icon;
            return (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border ${config.color} ${!n.read ? "ring-1 ring-amber-400/30" : ""}`}>
                <div className="mt-0.5 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A]">{n.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(n.created_at)}</p>
                </div>
                <button onClick={() => deleteNotification(n.id)} className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
