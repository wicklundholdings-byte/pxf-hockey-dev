
# PXF Hockey Platform Redesign — 4 User Experiences

This is a large architectural change. Before I build, I want to confirm scope so we don't waste cycles.

## Scope

Restructure the whole app around 4 roles with distinct bottom navs, plus trial + paywall gating for coaches. All visual mockups in the existing dark theme — no new business logic, no Stripe wiring, no DB migrations in this pass.

## Roles & Routes

```text
Elite/Platinum Coach   →  /coach            (5 tabs: Dashboard, Events, Library, Inbox, Contacts)
Home Coach             →  /home-coach       (4 tabs: Library, Sessions, Inbox, Profile)
Camp Parent            →  /parent           (4 tabs: Camps, Schedule, Inbox, Profile)
Athlete (existing)     →  /                 (unchanged training home)
```

Role detection lives in a single hook (`useUserRole`) reading `user_roles` + `subscriptions`. App shell routes to the correct shell based on role. No route swaps for `/` and `/parent` — gated in code as previously agreed.

## New / Updated Screens

**Coach shell (`/coach`)**
- Replace 4-tab nav with 5-tab nav: Dashboard, Events, Library, Inbox, Contacts
- Add `/coach/library` (drill library + session builder, coach-edit mode)
- Event detail (`/coach/camps/$campId`) gets sub-tabs: Overview · Roster · Session Plans · Financials · Broadcast
- Platinum-only header chips: Branding, Analytics, Partner Channels
- Quick-create FAB on Dashboard

**Home Coach shell (`/home-coach`)** — NEW
- `/home-coach` (Library), `/home-coach/sessions`, `/home-coach/inbox`, `/home-coach/profile`
- Reuses existing drill/session components

**Camp Parent shell (`/parent`)** — refactor existing
- 4-tab nav: Camps, Schedule, Inbox, Profile
- `/parent/camps`, `/parent/schedule`, `/parent/inbox`, `/parent/profile`

**Trial + Paywall**
- `/coach/plans` — plan selection (Elite, Platinum, Home Coach) with "Start Free Trial"
- Trial countdown banner component injected at top of every coach screen
- Paywall overlay component (blurs content, shows plan cards) — visual only, triggered by a mock `trialExpired` flag

**Onboarding**
- `/onboarding/coach` — 3 steps (plan → profile → first event/library)
- `/onboarding/parent` — 2 steps (account → find camp by coach/join code)

## Design tokens

Add to `src/styles.css`:
- `--bg: #0D1117`, `--surface: #161B22`, `--teal: #00C4B4`, `--volt: #3DFF8F`, `--muted: #8B949E`, `--border: #21262D`
- Nav active state: teal icon + label + 2px underline

## Out of scope (this pass)

- Real Stripe subscription enforcement
- DB schema changes (plan tiers, trial timestamps)
- Real role-aware routing redirects at the router level (will use a mock role switcher for preview)
- Email broadcast send logic
- Session plan assignment persistence

## Technical notes

- Each shell is a layout route with `<Outlet />` and a fixed bottom nav component
- Extract `<BottomNav items={...} />` so all 3 shells share styling
- Trial banner + paywall are wrappers around the coach `<Outlet />`
- A dev-only role switcher (top-right gear menu) lets you preview each shell without real subscription data

## Questions before I build

1. **Role switcher for preview** — OK to add a small dev-mode role picker so you can flip between Elite/Platinum/Home/Parent without changing DB rows?
2. **Existing `/coach/*` sub-routes** (financials, memberships, analytics, bookings, attendees, roster, team, email, broadcast) — keep them all reachable from the new Dashboard quick-grid, or retire any?
3. **Athlete experience at `/`** — leave completely untouched, correct?
4. **Trial state** — mock with a local flag (`trialDaysLeft = 12`) for now, no backend?

Confirm answers and I'll execute.
