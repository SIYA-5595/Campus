import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Users,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  GraduationCap,
  BookOpen,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  joining_year: number | null;
  end_year: number | null;
  year_of_study: string | null;
  is_approved: boolean;
  avatar_url: string | null;
  age: number | null;
  dob: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  father_name: string | null;
  gender: string | null;
}

type YearTab = "1st Year" | "2nd Year" | "3rd Year" | "Alumni";

const YEAR_TABS: { key: YearTab; label: string; icon: React.ReactNode; color: string; badgeColor: string }[] = [
  {
    key: "1st Year",
    label: "1st Year",
    icon: <BookOpen className="h-4 w-4" />,
    color: "from-blue-500 to-cyan-500",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    key: "2nd Year",
    label: "2nd Year",
    icon: <BookOpen className="h-4 w-4" />,
    color: "from-violet-500 to-purple-500",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  {
    key: "3rd Year",
    label: "3rd Year",
    icon: <GraduationCap className="h-4 w-4" />,
    color: "from-orange-500 to-amber-500",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  {
    key: "Alumni",
    label: "Alumni",
    icon: <Award className="h-4 w-4" />,
    color: "from-emerald-500 to-teal-500",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<YearTab>("1st Year");
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editJoiningYear, setEditJoiningYear] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editContact, setEditContact] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    const studentIds = (roleData || []).map((r: { user_id: string }) => r.user_id);

    if (studentIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", studentIds)
        .order("full_name");
        
      const processedStudents = (profileData || []).map((s: any) => {
        let yearOfStudy = "Alumni";
        if (s.joining_year) {
          const currentYear = new Date().getFullYear();
          const diff = currentYear - s.joining_year;
          if (diff === 0) yearOfStudy = "1st Year";
          else if (diff === 1) yearOfStudy = "2nd Year";
          else if (diff === 2) yearOfStudy = "3rd Year";
        }
        return {
          ...s,
          year_of_study: yearOfStudy,
        };
      });
      setStudents(processedStudents as unknown as Student[]);
    } else {
      setStudents([]);
    }
    setLoading(false);
  };

  const handleApprove = async (userId: string, approve: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: approve })
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success(approve ? "Student approved" : "Student suspended");
      fetchStudents();
    }
  };

  const handleEdit = (s: Student) => {
    setEditStudent(s);
    setEditName(s.full_name || "");
    setEditDept(s.department || "");
    setEditJoiningYear(s.joining_year?.toString() || "");
    setEditAge(s.age?.toString() || "");
    setEditContact(s.contact_number || "");
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editName,
        department: editDept || null,
        joining_year: parseInt(editJoiningYear) || null,
        age: parseInt(editAge) || null,
        contact_number: editContact || null,
      })
      .eq("user_id", editStudent.user_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Student updated");
      setEditStudent(null);
      fetchStudents();
    }
    setSaving(false);
  };

  const handleDelete = async (userId: string) => {
    const { error } = await supabase.rpc("admin_delete_user", { target_user_id: userId });
    if (error) toast.error(error.message);
    else {
      toast.success("Student removed");
      fetchStudents();
    }
  };

  // Count students per year tab (all students, pending + approved)
  const countForTab = (year: YearTab) =>
    students.filter((s) => (s.year_of_study || "").trim() === year).length;

  // Students for the active tab, filtered by search
  const tabStudents = students
    .filter((s) => (s.year_of_study || "").trim() === activeTab)
    .filter(
      (s) =>
        (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.department || "").toLowerCase().includes(search.toLowerCase())
    );

  const pendingCount = students.filter((s) => !s.is_approved).length;
  const activeTabMeta = YEAR_TABS.find((t) => t.key === activeTab)!;

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Student Management</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-warning mt-0.5">
              {pendingCount} student(s) pending approval
            </p>
          )}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Year Tabs */}
      <div className="flex gap-2 flex-wrap">
        {YEAR_TABS.map((tab) => {
          const count = countForTab(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 border
                ${
                  isActive
                    ? "bg-gradient-to-r " + tab.color + " text-white border-transparent shadow-lg scale-[1.02]"
                    : "bg-card/60 text-muted-foreground border-border/50 hover:bg-card hover:text-foreground hover:border-border"
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`
                  inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold
                  ${isActive ? "bg-white/25 text-white" : tab.badgeColor + " border"}
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Students Table Card */}
      <Card className="glass-card overflow-hidden">
        {/* Card accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${activeTabMeta.color}`} />

        <div className="px-6 py-4 flex items-center gap-3 border-b border-border/50">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${activeTabMeta.color} shadow-sm`}>
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-base leading-tight">
              {activeTab} Students
            </h3>
            <p className="text-xs text-muted-foreground">
              {tabStudents.length} student{tabStudents.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>

        <CardContent className="p-0">
          {tabStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <div className={`p-4 rounded-full bg-gradient-to-br ${activeTabMeta.color} opacity-20`}>
                <Users className="h-8 w-8 text-foreground" />
              </div>
              <p className="text-sm font-medium">No {activeTab} students found</p>
              <p className="text-xs opacity-70">
                {search ? "Try a different search term" : "Students will appear here once they submit their profile"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year of Study</TableHead>
                  <TableHead>Joining Year</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabStudents.map((s) => (
                  <TableRow key={s.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell
                      className="pl-6 font-medium cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setViewStudent(s)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${activeTabMeta.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {(s.full_name || "?")[0].toUpperCase()}
                        </div>
                        {s.full_name || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.department || "—"}</TableCell>
                    <TableCell>
                      {s.year_of_study ? (
                        <Badge variant="outline" className={activeTabMeta.badgeColor + " border text-xs"}>
                          {s.year_of_study}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{s.joining_year || "—"}</TableCell>
                    <TableCell className="text-sm">{s.contact_number || "—"}</TableCell>
                    <TableCell>
                      {s.is_approved ? (
                        <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex gap-1">
                        {!s.is_approved ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(s.user_id, true)}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(s.user_id, false)}
                            title="Suspend"
                          >
                            <XCircle className="h-4 w-4 text-warning" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.user_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Detail Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={(open) => !open && setViewStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Student Profile</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-4 pt-2">
              {/* Avatar Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${activeTabMeta.color} flex items-center justify-center text-white text-lg font-bold`}>
                  {(viewStudent.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold font-display">{viewStudent.full_name}</p>
                  <p className="text-xs text-muted-foreground">{viewStudent.email}</p>
                </div>
                <div className="ml-auto">
                  {viewStudent.is_approved ? (
                    <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-xs">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Department</Label>
                  <p className="font-medium text-sm">{viewStudent.department || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Year of Study</Label>
                  <p className="font-medium text-sm">
                    {viewStudent.year_of_study ? (
                      <Badge variant="outline" className={activeTabMeta.badgeColor + " border text-xs"}>
                        {viewStudent.year_of_study}
                      </Badge>
                    ) : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Joining Year</Label>
                  <p className="font-medium text-sm">{viewStudent.joining_year || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Year</Label>
                  <p className="font-medium text-sm">{viewStudent.end_year || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Age / DOB</Label>
                  <p className="font-medium text-sm">
                    {viewStudent.age}Y ({viewStudent.dob ? new Date(viewStudent.dob).toLocaleDateString() : "—"})
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Gender</Label>
                  <p className="font-medium text-sm capitalize">{viewStudent.gender || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Contact No.</Label>
                  <p className="font-medium text-sm">{viewStudent.contact_number || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">WhatsApp No.</Label>
                  <p className="font-medium text-sm">{viewStudent.whatsapp_number || "—"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Father's Name</Label>
                  <p className="font-medium text-sm">{viewStudent.father_name || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={editDept} onChange={(e) => setEditDept(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Joining Year</Label>
                <Input
                  type="number"
                  value={editJoiningYear}
                  onChange={(e) => setEditJoiningYear(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input value={editContact} onChange={(e) => setEditContact(e.target.value)} />
            </div>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="w-full gradient-primary text-primary-foreground"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}