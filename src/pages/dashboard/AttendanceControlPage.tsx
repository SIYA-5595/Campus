import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, MapPin, Settings, Eye, Edit, Trash2, Plus, Users, BookOpen, GraduationCap, Award, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ControlRecord {
  id: string;
  date: string;
  is_enabled: boolean;
  start_time: string;
  end_time: string;
  campus_lat: number;
  campus_lng: number;
  radius_meters: number;
  department: string | null;
  created_by: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  marked_at: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

export default function AttendanceControlPage() {
  const { user } = useAuth();
  const [controls, setControls] = useState<ControlRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string, year_of_study: string }>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDate, setViewDate] = useState<string | null>(null);
  const [mainView, setMainView] = useState<"control" | "reports">("control");
  const [reportMonth, setReportMonth] = useState((new Date().getMonth() + 1).toString());
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportRecords, setReportRecords] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState("present");

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formLat, setFormLat] = useState("11.0168");
  const [formLng, setFormLng] = useState("76.9558");
  const [formRadius, setFormRadius] = useState("200");
  const [formDepartment, setFormDepartment] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchReportData = async () => {
    const startDate = new Date(parseInt(reportYear), parseInt(reportMonth) - 1, 1);
    const endDate = new Date(parseInt(reportYear), parseInt(reportMonth), 0);
    
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .gte("date", format(startDate, "yyyy-MM-dd"))
      .lte("date", format(endDate, "yyyy-MM-dd"));
    
    setReportRecords((data || []) as AttendanceRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    if (mainView === "reports") {
      fetchReportData();
    }
  }, [mainView, reportMonth, reportYear]);

  const fetchData = async () => {
    setLoading(true);
    const { data: controlData } = await supabase
      .from("attendance_control")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);
    setControls((controlData || []) as ControlRecord[]);

    const { data: profileData } = await supabase.from("profiles").select("user_id, full_name, joining_year");
    const map: Record<string, { full_name: string, year_of_study: string }> = {};
    (profileData || []).forEach((p: any) => {
      let yearOfStudy = "Alumni";
      if (p.joining_year) {
        const currentYear = new Date().getFullYear();
        const diff = currentYear - p.joining_year;
        if (diff === 0) yearOfStudy = "1st Year";
        else if (diff === 1) yearOfStudy = "2nd Year";
        else if (diff === 2) yearOfStudy = "3rd Year";
      }
      map[p.user_id] = { full_name: p.full_name, year_of_study: yearOfStudy };
    });
    setProfiles(map);
    setLoading(false);
  };

  const handleCreateControl = async () => {
    if (!user) return;
    setSaving(true);

    const startDateTime = `${formDate}T${formStartTime}:00`;
    const endDateTime = `${formDate}T${formEndTime}:00`;

    const { error } = await supabase.from("attendance_control").insert({
      date: formDate,
      start_time: startDateTime,
      end_time: endDateTime,
      campus_lat: parseFloat(formLat),
      campus_lng: parseFloat(formLng),
      radius_meters: parseInt(formRadius),
      department: formDepartment || null,
      is_enabled: formEnabled,
      created_by: user.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Attendance control created!");
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const toggleControl = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("attendance_control")
      .update({ is_enabled: !enabled })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(enabled ? "Attendance disabled" : "Attendance enabled");
      fetchData();
    }
  };

  const deleteControl = async (id: string) => {
    const { error } = await supabase.from("attendance_control").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Control deleted");
      fetchData();
    }
  };

  const viewAttendance = async (date: string) => {
    setViewDate(date);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", date)
      .order("marked_at", { ascending: true });
    setAttendanceRecords((data || []) as AttendanceRecord[]);
  };

  const handleEditAttendance = async () => {
    if (!editRecord) return;
    const { error } = await supabase
      .from("attendance")
      .update({ status: editStatus })
      .eq("id", editRecord.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Attendance updated");
      setEditRecord(null);
      if (viewDate) viewAttendance(viewDate);
    }
  };

  const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Record deleted");
      if (viewDate) viewAttendance(viewDate);
    }
  };

  const YEAR_TABS = [
    { key: "All", label: "All Students", icon: <Users className="h-4 w-4" />, color: "from-gray-500 to-slate-500" },
    { key: "1st Year", label: "1st Year", icon: <BookOpen className="h-4 w-4" />, color: "from-blue-500 to-cyan-500" },
    { key: "2nd Year", label: "2nd Year", icon: <BookOpen className="h-4 w-4" />, color: "from-violet-500 to-purple-500" },
    { key: "3rd Year", label: "3rd Year", icon: <GraduationCap className="h-4 w-4" />, color: "from-orange-500 to-amber-500" },
    { key: "Alumni", label: "Alumni", icon: <Award className="h-4 w-4" />, color: "from-emerald-500 to-teal-500" },
  ];

  const filteredRecords = attendanceRecords.filter((r) => activeTab === "All" || profiles[r.user_id]?.year_of_study === activeTab);
  const reportFilteredRecords = reportRecords.filter((r) => activeTab === "All" || profiles[r.user_id]?.year_of_study === activeTab);

  const reportStatsRaw = reportFilteredRecords.reduce((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = { present: 0, absent: 0, total: 0 };
    acc[r.user_id].total++;
    if (r.status === "present") acc[r.user_id].present++;
    if (r.status === "absent") acc[r.user_id].absent++;
    return acc;
  }, {} as Record<string, { present: number; absent: number; total: number }>);

  // Get unique user IDs for the report table
  const reportUserIds = Object.keys(reportStatsRaw);


  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-2 border-b border-border/50 pb-4">
        <Button 
          variant={mainView === "control" ? "default" : "ghost"} 
          onClick={() => setMainView("control")}
          className={mainView === "control" ? "gradient-primary text-primary-foreground" : ""}
        >
          Daily Controls
        </Button>
        <Button 
          variant={mainView === "reports" ? "default" : "ghost"} 
          onClick={() => setMainView("reports")}
          className={mainView === "reports" ? "gradient-primary text-primary-foreground" : ""}
        >
          Monthly & Yearly Reports
        </Button>
      </div>

      {mainView === "control" ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold">Attendance Control</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New Control
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Create Attendance Window</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Department (optional)</Label>
                  <Input placeholder="e.g. CS, IT" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Campus Lat</Label>
                  <Input type="number" step="any" value={formLat} onChange={(e) => setFormLat(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Campus Lng</Label>
                  <Input type="number" step="any" value={formLng} onChange={(e) => setFormLng(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Radius (m)</Label>
                  <Input type="number" value={formRadius} onChange={(e) => setFormRadius(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
                <Label>Enable immediately</Label>
              </div>
              <Button onClick={handleCreateControl} disabled={saving} className="w-full gradient-primary text-primary-foreground">
                {saving ? "Creating..." : "Create Control"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Attendance Windows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {controls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance controls created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Window</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{format(new Date(c.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {format(new Date(c.start_time), "hh:mm a")} — {format(new Date(c.end_time), "hh:mm a")}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {c.campus_lat.toFixed(4)}, {c.campus_lng.toFixed(4)} ({c.radius_meters}m)
                      </span>
                    </TableCell>
                    <TableCell>{c.department || "All"}</TableCell>
                    <TableCell>
                      <Switch checked={c.is_enabled} onCheckedChange={() => toggleControl(c.id, c.is_enabled)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => viewAttendance(c.date)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteControl(c.id)}>
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

      {/* View Attendance Records */}
      {viewDate && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Attendance for {format(new Date(viewDate), "MMMM d, yyyy")}
              <Button variant="ghost" size="sm" onClick={() => setViewDate(null)} className="ml-auto">
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Year Tabs */}
            <div className="flex gap-2 flex-wrap mb-4">
              {YEAR_TABS.map((tab) => {
                const count = activeTab === tab.key ? filteredRecords.length : attendanceRecords.filter((r) => tab.key === "All" || profiles[r.user_id]?.year_of_study === tab.key).length;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
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
                        ${isActive ? "bg-white/25 text-white" : "border"}
                      `}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">No attendance records found for {activeTab}.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {profiles[r.user_id]?.full_name || r.user_id.slice(0, 8)}
                        <span className="ml-2 text-xs text-muted-foreground opacity-60">
                           ({profiles[r.user_id]?.year_of_study})
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(r.marked_at), "hh:mm a")}</TableCell>
                      <TableCell className="text-xs">
                        {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status as "present" | "absent"} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditRecord(r);
                              setEditStatus(r.status);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteAttendance(r.id)}>
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
      )}

      {/* Edit Attendance Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <p className="text-sm">{editRecord ? profiles[editRecord.user_id]?.full_name || editRecord.user_id : ""}</p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditAttendance} className="w-full gradient-primary text-primary-foreground">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-display font-bold">Attendance Reports</h2>
            <div className="flex gap-3">
              <Select value={reportMonth} onValueChange={setReportMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {format(new Date(2000, i, 1), "MMMM")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={reportYear} onValueChange={setReportYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Report for {format(new Date(parseInt(reportYear), parseInt(reportMonth) - 1, 1), "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Year Tabs */}
              <div className="flex gap-2 flex-wrap mb-6">
                {YEAR_TABS.map((tab) => {
                  const count = activeTab === tab.key ? reportFilteredRecords.length : reportRecords.filter((r) => tab.key === "All" || profiles[r.user_id]?.year_of_study === tab.key).length;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
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
                          ${isActive ? "bg-white/25 text-white" : "border"}
                        `}
                      >
                        {new Set(reportRecords.filter((r) => tab.key === "All" || profiles[r.user_id]?.year_of_study === tab.key).map(r => r.user_id)).size} students
                      </span>
                    </button>
                  );
                })}
              </div>

              {reportUserIds.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No attendance data recorded for {activeTab} in this period.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Year of Study</TableHead>
                      <TableHead className="text-center">Days Present</TableHead>
                      <TableHead className="text-center">Total Classes</TableHead>
                      <TableHead className="text-right">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportUserIds.map((userId) => {
                      const stats = reportStatsRaw[userId];
                      const percentage = Math.round((stats.present / stats.total) * 100);
                      return (
                        <TableRow key={userId}>
                          <TableCell className="font-medium">
                            {profiles[userId]?.full_name || userId.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 bg-muted rounded-full">
                              {profiles[userId]?.year_of_study || "Unknown"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-medium text-success">
                            {stats.present}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {stats.total}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${percentage >= 75 ? 'bg-success/20 text-success' : percentage >= 50 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'}`}>
                              {percentage}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
