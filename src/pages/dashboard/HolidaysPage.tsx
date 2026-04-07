import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, isSameDay, parseISO, getYear, isAfter, startOfDay } from "date-fns";
import { Pencil, Trash2, Plus, Search, Filter, Calendar as CalendarIcon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface Holiday {
  id: string;
  title: string;
  date: string;
  description: string | null;
  holiday_type: string;
}

const HOLIDAY_TYPES = [
  { value: "Government Holiday", color: "bg-blue-600", border: "border-blue-600" },
  { value: "Festival Holiday", color: "bg-green-600", border: "border-green-600" },
  { value: "Academic Holiday", color: "bg-orange-600", border: "border-orange-600" },
  { value: "Local Holiday", color: "bg-purple-600", border: "border-purple-600" },
  { value: "Casual Holiday", color: "bg-gray-600", border: "border-gray-600" },
];

export default function HolidaysPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "staff";
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  
  // Year selector for year filter
  const currentYear = new Date().getFullYear();
  const years = ["All", ...Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())];

  // Dialog & Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    holiday_type: "Government Holiday",
    date: format(new Date(), "yyyy-MM-dd")
  });

  const fetchHolidays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("date", { ascending: true });
    
    if (error) {
      toast.error("Failed to load holidays");
    } else {
      setHolidays((data || []) as Holiday[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    
    const holidayOnDate = holidays.find(h => isSameDay(parseISO(h.date), date));
    
    if (isAdmin) {
      if (holidayOnDate) {
        setEditingHoliday(holidayOnDate);
        setFormData({
          title: holidayOnDate.title,
          description: holidayOnDate.description || "",
          holiday_type: holidayOnDate.holiday_type || "Government Holiday",
          date: holidayOnDate.date
        });
      } else {
        setEditingHoliday(null);
        setFormData({
          title: "",
          description: "",
          holiday_type: "Government Holiday",
          date: format(date, "yyyy-MM-dd")
        });
      }
      setIsDialogOpen(true);
    } else {
        // Student side tooltip or popover logic if needed but user requested tooltip in calendar
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        const { error } = await supabase
          .from("holidays")
          .update(formData)
          .eq("id", editingHoliday.id);
        if (error) throw error;
        toast.success("Holiday updated successfully");
      } else {
        const { error } = await supabase
          .from("holidays")
          .insert([formData]);
        if (error) throw error;
        toast.success("Holiday added successfully");
      }
      setIsDialogOpen(false);
      fetchHolidays();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!editingHoliday) return;
    try {
      const { error } = await supabase
        .from("holidays")
        .delete()
        .eq("id", editingHoliday.id);
      if (error) throw error;
      toast.success("Holiday deleted successfully");
      setIsDeleteDialogOpen(false);
      setIsDialogOpen(false);
      fetchHolidays();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openAddDialog = () => {
    setEditingHoliday(null);
    setFormData({
      title: "",
      description: "",
      holiday_type: "Government Holiday",
      date: format(new Date(), "yyyy-MM-dd")
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      title: holiday.title,
      description: holiday.description || "",
      holiday_type: holiday.holiday_type || "Government Holiday",
      date: holiday.date
    });
    setIsDialogOpen(true);
  };

  // Calendar modifiers
  const modifiers: any = {};
  HOLIDAY_TYPES.forEach(type => {
      modifiers[type.value.replace(/\s+/g, '').toLowerCase()] = (date: Date) => 
          holidays.some(h => isSameDay(parseISO(h.date), date) && h.holiday_type === type.value);
  });

  const modifierStyles: any = {};
  HOLIDAY_TYPES.forEach(type => {
      modifierStyles[type.value.replace(/\s+/g, '').toLowerCase()] = {
          backgroundColor: "transparent",
          border: `2px solid`,
          borderRadius: "50%"
      };
  });

  const modifierClassNames: any = {};
  HOLIDAY_TYPES.forEach(type => {
      // We'll use custom classes to apply the colors from HOLIDAY_TYPES
      modifierClassNames[type.value.replace(/\s+/g, '').toLowerCase()] = `holiday-${type.value.replace(/\s+/g, '').toLowerCase()}`;
  });

  // Filtered Holidays
  const filteredHolidays = holidays.filter(h => {
    const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === "All" || getYear(parseISO(h.date)).toString() === yearFilter;
    const matchesType = typeFilter === "All" || h.holiday_type === typeFilter;
    return matchesSearch && matchesYear && matchesType;
  });

  if (loading && holidays.length === 0) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">
              {isAdmin ? "Holidays List" : "Holiday Calendar"}
          </h2>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage yearly holidays" : "View academic holidays"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAddDialog} className="gap-2 shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-5 h-5" /> Add Holiday
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Side */}
        <Card className="lg:col-span-2 shadow-sm border-none bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Calendar View
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[100px] h-9">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center justify-center p-0 md:p-6 gap-8">
            <div className="calendar-container w-full max-w-sm md:max-w-md">
                <style dangerouslySetInnerHTML={{ __html: `
                    ${HOLIDAY_TYPES.map(type => `
                        .holiday-${type.value.replace(/\s+/g, '').toLowerCase()} {
                            background-color: ${type.color.replace('bg-', '') === 'blue-600' ? '#2563eb' : 
                                              type.color.replace('bg-', '') === 'green-600' ? '#16a34a' :
                                              type.color.replace('bg-', '') === 'orange-600' ? '#ea580c' :
                                              type.color.replace('bg-', '') === 'purple-600' ? '#9333ea' :
                                              '#4b5563'};
                            color: white !important;
                            border-radius: 50% !important;
                        }
                    `).join('\n')}
                `}} />
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateClick}
                    modifiers={modifiers}
                    modifiersClassNames={modifierClassNames}
                    className="rounded-xl border shadow-md bg-card mx-auto"
                />
            </div>

            <div className="flex flex-col gap-3 p-4 md:p-0 min-w-[200px]">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Legend</h4>
                {HOLIDAY_TYPES.map(type => (
                    <div key={type.value} className="flex items-center gap-3">
                        <div className={cn("w-4 h-4 rounded-full shadow-sm", type.color)}></div>
                        <span className="text-sm font-medium">{type.value}</span>
                    </div>
                ))}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                    <div className="w-4 h-4 rounded-full border bg-accent/20"></div>
                    <span className="text-sm font-medium">Working Day</span>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Side */}
        <div className="space-y-4">
          <Card className="shadow-sm border-none bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Holiday Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {(() => {
                const sortedHolidays = [...holidays].sort((a,b) => a.date.localeCompare(b.date));

                if (sortedHolidays.length === 0) {
                  return <p className="text-sm text-center text-muted-foreground py-8 italic">No holidays scheduled yet.</p>;
                }

                return sortedHolidays.map((h) => (
                  <TooltipProvider key={h.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-start gap-4 p-3 rounded-xl border hover:bg-muted/50 transition-all cursor-pointer group hover:border-primary/30">
                          <div className={cn(
                            "h-12 w-12 shrink-0 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold text-white shadow-md transition-transform group-hover:scale-105",
                            HOLIDAY_TYPES.find(t => t.value === h.holiday_type)?.color || "bg-gray-500"
                          )}>
                            <span>{format(parseISO(h.date), "MMM")}</span>
                            <span className="text-lg leading-none">{format(parseISO(h.date), "d")}</span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-1">{h.title}</p>
                            <Badge variant="outline" className="text-[10px] font-medium py-0 h-4 border-muted-foreground/30">
                              {h.holiday_type}
                            </Badge>
                          </div>
                          <Info className="w-4 h-4 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="p-3 w-64 shadow-xl">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-primary">{h.title}</h4>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">{h.holiday_type}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">{h.description || "No specific details provided for this holiday."}</p>
                          <div className="text-[10px] items-center gap-1 font-bold bg-secondary px-2 py-1 rounded-full w-fit">
                            {format(parseISO(h.date), "EEEE, MMM d, yyyy")}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ));
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-none bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold">Holiday List Table</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search holidays..."
                      className="pl-8 w-[200px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="All">All Types</SelectItem>
                      {HOLIDAY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.value}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Title</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Description</TableHead>
                {isAdmin && <TableHead className="text-right font-bold w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHolidays.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-10 text-muted-foreground">
                          No holidays found matching your criteria.
                      </TableCell>
                  </TableRow>
              ) : (
                  filteredHolidays.map((holiday) => (
                      <TableRow key={holiday.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium whitespace-nowrap">
                              {format(parseISO(holiday.date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="font-bold">{holiday.title}</TableCell>
                          <TableCell>
                              <Badge className={cn("font-medium", HOLIDAY_TYPES.find(t => t.value === holiday.holiday_type)?.color)}>
                                  {holiday.holiday_type}
                              </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-muted-foreground">
                              {holiday.description || "-"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(holiday)} className="hover:bg-primary/10 hover:text-primary">
                                      <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => {
                                      setEditingHoliday(holiday);
                                      setIsDeleteDialogOpen(true);
                                  }} className="hover:bg-destructive/10 hover:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                  </Button>
                              </div>
                            </TableCell>
                          )}
                      </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{editingHoliday ? "Edit Holiday" : "Add New Holiday"}</DialogTitle>
            <DialogDescription>
                Please provide the details for the holiday. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                        className="rounded-lg"
                    />
                </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Holiday Type *</Label>
              <Select
                value={formData.holiday_type}
                onValueChange={(val) => setFormData({ ...formData, holiday_type: val })}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Holiday Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g. Independence Day"
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the holiday..."
                className="min-h-[100px] rounded-lg"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg px-8 shadow-md">
                {editingHoliday ? "Save Changes" : "Save Holiday"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the holiday
                    <span className="font-bold text-foreground mx-1">"{editingHoliday?.title}"</span>
                    from the database.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
                    Delete Holiday
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
