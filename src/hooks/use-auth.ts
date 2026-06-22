import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserAppRole, type AppRole } from "@/lib/user-role";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading, signOut: () => supabase.auth.signOut() };
}

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [userId]);
  return { isAdmin, loading };
}

export function useUserAppRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserAppRole(userId).then((nextRole) => {
      if (cancelled) return;
      setRole(nextRole);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { role, loading };
}

export function useHasCoachAccess(userId: string | undefined) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [{ data: role }, { data: subs }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
        supabase
          .from("subscriptions")
          .select("plan_name,status,current_period_end")
          .eq("user_id", userId)
          .eq("status", "active"),
      ]);
      const subActive = (subs ?? []).some((s) => {
        const notExpired = !s.current_period_end || new Date(s.current_period_end) > new Date();
        const plan = (s.plan_name ?? "").toLowerCase();
        return notExpired && (plan.includes("coach") || plan.includes("platinum"));
      });
      setHasAccess(!!role || subActive);
      setLoading(false);
    })();
  }, [userId]);
  return { hasAccess, loading };
}