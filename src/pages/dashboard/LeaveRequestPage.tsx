import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, ClipboardList, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface LeaveRequest {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_days: number;
  purpose: string;
  status: string;
  admin_note?: string;
  created_at: string;
}

export default function LeaveRequestPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    if (user) fetchLeaves();
  }, [user]);

  const fetchLeaves = async () => {
    setFetching(true);
    const { data, error } = await (supabase as any)
      .from("leave_requests")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch leave history");
    } else {
      setLeaves((data as LeaveRequest[]) || []);
    }
    setFetching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!fromDate || !toDate || !leaveType || !purpose) {
      toast.error("Please fill all fields");
      return;
    }

    const days = differenceInDays(toDate, fromDate) + 1;
    if (days <= 0) {
      toast.error("To Date must be after From Date");
      return;
    }

    setLoading(true);
    const { error } = await (supabase as any).from("leave_requests").insert({
      user_id: user.id,
      student_name: profile.full_name,
      department: profile.department,
      year_of_study: profile.year_of_study || "N/A",
      register_number: (profile as any).register_number || "N/A",
      leave_type: leaveType,
      from_date: format(fromDate, "yyyy-MM-dd"),
      to_date: format(toDate, "yyyy-MM-dd"),
      total_days: days,
      purpose: purpose,
      status: "Pending",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Leave request submitted successfully");
      setIsFormOpen(false);
      setLeaveType("");
      setFromDate(undefined);
      setToDate(undefined);
      setPurpose("");
      fetchLeaves();
    }
    setLoading(false);
  };

  const totalApprovedDays = leaves
    .filter((l) => l.status === "Approved")
    .reduce((acc, curr) => acc + curr.total_days, 0);

  const statusCounts = {
    Pending: leaves.filter((l) => l.status === "Pending").length,
    Approved: leaves.filter((l) => l.status === "Approved").length,
    Rejected: leaves.filter((l) => l.status === "Rejected").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold">Leave Request</h2>
          <p className="text-sm text-muted-foreground">Request leave and track your leave history</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setIsFormOpen(true)}
            className="gradient-primary text-white font-medium shadow-lg px-6"
          >
            <Plus className="mr-2 h-4 w-4" />
            Apply for Leave
          </Button>
          <Card className="bg-primary/5 border-primary/20 shrink-0">
            <CardContent className="py-2.5 px-4 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none mb-1">
                  Approved Days
                </p>
                <p className="text-lg font-display font-bold text-primary leading-none">
                  {totalApprovedDays} Days
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Leave History
          </h3>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(true)}
              className="h-8 text-xs font-semibold hover:bg-primary hover:text-white transition-all border-primary/20"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Request
            </Button>
            <Badge variant="outline" className="bg-muted text-muted-foreground h-8 px-3">
              {leaves.length} Total
            </Badge>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          </div>
        ) : leaves.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-4 rounded-full bg-muted/50">
                <ClipboardList className="h-8 w-8 text-muted-foreground opacity-30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No leave history found</p>
              <p className="text-xs text-muted-foreground opacity-70 mb-4">
                Your submitted leave requests will appear here
              </p>
              <Button
                onClick={() => setIsFormOpen(true)}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary hover:text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Apply for Leave Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-border/40 overflow-hidden">
            {/* Status summary bar */}
            <div className="flex items-stretch border-b border-border/40">
              {(
                [
                  {
                    label: "Pending",
                    count: statusCounts.Pending,
                    badgeCls: "text-warning bg-warning/10 border-warning/20",
                  },
                  {
                    label: "Approved",
                    count: statusCounts.Approved,
                    badgeCls: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                  },
                  {
                    label: "Rejected",
                    count: statusCounts.Rejected,
                    badgeCls: "text-destructive bg-destructive/10 border-destructive/20",
                  },
                ] as const
              ).map((s, i) => (
                <div
                  key={s.label}
                  className={`flex-1 flex items-center gap-2.5 px-5 py-3.5 ${i < 2 ? "border-r border-border/40" : ""}`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${s.badgeCls}`}
                  >
                    {s.label}
                  </span>
                  <span className="text-base font-bold tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    {["#", "Leave Type", "From Date", "To Date", "Days", "Purpose / Note", "Status"].map(
                      (col) => (
                        <th
                          key={col}
                          className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-3 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l, idx) => (
                    <tr
                      key={l.id}
                      className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      {/* # */}
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs w-10">
                        {idx + 1}
                      </td>

                      {/* Leave Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-xs uppercase tracking-wide">{l.leave_type}</span>
                      </td>

                      {/* From Date */}
                      <td className="px-4 py-3.5 text-xs font-medium tabular-nums whitespace-nowrap">
                        {format(new Date(l.from_date), "dd/MM/yyyy")}
                      </td>

                      {/* To Date */}
                      <td className="px-4 py-3.5 text-xs font-medium tabular-nums whitespace-nowrap">
                        {format(new Date(l.to_date), "dd/MM/yyyy")}
                      </td>

                      {/* Days */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-xs">{l.total_days}</span>
                      </td>

                      {/* Purpose / Note */}
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/60 rounded px-1 py-0.5 shrink-0 mt-0.5">
                              Purpose
                            </span>
                            <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {l.purpose}
                            </span>
                          </div>
                          {l.admin_note && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-destructive border border-destructive/30 rounded px-1 py-0.5 shrink-0 mt-0.5">
                                Note
                              </span>
                              <span className="text-xs text-destructive font-medium leading-relaxed">
                                {l.admin_note}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap",
                            l.status === "Approved"
                              ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                              : l.status === "Rejected"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : "bg-warning/15 text-warning border-warning/30"
                          )}
                        >
                          {l.status === "Approved" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : l.status === "Rejected" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* New Leave Request Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-primary to-accent" />
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-display font-bold flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                New Leave Request
              </DialogTitle>
              <DialogDescription className="text-sm">
                Fill in your leave details. Your profile information is automatically included.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Name
                  </Label>
                  <Input
                    value={profile?.full_name || ""}
                    readOnly
                    className="bg-muted/50 h-9 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Reg No
                  </Label>
                  <Input
                    value={(profile as any)?.register_number || ""}
                    readOnly
                    className="bg-muted/50 h-9 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaveType" className="text-xs font-semibold">
                  Leave Type
                </Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal Leave">Normal Leave</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Formal Leave">Formal Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "PP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "PP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-xs font-semibold">
                  Purpose
                </Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Briefly explain why you need leave"
                  className="min-h-[100px] resize-none text-sm"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 font-bold gradient-primary text-white shadow-lg"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
