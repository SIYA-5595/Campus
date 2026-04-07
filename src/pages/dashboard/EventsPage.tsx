import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Calendar, Plus, MapPin, Pencil, Trash2, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { EventsForm } from "./components/EventsForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const { role } = useAuth();
  
  const canManage = role === "admin" || role === "staff";

  const fetchEvents = () => {
    setLoading(true);
    supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        setEvents((data || []));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast.error("Failed to delete event");
    } else {
      toast.success("Event deleted successfully");
      fetchEvents();
    }
  };

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold">
            {view === 'create' ? 'Create New Event' : 'Edit Event'}
          </h2>
        </div>
        <EventsForm 
          initialData={editingEvent}
          onSuccess={() => {
            setView('list');
            fetchEvents();
          }} 
          onCancel={() => setView('list')} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Events Hub</h2>
        {canManage && (
          <Button onClick={() => { setEditingEvent(null); setView('create'); }} className="gap-2">
            <Plus className="w-4 h-4" /> Create Event
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[200px]">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p>No upcoming events.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Card key={e.id} className="glass-card hover:glow-primary transition-all flex flex-col overflow-hidden">
              {e.poster_url && (
                <div className="h-48 w-full overflow-hidden">
                  <img src={e.poster_url} alt={e.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="font-display text-xl">{e.title}</CardTitle>
                <div className="flex flex-col gap-1.5 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(e.event_date), "MMMM d, yyyy")}
                  </span>
                  {(e.start_time || e.end_time) && (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {e.start_time} - {e.end_time}
                    </span>
                  )}
                  {e.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {e.location}
                    </span>
                  )}
                  {e.principal_name && (
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Principal: {e.principal_name}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm line-clamp-3 mb-4">{e.description}</p>
                
                {canManage && (
                  <div className="flex justify-end gap-2 mt-auto border-t pt-4">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingEvent(e); setView('edit'); }}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Event</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this event? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
