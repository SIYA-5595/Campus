import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Sun } from "lucide-react";
import { format } from "date-fns";

interface Holiday {
  id: string;
  title: string;
  date: string;
  description: string | null;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("holidays")
      .select("*")
      .order("date", { ascending: true })
      .then(({ data }) => {
        setHolidays((data || []) as Holiday[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-display font-bold">Holidays</h2>
      {holidays.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            No holidays listed.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {holidays.map((h) => (
            <Card key={h.id} className="glass-card hover:glow-accent transition-all">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-base">
                  <Sun className="h-5 w-5 text-accent" />
                  {h.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-primary">
                  {format(new Date(h.date), "MMMM d, yyyy")}
                </p>
                {h.description && (
                  <p className="text-xs text-muted-foreground mt-1">{h.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
