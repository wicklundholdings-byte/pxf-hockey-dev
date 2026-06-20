## Phase 1 scope

Three new screens under `/coach/*`, plus the full backend schema so later phases (camp detail, financials, contacts, attendees, team, inbox, email, waitlist, public booking) can land without another migration round.

All new routes live under `src/routes/_authenticated/coach.*` and require an `admin` or new `coach` role. Existing `/admin`, `/drills`, etc. are untouched.

## Database (one migration, all tables for the full brief)

Created so Phase 2+ has no schema churn. Every public table gets GRANTs + RLS.

- `coach_role` enum extension: add `coach` to existing `app_role`.
- `camps` — format (camp/session), name, slug, description, hero_image, tags[], featured, venue/online/tba, address, start/end dates, timezone, price_cents, capacity, show_remaining, early_bird_price_cents, early_bird_expires_at, sibling_discount, payment_plan (none/2/3), waiver_url, status (draft/live/ended), owner_id, gross_sales_cents (derived), net_sales_cents (derived).
- `camp_custom_fields` — camp_id, label, type (position/skill_level/jersey/handedness/equipment/text/select), options[], required, sort_order.
- `camp_sessions` — camp_id, session_date, start_time, end_time (for attendance grid).
- `contacts` — owner_id, full_name, email, phone, subscribed, joined_at.
- `attendees` — owner_id, contact_id (parent), full_name, gender, birthday, position, skill_level, jersey_number, handedness, equipment_size.
- `registrations` — camp_id, contact_id, attendee_id, status (paid/abandoned/waitlisted/refunded), amount_cents, order_number, created_at, custom_field_values jsonb.
- `orders` — registration_id, stripe_payment_intent, total_cents, status, coupon_id, payment_plan_installments.
- `coupons` — owner_id, code, percent_off, amount_off_cents, expires_at, usage_limit, used_count.
- `payouts` — owner_id, amount_cents, status, period_start, period_end, paid_at.
- `team_members` — owner_id (coach), member_user_id, title, status (active/invited), email, phone.
- `attendance` — registration_id, session_id, present bool.
- `evaluations` — registration_id, skating, puck_control, passing, shooting, hockey_sense, compete_level (1-5), notes, sent_to_parent_at.
- `camp_media` — camp_id, storage_path, uploaded_by, created_at.
- `conversations` — type (camp_group/dm), camp_id nullable, created_by.
- `conversation_members` — conversation_id, user_id.
- `messages` — conversation_id, sender_id, body, image_path, pinned, created_at, read_by jsonb.
- `email_campaigns` — owner_id, name, audience_filter jsonb, template, subject, body, status (draft/scheduled/sent), scheduled_for, sent_count, open_count, click_count.
- `waitlist_entries` — camp_id, contact_id, attendee_id, position, claim_expires_at, status.

RLS: owner-scoped (`auth.uid() = owner_id`) for coach-owned rows; admins bypass via `has_role`. Public booking page reads `camps` via narrow `TO anon` SELECT policy where `status = 'live'`.

Storage bucket `camp-media` (private, signed URLs) and `camp-images` (public hero images).

## Screens (Phase 1)

### 1. `/coach` — Coach Dashboard
- Header: today's date, notification bell (dropdown stub), "Broadcast" button.
- Stats grid: Gross sales, Net sales, Total registrations, Monthly revenue (mock numbers from real aggregations where available).
- Registrations chart: line/area, date-range selector (7d/30d/90d/custom).
- Active camps list with capacity progress bars.
- Recent activity feed (registrations, payments, messages — pulled from real tables, empty-state friendly).
- Quick stats: total contacts, upcoming camps.

### 2. `/coach/camps` — Events / Camps
- Top bar: search, status filter chips, calendar/list toggle, "Create Camp" button.
- Card rows: date block, hero image, name, location, status badge, spots-sold progress, net sales.
- Calendar toggle renders a month grid with camp pills.

### 3. `/coach/camps/new` — Create Camp wizard
- 5 steps with a step indicator, Back/Next, validation per step (zod):
  1. Format (Camp vs Training Session)
  2. Details (image upload to `camp-images`, name, tags, featured toggle, rich text via `textarea` + markdown preview to keep deps minimal)
  3. Location & Time (venue/online/TBA, date range, timezone)
  4. Registration (price, spots, show-remaining, early bird, sibling discount, payment plan, waiver upload, custom fields builder)
  5. Review (full summary + Save Draft / Publish)
- On submit: insert `camps` + `camp_custom_fields`, route to `/coach/camps`.

## Design system

Add the brief's tokens to `src/styles.css` under a scoped `.coach-shell` so it doesn't disturb existing screens:
- `--coach-bg #0D1117`, `--coach-card #161B22`, `--coach-border #21262D`, `--coach-text #FFFFFF`, `--coach-muted #8B949E`, `--coach-accent #00C4B4` (teal), `--coach-success #3DFF8F`, `--coach-danger`, `--coach-warning`.
- Status badges (Paid, Abandoned, Live, Draft, Waitlisted) as a shared `<StatusBadge />`.
- Shared `CoachShell` layout with sidebar nav (Dashboard, Camps — others greyed "Coming in Phase 2").

## Technical notes

- Server fns under `src/lib/coach/*.functions.ts` using `requireSupabaseAuth`; no admin client for app reads.
- TanStack Query + `ensureQueryData` in loaders, `useSuspenseQuery` in components.
- Role gate: new pathless `_authenticated/_coach.tsx` layout that `redirect`s if `!has_role('coach' or 'admin')`.
- Migration includes seed: 3 sample camps (1 live, 1 draft, 1 ended), ~10 sample registrations so the dashboard isn't empty.

## Out of scope for Phase 1

Camp detail tabs, financials, contacts, attendees, team, inbox, email marketing, waitlist UI, public booking page, Stripe integration. All tables exist so Phase 2 is pure UI.
