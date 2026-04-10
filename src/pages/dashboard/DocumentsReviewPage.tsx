import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Doc {
  id: string;
  user_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export default function DocumentsReviewPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<"image" | "pdf">("image");
  const [isDocOpen, setIsDocOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [docsRes, profilesRes] = await Promise.all([
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    setDocs((docsRes.data || []) as Doc[]);
    const map: Record<string, string> = {};
    (profilesRes.data || []).forEach((p: { user_id: string; full_name: string }) => {
      map[p.user_id] = p.full_name;
    });
    setProfiles(map);
    setLoading(false);
  };

  const handleReview = async (docId: string, status: "approved" | "rejected") => {
    if (!user) return;
    const { error } = await supabase
      .from("documents")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq("id", docId);
    if (error) toast.error(error.message);
    else {
      toast.success(`Document ${status}`);
      fetchData();
    }
  };

  const handleOpenDoc = async (fileUrl: string, fileName: string) => {
    try {
      const pathSegments = fileUrl.split('/documents/');
      if (pathSegments.length < 2) throw new Error("Invalid file path format");
      const filePath = pathSegments.slice(1).join('/documents/');
      
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        setSelectedDocUrl(data.signedUrl);
        setSelectedDocType(fileName.toLowerCase().endsWith(".pdf") ? "pdf" : "image");
        setIsDocOpen(true);
      }
    } catch (err: any) {
      toast.error("Could not load secure document: " + err.message);
    }
  };

  const filteredDocs = filter === "all" ? docs : docs.filter((d) => d.status === filter);

  if (loading) return <LoadingSpinner className="min-h-[400px]" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Document Review</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Student Documents ({filteredDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents to review.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{profiles[d.user_id] || d.user_id.slice(0, 8)}</TableCell>
                    <TableCell className="capitalize">{d.doc_type.replace("_", " ")}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleOpenDoc(d.file_url, d.file_name)}
                        className="flex items-center gap-1 text-primary hover:underline text-sm bg-transparent border-none p-0 cursor-pointer text-left"
                      >
                        {d.file_name.slice(0, 20)}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.status as "pending" | "approved" | "rejected"} />
                    </TableCell>
                    <TableCell>
                      {d.status === "pending" ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReview(d.id, "approved")}
                            className="text-success hover:text-success"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReview(d.id, "rejected")}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {d.reviewed_at ? `Reviewed ${format(new Date(d.reviewed_at), "MMM d")}` : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] p-6 flex flex-col items-center justify-center bg-background border-border shadow-2xl rounded-xl z-50 overflow-hidden">
          {selectedDocUrl && selectedDocType === "pdf" ? (
            <iframe 
              src={selectedDocUrl} 
              className="w-full h-full border border-border/50 rounded-lg bg-white" 
              title="Document Preview"
            />
          ) : (
            selectedDocUrl && (
              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
                <img 
                  src={selectedDocUrl} 
                  alt="Document Preview" 
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
