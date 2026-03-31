import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageLoader } from "@/components/LoadingSpinner";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import AttendancePage from "@/pages/dashboard/AttendancePage";
import DocumentsPage from "@/pages/dashboard/DocumentsPage";
import EventsPage from "@/pages/dashboard/EventsPage";
import BlogsPage from "@/pages/dashboard/BlogsPage";
import HolidaysPage from "@/pages/dashboard/HolidaysPage";
import AttendanceControlPage from "@/pages/dashboard/AttendanceControlPage";
import DocumentsReviewPage from "@/pages/dashboard/DocumentsReviewPage";
import StudentsPage from "@/pages/dashboard/StudentsPage";
import { ReactNode } from "react";

function StaffOnly({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role !== "staff" && role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function Dashboard() {
  const { user, role, loading, profile } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  // Students must be approved to access dashboard
  if (role === "student" && profile && !profile.is_approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-2xl font-display font-bold">Account Pending Approval</h2>
          <p className="text-muted-foreground">
            Your account has been created but is waiting for admin approval. You'll be able to access the portal once an administrator activates your account.
          </p>
          <button
            onClick={() => { import("@/integrations/supabase/client").then(m => m.supabase.auth.signOut()); }}
            className="text-primary hover:underline text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DashboardHome />} />
        {/* Student routes */}
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="holidays" element={<HolidaysPage />} />
        {/* Staff/Admin routes - protected */}
        <Route path="attendance-control" element={<StaffOnly><AttendanceControlPage /></StaffOnly>} />
        <Route path="documents-review" element={<StaffOnly><DocumentsReviewPage /></StaffOnly>} />
        <Route path="students" element={<StaffOnly><StudentsPage /></StaffOnly>} />
      </Routes>
    </DashboardLayout>
  );
}
