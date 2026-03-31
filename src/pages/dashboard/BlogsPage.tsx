import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BookOpen } from "lucide-react";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("blogs")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBlogs((data || []) as Blog[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-display font-bold">Blogs</h2>
      {blogs.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            No blog posts yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {blogs.map((b) => (
            <Card key={b.id} className="glass-card hover:glow-primary transition-all">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {b.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(b.created_at), "MMMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{b.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
