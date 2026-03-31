/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "student" | "staff" | "admin";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { 
    full_name: string; 
    email: string; 
    department?: string; 
    year?: string; 
    avatar_url?: string; 
    is_approved?: boolean;
    onboarding_completed?: boolean;
    age?: number;
    contact_number?: string;
    whatsapp_number?: string;
    gender?: string;
    father_name?: string;
    dob?: string;
    joining_year?: number;
    end_year?: number;
    year_of_study?: string;
  } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch role and profile with setTimeout to avoid deadlock
          setTimeout(async () => {
            const [roleRes, profileRes] = await Promise.all([
              supabase.from("user_roles").select("role").eq("user_id", session.user.id).limit(1).single(),
              supabase.from("profiles").select("*").eq("user_id", session.user.id).limit(1).single(),
            ]);
            if (roleRes.data) {
              setRole(roleRes.data.role as AppRole);
            } else {
              // Auto-assign student role if no role exists
              const { error: roleError } = await supabase
                .from("user_roles")
                .insert({ user_id: session.user.id, role: "student" });
              if (!roleError) setRole("student");
            }
            if (profileRes.data) setProfile(profileRes.data as AuthContextType["profile"]);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", currentSession.user.id)
      .limit(1)
      .single();
    if (data) setProfile(data as AuthContextType["profile"]);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);