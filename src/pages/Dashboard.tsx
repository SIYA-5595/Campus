import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import ApprovalsPage from "@/pages/dashboard/ApprovalsPage";
import AdminInvitePage from "@/pages/dashboard/AdminInvitePage";
import { ReactNode } from "react";

function StaffOnly({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role !== "staff" && role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function Dashboard() {
  const { user, role, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  // 0. Wait for profile for students
  if (role === "student" && !profile) return <PageLoader />;

  // 1. Show Finish Onboarding prompt for students
  if (role === "student" && profile && !profile.onboarding_completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="text-center space-y-6 max-w-md relative z-10">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-xl border border-primary/20">
            <span className="text-4xl">🚀</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold">Finish Onboarding</h2>
            <p className="text-muted-foreground">
              You're almost there! Complete your profile to get full access to the campus hub.
            </p>
          </div>
          <button
            onClick={() => navigate("/onboarding")}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-lg hover:shadow-primary/25 transition-all active:scale-95"
          >
            Complete Profile Now
          </button>
        </div>
      </div>
    );
  }

  // 2. Students must be approved to access dashboard (ONLY AFTER ONBOARDING)
  if (role === "student" && profile && !profile.is_approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="text-center space-y-6 max-w-md relative z-10">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-warning/10 flex items-center justify-center shadow-xl border border-warning/20">
            <span className="text-4xl">⏳</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold">Pending Approval</h2>
            <p className="text-muted-foreground">
              Your profile is being reviewed by our administrators. You'll receive full access once your account is activated.
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-primary hover:underline font-medium"
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
        <Route path="approvals" element={<StaffOnly><ApprovalsPage /></StaffOnly>} />
        <Route path="admin-management" element={<StaffOnly><AdminInvitePage /></StaffOnly>} />
      </Routes>
    </DashboardLayout>
  );
}