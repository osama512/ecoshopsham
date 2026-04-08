import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  merchantStatus: string | null;
  planType: string | null;
  storeSlug: string | null;
  trialExpired: boolean;
  trialDaysLeft: number;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  merchantStatus: null,
  planType: null,
  storeSlug: null,
  trialExpired: false,
  trialDaysLeft: 0,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const TRIAL_DAYS = 7;

function isTrialExpired(createdAt: string | null, planType: string | null): boolean {
  if (!createdAt || planType === "pro" || planType === "enterprise") return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > TRIAL_DAYS;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  const applyFallbackProfileState = (daysLeft: number) => {
    setRole("merchant");
    setMerchantStatus("active");
    setPlanType("free");
    setStoreSlug(null);
    setTrialExpired(false);
    setTrialDaysLeft(daysLeft);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, status, plan_type, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      applyFallbackProfileState(0);
      return;
    }

    if (data) {
      const d = data as any;
      setRole(d.role ?? "merchant");
      setMerchantStatus(d.status ?? "active");
      setPlanType(d.plan_type ?? "free");
      setStoreSlug(d.store_slug ?? null);
      setTrialExpired(isTrialExpired(d.created_at, d.plan_type));
      if (d.created_at) {
        const diff = TRIAL_DAYS - (Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24);
        setTrialDaysLeft(Math.max(0, Math.ceil(diff)));
      } else {
        setTrialDaysLeft(TRIAL_DAYS);
      }
      return;
    }

    // Get the user's email from auth to sync to profile
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { error: upsertError } = await (supabase.from("profiles" as any) as any).upsert(
      {
        id: userId,
        role: "merchant",
        status: "active",
        plan_type: "free",
        email: authUser?.email || null,
        updated_at: new Date().toISOString(),
      } as any
    );

    if (upsertError) {
      console.error("Failed to initialize merchant profile", upsertError);
      applyFallbackProfileState(0);
      return;
    }

    applyFallbackProfileState(TRIAL_DAYS);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setRole(null);
          setMerchantStatus(null);
          setPlanType(null);
          setStoreSlug(null);
          setTrialExpired(false);
          setTrialDaysLeft(0);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, merchantStatus, planType, storeSlug, trialExpired, trialDaysLeft, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
