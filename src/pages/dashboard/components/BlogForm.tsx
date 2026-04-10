import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BookOpen, ImageIcon } from "lucide-react";

const blogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  author_name: z.string().min(1, "Author name is required"),
  content: z.string().min(1, "Content is required"),
  publish_date: z.string().min(1, "Publish date is required"),
  published: z.boolean().default(false),
});

type BlogFormValues = z.infer<typeof blogSchema>;

interface BlogFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function BlogForm({ onSuccess, onCancel, initialData }: BlogFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogSchema),
    defaultValues: initialData ? {
      title: initialData.title || "",
      category: initialData.category || "General",
      author_name: initialData.author_name || "",
      content: initialData.content || "",
      publish_date: initialData.publish_date || new Date().toISOString().split("T")[0],
      published: initialData.published || false,
    } : {
      title: "", category: "", author_name: "", content: "",
      publish_date: new Date().toISOString().split("T")[0], published: false
    }
  });

  const onSubmit = async (values: BlogFormValues) => {
    try {
      setIsSubmitting(true);
      if (!user) throw new Error("Not authenticated");

      let image_url = initialData?.image_url || null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('blogs').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('blogs').getPublicUrl(filePath);
        image_url = publicUrlData.publicUrl;
      }

      const payload = {
        title: values.title,
        category: values.category,
        author_name: values.author_name,
        content: values.content,
        publish_date: values.publish_date,
        published: values.published,
        image_url,
        author_id: user.id
      };

      if (initialData?.id) {
        const { error } = await supabase.from('blogs').update(payload).eq('id', initialData.id);
        if (error) throw error;
        toast.success("Blog updated successfully!");
      } else {
        const { error } = await supabase.from('blogs').insert([payload]);
        if (error) throw error;
        toast.success("Blog published successfully!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save blog");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-fade-in pb-8">
        <Card className="glass-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <BookOpen className="w-5 h-5" /> Blog Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Blog Title *</FormLabel><FormControl><Input placeholder="Title of the blog post" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
             <div className="space-y-4 md:col-span-2">
              <Label>Blog Image</Label>
              <div className="flex items-center gap-4">
                <Input type="file" accept="image/*" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
                }} />
              </div>
              {initialData?.image_url && !imageFile && (
                <p className="text-sm text-muted-foreground">Current image attached. Uploading unselected keeps current.</p>
              )}
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Category *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Events">Events</SelectItem>
                  <SelectItem value="Announcement">Announcement</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Company News">Company News</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="author_name" render={({ field }) => (
              <FormItem><FormLabel>Author Name *</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="publish_date" render={({ field }) => (
              <FormItem><FormLabel>Publish Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField control={form.control} name="published" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-10 mt-auto">
                <div className="space-y-0.5"><FormLabel>Publish Status</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Blog Content (Text / Markdown format) *</FormLabel><FormControl>
                <Textarea className="min-h-[300px]" placeholder="Write your blog content here..." {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 border-t pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
            {isSubmitting ? "Saving..." : (initialData ? "Update Blog" : "Submit Blog")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
