import { useState, useEffect, useCallback } from "react";
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
import { Clock, MapPin, Settings, Eye, Edit, Trash2, Plus, Users, BookOpen, GraduationCap, Award, Calendar, FileText, XCircle, CheckCircle } from "lucide-react";
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
  const [profiles, setProfiles] = useState<Record<string, { full_name: string, year_of_study: string, department: string }>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDate, setViewDate] = useState<string | null>(null);
  const [mainView, setMainView] = useState<"control" | "reports">("control");
  const [reportMonth, setReportMonth] = useState((new Date().getMonth() + 1).toString());
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportRecords, setReportRecords] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("1st Year");
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState("present");
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formEndDate, setFormEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [useRange, setUseRange] = useState(false);
  const [studentFullHistory, setStudentFullHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rangeConfigs, setRangeConfigs] = useState<{ date: string; start: string; end: string }[]>([]);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formLat, setFormLat] = useState("8.7929534");
  const [formLng, setFormLng] = useState("78.1180229");
  const [formRadius, setFormRadius] = useState("200");
  const [formDepartment, setFormDepartment] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingControlId, setEditingControlId] = useState<string | null>(null);
  const [reportView, setReportView] = useState<"summary" | "detailed">("summary");

  useEffect(() => {
    if (useRange) {
      const dates = [];
      const curr = new Date(formDate);
      const end = new Date(formEndDate);
      while (curr <= end) {
        dates.push({
          date: format(curr, "yyyy-MM-dd"),
          start: formStartTime,
          end: formEndTime
        });
        curr.setDate(curr.getDate() + 1);
      }
      setRangeConfigs(dates);
    }
  }, [formDate, formEndDate, useRange, formStartTime, formEndTime]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchReportData = useCallback(async () => {
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
  }, [reportMonth, reportYear]);

  useEffect(() => {
    if (mainView === "reports") {
      fetchReportData();
    }
  }, [mainView, fetchReportData]);

  const fetchStudentFullHistory = useCallback(async (userId: string) => {
    setHistoryLoading(true);
    const startDate = `${reportYear}-01-01`;
    const endDate = `${reportYear}-12-31`;
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });
    setStudentFullHistory((data || []) as AttendanceRecord[]);
    setHistoryLoading(false);
  }, [reportYear]);

  useEffect(() => {
    if (selectedStudentDetail) {
      fetchStudentFullHistory(selectedStudentDetail);
    } else {
      setStudentFullHistory([]);
    }
  }, [selectedStudentDetail, fetchStudentFullHistory]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: controlData } = await supabase
      .from("attendance_control")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);
    setControls((controlData || []) as ControlRecord[]);

    const { data: profileData } = await supabase.from("profiles").select("user_id, full_name, department, year, joining_year");
    const map: Record<string, { full_name: string, year_of_study: string, department: string }> = {};
    const currentYear = new Date().getFullYear();
    
    (profileData || []).forEach((p: any) => {
      let yearOfStudy = p.year;
      if (!yearOfStudy && p.joining_year) {
        const diff = currentYear - p.joining_year;
        if (diff === 0) yearOfStudy = "1st Year";
        else if (diff === 1) yearOfStudy = "2nd Year";
        else if (diff === 2) yearOfStudy = "3rd Year";
        else yearOfStudy = "Alumni";
      } else if (!yearOfStudy) {
        yearOfStudy = "Alumni";
      }
      map[p.user_id] = { 
        full_name: p.full_name, 
        year_of_study: yearOfStudy, 
        department: p.department || "N/A" 
      };
    });
    setProfiles(map);
    setLoading(false);
  }, []);

  const handleSaveControl = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (editingControlId) {
        // Edit existing
        const startDateTime = `${formDate}T${formStartTime}:00`;
        const endDateTime = `${formDate}T${formEndTime}:00`;

        const { error } = await supabase.from("attendance_control").update({
          date: formDate,
          start_time: startDateTime,
          end_time: endDateTime,
          campus_lat: parseFloat(formLat),
          campus_lng: parseFloat(formLng),
          radius_meters: parseInt(formRadius),
          department: formDepartment || null,
          is_enabled: formEnabled,
        }).eq("id", editingControlId);

        if (error) throw error;
        toast.success("Attendance control updated!");
      } else {
        // Create new (single or range)
        const inserts = useRange 
          ? rangeConfigs.map(config => ({
              date: config.date,
              start_time: `${config.date}T${config.start}:00`,
              end_time: `${config.date}T${config.end}:00`,
              campus_lat: parseFloat(formLat),
              campus_lng: parseFloat(formLng),
              radius_meters: parseInt(formRadius),
              department: formDepartment || null,
              is_enabled: formEnabled,
              created_by: user.id,
            }))
          : [{
              date: formDate,
              start_time: `${formDate}T${formStartTime}:00`,
              end_time: `${formDate}T${formEndTime}:00`,
              campus_lat: parseFloat(formLat),
              campus_lng: parseFloat(formLng),
              radius_meters: parseInt(formRadius),
              department: formDepartment || null,
              is_enabled: formEnabled,
              created_by: user.id,
            }];

        const { error } = await supabase.from("attendance_control").insert(inserts);
        if (error) throw error;
        toast.success(`Attendance control created for ${inserts.length} day(s)!`);
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingControlId(null);
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormEndDate(format(new Date(), "yyyy-MM-dd"));
    setUseRange(false);
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormDepartment("");
    setFormEnabled(true);
  };

  const openEditControl = (control: ControlRecord) => {
    setEditingControlId(control.id);
    setFormDate(control.date);
    // Parse times (they are ISO strings)
    setFormStartTime(format(new Date(control.start_time), "HH:mm"));
    setFormEndTime(format(new Date(control.end_time), "HH:mm"));
    setFormLat(control.campus_lat.toString());
    setFormLng(control.campus_lng.toString());
    setFormRadius(control.radius_meters.toString());
    setFormDepartment(control.department || "");
    setFormEnabled(control.is_enabled);
    setDialogOpen(true);
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
    const confirmDelete = window.confirm("Are you sure? This will also delete all attendance records for this window.");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      // Manually delete associated attendance records first as an extra layer of safety
      const { error: attError } = await supabase.from("attendance").delete().eq("control_id", id);
      if (attError) throw attError;

      const { error } = await supabase.from("attendance_control").delete().eq("id", id);
      if (error) throw error;

      toast.success("Control and associated records deleted");
      fetchData();
    } catch (error: unknown) {
      toast.error("Deletion failed: " + (error as Error).message);
    } finally {
      setLoading(false);
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
    { key: "1st Year", label: "1st Year", icon: <BookOpen className="h-4 w-4" />, color: "from-blue-500 to-cyan-500" },
    { key: "2nd Year", label: "2nd Year", icon: <BookOpen className="h-4 w-4" />, color: "from-violet-500 to-purple-500" },
    { key: "3rd Year", label: "3rd Year", icon: <GraduationCap className="h-4 w-4" />, color: "from-orange-500 to-amber-500" },
    { key: "All", label: "All Students", icon: <Users className="h-4 w-4" />, color: "from-gray-500 to-slate-500" },
  ];

  const filteredRecords = attendanceRecords.filter((r) => {
    const studentYear = profiles[r.user_id]?.year_of_study;
    if (activeTab === "All") return studentYear !== "Alumni";
    return studentYear === activeTab;
  });

  const reportFilteredRecords = reportRecords.filter((r) => {
    const studentYear = profiles[r.user_id]?.year_of_study;
    if (activeTab === "All") return studentYear !== "Alumni";
    return studentYear === activeTab;
  });

  const reportStatsRaw = reportFilteredRecords.reduce((acc, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = { present: 0, absent: 0, total: 0 };
    acc[r.user_id].total++;
    if (r.status === "present") acc[r.user_id].present++;
    if (r.status === "absent") acc[r.user_id].absent++;
    return acc;
  }, {} as Record<string, { present: number; absent: number; total: number }>);

  const reportUserIds = Object.keys(reportStatsRaw);

  const downloadCSV = () => {
    const dataToExport = reportView === "summary" 
      ? reportUserIds.map(id => ({
          Student: profiles[id]?.full_name || id,
          Department: profiles[id]?.department || "N/A",
          Year: profiles[id]?.year_of_study || "Unknown",
          Present: reportStatsRaw[id].present,
          Total: reportStatsRaw[id].total,
          Percentage: Math.round((reportStatsRaw[id].present / reportStatsRaw[id].total) * 100) + "%"
        }))
      : reportFilteredRecords.map(r => ({
          Date: r.date,
          Time: format(new Date(r.marked_at), "hh:mm a"),
          Student: profiles[r.user_id]?.full_name || r.user_id,
          Department: profiles[r.user_id]?.department || "N/A",
          Status: r.status,
          Location: `${r.latitude}, ${r.longitude}`
        }));

    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]).join(",");
    const rows = dataToExport.map(obj => 
      Object.values(obj).map(val => `"${val}"`).join(",")
    ).join("\n");
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${reportMonth}_${reportYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground" onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" /> New Control
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-display">{editingControlId ? "Edit Attendance Window" : "Create Attendance Window"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!editingControlId && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-muted/30 rounded-lg">
                  <Switch checked={useRange} onCheckedChange={setUseRange} />
                  <Label>Use Date Range</Label>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{useRange ? "From Date" : "Date"}</Label>
                  <Input 
                    type="date" 
                    value={formDate} 
                    onChange={(e) => setFormDate(e.target.value)} 
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
                {useRange ? (
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input 
                      type="date" 
                      value={formEndDate} 
                      onChange={(e) => setFormEndDate(e.target.value)} 
                      onClick={(e) => (e.target as any).showPicker?.()}
                      className="cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Department (optional)</Label>
                    <Input placeholder="e.g. CS, IT" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} />
                  </div>
                )}
              </div>

              {useRange && (
                <div className="space-y-2">
                  <Label>Department (optional)</Label>
                  <Input placeholder="e.g. CS, IT" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input 
                    type="time" 
                    value={formStartTime} 
                    onChange={(e) => setFormStartTime(e.target.value)} 
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input 
                    type="time" 
                    value={formEndTime} 
                    onChange={(e) => setFormEndTime(e.target.value)} 
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  />
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

              {useRange && !editingControlId && rangeConfigs.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Daily Timing Preview & Edit
                    </span>
                    <span className="bg-muted px-2 py-0.5 rounded text-[10px] lowercase font-normal">
                      Range: {format(new Date(formDate), "dd/MM/yyyy")} to {format(new Date(formEndDate), "dd/MM/yyyy")}
                    </span>
                  </Label>
                  <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {rangeConfigs.map((config, idx) => (
                      <div key={config.date} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/30 border border-border/20">
                        <span className="text-[11px] font-medium w-32 font-mono">{format(new Date(config.date), "dd/MM/yyyy")} ({format(new Date(config.date), "EEE")})</span>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="time" 
                            value={config.start} 
                            className="h-8 py-1 text-xs w-28 bg-card border-border/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            onChange={(e) => {
                              const newConfigs = [...rangeConfigs];
                              newConfigs[idx].start = e.target.value;
                              setRangeConfigs(newConfigs);
                            }}
                            onClick={(e) => (e.target as any).showPicker?.()}
                          />
                          <span className="text-muted-foreground opacity-50">—</span>
                          <Input 
                            type="time" 
                            value={config.end} 
                            className="h-8 py-1 text-xs w-28 bg-card border-border/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                            onChange={(e) => {
                              const newConfigs = [...rangeConfigs];
                              newConfigs[idx].end = e.target.value;
                              setRangeConfigs(newConfigs);
                            }}
                            onClick={(e) => (e.target as any).showPicker?.()}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSaveControl} disabled={saving} className="w-full gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
                {saving ? "Saving..." : editingControlId ? "Update Control" : "Create All Windows"}
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
                        <Button variant="ghost" size="icon" onClick={() => openEditControl(c)}>
                          <Edit className="h-4 w-4" />
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
                const count = activeTab === tab.key 
                  ? filteredRecords.length 
                  : attendanceRecords.filter((r) => {
                      const studentYear = profiles[r.user_id]?.year_of_study;
                      if (tab.key === "All") return studentYear !== "Alumni";
                      return studentYear === tab.key;
                    }).length;
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
                  const studentIdsForTab = new Set(
                    reportRecords
                      .filter((r) => {
                        const studentYear = profiles[r.user_id]?.year_of_study;
                        if (tab.key === "All") return studentYear !== "Alumni";
                        return studentYear === tab.key;
                      })
                      .map((r) => r.user_id)
                  );
                  const count = studentIdsForTab.size;
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
                      {count} students
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
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={downloadCSV}
                    >
                      <FileText className="h-4 w-4 mr-2" /> Export CSV
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant={reportView === "summary" ? "secondary" : "ghost"} 
                        size="sm"
                        onClick={() => setReportView("summary")}
                      >
                        Summary View
                      </Button>
                      <Button 
                        variant={reportView === "detailed" ? "secondary" : "ghost"} 
                        size="sm"
                        onClick={() => setReportView("detailed")}
                      >
                        Detailed View
                      </Button>
                    </div>
                  </div>

                  {reportView === "summary" ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Department</TableHead>
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
                              <TableCell className="font-medium cursor-pointer hover:text-primary hover:underline" onClick={() => setSelectedStudentDetail(userId)}>
                                {profiles[userId]?.full_name || userId.slice(0, 8)}
                              </TableCell>
                              <TableCell>{profiles[userId]?.department || "N/A"}</TableCell>
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
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportFilteredRecords.sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime()).map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{format(new Date(r.date), "MMM d, yyyy")}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(r.marked_at), "hh:mm a")}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col cursor-pointer hover:text-primary hover:underline" onClick={() => setSelectedStudentDetail(r.user_id)}>
                                <span className="font-medium">{profiles[r.user_id]?.full_name || r.user_id.slice(0, 8)}</span>
                                <span className="text-xs text-muted-foreground">{profiles[r.user_id]?.year_of_study}</span>
                              </div>
                            </TableCell>
                            <TableCell>{profiles[r.user_id]?.department || "N/A"}</TableCell>
                            <TableCell className="text-xs">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={r.status as "present" | "absent"} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Detailed Sheet Dialog (Excel-like view) */}
      <Dialog open={!!selectedStudentDetail} onOpenChange={(open) => !open && setSelectedStudentDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-display font-bold">Student Attendance Sheet</DialogTitle>
                <p className="text-white/80 mt-1">Academic Year {reportYear}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedStudentDetail(null)}
                className="text-white hover:bg-white/20 rounded-full h-8 w-8"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Student Info Bar */}
            {selectedStudentDetail && (
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-lg font-bold shadow-lg">
                  {(profiles[selectedStudentDetail]?.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{profiles[selectedStudentDetail]?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{profiles[selectedStudentDetail]?.department} — {profiles[selectedStudentDetail]?.year_of_study}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Overall Attendance</p>
                  <p className="text-xl font-bold font-display text-primary">
                    {Math.round((studentFullHistory.filter(r => r.status === 'present').length / (studentFullHistory.length || 1)) * 100)}%
                  </p>
                </div>
              </div>
            )}

            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground">Calculating statistics...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Summary Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-emerald-500/10 border-emerald-500/20 overflow-hidden group">
                    <div className="h-1 w-full bg-emerald-500 opacity-30" />
                    <CardContent className="h-24 flex items-center gap-4 p-4">
                      <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-500/70 font-semibold uppercase">Total Present</p>
                        <p className="text-2xl font-bold text-emerald-600">{studentFullHistory.filter(r => r.status === 'present').length} Days</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-rose-500/10 border-rose-500/20 overflow-hidden group">
                    <div className="h-1 w-full bg-rose-500 opacity-30" />
                    <CardContent className="h-24 flex items-center gap-4 p-4">
                      <div className="bg-rose-500/20 p-2 rounded-lg text-rose-500 group-hover:scale-110 transition-transform">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-rose-500/70 font-semibold uppercase">Total Absent</p>
                        <p className="text-2xl font-bold text-rose-600">{studentFullHistory.filter(r => r.status === 'absent').length} Days</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-500/10 border-blue-500/20 overflow-hidden group">
                    <div className="h-1 w-full bg-blue-500 opacity-30" />
                    <CardContent className="h-24 flex items-center gap-4 p-4">
                      <div className="bg-blue-500/20 p-2 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-500/70 font-semibold uppercase">Total Classes</p>
                        <p className="text-2xl font-bold text-blue-600">{studentFullHistory.length} Days</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Excel Sheet View */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-semibold flex items-center gap-2">
                       <Calendar className="h-4 w-4" /> 
                       Monthly Attendance Details ({format(new Date(parseInt(reportYear), parseInt(reportMonth)-1, 1), 'MMMM')})
                    </h4>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border/50">EXCEL FORMAT</span>
                  </div>
                  <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm bg-card">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-40 border-r border-border/50 py-3 uppercase text-[10px] tracking-widest font-bold">Date & Day</TableHead>
                          <TableHead className="py-3 uppercase text-[10px] tracking-widest font-bold">Status & Information</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                          const yearInt = parseInt(reportYear);
                          const monthInt = parseInt(reportMonth);
                          const lastDayOfMonth = new Date(yearInt, monthInt, 0).getDate();
                          if (day > lastDayOfMonth) return null;

                          const dateStr = format(new Date(yearInt, monthInt-1, day), 'yyyy-MM-dd');
                          const record = studentFullHistory.find(r => r.date === dateStr);
                          
                          return (
                            <TableRow key={day} className={`hover:bg-muted/30 transition-colors border-b border-border/30 h-10 ${record?.status === 'present' ? 'bg-emerald-50/20' : record?.status === 'absent' ? 'bg-rose-50/20' : ''}`}>
                              <TableCell className="font-medium text-xs border-r border-border/40 py-2">
                                {format(new Date(yearInt, monthInt-1, day), 'MMM d, EEEE')}
                              </TableCell>
                              <TableCell className="py-2">
                                {record ? (
                                  <div className="flex items-center gap-4">
                                    <StatusBadge status={record.status as 'present' | 'absent'} />
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">
                                        <Clock className="h-3 w-3" /> {format(new Date(record.marked_at), 'hh:mm a')}
                                      </span>
                                      {record.latitude && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">
                                          <MapPin className="h-3 w-3" /> {record.latitude.toFixed(4)}, {record.longitude?.toFixed(4)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground/30 font-light italic">Records not found for this date</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
