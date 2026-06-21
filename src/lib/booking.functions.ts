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
        "id, owner_id, capacity, price_cents, early_bird_price_cents, early_bird_expires_at, status, waiver_required",
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
    const baseAmount = earlyBirdActive ? camp.early_bird_price_cents! : camp.price_cents;

    // Apply coupon if provided & valid
    let amount = baseAmount;
    let couponId: string | null = null;
    if (data.couponCode && data.couponCode.trim()) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id, percent_off, amount_off_cents, expires_at, usage_limit, used_count")
        .eq("owner_id", camp.owner_id)
        .ilike("code", data.couponCode.trim())
        .maybeSingle();
      const valid =
        coupon &&
        (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) &&
        (coupon.usage_limit == null || (coupon.used_count ?? 0) < coupon.usage_limit);
      if (valid) {
        const discount = coupon.percent_off
          ? Math.round((baseAmount * coupon.percent_off) / 100)
          : coupon.amount_off_cents ?? 0;
        amount = Math.max(0, baseAmount - discount);
        couponId = coupon.id;
      }
    }

    const { data: reg, error: rErr } = await supabaseAdmin
      .from("registrations")
      .insert({
        camp_id: camp.id,
        contact_id: contactId,
        attendee_id: attendee.id,
        status: "pending",
        amount_cents: amount,
        custom_field_values: (data.customFieldValues ?? {}) as never,
      })
      .select("id")
      .single();
    if (rErr) throw new Error(rErr.message);

    if (couponId) {
      const { data: cRow } = await supabaseAdmin.from("coupons").select("used_count").eq("id", couponId).maybeSingle();
      await supabaseAdmin
        .from("coupons")
        .update({ used_count: (cRow?.used_count ?? 0) + 1 })
        .eq("id", couponId);
    }

    if (data.waiver) {
      const { error: wErr } = await supabaseAdmin.from("waiver_signatures").insert({
        registration_id: reg.id,
        attendee_id: attendee.id,
        camp_id: camp.id,
        signer_name: data.waiver.signer_name,
        signature_method: data.waiver.signature_method,
        signature_data: data.waiver.signature_data,
        waiver_text_snapshot: data.waiver.waiver_text_snapshot,
      });
      if (wErr) throw new Error(wErr.message);
    }

    return { kind: "registered" as const, registrationId: reg.id, amountCents: amount };
  });