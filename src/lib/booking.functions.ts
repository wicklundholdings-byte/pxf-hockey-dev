import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitSchema = z.object({
  campId: z.string().uuid(),
  parent: z.object({
    full_name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().max(40).optional().nullable(),
  }),
  attendee: z.object({
    full_name: z.string().min(1).max(120),
    birthday: z.string().optional().nullable(),
    position: z.string().max(40).optional().nullable(),
    skill_level: z.string().max(40).optional().nullable(),
    handedness: z.string().max(20).optional().nullable(),
    jersey_number: z.string().max(10).optional().nullable(),
  }),
  customFieldValues: z.record(z.string(), z.unknown()).optional(),
});

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load camp
    const { data: camp, error: campErr } = await supabaseAdmin
      .from("camps")
      .select("id, owner_id, capacity, price_cents, early_bird_price_cents, early_bird_expires_at, status")
      .eq("id", data.campId)
      .maybeSingle();
    if (campErr) throw new Error(campErr.message);
    if (!camp || camp.status !== "live") throw new Error("This camp is not accepting registrations.");

    // Count paid registrations to check capacity
    const { count: paidCount } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", camp.id)
      .eq("status", "paid");
    const isFull = (paidCount ?? 0) >= camp.capacity;

    // Upsert contact by (owner_id,email)
    const { data: existing } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", camp.owner_id)
      .eq("email", data.parent.email)
      .maybeSingle();

    let contactId = existing?.id;
    if (!contactId) {
      const { data: newContact, error: cErr } = await supabaseAdmin
        .from("contacts")
        .insert({
          owner_id: camp.owner_id,
          full_name: data.parent.full_name,
          email: data.parent.email,
          phone: data.parent.phone ?? null,
          subscribed: true,
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      contactId = newContact.id;
    }

    // Insert attendee
    const { data: attendee, error: aErr } = await supabaseAdmin
      .from("attendees")
      .insert({
        owner_id: camp.owner_id,
        contact_id: contactId,
        full_name: data.attendee.full_name,
        birthday: data.attendee.birthday || null,
        position: data.attendee.position || null,
        skill_level: data.attendee.skill_level || null,
        handedness: data.attendee.handedness || null,
        jersey_number: data.attendee.jersey_number || null,
      })
      .select("id")
      .single();
    if (aErr) throw new Error(aErr.message);

    if (isFull) {
      const { count: waitCount } = await supabaseAdmin
        .from("waitlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("camp_id", camp.id);
      const { error: wErr } = await supabaseAdmin.from("waitlist_entries").insert({
        camp_id: camp.id,
        contact_id: contactId,
        attendee_id: attendee.id,
        position: (waitCount ?? 0) + 1,
        status: "waiting",
      });
      if (wErr) throw new Error(wErr.message);
      return { kind: "waitlisted" as const };
    }

    const earlyBirdActive =
      camp.early_bird_price_cents != null &&
      camp.early_bird_expires_at != null &&
      new Date(camp.early_bird_expires_at) > new Date();
    const amount = earlyBirdActive ? camp.early_bird_price_cents! : camp.price_cents;

    const { data: reg, error: rErr } = await supabaseAdmin
      .from("registrations")
      .insert({
        camp_id: camp.id,
        contact_id: contactId,
        attendee_id: attendee.id,
        status: "pending",
        amount_cents: amount,
        custom_field_values: data.customFieldValues ?? {},
      })
      .select("id")
      .single();
    if (rErr) throw new Error(rErr.message);

    return { kind: "registered" as const, registrationId: reg.id, amountCents: amount };
  });