import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Loader2, ShieldCheck, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "admin" ? "admin" : "student";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"student" | "admin">(initialMode);
  const navigate = useNavigate();

  useEffect(() => {
    setEmail("");
  }, [mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      if (error.message.includes("Email not confirmed")) {
        toast.info("Please confirm your email address to continue.");
        navigate(`/signup?verify=true&email=${encodeURIComponent(email)}`);
      } else {
        toast.error(error.message);
      }
      return;
    }

    if (data.user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();

      // No role record means this account was deleted from the system
      if (!roleData) {
        await supabase.auth.signOut();
        toast.error(
          "Your account has been removed from the system. Please contact the administrator to re-register.",
          { duration: 6000 }
        );
        setLoading(false);
        return;
      }

      const userRole = roleData.role;

      if (mode === "admin" && userRole !== "admin" && userRole !== "staff") {
        await supabase.auth.signOut();
        toast.error("Access denied. Admin portal is restricted.");
        setLoading(false);
        return;
      }

      if (mode === "student" && (userRole === "admin" || userRole === "staff")) {
        await supabase.auth.signOut();
        toast.error("Please use the Admin Portal to sign in.");
        setLoading(false);
        return;
      }

      setLoading(false);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-4 relative z-10">
        <div className="flex justify-center mb-2">
           <Link to="/" className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground transition-colors">
             <ShieldCheck className="h-3 w-3" /> Admin Portal Redirect
           </Link>
        </div>

        <Card className="glass-card border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-lg glow-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription>Sign in to your college account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={mode} onValueChange={(v) => setMode(v as any)} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Student
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder={mode === "admin" ? "admin@college.edu" : "you@college.edu"} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="bg-background/50"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground font-medium h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {mode === "admin" ? "Admin Sign In" : "Sign In"}
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-border/50 text-center space-y-3">
              {mode === "student" ? (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary font-medium hover:underline">Create account</Link>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Admin accounts are managed by the primary administrator.
                </p>
              )}
              <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back to Landing Page
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}