import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/StatCard";
import { Clock, FileText, Calendar, CheckCircle, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardHome() {
  const { user, role, profile } = useAuth();
  const [stats, setStats] = useState({ attendance: 0, documents: 0, events: 0, students: 0, pendingDocs: 0, pendingStudents: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      if (role === "student") {
        const [att, docs, evts] = await Promise.all([
          supabase.from("attendance").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("events").select("id", { count: "exact", head: true }),
        ]);
        setStats({ attendance: att.count || 0, documents: docs.count || 0, events: evts.count || 0, students: 0, pendingDocs: 0, pendingStudents: 0 });
      } else {
        const [att, docs, evts, pendingDocs, roleData] = await Promise.all([
          supabase.from("attendance").select("id", { count: "exact", head: true }),
          supabase.from("documents").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("user_roles").select("user_id").eq("role", "student"),
        ]);
        
        const studentIds = (roleData.data || []).map(r => r.user_id);
        let studentProfiles: any[] = [];
        
        if (studentIds.length > 0) {
          const { data } = await supabase
            .from("profiles")
            .select("is_approved")
            .in("user_id", studentIds);
          studentProfiles = data || [];
        }

        const pendingStudents = studentProfiles.filter((p: { is_approved: boolean | null }) => !p.is_approved).length;

        setStats({
          attendance: att.count || 0,
          documents: docs.count || 0,
          events: evts.count || 0,
          students: studentProfiles.length,
          pendingDocs: pendingDocs.count || 0,
          pendingStudents,
        });
      }
    };
    fetchStats();
  }, [user, role]);

  const isStaff = role === "staff" || role === "admin";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold">
          Welcome back, {profile?.full_name || (isStaff ? "Staff" : "Student")} 👋
        </h2>
        <p className="text-muted-foreground">
          {isStaff ? "Manage students, attendance, and documents." : "Here's what's happening at My College today."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isStaff ? (
          <>
            <StatCard title="Total Students" value={stats.students} icon={Users} />
            <StatCard title="Pending Approvals" value={stats.pendingStudents} icon={AlertTriangle} description="Students" />
            <StatCard title="Pending Documents" value={stats.pendingDocs} icon={FileText} description="Need review" />
            <StatCard title="Total Attendance" value={stats.attendance} icon={Clock} description="All records" />
          </>
        ) : (
          <>
            <StatCard title="Days Attended" value={stats.attendance} icon={Clock} description="This semester" />
            <StatCard title="Documents" value={stats.documents} icon={FileText} description="Uploaded" />
            <StatCard title="Upcoming Events" value={stats.events} icon={Calendar} />
            <StatCard title="Status" value="Active" icon={CheckCircle} description={`Role: ${role}`} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isStaff
                ? "Use the sidebar to manage attendance controls, review documents, or manage students."
                : "Navigate using the sidebar to mark attendance, upload documents, or view upcoming events."}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No new announcements at this time.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}