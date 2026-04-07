import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Calendar, User, Share2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function BlogDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchBlog = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('blogs').select('*').eq('id', id).single();
      if (error) {
        toast.error("Failed to load blog");
        navigate('/dashboard/blogs');
      } else {
        setBlog(data);
      }
      setLoading(false);
    };
    fetchBlog();
  }, [id, navigate]);

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;
  if (!blog) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <Button variant="ghost" className="gap-2 mb-4" onClick={() => navigate('/dashboard/blogs')}>
        <ArrowLeft className="w-4 h-4" /> Back to Blogs
      </Button>

      {blog.image_url && (
        <div className="w-full h-64 md:h-[400px] rounded-xl overflow-hidden shadow-lg border border-border/50">
          <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
            {blog.category || 'General'}
          </Badge>
          <div className="ml-auto text-sm text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {blog.publish_date ? format(new Date(blog.publish_date), "MMMM d, yyyy") : format(new Date(blog.created_at), "MMMM d, yyyy")}</span>
            <span className="flex items-center gap-1.5"><User className="w-4 h-4"/> {blog.author_name || 'Anonymous'}</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight">
          {blog.title}
        </h1>

        <div className="flex items-center gap-4 py-4 border-y border-border/50">
           <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 rounded-full">
            <Share2 className="w-4 h-4" /> Share
           </Button>
        </div>

        <Card className="glass-card mt-6">
          <CardContent className="p-6 md:p-8 prose prose-slate dark:prose-invert max-w-none">
            {/* simple rendering of textarea newlines */}
            {blog.content.split('\n').map((paragraph: string, idx: number) => (
              <p key={idx} className="mb-4 whitespace-pre-wrap">{paragraph}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
