import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, FileText, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TimeTableEntry {
  id: string;
  academic_year: string;
  department: string;
  year: string;
  semester: string;
  day: string;
  period: number;
  time_slot: string;
  subject_name: string;
  staff_name: string;
  classroom: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const YEARS = ["1st Year", "2nd Year", "3rd Year"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil"];

export default function TimeTablePage() {
  const { role, profile } = useAuth();
  const isAdmin = role === "admin" || role === "staff";

  const [entries, setEntries] = useState<TimeTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection/Filtering state
  const [selectedDept, setSelectedDept] = useState<string>(profile?.department || DEPARTMENTS[0]);
  const [selectedYear, setSelectedYear] = useState<string>(profile?.year_of_study || profile?.year || YEARS[0]);
  const [selectedSem, setSelectedSem] = useState<string>("1");
  
  // Sync profile data when it loads
  useEffect(() => {
    if (profile) {
      if (profile.department) setSelectedDept(profile.department);
      if (profile.year_of_study || profile.year) {
        setSelectedYear(profile.year_of_study || profile.year || YEARS[0]);
      }
    }
  }, [profile]);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeTableEntry | null>(null);
  
  const [formData, setFormData] = useState({
    academic_year: "2023-2024",
    department: DEPARTMENTS[0],
    year: YEARS[0],
    semester: "1",
    day: "Monday",
    period: 1,
    time_slot: "09:00 - 10:00",
    subject_name: "",
    staff_name: "",
    classroom: ""
  });

  const fetchTimeTable = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("timetables")
      .select("*")
      .eq("department", selectedDept)
      .eq("year", selectedYear)
      .eq("semester", selectedSem);
    
    if (error) {
      toast.error("Failed to load timetable");
    } else {
      setEntries((data || []) as TimeTableEntry[]);
    }
    setLoading(false);
  }, [selectedDept, selectedYear, selectedSem]);

  useEffect(() => {
    fetchTimeTable();
  }, [fetchTimeTable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEntry) {
        const { error } = await supabase
          .from("timetables")
          .update(formData)
          .eq("id", editingEntry.id);
        if (error) throw error;
        toast.success("Time table updated successfully");
      } else {
        const { error } = await supabase
          .from("timetables")
          .insert([formData]);
        if (error) throw error;
        toast.success("Entry added successfully");
      }
      setIsDialogOpen(false);
      fetchTimeTable();
    } catch (error: unknown) {
      const err = error as any;
      if (err.code === "23505") {
          toast.error("Slot already assigned for this class!");
      } else {
          toast.error(err.message || "An error occurred");
      }
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    try {
      const { error } = await supabase
        .from("timetables")
        .delete()
        .eq("id", editingEntry.id);
      if (error) throw error;
      toast.success("Entry deleted successfully");
      setIsDeleteDialogOpen(false);
      setIsDialogOpen(false);
      fetchTimeTable();
    } catch (error: unknown) {
      toast.error((error as Error).message || "An error occurred");
    }
  };

  const getEntryForSlot = (day: string, period: number) => {
    return entries.find(e => e.day === day && e.period === period);
  };

  const openAddDialog = (day?: string, period?: number) => {
    setEditingEntry(null);
    setFormData({
      academic_year: "2023-2024",
      department: selectedDept,
      year: selectedYear,
      semester: selectedSem,
      day: day || "Monday",
      period: period || 1,
      time_slot: period ? getTimeSlotForPeriod(period) : "09:00 - 10:00",
      subject_name: "",
      staff_name: "",
      classroom: ""
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry: TimeTableEntry) => {
    setEditingEntry(entry);
    setFormData({
      academic_year: entry.academic_year,
      department: entry.department,
      year: entry.year,
      semester: entry.semester,
      day: entry.day,
      period: entry.period,
      time_slot: entry.time_slot,
      subject_name: entry.subject_name,
      staff_name: entry.staff_name,
      classroom: entry.classroom
    });
    setIsDialogOpen(true);
  };

  const getTimeSlotForPeriod = (p: number) => {
      const slots: Record<number, string> = {
          1: "09:00 - 10:00",
          2: "10:00 - 11:00",
          3: "11:15 - 12:15",
          4: "12:15 - 01:15",
          5: "02:00 - 03:00",
          6: "03:00 - 04:00",
          7: "04:00 - 05:00",
          8: "05:00 - 06:00"
      };
      return slots[p];
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">
              {isAdmin ? "Time Table Generator" : "My Time Table"}
          </h2>
          <p className="text-muted-foreground">
            {isAdmin ? "Create and manage semester-wise timetables" : "View your current semester timetable"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => openAddDialog()} className="gap-2 shadow-lg">
            <Plus className="w-5 h-5" /> Create Time Table
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-none bg-card/60 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            {isAdmin ? (
              <>
                <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Department</Label>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger className="w-[200px] h-10 border-primary/20 bg-background/50">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            {DEPARTMENTS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[150px] h-10 border-primary/20 bg-background/50">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {YEARS.map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Department</Label>
                    <div className="h-10 flex items-center px-4 rounded-md border border-primary/10 bg-primary/5 font-medium text-sm min-w-[200px]">
                        {selectedDept}
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Year</Label>
                    <div className="h-10 flex items-center px-4 rounded-md border border-primary/10 bg-primary/5 font-medium text-sm min-w-[120px]">
                        {selectedYear}
                    </div>
                </div>
              </>
            )}
            <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Semester</Label>
                <Select value={selectedSem} onValueChange={setSelectedSem}>
                    <SelectTrigger className="w-[120px] h-10 border-primary/20 bg-background/50">
                        <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                        {SEMESTERS.map(s => (
                            <SelectItem key={s} value={s}>Sem {s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="ml-auto pt-4 md:pt-0">
                <Badge variant="outline" className="h-10 px-4 bg-primary/5 text-primary border-primary/20 gap-2">
                    <Calendar className="w-4 h-4" />
                    {selectedDept} - {selectedYear} (Sem {selectedSem})
                </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="shadow-xl border-none bg-card/80 backdrop-blur-sm overflow-hidden overflow-x-auto">
        <CardContent className="p-0">
          {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                  <LoadingSpinner />
              </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[120px] font-bold border-r">Period / Day</TableHead>
                  {DAYS.map(day => (
                    <TableHead key={day} className="min-w-[160px] text-center font-bold">{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERIODS.map(period => (
                  <TableRow key={period} className="group hover:bg-muted/10">
                    <TableCell className="font-bold border-r bg-muted/20">
                      <div className="text-xs uppercase text-muted-foreground">Period {period}</div>
                      <div className="text-[10px] font-medium opacity-60">{getTimeSlotForPeriod(period)}</div>
                    </TableCell>
                    {DAYS.map(day => {
                      const entry = getEntryForSlot(day, period);
                      return (
                        <TableCell 
                            key={day} 
                            className={cn(
                                "p-2.5 min-h-[100px] border-r last:border-r-0 transition-all",
                                entry ? "bg-primary/5" : "hover:bg-muted/30 cursor-pointer"
                            )}
                            onClick={() => !entry && isAdmin && openAddDialog(day, period)}
                        >
                          {entry ? (
                            <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-300">
                              <div className="flex items-center justify-between">
                                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none font-bold text-[10px] tracking-wide py-0 px-2 h-5">
                                      {entry.subject_name}
                                  </Badge>
                                  {isAdmin && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); openEditDialog(entry); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                    </button>
                                  )}
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold truncate leading-tight">{entry.staff_name}</p>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    RM: {entry.classroom || "N/A"}
                                </div>
                              </div>
                            </div>
                          ) : (
                            isAdmin && (
                                <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity py-4">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </div>
                            )
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {editingEntry ? "Edit Time Table Entry" : "New Time Table Entry"}
            </DialogTitle>
            <DialogDescription>
                Assign staff and subjects to a specific class slot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="academic_year">Academic Year *</Label>
                    <Input
                        id="academic_year"
                        value={formData.academic_year}
                        onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                        required
                        placeholder="e.g. 2023-2024"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="classroom">Classroom / Room No</Label>
                    <Input
                        id="classroom"
                        value={formData.classroom}
                        onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                        placeholder="e.g. Hall 101"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-muted-foreground/10">
                <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={formData.day} onValueChange={(val) => setFormData({ ...formData, day: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Period</Label>
                    <Select 
                        value={formData.period.toString()} 
                        onValueChange={(val) => setFormData({ ...formData, period: parseInt(val), time_slot: getTimeSlotForPeriod(parseInt(val)) })}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p.toString()}>Period {p}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject">Subject Name *</Label>
                <Input
                    id="subject"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    required
                    placeholder="e.g. Web Development"
                />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="staff">Staff Name *</Label>
                <Input
                    id="staff"
                    value={formData.staff_name}
                    onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
                    required
                    placeholder="e.g. Dr. John Doe"
                />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              {editingEntry && (
                  <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="mr-auto">
                      Delete
                  </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="px-8 shadow-md">
                {editingEntry ? "Save Changes" : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold text-destructive">Remove Entry?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove the <span className="font-bold text-foreground">{formData.subject_name}</span> class 
                    from the <span className="font-bold text-foreground">{formData.day}</span> timetable.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
                    Remove Class
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
