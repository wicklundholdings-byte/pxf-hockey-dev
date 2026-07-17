@AGENTS.md

# PXF Hockey — Product Context

This file is the source of truth for product decisions. Update it whenever something changes.

---

## Subscription Tiers & Pricing

| Tier         | Regular Price | Founding Member Price | Notes |
|---|---|---|---|
| Parent       | $10/mo        | $10/mo (no discount)  | View camp details, payments, team info |
| Team Coach   | $35/mo        | $25/mo (founding)     | Team-focused: roster, schedule, sessions, drills, inbox |
| Elite Coach  | $80/mo        | $50/mo (founding)     | Full platform: all Team Coach features + financials, camps, CRM, campaigns |

**Founding Member rules:**
- First 250 paying users (Team Coach + Elite only) lock in the 25% discount **for life**
- Discount applies at signup and never expires, even after 250 cap is hit
- Parents are $10 flat — no founding member discount
- `is_founding_member` flag exists on the `profiles` table in Supabase

---

## User Roles / Views

| Role        | Entry Point    | Tab Bar            | Description |
|---|---|---|---|
| Parent      | `/parent-home` | `ParentTabBar`     | Read-only access to child's teams, camps, payments, inbox |
| Team Coach  | `/tc-home`     | `TeamCoachTabBar`  | Coaches a single team, no business/revenue tools |
| Elite Coach | `/`            | Coach tab bar      | Full platform access |
| Staff       | `/staff-home`  | Custom (3-tab)     | Assigned camps/sessions only, role-gated |

**Role values in Supabase `profiles.role`:** `'elite'` | `'team'` | `'parent'` | `'staff'` — exact strings. `'coach'` routes to onboarding (do not use).

DEV switching: Settings screen has buttons to switch between all three views for testing.

---

## Key Product Decisions

- **No Academy tier yet** — Elite is the top tier for now, no staff/size restrictions. Academy (multi-org, white-label) comes later; existing members will be grandfathered.
- **Founding member banner** shown on Elite Coach dashboard when `is_founding_member = true`
- **Role-based routing** uses Supabase `profiles.role`; DEV switcher available in Settings for testing
- **TC Home has NO stat cards** — removed Players/This Week/Drills row; first section is TODAY

---

## Team Coach Tab Bar (FINAL)

Labels: **Home | Teams | Schedule | Playbook | Inbox**

```tsx
// src/components/team-coach-tab-bar.tsx
export type TeamCoachTab = 'home' | 'teams' | 'schedule' | 'playbook' | 'inbox';

const TABS = [
  { key: 'home',     label: 'Home',     icon: 'home-outline',       activeIcon: 'home',       route: '/tc-home' },
  { key: 'teams',    label: 'Teams',    icon: 'people-outline',     activeIcon: 'people',     route: '/tc-teams' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline',   activeIcon: 'calendar',   route: '/tc-sessions' },
  { key: 'playbook', label: 'Playbook', icon: 'book-outline',       activeIcon: 'book',       route: '/tc-drills' },
  { key: 'inbox',    label: 'Inbox',    icon: 'chatbubble-outline', activeIcon: 'chatbubble', route: '/tc-inbox' },
];
```

---

## Team Coach UI Rules

All TC screens must match Elite Coach visually. Key rules:

- **Logo**: Stacked `GradientText` PXF / HOCKEY (teal→green), NOT plain ThemedText. Same sizes as Elite Coach (`fontSize: 28 / lineHeight: 34` for PXF, `fontSize: 11 / lineHeight: 16` for HOCKEY, `letterSpacing: 3 / 5`).
- **Filter chips**: Rectangular style (`borderRadius: 8`, `backgroundColor: CARD`, `borderColor: BORDER`), active = `borderColor: TEAL, backgroundColor: '#0D2A24'`. NOT pill style.
- **Playbook tab** (`src/app/tc-drills.tsx`): Identical to Elite Coach `src/app/playbook.tsx` — Library/Practices/My Drills/Favorites tabs, solid TEAL active tab selector, solid TEAL active chips, DrillCard with green gradient "+ Add to Session" button.
- **MY TEAMS** (not "My Team") on TC home — empty state says "No teams yet" with "+ Add Team" button.
- **Tab pill selector** (Playbook, Practices toggle): solid TEAL fill for active tab, black text. Container = `backgroundColor: CARD, borderRadius: 30`.

