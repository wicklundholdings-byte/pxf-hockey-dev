import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * RSVP reminder queuer.
 *
 * Runs hourly via pg_cron. For every camp day in the next ~36h it:
 *   1. Ensures a `daily_rsvps` row exists per active registration.
 *   2. Queues a 6pm-evening-before reminder for "no_response" RSVPs.
 *   3. Queues an 8am-day-of reminder if still "no_response".
 *
 * Sending itself is the build-phase Twilio/push worker's job. This route only
 * inserts into `scheduled_messages` and marks `reminder_*_sent_at` so duplicates
 * are not enqueued.
 */
export const Route = createFileRoute("/api/public/hooks/rsvp-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return new Response("Missing Supabase env", { status: 500 });
        const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

        const now = new Date();
        const horizon = new Date(now.getTime() + 36 * 60 * 60 * 1000);
        const startDate = now.toISOString().slice(0, 10);
        const endDate = horizon.toISOString().slice(0, 10);

        const { data: sessions, error: sErr } = await admin
          .from("camp_sessions")
          .select("id, camp_id, session_date, start_time, camps:camp_id(name, owner_id)")
          .gte("session_date", startDate)
          .lte("session_date", endDate);
        if (sErr) return new Response(`sessions: ${sErr.message}`, { status: 500 });

        let ensured = 0, evening = 0, morning = 0;

        for (const s of (sessions ?? []) as any[]) {
          const campName = s.camps?.name ?? "Camp";
          const ownerId = s.camps?.owner_id;
          if (!ownerId) continue;

          // 1) Ensure rsvp rows
          const { data: regs } = await admin
            .from("registrations")
            .select("id")
            .eq("camp_id", s.camp_id)
            .in("status", ["paid", "pending"]);
          const regIds = (regs ?? []).map((r: any) => r.id);
          if (regIds.length) {
            const { data: existing } = await admin
              .from("daily_rsvps")
              .select("registration_id")
              .eq("camp_session_id", s.id);
            const have = new Set((existing ?? []).map((r: any) => r.registration_id));
            const missing = regIds.filter((id) => !have.has(id));
            if (missing.length) {
              await admin.from("daily_rsvps").insert(missing.map((id) => ({
                camp_id: s.camp_id, camp_session_id: s.id, registration_id: id,
              })));
              ensured += missing.length;
            }
          }

          // Compute trigger windows
          const sessionStart = new Date(`${s.session_date}T${(s.start_time ?? "09:00:00").slice(0, 8)}`);
          const eveningTrigger = new Date(sessionStart); eveningTrigger.setDate(eveningTrigger.getDate() - 1); eveningTrigger.setHours(18, 0, 0, 0);
          const morningTrigger = new Date(sessionStart); morningTrigger.setHours(8, 0, 0, 0);

          // 2) 6pm evening before — enqueue once per rsvp
          if (now >= eveningTrigger && now < sessionStart) {
            const { data: pending } = await admin
              .from("daily_rsvps")
              .select("id, registration_id, rsvp_token")
              .eq("camp_session_id", s.id)
              .eq("status", "no_response")
              .is("reminder_evening_sent_at", null);
            for (const r of (pending ?? []) as any[]) {
              const link = `/rsvp/${r.rsvp_token}`;
              await admin.from("scheduled_messages").insert({
                owner_id: ownerId,
                camp_id: s.camp_id,
                registration_id: r.registration_id,
                channel: "sms",
                kind: "rsvp_reminder_evening",
                body: `Is your athlete attending ${campName} tomorrow? Tap to RSVP: ${link}`,
                scheduled_for: now.toISOString(),
              });
              await admin.from("daily_rsvps").update({ reminder_evening_sent_at: now.toISOString() }).eq("id", r.id);
              evening++;
            }
          }

          // 3) 8am day-of — second nudge for still-no-response
          if (now >= morningTrigger && now < sessionStart) {
            const { data: pending } = await admin
              .from("daily_rsvps")
              .select("id, registration_id, rsvp_token")
              .eq("camp_session_id", s.id)
              .eq("status", "no_response")
              .is("reminder_morning_sent_at", null);
            for (const r of (pending ?? []) as any[]) {
              const link = `/rsvp/${r.rsvp_token}`;
              await admin.from("scheduled_messages").insert({
                owner_id: ownerId,
                camp_id: s.camp_id,
                registration_id: r.registration_id,
                channel: "sms",
                kind: "rsvp_reminder_morning",
                body: `Reminder — please RSVP for ${campName} today: ${link}`,
                scheduled_for: now.toISOString(),
              });
              await admin.from("daily_rsvps").update({ reminder_morning_sent_at: now.toISOString() }).eq("id", r.id);
              morning++;
            }
          }
        }

        return Response.json({ ok: true, ensured, queued: { evening, morning } });
      },
    },
  },
});