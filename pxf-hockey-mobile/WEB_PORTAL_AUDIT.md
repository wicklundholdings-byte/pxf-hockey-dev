# PXF Hockey Web Portal — Full Audit
_Audited July 9, 2026 · Source: puck-palace-coach.lovable.app_

---

## ROUTES THAT EXIST ✅

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Full | Marketing landing page |
| `/pricing` | ✅ Full | Pricing page (see fixes needed below) |
| `/dashboard` | ✅ Full | Coach dashboard — mock data |
| `/schedule` | ✅ Full | Week/Month/Day views, Camps/Privates/Practices filters, Create button |
| `/teams` | ✅ Full | Team list, search, create, cards with record + next game |
| `/camps` | ✅ Full | Camps & Privates list, Events/Series tabs, status filters (Active/Published/Complete) |
| `/camps/[id]` | ✅ Full | Camp detail — Overview, Schedule, Registrations, Payments, Financials tabs + public link |
| `/financials` | ✅ Full | Overview, Profitability, Payments, Insights tabs; revenue chart, transactions, outstanding |
| `/playbook` | ✅ Full | Drill library — search, categories, filter tabs (All/Skating/Slip Training/GameIQ/Dryland/My Drills) |
| `/athletes` | ✅ Full | Athlete roster, dryland progress tracking, multi-team filter, search |
| `/inbox` | ✅ Full | Channels + DMs, pinned messages, file sharing, Broadcast button, auto-creates channels per camp/team |
| `/settings` | ✅ Full | Profile, Staff & Rates, Ice Allocation, Website Builder, Notifications, Billing |

---

## ROUTES THAT ARE 404 ❌ (NOT BUILT)

| Route | Priority | What it needs |
|---|---|---|
| `/teams/[id]` | 🔴 HIGH | Team detail — roster, schedule, games, tournaments, playbook |
| `/athletes/[id]` | 🔴 HIGH | Athlete detail — session history, dryland progress, payments, notes |
| `/privates/[id]` | 🟡 MEDIUM | Private session detail — schedule, athlete info, payments |
| `/coach/[slug]` | 🔴 HIGH | **Public coach profile page** — shown in website builder preview but route doesn't exist |
| `/book/[coach]/camp/[slug]` | 🔴 HIGH | **Public camp registration page** — route exists but shows "Camp not found", no form, no payment |

---

## FEATURES PARTIALLY BUILT ⚠️

### Drill Builder (`/playbook` → Create Drill)
**What's there:** Ice rink (Full/Half/Neutral/Corner), dark/light toggle, pencil, curved line, dashed line, cone, puck, basic shapes, undo/redo, drill name/category/difficulty/duration/description form, video upload, IHS link field.

**What's MISSING (critical):**
- ❌ Player tokens — no offensive players, defensive players, or goalie markers
- ❌ Skating path arrows (curved, directional)
- ❌ Pass arrows (dashed, straight)
- ❌ Shot arrows (solid, straight to net)
- ❌ Multi-step/phase sequencing (Phase 1 → Phase 2 → Phase 3)
- ❌ Player numbering/labeling
- ❌ Snap-to-zone guides

**Rebuild plan:** Use Konva.js or Fabric.js canvas library for proper hockey diagram tool.

### Website Builder (`/settings` → Website)
**What's there:** 3 templates (Classic/Modern/Minimal), branding panel (name, tagline, logo, colors, favicon), Hero Section, About Section, Contact & Social, live preview, Preview Page, Publish Changes, URL shows `pxfhockey.com/coach/[slug]`, camps auto-populate from portal.

**What's MISSING:**
- ❌ The actual public profile route (`/coach/[slug]`) is 404 — builder is UI-only
- ❌ Registration flow on camp "Register" buttons — no form, no Stripe, no waiver
- ❌ Waiver & liability release in registration
- ❌ Media/filming consent checkbox
- ❌ Cancellation policy displayed at registration
- ❌ Mailing list opt-in at registration

---

## THINGS THAT NEED FIXES (wrong, not missing)