---

## Color Constants (used across all screens)

```
BG      = '#0D1117'
CARD    = '#161B22'
TEAL    = '#00C4B4'
GREEN   = '#3DFF8F'
ORANGE  = '#F59E0B'
RED     = '#EF4444'
PURPLE  = '#7C3AED'
TEXT    = '#FFFFFF'
MUTED   = '#8B949E'
BORDER  = '#21262D'
```

---

## Text Clipping Rule

`ThemedText` default style applies `lineHeight: 24`. Any custom style with `fontSize >= 25` MUST include an explicit `lineHeight` or text will be physically clipped on screen. Formula: `lineHeight = Math.ceil(fontSize * 1.2)`.

---

## Web Portal (pxfhockey.com)

- **Stack**: TanStack Start + Vite + Tailwind, targeting Cloudflare Pages (SSR)
- **Local repo**: `/Users/evanwicklund/pxf-hockey-dev/pxf-hockey-web`
- **GitHub**: `https://github.com/wicklundholdings-byte/pxf-hockey-web`
- **Deployment**: Cloudflare Pages — GitHub `main` branch → auto-deploys on every `git push`
- **Build command**: `npm run build` | **Output dir**: `.output/public`
- **Auth**: Same Supabase project (`kqamqlsimyelvzxqdnyp`) as mobile app
- **Role redirect** (`src/lib/get-role.ts` → `pathForRole`): elite/null → `/dashboard`, team → `/team-coach`, parent → `/parent`
- **Fully off Lovable** as of July 2026 — `package.json` and `vite.config.ts` have no Lovable deps

### Route Structure

```
pxfhockey.com/                    → marketing home
pxfhockey.com/store               → gear shop
pxfhockey.com/sign-up             → auth
pxfhockey.com/sign-in             → auth
pxfhockey.com/dashboard           → elite coach portal
pxfhockey.com/team-coach          → team coach portal
pxfhockey.com/parent              → parent portal
pxfhockey.com/[coach_slug]        → coach public mini-site (see below)
pxfhockey.com/[coach_slug]/camps/[camp_slug] → individual camp registration page
```

### Coach Mini-Sites (Elite Coach only)

Every Elite Coach gets a public-facing mini-site at `pxfhockey.com/[coach_slug]`:
- Displays coach bio, photo, org name, specialty
- Lists their active/upcoming camps with registration links
- Each camp has its own public registration page at `/[coach_slug]/camps/[camp_slug]`
- Parents can register and pay without a PXF Hockey account
- Registrations flow directly into `camp_registrations` table

**Widget option:** Coaches who already have a personal/club website can embed a widget instead:
- Snippet: `<script src="https://pxfhockey.com/widget/[coach_slug].js"></script>`
- Renders their upcoming camps inline on any external site
- "Register" button links back to the PXF camp page
- Widget route: `pxfhockey.com/widget/[coach_slug]` (embeddable iframe fallback)

`coach_slug` column already exists on `profiles` table. Coaches set it during onboarding.

### Planned Web Features (build order)

1. Marketing page + auth (sign-up / sign-in)
2. Dashboard shells (role-gated layouts matching app)
3. Coach mini-sites + public camp registration pages
4. Drill builder (react-konva rink diagram editor, saves to `drills` table)
5. Gear store (`/store`)
6. Web-only extras: video upload to Cloudflare Stream, print/export (PDF/CSV), bulk player import

