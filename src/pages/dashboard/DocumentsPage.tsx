import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Doc {
  id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  status: string;
  created_at: string;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("id_proof");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocs((data || []) as Doc[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      doc_type: docType,
      file_name: file.name,
      file_url: urlData.publicUrl,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Document uploaded!");
      if (fileRef.current) fileRef.current.value = "";
      fetchDocs();
    }
    setUploading(false);
  };

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-display font-bold">Documents</h2>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="id_proof">ID Proof</SelectItem>
                  <SelectItem value="profile_image">Profile Image</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input ref={fileRef} type="file" accept="image/*,.pdf" />
            </div>
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="gradient-primary text-primary-foreground">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">My Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {d.doc_type.replace("_", " ")} • {format(new Date(d.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={d.status as "pending" | "approved" | "rejected"} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
