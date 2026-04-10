import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, CheckCircle2, XCircle, Clock, 
  Search, FileText, ChevronRight, GraduationCap, 
  BookOpen, Award, Filter, FileJson, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";
import { DialogDescription } from "@/components/ui/dialog";

interface LeaveRequest {
  id: string;
  user_id: string;
  student_name: string;
  department: string;
  year_of_study: string;
  register_number: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_days: number;
  purpose: string;
  status: string;
  admin_note?: string;
  created_at: string;
}

type YearTab = "1st Year" | "2nd Year" | "3rd Year" | "All Students";

const YEAR_TABS: { key: YearTab; label: string; icon: any; color: string }[] = [
  { key: "1st Year", label: "1st Year", icon: BookOpen, color: "from-blue-500 to-cyan-500" },
  { key: "2nd Year", label: "2nd Year", icon: GraduationCap, color: "from-violet-500 to-purple-500" },
  { key: "3rd Year", label: "3rd Year", icon: Award, color: "from-orange-500 to-amber-500" },
  { key: "All Students", label: "All Students", icon: Users, color: "from-emerald-500 to-teal-500" },
];

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<YearTab>("1st Year");
  
  // Rejection handling
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Student detail view
  const [viewingStudent, setViewingStudent] = useState<{ id: string, name: string } | null>(null);
  const [studentHistory, setStudentHistory] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch leave requests");
    } else {
      // Auto-filter expired leaves (leaves that ended yesterday or earlier)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeLeaves = ((data as LeaveRequest[]) || []).filter(l => {
        const toDate = new Date(l.to_date);
        toDate.setHours(0, 0, 0, 0);
        return isAfter(toDate, addDays(today, -1)); // Keep if toDate is >= today
      });
      setLeaves(activeLeaves);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await (supabase as any)
      .from("leave_requests")
      .update({ status: "Approved" })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Leave approved");
      fetchLeaves();
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      setRejectError("Note is required");
      return;
    }

    if (!rejectingLeave) return;

    const { error } = await (supabase as any)
      .from("leave_requests")
      .update({ 
        status: "Rejected",
        admin_note: rejectNote.trim()
      })
      .eq("id", rejectingLeave.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Leave rejected");
      setRejectingLeave(null);
      setRejectNote("");
      setRejectError("");
      fetchLeaves();
    }
  };

  const openStudentHistory = async (userId: string, name: string) => {
    setViewingStudent({ id: userId, name });
    const { data, error } = await (supabase as any)
      .from("leave_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch history");
    } else {
      setStudentHistory((data as LeaveRequest[]) || []);
    }
  };

  const filteredLeaves = leaves
    .filter(l => activeTab === "All Students" || l.year_of_study === activeTab)
    .filter(l => 
      l.student_name.toLowerCase().includes(search.toLowerCase()) ||
      l.register_number.toLowerCase().includes(search.toLowerCase())
    );

  const pendingLeaves = filteredLeaves.filter(l => l.status === "Pending");
  const processedLeaves = filteredLeaves.filter(l => l.status !== "Pending");

  // Calculate leave days per student for display in the main list
  const getLeaveCount = (userId: string) => {
    return leaves
      .filter(l => l.user_id === userId && l.status === "Approved")
      .reduce((acc, curr) => acc + curr.total_days, 0);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Leave Management</h2>
          <p className="text-sm text-muted-foreground">Manage student leave applications and history</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student or reg no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 glass-card border-border/50"
          />
        </div>
      </div>

      {/* Year Tabs */}
      <div className="flex gap-2 flex-wrap">
        {YEAR_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = leaves.filter(l => (tab.key === "All Students" || l.year_of_study === tab.key) && l.status === "Pending").length;
          
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-300 border hvr-grow
                ${isActive
                  ? "bg-gradient-to-r " + tab.color + " text-white border-transparent shadow-lg scale-[1.02]"
                  : "bg-card/60 text-muted-foreground border-border/50 hover:bg-card hover:text-foreground hover:border-border"
                }
              `}
            >
              <tab.icon className={`h-4 w-4 ${isActive ? "" : "text-primary/70"}`} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-warning text-warning-foreground'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        {/* Pending Requests Table */}
        <Card className="glass-card shadow-xl overflow-hidden border-border/50">
          <div className="h-1 bg-warning" />
          <CardHeader className="py-4 px-6 border-b border-border/50 bg-warning/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <CardTitle className="text-base font-display">Pending Requests</CardTitle>
                  <p className="text-xs text-muted-foreground">Action required for {pendingLeaves.length} applications</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingLeaves.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 opacity-10 mb-2" />
                <p className="text-sm font-medium">No pending requests in this section</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="pl-6">Student Details</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Duration & Dates</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Total Approved</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeaves.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/20">
                      <TableCell className="pl-6">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => openStudentHistory(l.user_id, l.student_name)}
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                            {l.student_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">{l.student_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{l.register_number}</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all text-primary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/50 font-semibold text-[10px] uppercase">
                          {l.leave_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold">{l.total_days} Day(s)</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {format(new Date(l.from_date), "MMM d")} - {format(new Date(l.to_date), "MMM d")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <p className="text-xs text-muted-foreground truncate italic" title={l.purpose}>"{l.purpose}"</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold text-[10px] bg-primary/10 text-primary hover:bg-primary/20">
                          {getLeaveCount(l.user_id)} Days
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-success hover:bg-success hover:text-white"
                          onClick={() => handleApprove(l.id)}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-destructive hover:bg-destructive hover:text-white"
                          onClick={() => setRejectingLeave(l)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Processed Table */}
        <Card className="glass-card shadow-lg opacity-90">
          <CardHeader className="py-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Processed Leave Requests</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {processedLeaves.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs italic">No processed requests yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="pr-6">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedLeaves.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/20">
                      <TableCell className="pl-6 py-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => openStudentHistory(l.user_id, l.student_name)}
                        >
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                            {l.student_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-xs group-hover:text-primary transition-colors">{l.student_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{l.register_number}</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all text-primary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{l.leave_type}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={l.status === 'Approved' ? 'bg-success/10 text-success text-[10px]' : 'bg-destructive/10 text-destructive text-[10px]'}>
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {format(new Date(l.from_date), "MMM d")} - {format(new Date(l.to_date), "MMM d")}
                      </TableCell>
                      <TableCell className="pr-6 max-w-[200px]">
                        <p className="text-[10px] truncate text-muted-foreground italic">{l.admin_note || "—"}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingLeave} onOpenChange={(open) => !open && (setRejectingLeave(null), setRejectNote(""), setRejectError(""))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reject Leave Request
            </DialogTitle>
            <DialogDescription>
              A mandatory note is required to inform <strong>{rejectingLeave?.student_name}</strong> why their request was rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectNote">Reason for Rejection <span className="text-destructive">*</span></Label>
              <Textarea
                id="rejectNote"
                value={rejectNote}
                onChange={(e) => {
                  setRejectNote(e.target.value);
                  if (e.target.value.trim()) setRejectError("");
                }}
                placeholder="Enter rejection reason here..."
                className={cn("min-h-[100px]", rejectError && "border-destructive ring-destructive/20")}
              />
              {rejectError && <p className="text-[10px] font-bold text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-1"><AlertCircle className="h-3 w-3" /> Note is required</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingLeave(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel-style History Dialog */}
      <Dialog open={!!viewingStudent} onOpenChange={(open) => !open && setViewingStudent(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <div className="bg-emerald-700 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FileJson className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="font-display font-bold text-lg leading-none">Student Leave History</DialogTitle>
                <p className="text-emerald-100 text-xs mt-1">Export-style view for {viewingStudent?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-tighter">Total Approved</p>
                <p className="text-xl font-display font-bold leading-none">{studentHistory.filter(h => h.status === 'Approved').reduce((a,c)=>a+c.total_days,0)} <span className="text-xs font-normal opacity-70">Days</span></p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setViewingStudent(null)} className="text-white hover:bg-white/10 rounded-full h-8 w-8">
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white text-slate-800 p-6">
            <div className="border border-slate-200 rounded-sm shadow-sm overflow-hidden min-w-[800px]">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b-2 border-slate-200">
                    <TableHead className="w-10 text-center font-bold text-slate-600 border-r border-slate-200 text-xs uppercase">#</TableHead>
                    <TableHead className="font-bold text-slate-700 border-r border-slate-200 text-xs uppercase">Student Name</TableHead>
                    <TableHead className="font-bold text-slate-700 border-r border-slate-200 text-xs uppercase">Leave Type</TableHead>
                    <TableHead className="font-bold text-slate-700 border-r border-slate-200 text-xs uppercase">From Date</TableHead>
                    <TableHead className="font-bold text-slate-700 border-r border-slate-200 text-xs uppercase">To Date</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center border-r border-slate-200 text-xs uppercase whitespace-nowrap px-4">Total Days</TableHead>
                    <TableHead className="font-bold text-slate-700 border-r border-slate-200 text-xs uppercase">Purpose / Rejection Reason</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentHistory.map((h, i) => (
                    <TableRow key={h.id} className={cn("border-b border-slate-100 hover:bg-slate-50/50 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                      <TableCell className="text-center text-[11px] text-slate-500 font-medium border-r border-slate-100">{i + 1}</TableCell>
                      <TableCell className="font-bold text-[11px] text-slate-800 border-r border-slate-100 uppercase">{h.student_name}</TableCell>
                      <TableCell className="text-[11px] font-medium text-slate-800 border-r border-slate-100">{h.leave_type}</TableCell>
                      <TableCell className="text-[11px] text-slate-800 border-r border-slate-100">{format(new Date(h.from_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-[11px] text-slate-800 border-r border-slate-100">{format(new Date(h.to_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-center font-bold text-[11px] text-slate-800 border-r border-slate-100 px-4">{h.total_days}</TableCell>
                      <TableCell className="text-[11px] text-slate-800 border-r border-slate-100 py-3 leading-relaxed">
                        <div className="space-y-1">
                          <p><span className="text-[9px] uppercase font-bold text-slate-400 mr-1.5 border border-slate-200 px-1 rounded-sm">Purpose</span> <span className="text-slate-700">{h.purpose}</span></p>
                          {h.admin_note && (
                            <p className="text-destructive font-semibold italic"><span className="text-[9px] uppercase font-bold text-destructive/50 mr-1.5 border border-destructive/20 px-1 rounded-sm">Rejection Note</span> {h.admin_note}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-bold uppercase tracking-tighter px-1.5 h-4.5 border",
                          h.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          h.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                          'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {h.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-8 flex justify-between items-end border-t border-slate-200 pt-6">
               <div className="space-y-4">
                  <div className="flex gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Report Generated</p>
                      <p className="text-xs font-mono text-slate-700">{format(new Date(), "PPpp")}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department</p>
                      <p className="text-xs font-medium text-slate-700">{studentHistory[0]?.department || "B.Sc Information Technology"}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 max-w-md italic">
                    Certification: This report represents all historical leave data for the student within the College Campus Hub database system as of the generation date.
                  </div>
               </div>
               <div className="text-right space-y-4">
                  <div className="space-y-1 pr-6">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Authorized Signature</p>
                    <div className="h-10 w-48 border-b-2 border-slate-200 mt-2"></div>
                    <p className="text-[10px] text-slate-500 italic">Administrator / Head of Department</p>
                  </div>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
