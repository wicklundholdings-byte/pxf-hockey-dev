import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

const PARENT_ROOTS = new Set([
  "/parent",
  "/parent/camps",
  "/parent/teams",
  "/parent/train",
  "/parent/inbox",
]);

const COACH_ROOTS = new Set([
  "/coach",
  "/coach/camps",
  "/coach/teams",
  "/coach/playbook",
  "/coach/inbox",
]);

const ATHLETE_ROOTS = new Set([
  "/",
  "/drills",
  "/sessions",
  "/profile",
  "/calendar",
]);

function isRoot(pathname: string): boolean {
  return (
    PARENT_ROOTS.has(pathname) ||
    COACH_ROOTS.has(pathname) ||
    ATHLETE_ROOTS.has(pathname)
  );
}

/**
 * Compute a friendly parent-screen label from the current pathname.
 * Returns null to fall back to "Back".
 */
function parentLabel(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  // Drop the last segment to get the parent
  const parentParts = parts.slice(0, -1);
  const parentPath = "/" + parentParts.join("/");
  const map: Record<string, string> = {
    "/parent": "Home",
    "/parent/camps": "Events",
    "/parent/teams": "My Clubs",
    "/parent/train": "Train",
    "/parent/inbox": "Inbox",
    "/parent/team": "Team",
    "/parent/hockey-schools": "Hockey Schools",
    "/coach": "Dashboard",
    "/coach/camps": "Events",
    "/coach/teams": "Teams",
    "/coach/playbook": "Playbook",
    "/coach/inbox": "Inbox",
    "/coach/operations": "Operations",
    "/coach/staff": "Staff",
    "/coach/financials": "Financials",
    "/coach/locations": "Locations",
  };
  if (map[parentPath]) return map[parentPath];
  // If the immediate parent path is not mapped, check if the last segment
  // is a dynamic/UUID segment and try the grandparent path.
  const lastParent = parentParts[parentParts.length - 1] ?? "";
  if (lastParent.startsWith("$") || /^[0-9a-f-]{8,}$/i.test(lastParent)) {
    const grandparentPath = "/" + parentParts.slice(0, -1).join("/");
    if (map[grandparentPath]) return map[grandparentPath];
  }
  // Strip $ from dynamic segments for the leaf label
  const last = parentParts[parentParts.length - 1] ?? "";
  if (last.startsWith("$") || /^[0-9a-f-]{8,}$/i.test(last)) return null;
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

export function BackButton() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (isRoot(pathname)) return null;
  const label = parentLabel(pathname) ?? "Back";
  const handleClick = () => {
    // Use browser history so we always go to the previous screen.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      // Fallback: navigate up one path segment.
      const parts = pathname.split("/").filter(Boolean);
      const up = "/" + parts.slice(0, -1).join("/");
      router.navigate({ to: up || "/" });
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Back to ${label}`}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
    >
      <ChevronLeft size={14} />
      <span className="max-w-[140px] truncate">{label}</span>
    </button>
  );
}