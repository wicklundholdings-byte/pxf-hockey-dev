import { Navigate } from "@tanstack/react-router";
import { useEliteRole } from "@/hooks/use-elite-role";
import type { ReactNode } from "react";

/**
 * Hides a screen entirely from Elite staff coaches.
 * Owners and non-elite tiers pass through.
 */
export function BlockForStaff({ children }: { children: ReactNode }) {
  const { role, loading } = useEliteRole();
  if (loading) return <div className="h-40" />;
  if (role === "staff") return <Navigate to="/coach" />;
  return <>{children}</>;
}