## Parent Camp Registration Experience

Goal: ship the 6 screens you described as a cohesive flow that parents land on from a coach's shared link. Reuse the existing booking data layer (`/book/$slug` already wires `submitBooking`, coupons, custom fields, waivers, payment plans) but redesign the UX into the modern, sectioned dashboard look the rest of the app uses.

### Routes

```text
/camps/$slug              → Screen 1  Public camp page (hero, info, CTAs)
/camps/$slug/register     → Screen 2  Registration form
/camps/$slug/waiver       → Screen 3  Scroll-to-sign waiver
/camps/$slug/payment      → Screen 4  Order summary + payment plans + Stripe
/camps/$slug/confirmed    → Screen 5  Confirmation + add-to-calendar + view-in-app
/parent                   → Screen 6  Camps tab (already exists, redesign card)
/parent/camp/$campId      → Screen 6  Camp detail with Schedule / Roster / Inbox / Info sub-tabs
```

`/book/$slug` stays as a redirect into `/camps/$slug` so old coach links keep working.

A small `useRegistrationDraft(slug)` hook persists parent + child + waiver + plan + coupon to `sessionStorage` so refreshes and back-navigation don't lose progress across the 4 wizard steps. Screen 1 has the only entry point; deep-linking later steps without a draft bounces to step 1.

### Screen-by-screen

**Screen 1 — Public Camp Page (`/camps/$slug`)**
- Public route (no `_authenticated`). Loader reads camp via the existing `getPublicCamp` server fn (publishable key, narrow column projection) so SSR/OG tags work for shared links.
- Hero: cover image, camp name, coach name + logo, date range, time, venue, price (early-bird strikethrough when active), `8 spots left` chip (uses `camp.show_remaining`).
- Sections (cards): Description, What's included, Daily schedule overview (from `camp_sessions`), Coach bio (from `profiles`).
- Sticky bottom bar on mobile: `Register Now` (teal gradient) + `Share` (native share / copy link).
- `head()` sets title, description, `og:title`, `og:description`, `og:image` from camp hero.

**Screen 2 — Registration Form (`/camps/$slug/register`)**
- Single-column form, sectioned: Parent info, Child info, Custom fields (loaded from `camp_custom_fields`).
- Skill level pill selector (Beginner / Intermediate / Advanced), position select, DOB date input.
- Custom-field renderer covers text / textarea / select / checkbox / number.
- `Continue` advances to `/waiver` after writing the draft.

**Screen 3 — Waiver (`/camps/$slug/waiver`)**
- Scrollable card with full `camp.waiver_text`. Tracks scroll position; agree controls stay disabled until bottom is reached (visible progress hint).
- Checkbox `I have read and agree…` + typed-name signature field.
- `Continue` requires both; on submit, draft stores agreement timestamp + typed name.

**Screen 4 — Payment (`/camps/$slug/payment`)**
- Order summary card: camp name, dates, child name, price.
- When `camp.payment_plan !== 'none'`: two radio cards at top — `Pay in full` vs `Pay deposit` (deposit + remaining due date derived from camp config).
- Promo code: collapsed row "Have a promo code?" → expands to input + Apply, calls existing `previewCoupon`. Discount line shows in summary.
- Stripe payment form below (placeholder Stripe Elements wrapper — wired identically to current `book.$slug.tsx` `submitBooking` call). Pay button at bottom in the teal gradient style.
- On success → navigate to `/camps/$slug/confirmed` with registration IDs in router state.

**Screen 5 — Confirmation (`/camps/$slug/confirmed`)**
- Animated green check (CSS, no library).
- Child name, camp name, dates, total paid.
- `Add to calendar` (generates `.ics` client-side from camp_sessions).
- `Download receipt` (generates a simple printable receipt page).
- Copy: "You'll receive a confirmation email and SMS shortly. Your coach will be in touch before camp starts."
- `View in app →` routes to `/auth?mode=signup&redirect=/parent` (or `/parent` if already signed in).

**Screen 6 — Parent App (`/parent` + `/parent/camp/$campId`)**
- `/parent` Camps tab card: camp name, dates, coach name, big countdown chip (`14 days until camp`), tap → detail.
- New nested route `/parent/camp/$campId` with horizontal sub-tabs:
  - **Schedule** — read-only list of `camp_sessions` grouped by day.
  - **Roster** — `X kids enrolled` count only; no names.
  - **Inbox** — message thread with coach (reuses existing `conversations` / `messages`).
  - **Info** — venue, address, map link, "What to bring" list.

### Technical notes

- New components:
  - `src/components/parent/camp-hero.tsx`
  - `src/components/parent/registration-stepper.tsx` (1/4 progress dots reused across screens 2–4)
  - `src/components/parent/order-summary.tsx`
  - `src/components/parent/payment-plan-picker.tsx`
  - `src/components/parent/waiver-scroll.tsx`
  - `src/components/parent/countdown-chip.tsx`
- New server fns in `src/lib/camps-public.functions.ts`: `getPublicCamp(slug)`, `getPublicCampSchedule(campId)`, `getPublicCoachBio(userId)` — all use the server publishable client + narrow column projection against existing `TO anon` SELECT policies (no schema changes).
- New authenticated server fn `getParentCamp(campId)` for screen 6 detail (RLS-scoped reads of camp + sessions + roster count).
- Reuse existing `submitBooking`, `previewCoupon`, `camp_custom_fields`, `waiver_signatures`.
- Tokens only: teal gradient buttons, `bg-surface`/`bg-card`, `border-border`, `text-muted-foreground` — no hardcoded colors.
- All public routes set `head()` metadata; only `/camps/$slug` adds `og:image`.
- Out of scope this pass: real Stripe Elements wiring (keeps placeholder), actual SMS delivery, calendar OAuth.

### Open questions before I build

1. Should `/book/$slug` keep working as an alias (redirect to `/camps/$slug`), or do you want the old route deleted entirely?
2. For Add-to-calendar, is a client-generated `.ics` download fine, or do you want Google/Apple deep links too?
3. Screen 6 Inbox — wire it to the real `conversations` table now, or stub the thread UI in this pass and wire later?
