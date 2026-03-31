import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        setEvents((data || []) as Event[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-display font-bold">Events</h2>
      {events.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            No upcoming events.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <Card key={e.id} className="glass-card hover:glow-primary transition-all">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {e.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{e.description}</p>
                <p className="text-xs text-primary mt-2 font-medium">
                  {format(new Date(e.event_date), "MMMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
