import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function escapeHtml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staff, error } = await context.supabase
      .from("elite_staff_coaches")
      .select("id,email,full_name,status,invited_at,accepted_at,invite_token,staff_user_id,session_rate_cents")
      .eq("owner_id", context.userId)
      .neq("status", "removed")
      .order("invited_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (staff ?? []).map((s: any) => s.id);
    let asn: { staff_id: string; team_id: string; teams: { name: string } | null }[] = [];
    if (ids.length) {
      const { data } = await context.supabase
        .from("elite_staff_team_assignments")
        .select("staff_id, team_id, teams(name)")
        .in("staff_id", ids);
      asn = (data ?? []) as any;
    }
    const byStaff = new Map<string, { team_id: string; name: string }[]>();
    asn.forEach((a) => {
      const arr = byStaff.get(a.staff_id) ?? [];
      arr.push({ team_id: a.team_id, name: a.teams?.name ?? "Team" });
      byStaff.set(a.staff_id, arr);
    });
    return (staff ?? []).map((s: any) => ({
      ...s,
      teams: byStaff.get(s.id) ?? [],
    }));
  });

export const inviteStaffCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; fullName?: string; teamIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    const { data: existing } = await context.supabase
      .from("elite_staff_coaches")
      .select("id, status, invite_token")
      .eq("owner_id", context.userId)
      .ilike("email", email)
      .neq("status", "removed")
      .maybeSingle();

    let staffId: string;
    let token: string;
    if (existing) {
      staffId = (existing as any).id;
      token = (existing as any).invite_token;
    } else {
      const { data: row, error } = await context.supabase
        .from("elite_staff_coaches")
        .insert({ owner_id: context.userId, email, full_name: data.fullName ?? null })
        .select("id, invite_token")
        .single();
      if (error) throw new Error(error.message);
      staffId = row.id;
      token = (row as any).invite_token;
    }

    // Reset team assignments to provided list
    await context.supabase.from("elite_staff_team_assignments").delete().eq("staff_id", staffId);
    if (data.teamIds.length) {
      const rows = data.teamIds.map((tid) => ({ staff_id: staffId, team_id: tid }));
      const { error: aErr } = await context.supabase.from("elite_staff_team_assignments").insert(rows);
      if (aErr) throw new Error(aErr.message);
    }

    // Owner name
    const { data: prof } = await context.supabase
      .from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const ownerName = prof?.full_name ?? "A coach";

    const origin = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "https://pxf-hockey-dev.lovable.app";
    const inviteUrl = `${origin}/staff-invite/${token}`;

    let emailStatus: "sent" | "skipped" | "failed" = "skipped";
    let emailError: string | null = null;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">You're invited to coach on PXF Hockey</h2>
            <p style="margin:0 0 12px">${escapeHtml(ownerName)} added you as a staff coach.</p>
            <p style="margin:24px 0">
              <a href="${inviteUrl}" style="background:#0ea5a3;color:#000;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">Accept invite</a>
            </p>
            <p style="margin:0 0 8px;color:#555;font-size:12px">Or copy this link:</p>
            <p style="margin:0 0 16px;color:#555;font-size:12px;word-break:break-all">${inviteUrl}</p>
          </div>`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "PXF Hockey <onboarding@resend.dev>",
            to: [email],
            subject: `${ownerName} invited you to coach on PXF`,
            html,
          }),
        });
        if (!res.ok) { emailStatus = "failed"; emailError = `Resend ${res.status}: ${await res.text()}`; }
        else emailStatus = "sent";
      } catch (e: any) {
        emailStatus = "failed"; emailError = e?.message ?? "Unknown";
      }
    }
    return { staffId, inviteUrl, emailStatus, emailError };
  });

export const removeStaffCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("elite_staff_coaches")
      .update({ status: "removed", removed_at: new Date().toISOString() })
      .eq("id", data.staffId)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reassignStaffTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; teamIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    // Confirm ownership
    const { data: row } = await context.supabase
      .from("elite_staff_coaches").select("id").eq("id", data.staffId).eq("owner_id", context.userId).maybeSingle();
    if (!row) throw new Error("Not found");
    await context.supabase.from("elite_staff_team_assignments").delete().eq("staff_id", data.staffId);
    if (data.teamIds.length) {
      const rows = data.teamIds.map((tid) => ({ staff_id: data.staffId, team_id: tid }));
      const { error } = await context.supabase.from("elite_staff_team_assignments").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const acceptStaffInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any).rpc("accept_staff_invite", { _token: data.token });
    if (error) throw new Error(error.message);
    return row;
  });