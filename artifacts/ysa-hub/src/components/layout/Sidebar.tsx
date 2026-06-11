import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, QrCode, Bell, User, LogOut,
  Users, Calendar, ArrowRightLeft, Clock, BookOpen, ChevronRight, GraduationCap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVITIES } from "@/types";
import { toast } from "sonner";

const studentLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/qr-code", label: "My QR Code", icon: QrCode },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

const instructorLinks = [
  { to: "/instructor-dashboard", label: "My Dashboard", icon: GraduationCap },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

const adminLinks = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/activities", label: "Skills", icon: BookOpen },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/transfers", label: "Transfers", icon: ArrowRightLeft },
  { to: "/admin/reminders", label: "Reminders", icon: Clock },
  { to: "/admin/roster", label: "Saturday Roster", icon: Calendar },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
    toast.success("Signed out successfully");
  }

  const links =
    profile?.role === "admin"
      ? adminLinks
      : profile?.role === "instructor"
      ? instructorLinks
      : studentLinks;

  const instructingActivity = profile?.role === "instructor"
    ? ACTIVITIES.find((a) => a.id === profile.instructing_activity_id)
    : null;

  const roleLabel =
    profile?.role === "admin"
      ? "Administrator"
      : profile?.role === "instructor"
      ? `${instructingActivity?.name ?? "Instructor"}`
      : profile?.ward ?? "Member";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] text-white h-screen sticky top-0 shrink-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center text-[#0F172A] font-bold text-sm">
            YSA
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">YSA Skills Hub</p>
            <p className="text-xs text-white/50">Ojodu Stake</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-semibold text-sm uppercase">
            {profile?.name?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile?.name ?? "Loading…"}</p>
            <p className="text-xs text-white/50 truncate capitalize">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin" || to === "/dashboard" || to === "/instructor-dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-amber-400 text-[#0F172A] font-semibold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-40" />
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
