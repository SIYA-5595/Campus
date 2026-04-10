import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Calendar, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const eventSchema = z.object({
  title: z.string().min(1, "Event Name is required"),
  event_date: z.string().min(1, "Event Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  dress_code: z.string().min(1, "Dress code is required"),
  food_details: z.string(),
  snacks_available: z.boolean().default(false),
  family_invitation: z.string(),
  schedule: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    timing: z.string().min(1, "Timing is required"),
    description: z.string()
  })),
  competitions: z.array(z.object({
    name: z.string().min(1, "Name is required")
  })),
  guests: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().min(1, "Role is required"),
    description: z.string()
  })),
  principal_name: z.string().min(1, "Principal Name is required"),
  handover: z.object({
    name: z.string().min(1, "Handover name is required"),
    department: z.string().min(1, "Department is required"),
    responsibility: z.string().min(1, "Responsibility details are required")
  }),
  description: z.string().min(1, "Description is required")
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventsFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function EventsForm({ onSuccess, onCancel, initialData }: EventsFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      event_date: initialData.event_date,
      start_time: initialData.start_time || "",
      end_time: initialData.end_time || "",
      location: initialData.location || "",
      dress_code: initialData.dress_code || "",
      food_details: initialData.food_details || "",
      snacks_available: initialData.snacks_available || false,
      family_invitation: initialData.family_invitation || "Family members are allowed. Each employee can bring one family member.",
      schedule: initialData.schedule || [],
      competitions: initialData.competitions ? initialData.competitions.map((c: string) => ({ name: c })) : [],
      guests: initialData.guests || [],
      principal_name: initialData.principal_name || "",
      handover: initialData.handover || { name: "", department: "", responsibility: "" },
      description: initialData.description || ""
    } : {
      title: "", event_date: "", start_time: "", end_time: "", location: "",
      dress_code: "", food_details: "", snacks_available: false,
      family_invitation: "Family members are allowed. Each employee can bring one family member.",
      schedule: [], competitions: [], guests: [], principal_name: "",
      handover: { name: "", department: "", responsibility: "" },
      description: ""
    }
  });

  const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({ control: form.control, name: "schedule" });
  const { fields: compFields, append: appendComp, remove: removeComp } = useFieldArray({ control: form.control, name: "competitions" });
  const { fields: guestFields, append: appendGuest, remove: removeGuest } = useFieldArray({ control: form.control, name: "guests" });

  const onSubmit = async (values: EventFormValues) => {
    try {
      setIsSubmitting(true);
      if (!user) throw new Error("Not authenticated");

      let poster_url = initialData?.poster_url || null;
      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('events').upload(filePath, posterFile);
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('events').getPublicUrl(filePath);
        poster_url = publicUrlData.publicUrl;
      }

      const payload = {
        title: values.title,
        event_date: values.event_date,
        start_time: values.start_time,
        end_time: values.end_time,
        location: values.location,
        dress_code: values.dress_code,
        food_details: values.food_details,
        snacks_available: values.snacks_available,
        family_invitation: values.family_invitation,
        schedule: values.schedule,
        competitions: values.competitions.map(c => c.name),
        guests: values.guests,
        principal_name: values.principal_name,
        handover: values.handover,
        description: values.description,
        poster_url,
        created_by: user.id
      };

      if (initialData?.id) {
        const { error } = await supabase.from('events').update(payload).eq('id', initialData.id);
        if (error) throw error;
        toast.success("Event updated successfully!");
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
        toast.success("Event created successfully!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-fade-in pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info */}
          <Card className="glass-card md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-primary">
                <Calendar className="w-5 h-5" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Event Name *</FormLabel><FormControl><Input placeholder="Awesome Event" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="event_date" render={({ field }) => (
                <FormItem><FormLabel>Event Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem><FormLabel>Start Time *</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="end_time" render={({ field }) => (
                <FormItem><FormLabel>End Time *</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Location *</FormLabel><FormControl><Input placeholder="Main Auditorium" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="principal_name" render={({ field }) => (
                <FormItem><FormLabel>Principal Name *</FormLabel><FormControl><Input placeholder="Dr. John Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dress_code" render={({ field }) => (
                <FormItem><FormLabel>Dress Code *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select or type format" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Casual">Casual</SelectItem>
                    <SelectItem value="Formal">Formal</SelectItem>
                    <SelectItem value="Traditional">Traditional</SelectItem>
                    <SelectItem value="Theme Based">Theme Based</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage /></FormItem>
              )} />
              <div className="md:col-span-2">
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Event Description *</FormLabel><FormControl><Textarea className="min-h-[100px]" placeholder="Detailed description of the event..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Food & Family */}
          <Card className="glass-card shadow-sm">
            <CardHeader><CardTitle className="text-xl">Food & Family</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="snacks_available" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5"><FormLabel>Snacks Available</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="food_details" render={({ field }) => (
                <FormItem><FormLabel>Food Details</FormLabel><FormControl><Textarea placeholder="Buffet menu, catering details..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="family_invitation" render={({ field }) => (
                <FormItem><FormLabel>Family Invitation Message</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

           {/* Poster Image */}
           <Card className="glass-card shadow-sm">
            <CardHeader><CardTitle className="text-xl flex items-center gap-2"><ImageIcon className="w-5 h-5"/> Event Poster</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Upload Poster</Label>
                <Input type="file" accept="image/*" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setPosterFile(e.target.files[0]);
                }} />
                {initialData?.poster_url && !posterFile && (
                  <p className="text-sm text-muted-foreground">Current poster is attached. Uploading a new one will replace it.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="glass-card md:col-span-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Event Schedule</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => appendSchedule({ name: "", timing: "", description: "" })}>
                <Plus className="w-4 h-4 mr-2" /> Add Schedule Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleFields.map((item, index) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start p-4 border rounded-xl bg-card/50">
                  <FormField control={form.control} name={`schedule.${index}.name`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Activity Name</FormLabel><FormControl><Input placeholder="Welcome Speech" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`schedule.${index}.timing`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Timing</FormLabel><FormControl><Input placeholder="10:00 AM - 10:30 AM" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`schedule.${index}.description`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Description</FormLabel><FormControl><Input placeholder="Brief details" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="button" variant="destructive" size="icon" className="md:mt-8" onClick={() => removeSchedule(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {scheduleFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No schedule added yet.</p>}
            </CardContent>
          </Card>

          {/* Competitions */}
          <Card className="glass-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Competitions</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => appendComp({ name: "" })}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {compFields.map((item, index) => (
                <div key={item.id} className="flex items-start gap-2">
                  <FormField control={form.control} name={`competitions.${index}.name`} render={({ field }) => (
                    <FormItem className="flex-1"><FormControl><Input placeholder="e.g. Dance, Singing" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeComp(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {compFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No competitions listed.</p>}
            </CardContent>
          </Card>

          {/* Handover & Guests */}
          <div className="space-y-6">
            <Card className="glass-card shadow-sm">
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><FileText className="w-5 h-5"/> Event Handover</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="handover.name" render={({ field }) => (
                  <FormItem><FormLabel>Handover To (Name) *</FormLabel><FormControl><Input placeholder="Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="handover.department" render={({ field }) => (
                  <FormItem><FormLabel>Department Name *</FormLabel><FormControl><Input placeholder="Cultural Dept" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="handover.responsibility" render={({ field }) => (
                  <FormItem><FormLabel>Responsibility Details *</FormLabel><FormControl><Textarea placeholder="Overall coordination..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          {/* Guests */}
          <Card className="glass-card md:col-span-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Guest Details</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => appendGuest({ name: "", role: "", description: "" })}>
                <Plus className="w-4 h-4 mr-2" /> Add Guest
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {guestFields.map((item, index) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start p-4 border rounded-xl bg-card/50">
                  <FormField control={form.control} name={`guests.${index}.name`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Name</FormLabel><FormControl><Input placeholder="Guest Name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`guests.${index}.role`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Role/Title</FormLabel><FormControl><Input placeholder="Chief Guest" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`guests.${index}.description`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Description</FormLabel><FormControl><Input placeholder="Brief bio" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="button" variant="destructive" size="icon" className="md:mt-8" onClick={() => removeGuest(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {guestFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No guests added.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 border-t pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
            {isSubmitting ? "Saving..." : (initialData ? "Update Event" : "Create Event")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
