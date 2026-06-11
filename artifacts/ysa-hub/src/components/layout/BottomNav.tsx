import { NavLink } from "react-router-dom";
import { LayoutDashboard, QrCode, Bell, User, BookOpen, Users, ArrowRightLeft, Calendar, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const studentLinks = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/qr-code", label: "QR Code", icon: QrCode },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

const instructorLinks = [
  { to: "/instructor-dashboard", label: "Dashboard", icon: GraduationCap },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

const adminLinks = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/activities", label: "Skills", icon: BookOpen },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/transfers", label: "Transfers", icon: ArrowRightLeft },
  { to: "/admin/roster", label: "Roster", icon: Calendar },
];

export default function BottomNav() {
  const { profile } = useAuth();
  const links =
    profile?.role === "admin"
      ? adminLinks
      : profile?.role === "instructor"
      ? instructorLinks
      : studentLinks;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-white/10 z-50">
      <div className="flex">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin" || to === "/dashboard" || to === "/instructor-dashboard"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-all ${
                isActive ? "text-amber-400" : "text-white/50"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
