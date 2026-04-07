import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GraduationCap, Loader2, ArrowLeft, CalendarIcon } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Onboarding() {
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState<Date>();
  const [dobInput, setDobInput] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    dob: "",
    age: "",
    contact_number: "+91 ",
    whatsapp_number: "+91 ",
    gender: "",
    father_name: "",
    department: "B.Sc Information Technology",
    register_number: "",
    joining_year: "",
    end_year: "",
    year_of_study: "",
  });

  const [whatsappSameAsContact, setWhatsappSameAsContact] = useState(false);

  // Sync date picker with manual input
  useEffect(() => {
    if (date) {
      const formatted = format(date, "dd/MM/yyyy");
      if (dobInput !== formatted) {
        setDobInput(formatted);
      }
      const age = differenceInYears(new Date(), date);
      setFormData(prev => ({ 
        ...prev, 
        dob: date.toISOString(),
        age: age.toString() 
      }));
    }
  }, [date]);

  // Handle manual input with auto-formatting
  const handleDobManualInput = (value: string) => {
    // Remove non-numeric characters
    const cleanValue = value.replace(/\D/g, "");
    
    // Auto-format DD/MM/YYYY
    let formatted = "";
    if (cleanValue.length > 0) {
      formatted = cleanValue.substring(0, 2);
      if (cleanValue.length > 2) {
        formatted += "/" + cleanValue.substring(2, 4);
        if (cleanValue.length > 4) {
          formatted += "/" + cleanValue.substring(4, 8);
        }
      }
    }
    
    setDobInput(formatted);
    
    // Try parsing if format is complete
    if (cleanValue.length === 8) {
      const day = parseInt(cleanValue.substring(0, 2));
      const month = parseInt(cleanValue.substring(2, 4)) - 1;
      const year = parseInt(cleanValue.substring(4, 8));
      
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d <= new Date() && d > new Date("1900-01-01")) {
        setDate(d);
      }
    }
  };

  useEffect(() => {
    if (user || profile) {
      // Restore DOB date picker state if profile has a saved DOB
      if (profile?.dob) {
        const savedDate = new Date(profile.dob);
        if (!isNaN(savedDate.getTime())) {
          setDate(savedDate);
          setDobInput(format(savedDate, "dd/MM/yyyy"));
        }
      }

      setFormData((prev) => ({
        ...prev,
        full_name: profile?.full_name || user?.user_metadata?.full_name || "",
        email: profile?.email || user?.email || "",
        department: profile?.department || "B.Sc Information Technology",
        gender: profile?.gender || "",
        father_name: profile?.father_name || "",
        register_number: profile?.register_number || "",
        joining_year: profile?.joining_year?.toString() || "",
        end_year: profile?.end_year?.toString() || "",
        year_of_study: profile?.year_of_study || "",
        age: profile?.age?.toString() || "",
        dob: profile?.dob || "",
        contact_number: profile?.contact_number || "+91 ",
        whatsapp_number: profile?.whatsapp_number || "+91 ",
      }));
    }
  }, [profile, user]);

  useEffect(() => {
    if (formData.joining_year && !isNaN(parseInt(formData.joining_year))) {
      const joining = parseInt(formData.joining_year);
      const end = joining + 3;
      const currentYear = new Date().getFullYear();
      const diff = currentYear - joining;
      
      let yearOfStudy = "Alumni";
      if (diff === 0) yearOfStudy = "1st Year";
      else if (diff === 1) yearOfStudy = "2nd Year";
      else if (diff === 2) yearOfStudy = "3rd Year";

      setFormData(prev => ({
        ...prev,
        end_year: end.toString(),
        year_of_study: yearOfStudy
      }));
    }
  }, [formData.joining_year]);

  useEffect(() => {
    if (whatsappSameAsContact) {
      setFormData((prev) => ({ ...prev, whatsapp_number: prev.contact_number }));
    }
  }, [whatsappSameAsContact, formData.contact_number]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          dob: formData.dob || null,
          age: parseInt(formData.age) || null,
          contact_number: formData.contact_number,
          whatsapp_number: formData.whatsapp_number,
          gender: formData.gender,
          father_name: formData.father_name,
          department: formData.department,
          register_number: formData.register_number || null,
          joining_year: parseInt(formData.joining_year) || null,
          end_year: parseInt(formData.end_year) || null,
        },
        { onConflict: "user_id" }
      );

    setLoading(false);

    if (error) {
      // 23505 = unique_violation — register_number already taken by another user
      if (error.code === "23505") {
        toast.error("This registration number is already in use. Please enter your unique register number.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    await refreshProfile();
    const successMsg = profile?.is_approved
      ? "Profile updated successfully."
      : "Profile complete! Now awaiting administrative approval.";
    toast.success(successMsg);
    navigate("/dashboard");
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">My College</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>

        <Card className="glass-card border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-bold">Complete Your Profile</CardTitle>
            <CardDescription>
              Please provide the following details to complete your registration. Your account will be accessible once approved by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Student Full Name</Label>
                  <Input 
                    id="full_name" 
                    value={formData.full_name} 
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email ID</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    readOnly 
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="DD/MM/YYYY" 
                      value={dobInput}
                      onChange={(e) => handleDobManualInput(e.target.value)}
                      className="bg-background/50 flex-1 font-mono"
                      maxLength={10}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 bg-background/50">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input 
                    id="age" 
                    type="number" 
                    value={formData.age} 
                    readOnly
                    className="bg-muted/50 font-medium"
                    placeholder="Calculated from DOB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                    <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-muted-foreground pointer-events-none border-r border-border/50 pr-2">
                      <span>🇮🇳</span>
                      <span className="font-medium">+91</span>
                    </div>
                    <Input 
                      id="contact_number" 
                      value={formData.contact_number.replace("+91 ", "")} 
                      onChange={(e) => setFormData({ ...formData, contact_number: "+91 " + e.target.value })} 
                      required 
                      className="pl-20 bg-background/50"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-muted-foreground pointer-events-none border-r border-border/50 pr-2">
                      <span>🇮🇳</span>
                      <span className="font-medium">+91</span>
                    </div>
                    <Input 
                      id="whatsapp_number" 
                      value={formData.whatsapp_number.replace("+91 ", "")} 
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: "+91 " + e.target.value })} 
                      required 
                      disabled={whatsappSameAsContact}
                      className="pl-20 bg-background/50"
                      placeholder="9876543210"
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox 
                      id="same_as_contact" 
                      checked={whatsappSameAsContact} 
                      onCheckedChange={(checked) => setWhatsappSameAsContact(checked as boolean)}
                    />
                    <label htmlFor="same_as_contact" className="text-xs text-muted-foreground cursor-pointer">
                      Same as contact number
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="father_name">Father's Name</Label>
                  <Input 
                    id="father_name" 
                    value={formData.father_name} 
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    value={formData.department} 
                    readOnly 
                    className="bg-muted/50 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register_number" className="flex items-center gap-2">
                    Register Number 
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold border border-primary/20">Recommended / Required</span>
                  </Label>
                  <Input 
                    id="register_number" 
                    value={formData.register_number} 
                    onChange={(e) => setFormData({ ...formData, register_number: e.target.value })} 
                    placeholder="e.g. 21BIT001"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joining_year">Joining Year</Label>
                  <Input 
                    id="joining_year" 
                    type="number" 
                    placeholder="e.g. 2024"
                    value={formData.joining_year} 
                    onChange={(e) => setFormData({ ...formData, joining_year: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_year">Expected Completion Year</Label>
                  <Input 
                    id="end_year" 
                    value={formData.end_year} 
                    readOnly 
                    placeholder="Calculated automatically"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_of_study">Current Year of Study</Label>
                  <Input 
                    id="year_of_study" 
                    value={formData.year_of_study} 
                    readOnly 
                    placeholder="Calculated automatically"
                    className="bg-muted/50 font-bold text-primary"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground font-medium h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {profile?.is_approved ? "Save Changes" : "Submit & Request Approval"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}