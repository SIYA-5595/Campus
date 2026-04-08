import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Clock,
  FileText,
  Calendar,
  BookOpen,
  Sun as SunIcon,
  LogOut,
  Users,
  Settings,
  GraduationCap,
  ShieldCheck,
  ClipboardList,
  UserCheck,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const studentItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Attendance", url: "/dashboard/attendance", icon: Clock },
  { title: "Documents", url: "/dashboard/documents", icon: FileText },
  { title: "Events", url: "/dashboard/events", icon: Calendar },
  { title: "Blogs", url: "/dashboard/blogs", icon: BookOpen },
  { title: "Holidays", url: "/dashboard/holidays", icon: SunIcon },
  { title: "Time Table", url: "/dashboard/timetable", icon: ClipboardList },
  { title: "Leave Request", url: "/dashboard/leave-request", icon: ClipboardList },
];

const staffItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", url: "/dashboard/approvals", icon: Users },
  { title: "Students", url: "/dashboard/students", icon: GraduationCap },
  { title: "Attendance Control", url: "/dashboard/attendance-control", icon: Clock },
  { title: "Documents Review", url: "/dashboard/documents-review", icon: FileText },
  { title: "Events", url: "/dashboard/events", icon: Calendar },
  { title: "Blogs", url: "/dashboard/blogs", icon: BookOpen },
  { title: "Holidays", url: "/dashboard/holidays", icon: SunIcon },
  { title: "Time Table", url: "/dashboard/timetable", icon: ClipboardList },
  { title: "Leave Management", url: "/dashboard/leave-management", icon: UserCheck },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isPrimaryAdmin = user?.email === "admin@demo.com";
  const items = role === "admin" || role === "staff" ? [
    ...staffItems,
    ...(isPrimaryAdmin ? [{ title: "Admin Mgmt", url: "/dashboard/admin-management", icon: ShieldCheck }] : [])
  ] : studentItems;
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              {!collapsed && <span className="font-display font-bold text-sm">My College</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-3 space-y-2">
          {!collapsed && profile && (
            <div className="px-2 py-1.5 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/50">
              <p className="text-sm font-semibold truncate">{profile.full_name || profile.email}</p>
              <p className="text-xs text-muted-foreground capitalize mb-1.5">{role}</p>
              {role === "student" && (
                <button
                  onClick={() => navigate("/onboarding")}
                  className="flex items-center gap-1.5 text-[11px] text-primary font-semibold hover:underline transition-all"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Profile
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {collapsed && role === "student" && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/onboarding")} className="rounded-full" title="Edit Profile">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}