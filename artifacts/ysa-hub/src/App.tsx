import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignUpPage from "@/pages/SignUpPage";
import MemberDashboard from "@/pages/MemberDashboard";
import QRCodePage from "@/pages/QRCodePage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import InstructorDashboard from "@/pages/instructor/InstructorDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ActivitiesPage from "@/pages/admin/ActivitiesPage";
import ActivityDetailPage from "@/pages/admin/ActivityDetailPage";
import MemberDirectoryPage from "@/pages/admin/MemberDirectoryPage";
import TransferRequestsPage from "@/pages/admin/TransferRequestsPage";
import RemindersPage from "@/pages/admin/RemindersPage";
import SaturdayRosterPage from "@/pages/admin/SaturdayRosterPage";

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

/** Blocks unauthenticated users */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Blocks non-admins */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Spinner />;
  return profile?.role === "admin" ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

/** Blocks non-instructors (admins also allowed).
 *  If profile is null (not created yet), don't redirect — let them see the page. */
function InstructorRoute({ children }: { children: React.ReactNode }) {
  const { profile, user, loading } = useAuth();
  if (loading) return <Spinner />;
  // No profile row yet — user needs to set up profile first
  if (user && !profile) return <Navigate to="/profile" replace />;
  if (profile?.role === "instructor" || profile?.role === "admin") return <>{children}</>;
  return <Navigate to="/dashboard" replace />;
}

/** Students only — redirects instructors/admins to their own home.
 *  If profile is null, let them through to see the dashboard. */
function StudentRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (profile?.role === "admin") return <Navigate to="/admin" replace />;
  if (profile?.role === "instructor") return <Navigate to="/instructor-dashboard" replace />;
  return <>{children}</>;
}

/** Redirects already-logged-in users to their role home */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <>{children}</>;
  if (profile?.role === "admin") return <Navigate to="/admin" replace />;
  if (profile?.role === "instructor") return <Navigate to="/instructor-dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth callback — must be public, no auth guard */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Public */}
      <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>} />

      {/* Authenticated shell */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Student */}
        <Route path="/dashboard" element={<StudentRoute><MemberDashboard /></StudentRoute>} />
        <Route path="/qr-code" element={<QRCodePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Instructor */}
        <Route path="/instructor-dashboard" element={<InstructorRoute><InstructorDashboard /></InstructorRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/activities" element={<AdminRoute><ActivitiesPage /></AdminRoute>} />
        <Route path="/admin/activities/:id" element={<AdminRoute><ActivityDetailPage /></AdminRoute>} />
        <Route path="/admin/members" element={<AdminRoute><MemberDirectoryPage /></AdminRoute>} />
        <Route path="/admin/transfers" element={<AdminRoute><TransferRequestsPage /></AdminRoute>} />
        <Route path="/admin/reminders" element={<AdminRoute><RemindersPage /></AdminRoute>} />
        <Route path="/admin/roster" element={<AdminRoute><SaturdayRosterPage /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