| Item | Issue | Fix |
|---|---|---|
| Elite Coach price | Shows $75/mo | Change to $80/mo |
| Academy tier | Shows 3rd plan at $125/mo | Remove entirely |
| "Start Free Trial" / "Log In" CTAs | Go to `/dashboard` (fake) | Wire to real Supabase auth |
| App Store / Google Play buttons | Dead links (`#`) | Update when published |
| Testimonials | Placeholder names/orgs | Replace with real coaches or remove |
| Public booking URL in camp detail | Shows `pxfhockey.lovable.app/book/...` | Update to `pxfhockey.com/book/...` |
| Founding member price on pricing page | Shows "25% off" but not the actual $25/$50 prices | Add founding prices to cards |

---

## COMPLETE BUILD ORDER (Web Portal)

### Phase 1 — Export + Foundation
1. Export Lovable project to GitHub repo `pxf-hockey-web`
2. Set up Vite + React + TypeScript + Tailwind
3. Connect Supabase (same project: `kqamqlsimyelvzxqdnyp`)
4. Build auth flow (sign up, log in, onboarding — mirrors mobile app)
5. Set up Cloudflare Pages deployment + connect `pxfhockey.com`

### Phase 2 — Fix Marketing Site
6. Remove Academy tier, fix Elite price to $80
7. Wire "Start Free Trial" → real auth signup
8. Add actual founding member prices ($25/$50) to pricing cards
9. Replace placeholder testimonials

### Phase 3 — Wire Portal to Real Data (section by section)
10. Dashboard → real Supabase data
11. Schedule → real sessions, create/edit modals
12. Teams list → real teams from Supabase
13. **Team detail page** → build `/teams/[id]` (roster, schedule, games, tournaments)
14. Camps & Privates list → real camps
15. **Camp detail** → real data (registrations, payments, financials tabs)
16. Financials → real revenue, transactions, outstanding payments
17. Playbook/Drill library → real drills from Supabase
18. Athletes list → real athletes
19. **Athlete detail page** → build `/athletes/[id]`
20. Inbox → wire to real broadcasts/messages
21. Settings → real profile save, billing integration

### Phase 4 — Drill Builder (Rebuild)
22. Build proper canvas-based drill diagram tool (Konva.js)
    - Player tokens: O (offense), X (defense), G (goalie), color-coded, numbered
    - Arrow types: skating path (curved), pass (dashed), shot (solid)
    - Cones, pucks (keep from existing)
    - Phase sequencing (Phase 1/2/3)
    - Save diagram as JSON to Supabase, render as image for mobile

### Phase 5 — Public Profile + Registration
23. Build `/coach/[slug]` public profile route (reads from coach's website builder settings)
24. Build `/book/[coach]/camp/[slug]` registration page with:
    - Camp details (date, time, location, age group, spots left, price)
    - Player info form (name, birth year, position)
    - Parent/guardian info form (name, phone, email)
    - Stripe payment (Apple Pay / Google Pay / card)
    - **Waiver & liability release** (scrollable, checkbox required)
    - Media/filming consent checkbox
    - Cancellation policy displayed
    - Mailing list opt-in
    - Confirmation email trigger (Supabase Edge Function)
25. Wire camp "Register" button on website builder preview to this flow
26. Wire "Copy Public Link" in camp detail to real public URL

### Phase 6 — Website Builder Activation
27. Make website builder changes actually generate/update the public `/coach/[slug]` page
28. Publish Changes button goes live
29. Test all 3 templates rendering correctly

### Phase 7 — Polish + Pre-launch
30. App Store / Google Play links when published
31. Real testimonials
32. SEO meta tags on all public pages
33. Mobile responsiveness audit on public pages
34. Performance audit (Lighthouse)

---

## NOTES

- **Drill builder JSON format** should be compatible with the mobile app's drill viewer — same schema so drills created on web show in the mobile playbook
- **Waiver text** needs legal review before launch — draft it early
- **Supabase Edge Functions** needed for: confirmation emails, signed Cloudflare URLs (video), Stripe webhooks
- **`pxf-hockey-web` repo** should be separate from `pxf-hockey-mobile` but share the same Supabase types package (consider a shared `@pxf/types` package)
