import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserPlus, Copy, Trash2, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Invitation {
  id: string;
  email: string;
  token: string;
  created_at: string;
  used_at: string | null;
  expires_at: string;
}

export default function AdminInvitePage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    const { data, error } = await (supabase as any)
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) toast.error(error.message);
    else setInvitations((data || []) as unknown as Invitation[]);
  };

  const generateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tempPassword = "ChangeMe-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    const { error } = await (supabase as any)
      .from("admin_invitations")
      .insert({
        email,
        token,
        temp_password: tempPassword,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Invitation generated!");
      setEmail("");
      fetchInvitations();
    }
    setLoading(false);
  };

  const copyInviteLink = (inv: Invitation) => {
    const link = `${window.location.origin}/signup?invite=${inv.token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("admin_invitations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitation removed");
      fetchInvitations();
    }
  };

  if (user?.email !== "admin@demo.com") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only the primary administrator can invite other admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold">Admin Management</h2>
        <p className="text-muted-foreground">Invite other staff members to have administrative access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" /> Invite New Admin
            </CardTitle>
            <CardDescription>Enter email to generate an invite link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Staff Email Address</Label>
                <Input 
                  id="invite-email" 
                  type="email" 
                  placeholder="staff@college.edu" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? "Generating..." : "Generate Invite Link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" /> Recent Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No invitations sent yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-sm">{inv.email}</TableCell>
                      <TableCell>
                        {inv.used_at ? (
                          <Badge variant="outline" className="bg-success/20 text-success border-success/30">Used</Badge>
                        ) : new Date(inv.expires_at) < new Date() ? (
                          <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!inv.used_at && (
                            <Button variant="ghost" size="icon" onClick={() => copyInviteLink(inv)} title="Copy Invite Link">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}