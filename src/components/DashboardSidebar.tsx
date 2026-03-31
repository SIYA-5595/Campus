import { useLocation } from "react-router-dom";
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
];

const staffItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", url: "/dashboard/approvals", icon: Users },
  { title: "Students", url: "/dashboard/students", icon: GraduationCap },
  { title: "Attendance Control", url: "/dashboard/attendance-control", icon: Clock },
  { title: "Documents Review", url: "/dashboard/documents-review", icon: FileText },
  { title: "Events", url: "/dashboard/events", icon: Calendar },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, role, profile, signOut } = useAuth();
  const location = useLocation();

  const isPrimaryAdmin = user?.email === "admin@demo.com";
  const items = role === "student" ? studentItems : [
    ...staffItems,
    ...(isPrimaryAdmin ? [{ title: "Admin Mgmt", url: "/dashboard/admin-management", icon: ShieldCheck }] : [])
  ];
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
              {!collapsed && <span className="font-display font-bold text-sm">Pope's College</span>}
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
            <div className="px-2 py-1">
              <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}