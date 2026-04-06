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
              supabase.from("user_roles").select("role").eq("user_id", session.user.id).limit(1).maybeSingle(),
              supabase.from("profiles").select("*").eq("user_id", session.user.id).limit(1).maybeSingle(),
            ]);

            if (!roleRes.data) {
              // No role record found — this user was deleted from the system.
              // Sign them out immediately so they cannot access the app.
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setRole(null);
              setProfile(null);
              setLoading(false);
              return;
            }

            setRole(roleRes.data.role as AppRole);

            if (profileRes.data) {
              const profileData = profileRes.data as AuthContextType["profile"];
              if (profileData) {
                profileData.onboarding_completed = !!profileData.department || !!profileData.is_approved;
                if (profileData.joining_year) {
                  const diff = new Date().getFullYear() - profileData.joining_year;
                  if (diff === 0) profileData.year_of_study = "1st Year";
                  else if (diff === 1) profileData.year_of_study = "2nd Year";
                  else if (diff === 2) profileData.year_of_study = "3rd Year";
                  else profileData.year_of_study = "Alumni";
                }
              }
              setProfile(profileData);
            }
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
      .maybeSingle();
    if (data) {
      const profileData = data as AuthContextType["profile"];
      if (profileData) {
        profileData.onboarding_completed = !!profileData.department || !!profileData.is_approved;
        if (profileData.joining_year) {
          const diff = new Date().getFullYear() - profileData.joining_year;
          if (diff === 0) profileData.year_of_study = "1st Year";
          else if (diff === 1) profileData.year_of_study = "2nd Year";
          else if (diff === 2) profileData.year_of_study = "3rd Year";
          else profileData.year_of_study = "Alumni";
        }
      }
      setProfile(profileData);
    }
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