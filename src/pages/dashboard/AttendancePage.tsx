import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPosition, isWithinCampus, getDistanceMeters } from "@/lib/geofencing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MapPin, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  marked_at: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

interface AttendanceControl {
  id: string;
  date: string;
  is_enabled: boolean;
  start_time: string;
  end_time: string;
  campus_lat: number;
  campus_lng: number;
  radius_meters: number;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [control, setControl] = useState<AttendanceControl | null>(null);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("");

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [controlRes, recordsRes, todayRes] = await Promise.all([
      supabase.from("attendance_control").select("*").eq("date", today).limit(1).maybeSingle(),
      supabase.from("attendance").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
      supabase.from("attendance").select("id").eq("user_id", user.id).eq("date", today).maybeSingle(),
    ]);

    setControl(controlRes.data as AttendanceControl | null);
    setRecords((recordsRes.data || []) as AttendanceRecord[]);
    setAlreadyMarked(!!todayRes.data);
    setLoading(false);
  }, [user, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAttendance = async () => {
    if (!user || !control) return;

    // Check time window
    const now = new Date();
    const start = new Date(control.start_time);
    const end = new Date(control.end_time);

    if (now < start || now > end) {
      toast.error("Attendance window has expired or not yet started.");
      return;
    }

    setMarking(true);
    setLocationStatus("Getting your location...");

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      const distance = getDistanceMeters(latitude, longitude, control.campus_lat, control.campus_lng);
      const withinCampus = isWithinCampus(latitude, longitude, control.campus_lat, control.campus_lng, control.radius_meters);

      if (!withinCampus) {
        setLocationStatus(`You are ${Math.round(distance)}m from campus (max ${control.radius_meters}m)`);
        toast.error(`You are outside the campus radius. Distance: ${Math.round(distance)}m`);
        setMarking(false);
        return;
      }

      const { error } = await supabase.from("attendance").insert({
        user_id: user.id,
        control_id: control.id,
        date: today,
        latitude,
        longitude,
        status: "present",
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Attendance marked successfully!");
        setAlreadyMarked(true);
        setLocationStatus(`Verified: ${Math.round(distance)}m from campus`);
        fetchData();
      }
    } catch (err: unknown) {
      const message = err instanceof GeolocationPositionError
        ? "Location permission denied. Please enable GPS."
        : "Failed to get location.";
      toast.error(message);
      setLocationStatus(message);
    }
    setMarking(false);
  };

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  const canMark = control?.is_enabled && !alreadyMarked;
  const now = new Date();
  const timeWindowActive = control
    ? now >= new Date(control.start_time) && now <= new Date(control.end_time)
    : false;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-display font-bold">Attendance</h2>

      {/* Mark Attendance Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Today's Attendance — {format(new Date(), "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alreadyMarked ? (
            <div className="flex items-center gap-3 text-success">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">Attendance already marked for today!</span>
            </div>
          ) : !control?.is_enabled ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <XCircle className="h-6 w-6" />
              <span>Attendance is not enabled for today.</span>
            </div>
          ) : !timeWindowActive ? (
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="h-6 w-6" />
              <span>
                Attendance window: {format(new Date(control.start_time), "hh:mm a")} —{" "}
                {format(new Date(control.end_time), "hh:mm a")}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>GPS verification required (within {control.radius_meters}m of campus)</span>
              </div>
              <Button
                onClick={handleMarkAttendance}
                disabled={marking || !canMark}
                className="gradient-primary text-primary-foreground glow-primary"
              >
                {marking ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" /> Verifying Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" /> Mark Attendance
                  </>
                )}
              </Button>
            </div>
          )}
          {locationStatus && (
            <p className="text-sm text-muted-foreground">{locationStatus}</p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{format(new Date(r.date), "EEEE, MMMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground">
                      Marked at {format(new Date(r.marked_at), "hh:mm a")}
                    </p>
                  </div>
                  <StatusBadge status={r.status as "present" | "absent"} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