### Drill Builder (web-only)

- **Library**: `react-konva` (canvas, serializes to JSON for Supabase storage)
- Full-ice and half-ice rink templates
- Drag-and-place tokens: forwards (X), defense (O), goalies (G), pucks, cones
- Draw movement arrows: skating lines (curved), pass lines (straight dashed), shot lines
- Text annotations anywhere on ice
- Saves diagram JSON + PNG thumbnail to `drills` table
- PNG thumbnail displayed in mobile app drill cards

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      target: "cloudflare-pages",
    }),
  ],
});
```

### One-time cleanup still needed

`bunfig.toml` still has Lovable packages in `minimumReleaseAgeExcludes` — harmless but stale:
1. Remove those entries from `bunfig.toml`
2. Run `bun install` to regenerate `bun.lock` without Lovable's private GCP registry URLs

### Key web files

- `vite.config.ts` — build config
- `src/server.ts` — SSR entry with Cloudflare Workers error wrapper
- `src/lib/get-role.ts` — role → route mapping (`pathForRole`)

---

## Important Files (Mobile)

- `src/app/_layout.tsx` — all route registrations; parent + TC + staff screens use `tabBarStyle: { display: 'none' }` to hide coach tab bar; routes `role='staff'` → `/staff-home`
- `src/app/tc-home.tsx` — Team Coach home dashboard
- `src/app/tc-teams.tsx` — TC Teams tab (Roster / Schedule)
- `src/app/tc-sessions.tsx` — TC Schedule tab
- `src/app/tc-drills.tsx` — TC Playbook tab (mirrors Elite Coach playbook.tsx)
- `src/app/tc-inbox.tsx` — TC Inbox tab
- `src/app/staff.tsx` — Business Staff management (employees/contractors with app roles + rates)
- `src/app/staff-home.tsx` — Staff portal (Home / Schedule / Inbox, assignment-scoped)
- `src/app/contacts.tsx` — Parent CRM (3 statuses: Lead/Enrolled/Alumni, age group filters, coach-private notes + skill assessment)
- `src/components/instructor-picker.tsx` — reusable assign-instructor component with rate/hours confirmation
- `src/components/parent-tab-bar.tsx` — parent navigation
- `src/components/team-coach-tab-bar.tsx` — team coach navigation
- `src/lib/supabase.ts` — Supabase client
- `src/constants/theme.ts` — shared theme tokens

---

## Supabase

- **Project ID**: `kqamqlsimyelvzxqdnyp`
- **Key tables**: `profiles` (has `role`, `is_founding_member`, `staff_member_id`), `teams`, `players`, `sessions`, `drills`, `drill_categories`, `messages`, `camps`, `camp_registrations`, `ice_slots`, `coach_locations`, `staff_members`, `instructor_assignments`, `contacts`, `contact_children`
- **Edge Functions**: `stream-sign-url` (signs Cloudflare Stream URLs, token stays server-side), `invite-staff` (sends Supabase Auth invite email to staff member, sets metadata for handle_new_user trigger)

### Migration history

| # | File | Status | Summary |
|---|---|---|---|
| 022 | `022_staff_app_access.sql` | ✅ Applied | `app_role`, `status`, `invited_at`, `joined_at` on `staff_members`; `staff_member_id` FK on `profiles` |
| 023 | `023_staff_rls.sql` | ✅ Applied | RLS policies scoping staff to their owner's data |
| 024 | `024_handle_new_user_staff.sql` | ✅ Applied | `handle_new_user()` trigger reads `role='staff'` + `staff_member_id` from invite metadata |
| 025 | `025_contacts_crm.sql` | ✅ Applied | `stage`, `source`, `skill_level_coach`, `tags` on `contacts`; `contact_children` table; auto-populate trigger from `camp_registrations` |
| 026 | `026_instructor_rates.sql` | ✅ Applied | `hourly_rate` on `staff_members`; `rate_per_hour` + `hours` on `instructor_assignments` |

**⚠️ `supabase db push` is broken** — policy `coaches_own_drills` already exists conflict. All migrations must be applied manually via Supabase SQL editor (dashboard → SQL editor → paste and run).

---

## RevenueCat

- iOS key: `appl_QGtSLOmVVPSdaTBiBsTLuYgZnvH`
- Android: placeholder (iOS only for now)
- 4 IAP products to create in App Store Connect before submission

---

## Built: Business Staff System ✅

`src/app/staff.tsx` — org-level employees and contractors. Separate from team staff (assistant coaches etc. live inside `/team/[id]`).

**Job roles** (business-level only): `operations | front_desk | marketing | accountant | contractor | other`

**App roles** (permission level when invited):
| Role | Access |
|---|---|
| `null` | No app login — contact/assignment only |
| `admin` | Full access except billing |
| `manager` | Camps, schedule, ice management (full), teams, contacts, campaigns — no financials |
| `instructor` | Own assignments only: camps, sessions, playbook, inbox |
| `front_desk` | Camp check-in, contacts (view), inbox |

**Invite flow:**
1. Coach adds staff with email + app_role → `saveStaff()` inserts row
2. `invite-staff` Edge Function fires → `supabase.auth.admin.inviteUserByEmail()` with metadata `{ role: 'staff', staff_member_id, full_name }`
3. Staff clicks email link → redirects to `pxfhockey.com/staff-accept`
4. `handle_new_user` trigger reads metadata → sets `profiles.role = 'staff'`, `profiles.staff_member_id`; updates `staff_members.status = 'active'`
5. App routes `role='staff'` → `/staff-home`

**Staff rate:** `staff_members.hourly_rate` — default session/hourly rate, shown in add/edit modal as "Session Rate ($/hr)".

## Built: Staff Home Portal ✅

`src/app/staff-home.tsx` — 3-tab portal for staff users: Home / Schedule / Inbox.

- Loads `profiles.staff_member_id` → `staff_members` → owner profile
- Shows assignments from `instructor_assignments` filtered to this staff member
- `AssignmentCard` navigates to camp or session detail

## Built: Instructor Cost Tracking ✅

`src/components/instructor-picker.tsx` — updated with rate/hours flow.

**When assigning an instructor:**
1. Tap staff member → rate/hours confirmation step
2. Rate pre-fills from `staff_members.hourly_rate`; hours defaults to 1.0
3. Can override per assignment → saved as `instructor_assignments.rate_per_hour` + `.hours`
4. Assigned row shows: name · role · cost (e.g. "$50 · 2hr")
5. Pencil icon to edit rate/hours on an existing assignment

**Cost formula:** `COALESCE(assignment.rate_per_hour, staff.hourly_rate) × hours`

**Camp P&L** (`camp/[id].tsx`):
- COSTS card = ice + staff total
- Sub-line on card: `Ice $X · Staff $Y`
- `profit = revenue - (iceCost + instructorCost)`

**Financials** (`financials.tsx`):
- Period filter at top: **MTD | QTD | YTD** (default YTD) — chips above KPI grid, all data re-fetches on change
- KPI cards: Revenue, Available Balance, Pending, Refunded — all period-scoped
- Overview tab: NET PROFIT card (revenue − ice − staff − other), ICE COSTS, STAFF COSTS, OTHER EXPENSES (in-memory), REVENUE BY CAMP — all labeled with period
- Ice costs scoped by `ice_slots.start_time` in period
- Staff costs scoped by `instructor_assignments.created_at` in period
- Other expenses: in-memory manual add/remove (no DB)
- Canada GST default: 5% (US: user-entered)
- Taxes tab: switching region resets rate to regional default

## Built: Contacts CRM ✅

`src/app/contacts.tsx` — simple parent CRM, no kanban/pipeline needed (coaches fill camps easily).

**3 statuses:** Lead | Enrolled | Alumni
**Auto-populate:** PostgreSQL trigger on `camp_registrations` INSERT/UPDATE upserts contacts (creates new as Enrolled, upgrades Lead→Enrolled, never downgrades Alumni)
**contact_children table:** per-parent athlete records with birthdate (exact age calc), position, `skill_level_parent` (AAA/AA/A/House)
**Coach-private assessment:** `contacts.skill_level_coach` (AAA/AA/A/House) — never shown to parent
**Filters:** Stage chips (All/Lead/Enrolled/Alumni) + filter button (⚙ icon) opens sheet with:
  - Age: specific years 8,9,10,11,12,13,14,15,16+ (exact age from birthdate)
  - Skill Level: AAA / AA / A / House (matches `contact_children.skill_level_parent`)
  - Team: coach's teams (matched via player name lookup in `players` table)
  - Current Camps: coach's camps (matched via `camp_registrations.parent_email + camp_id`)
  Active filters show as orange dismissible pills in the stage chip row; filter button shows count badge
**Add athlete form:** position chips (Forward/Defense/Goalie) + skill level chips (AAA/AA/A/House)
**Detail sheet:** contact info, athlete list (add/remove inline), coach private notes + skill chips, auto-saves on Done

---

## Planned: Team Staff Management (NOT YET BUILT)

Per-team staff roles, managed from within each team's detail screen. Separate from the global `staff_members` table (which is for instructor assignments on camps/sessions).

**Concept:** Each team has its own set of staff that can change independently — team manager, assistant coach, safety person, etc. Managed in the team detail screen (`/team/[id]`).

**DB note:** A `team_staff` table already exists in the schema (referenced by `is_team_staff()` RLS helper). The UI and management flow need to be built on top of it.

**Key design decisions still needed:**
- Are team staff invited by email, or added by name only (no app login required)?
- Do team staff get app access, or is this just a roster/contact list for the coach?
- Relationship to the global Staff View — are they the same people or separate?

---

## Planned: Team Volunteer / Job Posting (NOT YET BUILT)

Coaches post open volunteer positions for practices and games. Parents of the team are notified and can claim spots on a first-come basis.

**Use cases:**
- Practice: "Need 2 on-ice helpers Tuesday night" — first 2 parents to sign up fill the spots
- Game: Scorekeeper, clock/music operator, other game-day roles
- Any recurring or one-off volunteer need on a team

**Proposed flow:**
1. Coach creates a "position" on a session/game — role name + number of spots
2. Push notification goes to all parents of that team
3. Parents tap to claim a spot — their name appears immediately
4. Once spots are filled, position shows as full (no more sign-ups)
5. Coach sees filled roster of volunteers from the session/game detail screen

**DB design (not yet built):**
- `team_positions` table: `team_id`, `entity_type` (session/game), `entity_id`, `role_name`, `spots_total`, `created_by`
- `position_signups` table: `position_id`, `parent_id` (profiles), `signed_up_at`
- Unique constraint on `(position_id, parent_id)` to prevent double sign-up
- Trigger or check: reject insert if `COUNT(signups) >= spots_total`

---

## Pre-Release: Drill Library Seeding

Before app launch, manually seed ~100 drills into `drills` + `drill_categories` via Supabase SQL editor.

**Planned categories to populate:**
- PXF Slips (signature PXF content)
- PXF Skating (signature PXF content)
- Skating
- Puck Skills
- Shooting
- Flow
- Team Systems
- Small Area
- Puck Protection
- Games
- Goalie

**Notes:**
- Drills go in the `drills` table with `category_id` FK to `drill_categories`
- Set `is_public = true` so they appear in the Library for all users
- Video content can reference Cloudflare Stream URLs (signed via `stream-sign-url` Edge Function)
- GameIQ category is "coming soon" — skip for initial seed
