import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const attendeeSchema = z.object({
  full_name: z.string().min(1).max(120),
  birthday: z.string().optional().nullable(),
  position: z.string().max(40).optional().nullable(),
  skill_level: z.string().max(40).optional().nullable(),
  handedness: z.string().max(20).optional().nullable(),
  jersey_number: z.string().max(10).optional().nullable(),
  customFieldValues: z.record(z.string(), z.unknown()).optional(),
});

const submitSchema = z.object({
  campId: z.string().uuid(),
  parent: z.object({
    full_name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().max(40).optional().nullable(),
  }),
  attendees: z.array(attendeeSchema).min(1).max(6),
  couponCode: z.string().trim().max(40).optional().nullable(),
  paymentPlan: z.enum(["none", "two", "three"]).optional().default("none"),
  waiver: z
    .object({
      signer_name: z.string().min(1).max(120),
      signature_method: z.enum(["drawn", "typed"]),
      signature_data: z.string().min(1).max(500_000),
      waiver_text_snapshot: z.string().min(1).max(50_000),
    })
    .optional()
    .nullable(),
});

const previewCouponSchema = z.object({
  campId: z.string().uuid(),
  code: z.string().trim().min(1).max(40),
});

export const previewCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => previewCouponSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: camp } = await supabaseAdmin
      .from("camps")
      .select("owner_id, price_cents, early_bird_price_cents, early_bird_expires_at, status")
      .eq("id", data.campId)
      .maybeSingle();
    if (!camp || camp.status !== "live") return { ok: false as const, error: "Camp not available" };
    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("id, percent_off, amount_off_cents, expires_at, usage_limit, used_count")
      .eq("owner_id", camp.owner_id)
      .ilike("code", data.code)
      .maybeSingle();
    if (!coupon) return { ok: false as const, error: "Invalid code" };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return { ok: false as const, error: "Code expired" };
    if (coupon.usage_limit != null && (coupon.used_count ?? 0) >= coupon.usage_limit)
      return { ok: false as const, error: "Code usage limit reached" };
    const earlyActive =
      camp.early_bird_price_cents != null &&
      camp.early_bird_expires_at != null &&
      new Date(camp.early_bird_expires_at) > new Date();
    const base = earlyActive ? camp.early_bird_price_cents! : camp.price_cents;
    const discount = coupon.percent_off
      ? Math.round((base * coupon.percent_off) / 100)
      : coupon.amount_off_cents ?? 0;
    const finalAmount = Math.max(0, base - discount);
    return {
      ok: true as const,
      baseCents: base,
      discountCents: discount,
      finalCents: finalAmount,
      label: coupon.percent_off ? `${coupon.percent_off}% off` : `$${((coupon.amount_off_cents ?? 0) / 100).toFixed(0)} off`,
    };
  });

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load camp
    const { data: camp, error: campErr } = await supabaseAdmin
      .from("camps")
      .select(
        "id, owner_id, capacity, price_cents, early_bird_price_cents, early_bird_expires_at, status, waiver_required, sibling_discount, sibling_discount_percent, payment_plan, start_date",
      )
      .eq("id", data.campId)
      .maybeSingle();
    if (campErr) throw new Error(campErr.message);
    if (!camp || camp.status !== "live") throw new Error("This camp is not accepting registrations.");
    if (camp.waiver_required && !data.waiver) {
      throw new Error("A signed waiver is required to register for this camp.");
    }

    // Count paid registrations to check capacity
    const { count: paidCount } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("camp_id", camp.id)
      .eq("status", "paid");
    const remaining = Math.max(0, camp.capacity - (paidCount ?? 0));
    const numAttendees = data.attendees.length;
    // If we can't fit everyone, treat the whole booking as waitlist (keeps siblings together)
    const isFull = remaining < numAttendees;

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

    // Insert all attendees
    const attendeeRows: { id: string }[] = [];
    for (const a of data.attendees) {
      const { data: row, error: aErr } = await supabaseAdmin
        .from("attendees")
        .insert({
          owner_id: camp.owner_id,
          contact_id: contactId,
          full_name: a.full_name,
          birthday: a.birthday || null,
          position: a.position || null,
          skill_level: a.skill_level || null,
          handedness: a.handedness || null,
          jersey_number: a.jersey_number || null,
        })
        .select("id")
        .single();
      if (aErr) throw new Error(aErr.message);
      attendeeRows.push(row);
    }

    if (isFull) {
      const { count: waitCount } = await supabaseAdmin
        .from("waitlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("camp_id", camp.id);
      let pos = (waitCount ?? 0);
      for (const att of attendeeRows) {
        pos += 1;
        const { error: wErr } = await supabaseAdmin.from("waitlist_entries").insert({
          camp_id: camp.id,
          contact_id: contactId,
          attendee_id: att.id,
          position: pos,
          status: "waiting",
        });
        if (wErr) throw new Error(wErr.message);
      }
      return { kind: "waitlisted" as const, count: attendeeRows.length };
    }

    const earlyBirdActive =
      camp.early_bird_price_cents != null &&
      camp.early_bird_expires_at != null &&
      new Date(camp.early_bird_expires_at) > new Date();
    const perPersonBase = earlyBirdActive ? camp.early_bird_price_cents! : camp.price_cents;

    // Resolve coupon once (applied per-child to base)
    let coupon: { id: string; percent_off: number | null; amount_off_cents: number | null } | null = null;
    if (data.couponCode && data.couponCode.trim()) {
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("id, percent_off, amount_off_cents, expires_at, usage_limit, used_count")
        .eq("owner_id", camp.owner_id)
        .ilike("code", data.couponCode.trim())
        .maybeSingle();
      const valid =
        c &&
        (!c.expires_at || new Date(c.expires_at) >= new Date()) &&
        (c.usage_limit == null || (c.used_count ?? 0) < c.usage_limit);
      if (valid) coupon = { id: c.id, percent_off: c.percent_off, amount_off_cents: c.amount_off_cents };
    }

    const siblingPct = camp.sibling_discount ? (camp.sibling_discount_percent ?? 0) : 0;
    const bookingGroupId =
      attendeeRows.length > 1
        ? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
        : null;

    const registrationIds: string[] = [];
    let totalAmount = 0;

    for (let i = 0; i < attendeeRows.length; i++) {
      const att = attendeeRows[i];
      const a = data.attendees[i];
      let base = perPersonBase;
      let siblingOff = 0;
      if (i > 0 && siblingPct > 0) {
        siblingOff = Math.round((base * siblingPct) / 100);
        base = base - siblingOff;
      }
      let couponOff = 0;
      if (coupon) {
        couponOff = coupon.percent_off
          ? Math.round((base * coupon.percent_off) / 100)
          : coupon.amount_off_cents ?? 0;
      }
      const amount = Math.max(0, base - couponOff);
      totalAmount += amount;

      const { data: reg, error: rErr } = await supabaseAdmin
        .from("registrations")
        .insert({
          camp_id: camp.id,
          contact_id: contactId,
          attendee_id: att.id,
          status: "pending",
          amount_cents: amount,
          custom_field_values: (a.customFieldValues ?? {}) as never,
          booking_group_id: bookingGroupId,
          sibling_discount_cents: siblingOff,
        })
        .select("id")
        .single();
      if (rErr) throw new Error(rErr.message);
      registrationIds.push(reg.id);

      // Installment schedule (deposit today, remaining at monthly intervals)
      if (data.paymentPlan && data.paymentPlan !== "none") {
        const installments = data.paymentPlan === "two" ? 2 : 3;
        const per = Math.floor(amount / installments);
        const remainder = amount - per * installments;
        const today = new Date();
        const rows = Array.from({ length: installments }).map((_, idx) => {
          const due = new Date(today);
          due.setMonth(due.getMonth() + idx);
          return {
            registration_id: reg.id,
            owner_id: camp.owner_id,
            sequence: idx + 1,
            amount_cents: idx === 0 ? per + remainder : per,
            due_date: due.toISOString().slice(0, 10),
            status: "scheduled",
          };
        });
        const { error: instErr } = await supabaseAdmin.from("payment_installments").insert(rows);
        if (instErr) throw new Error(instErr.message);
      }

      if (data.waiver) {
        const { error: wErr } = await supabaseAdmin.from("waiver_signatures").insert({
          registration_id: reg.id,
          attendee_id: att.id,
          camp_id: camp.id,
          signer_name: data.waiver.signer_name,
          signature_method: data.waiver.signature_method,
          signature_data: data.waiver.signature_data,
          waiver_text_snapshot: data.waiver.waiver_text_snapshot,
        });
        if (wErr) throw new Error(wErr.message);
      }
    }

    if (coupon) {
      const { data: cRow } = await supabaseAdmin.from("coupons").select("used_count").eq("id", coupon.id).maybeSingle();
      await supabaseAdmin
        .from("coupons")
        .update({ used_count: (cRow?.used_count ?? 0) + attendeeRows.length })
        .eq("id", coupon.id);
    }

    return {
      kind: "registered" as const,
      registrationIds,
      amountCents: totalAmount,
      count: attendeeRows.length,
      paymentPlan: data.paymentPlan ?? "none",
    };
  });