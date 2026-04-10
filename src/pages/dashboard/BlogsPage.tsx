import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Search, Plus, Filter, Pencil, Trash2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BlogForm } from "./components/BlogForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  
  const { role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin" || role === "staff";

  const fetchBlogs = async () => {
    setLoading(true);
    let query = supabase.from("blogs").select("*");
    
    // Normal users ONLY see published blogs
    if (!isAdmin) {
      query = query.eq('published', true);
    }
    
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load blogs");
    } else {
      setBlogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBlogs();
  }, [isAdmin]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) {
      toast.error("Failed to delete blog");
    } else {
      toast.success("Blog deleted successfully");
      fetchBlogs();
    }
  };

  const filteredBlogs = blogs.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (b.content && b.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = categoryFilter === "All" || b.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold">
            {view === 'create' ? 'Create New Blog' : 'Edit Blog'}
          </h2>
        </div>
        <BlogForm 
          initialData={editingBlog}
          onSuccess={() => {
            setView('list');
            fetchBlogs();
          }} 
          onCancel={() => setView('list')} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section admin/user */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            {isAdmin ? "Blog Management" : "Company Blogs"}
           </h2>
           {!isAdmin && <p className="text-muted-foreground mt-1 text-sm md:text-base">Discover the latest news, announcements, and tech insights.</p>}
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingBlog(null); setView('create'); }} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Create Blog
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card/50 p-4 rounded-xl border border-border/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search blogs..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48 whitespace-nowrap">
           <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-background">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              <SelectItem value="Events">Events</SelectItem>
              <SelectItem value="Announcement">Announcement</SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Company News">Company News</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isAdmin && filteredBlogs.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr className="text-left text-sm text-muted-foreground border-b border-border/50">
                  <th className="p-4 font-medium">Title</th>
                  <th className="p-4 font-medium hidden md:table-cell">Category</th>
                  <th className="p-4 font-medium hidden sm:table-cell">Author</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredBlogs.map(blog => (
                  <tr key={blog.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">
                      {blog.title}
                      <span className="block text-xs text-muted-foreground mt-1 md:hidden">{blog.category}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-sm">
                      <Badge variant="outline">{blog.category || 'General'}</Badge>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-sm text-muted-foreground">
                      {blog.author_name || 'Anonymous'}
                    </td>
                    <td className="p-4">
                       <Badge variant={blog.published ? "default" : "secondary"} className={blog.published ? "bg-success hover:bg-success/90" : "bg-warning hover:bg-warning/90 text-warning-foreground"}>
                        {blog.published ? 'Published' : 'Draft'}
                       </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingBlog(blog); setView('edit'); }}>
                          <Pencil className="w-4 h-4 text-primary" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Blog</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(blog.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* User View Grids (or Admin empty state inside grids) */}
      {(!isAdmin || filteredBlogs.length === 0) && (
        <>
          {filteredBlogs.length === 0 ? (
            <Card className="glass-card border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                <p>{searchTerm ? "No blogs match your search." : "No blogs available yet."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredBlogs.map((blog) => (
                <Card key={blog.id} className="glass-card hover:glow-primary transition-all flex flex-col h-full overflow-hidden group border-border/50">
                  {blog.image_url ? (
                    <div className="h-48 w-full overflow-hidden relative">
                      <div className="absolute top-3 left-3 z-10">
                        <Badge className="bg-background/80 text-foreground backdrop-blur-md hover:bg-background/90">{blog.category || 'General'}</Badge>
                      </div>
                      <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-primary/5 flex items-center justify-center relative">
                       <div className="absolute top-3 left-3 z-10">
                        <Badge className="bg-background/80 text-foreground backdrop-blur-md hover:bg-background/90">{blog.category || 'General'}</Badge>
                      </div>
                      <BookOpen className="w-12 h-12 text-primary/20" />
                    </div>
                  )}
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="text-xs text-muted-foreground flex items-center justify-between mb-3">
                      <span>{blog.publish_date ? format(new Date(blog.publish_date), "MMM d, yyyy") : format(new Date(blog.created_at), "MMM d, yyyy")}</span>
                      <span>By {blog.author_name || 'Anonymous'}</span>
                    </div>
                    <h3 className="font-display font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                      {blog.content}
                    </p>
                    <div className="mt-auto pt-4 border-t border-border/50">
                       <Button variant="ghost" className="w-full justify-between hover:bg-primary/5 hover:text-primary" onClick={() => navigate(`/dashboard/blogs/${blog.id}`)}>
                        Read More <span>&rarr;</span>
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
