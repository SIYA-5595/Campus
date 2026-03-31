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
  year: string | null;
  is_approved: boolean;
  avatar_url: string | null;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editYear, setEditYear] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // Get all student user_ids from user_roles
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
      setStudents((profileData || []) as Student[]);
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
    setEditName(s.full_name);
    setEditDept(s.department || "");
    setEditYear(s.year || "");
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editName,
        department: editDept || null,
        year: editYear || null,
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
    // Delete profile (cascade should handle roles)
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("Student removed");
      fetchStudents();
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
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
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell>{s.department || "—"}</TableCell>
                    <TableCell>{s.year || "—"}</TableCell>
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
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CS">Computer Science</SelectItem>
                  <SelectItem value="IT">Information Technology</SelectItem>
                  <SelectItem value="ECE">Electronics</SelectItem>
                  <SelectItem value="EEE">Electrical</SelectItem>
                  <SelectItem value="MECH">Mechanical</SelectItem>
                  <SelectItem value="CIVIL">Civil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={editYear} onValueChange={setEditYear}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                </SelectContent>
              </Select>
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
