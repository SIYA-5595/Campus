import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Loader2, RefreshCw } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const { session } = useAuth();
  const [step, setStep] = useState<"signup" | "verify">("signup");

  // 8-digit OTP state (Supabase default)
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-redirect if verified via email link
  useEffect(() => {
    const handleVerifiedSession = async () => {
      if (session && step === "verify") {
        if (inviteToken && invitedEmail === session.user.email) {
          await Promise.all([
            supabase.from("user_roles").insert({ user_id: session.user.id, role: "admin" }),
            (supabase as any).from("admin_invitations").update({ used_at: new Date().toISOString() }).eq("token", inviteToken)
          ]);
          toast.success("Admin account verified!");
        } else {
          toast.success("Email verified! Welcome to Pope's College.");
        }
        navigate("/dashboard");
      }
    };
    handleVerifiedSession();
  }, [session, step, navigate, inviteToken, invitedEmail]);

  useEffect(() => {
    if (inviteToken) validateInvite();
    const verifyMode = searchParams.get("verify") === "true";
    const emailParam = searchParams.get("email");
    if (verifyMode && emailParam) {
      setEmail(emailParam);
      setStep("verify");
    }
  }, [inviteToken, searchParams]);

  const validateInvite = async () => {
    const { data, error } = await (supabase as any)
      .from("admin_invitations")
      .select("email, used_at, expires_at")
      .eq("token", inviteToken)
      .single();
    if (error || !data) toast.error("Invalid or expired invitation link.");
    else if (data.used_at) toast.error("This invitation has already been used.");
    else if (new Date(data.expires_at) < new Date()) toast.error("This invitation has expired.");
    else { setInvitedEmail(data.email); setEmail(data.email); toast.info("Registering as Administrative Staff"); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // No emailRedirectTo — forces Supabase to send a 6-digit OTP code instead of a magic link
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setStep("verify");
    toast.success("An 8-digit verification code has been sent to your email!");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only last char
    setOtp(newOtp);
    if (value && index < 7) otpRefs.current[index + 1]?.focus(); // auto-advance up to box 7
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    const newOtp = [...otp];
    for (let i = 0; i < 8; i++) newOtp[i] = pasted[i] || "";
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((v) => !v);
    otpRefs.current[nextEmpty === -1 ? 7 : nextEmpty]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 8) { toast.error("Please enter the full 8-digit code."); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (inviteToken && invitedEmail === email && data.user) {
      await Promise.all([
        supabase.from("user_roles").insert({ user_id: data.user.id, role: "admin" }),
        (supabase as any).from("admin_invitations").update({ used_at: new Date().toISOString() }).eq("token", inviteToken)
      ]);
      toast.success("Admin account verified!");
    } else {
      toast.success("Email verified! Welcome to Pope's College.");
    }
    setLoading(false);
    navigate("/dashboard");
  };

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("A new code has been sent!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">
            {step === "signup" ? "Create Account" : "Verify Your Email"}
          </CardTitle>
          <CardDescription>
            {step === "signup"
              ? `${inviteToken ? "Admin" : "Student"} Registration - Pope's College IT Portal`
              : `Enter the 8-digit code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={!!invitedEmail} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {inviteToken ? "Create Admin Account" : "Create Account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* OTP Boxes */}
              <div className="space-y-3">
                <Label className="block text-center text-sm text-muted-foreground">
                  Enter the 8-digit code from your inbox
                </Label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground h-11" disabled={loading || otp.join("").length < 8}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify & Continue
              </Button>

              <div className="flex flex-col gap-2">
                <Button type="button" variant="ghost" className="w-full text-sm gap-2" onClick={handleResend} disabled={loading}>
                  <RefreshCw className="h-3 w-3" /> Resend Code
                </Button>
                <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setStep("signup")} disabled={loading}>
                  ← Change Email
                </Button>
              </div>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}