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
import { Clock, MapPin, Settings, Eye, Edit, Trash2, Plus } from "lucide-react";
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
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDate, setViewDate] = useState<string | null>(null);
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

  const fetchData = async () => {
    setLoading(true);
    const { data: controlData } = await supabase
      .from("attendance_control")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);
    setControls((controlData || []) as ControlRecord[]);

    const { data: profileData } = await supabase.from("profiles").select("user_id, full_name");
    const map: Record<string, string> = {};
    (profileData || []).forEach((p: { user_id: string; full_name: string }) => {
      map[p.user_id] = p.full_name;
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

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
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
            {attendanceRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records for this date.</p>
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
                  {attendanceRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{profiles[r.user_id] || r.user_id.slice(0, 8)}</TableCell>
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
              <p className="text-sm">{editRecord ? profiles[editRecord.user_id] || editRecord.user_id : ""}</p>
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
    </div>
  );
}
