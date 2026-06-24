import { createServerFn } from "@tanstack/react-start";

export type DevAccount = {
  tier: "parent" | "association" | "team" | "elite" | "academy";
  email: string;
  label: string;
  role: "user" | "admin";
};

export const DEV_ACCOUNTS: DevAccount[] = [
  { tier: "parent",      email: "parent.dev@pxf.local",      label: "Parent — $7.99",            role: "user"  },
  { tier: "association", email: "association.dev@pxf.local", label: "Association Coach — $14.99", role: "admin" },
  { tier: "team",        email: "team.dev@pxf.local",        label: "Team Coach — $24.99",        role: "admin" },
  { tier: "elite",       email: "elite.dev@pxf.local",       label: "Elite Coach — $49.99",       role: "admin" },
  { tier: "academy",     email: "academy.dev@pxf.local",     label: "Academy — $99",              role: "admin" },
];

export const DEV_PASSWORD = "DevPass123!";

/**
 * Seeds (or refreshes) the five dev test accounts and their per-tier mock data.
 * Idempotent — safe to call repeatedly. Only ever touches the hard-coded
 * `*.dev@pxf.local` emails, so even if invoked in production it cannot affect
 * real users. The matching UI is gated behind import.meta.env.DEV.
 */
export const seedDevAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // List once and reuse.
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1, perPage: 200,
  });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);
  const byEmail = new Map(
    (list?.users ?? []).map((u) => [u.email?.toLowerCase() ?? "", u]),
  );

  const results: { email: string; tier: string; created: boolean; user_id: string }[] = [];

  for (const acct of DEV_ACCOUNTS) {
    const existing = byEmail.get(acct.email.toLowerCase());
    let userId: string;
    let created = false;

    if (existing) {
      userId = existing.id;
      // Make sure password matches what the UI will sign in with.
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: DEV_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: acct.email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: acct.label,
          signup_role: acct.role === "admin" ? "coach" : "parent",
        },
      });
      if (error || !data.user) throw new Error(`createUser ${acct.email}: ${error?.message ?? "unknown"}`);
      userId = data.user.id;
      created = true;
    }

    const { error: seedErr } = await supabaseAdmin.rpc("seed_dev_account", {
      p_user_id: userId,
      p_tier: acct.tier,
    });
    if (seedErr) throw new Error(`seed_dev_account ${acct.tier}: ${seedErr.message}`);

    results.push({ email: acct.email, tier: acct.tier, created, user_id: userId });
  }

  return { ok: true, accounts: results, password: DEV_PASSWORD };
});