import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Users, Edit, Trash2, CheckCircle, XCircle, Search } from "lucide-react";
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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      setStudents((profileData || []) as unknown as Student[]);
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
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("Student removed");
      fetchStudents();
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.department || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  const pendingCount = students.filter((s) => !s.is_approved).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Student Management</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-warning">{pendingCount} student(s) pending approval</p>
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

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year of Study</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => setViewStudent(s)}>
                      {s.full_name || "—"}
                    </TableCell>
                    <TableCell>{s.department || "—"}</TableCell>
                    <TableCell>{s.year_of_study || "—"}</TableCell>
                    <TableCell className="text-sm">{s.contact_number || "—"}</TableCell>
                    <TableCell>
                      {s.is_approved ? (
                        <Badge variant="outline" className="bg-success/20 text-success border-success/30">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
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
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Full Name</Label>
                  <p className="font-medium">{viewStudent.full_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                  <p className="font-medium truncate">{viewStudent.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Department</Label>
                  <p className="font-medium">{viewStudent.department || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Year of Study</Label>
                  <p className="font-medium">{viewStudent.year_of_study || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Joining Year</Label>
                  <p className="font-medium">{viewStudent.joining_year || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">End Year</Label>
                  <p className="font-medium">{viewStudent.end_year || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Age / DOB</Label>
                  <p className="font-medium">{viewStudent.age}Y ({viewStudent.dob ? new Date(viewStudent.dob).toLocaleDateString() : "—"})</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Gender</Label>
                  <p className="font-medium capitalize">{viewStudent.gender || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Contact No.</Label>
                  <p className="font-medium">{viewStudent.contact_number || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">WhatsApp No.</Label>
                  <p className="font-medium">{viewStudent.whatsapp_number || "—"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase">Father's Name</Label>
                  <p className="font-medium">{viewStudent.father_name || "—"}</p>
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
                <Input type="number" value={editJoiningYear} onChange={(e) => setEditJoiningYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input value={editContact} onChange={(e) => setEditContact(e.target.value)} />
            </div>
            <Button onClick={handleSaveEdit} disabled={saving} className="w-full gradient-primary text-primary-foreground">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}