import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { UserCheck, CheckCircle, XCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  joining_year: number | null;
  is_approved: boolean;
  age: number | null;
  dob: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  father_name: string | null;
  gender: string | null;
}

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  joining_year: number | null;
  year_of_study: string | null;
  is_approved: boolean;
  age: number | null;
  dob: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  father_name: string | null;
  gender: string | null;
}

export default function ApprovalsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const fetchPendingStudents = useCallback(async () => {
    setLoading(true);
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_approved", false)
      .neq("email", "admin@demo.com")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
    } else {
      const processedStudents = (profileData || []).map((s: Profile) => {
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
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPendingStudents();
  }, [fetchPendingStudents]);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("user_id", userId);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Student account approved!");
      fetchPendingStudents();
    }
  };



  const handleDelete = async (userId: string) => {
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("Student application removed");
      fetchPendingStudents();
    }
  };

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold">Pending Approvals</h2>
        <p className="text-muted-foreground">Review and approve new student account requests.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Pending Requests ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-success mx-auto opacity-20" />
              <p className="text-sm text-muted-foreground">No pending approval requests found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Dept / Year</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell 
                      className={`font-medium ${s.department ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                      onClick={() => s.department && setViewStudent(s)}
                    >
                      <div className="flex flex-col">
                        <span>{s.full_name || "New Applicant"}</span>
                        {!s.department && (
                          <Badge variant="outline" className="w-fit text-[10px] h-4 px-1 bg-muted/50">Details Pending</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell className="text-sm">
                      {s.department || "—"} / {s.year_of_study || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{s.contact_number || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewStudent(s)}
                          title="View Details"
                          disabled={!s.department}
                        >
                          <Info className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(s.user_id)}
                          title="Approve"
                          disabled={!s.department}
                        >
                          <CheckCircle className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.user_id)}
                          title="Reject & Delete"
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
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

      {/* Detail Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={(open) => !open && setViewStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Onboarding Details</DialogTitle>
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
                <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">Department</Label>
                  <p className="font-medium">{viewStudent.department || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Joining Year</Label>
                  <p className="font-medium">{viewStudent.joining_year || "—"}</p>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => { handleApprove(viewStudent.user_id); setViewStudent(null); }}>
                  Approve Student
                </Button>
                <Button variant="outline" className="flex-1 text-destructive border-destructive/20" onClick={() => { handleDelete(viewStudent.user_id); setViewStudent(null); }}>
                  Reject & Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}