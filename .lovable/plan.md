## Elite Coach Dashboard + Staff Permission Model

### Scope
- Only Elite tier ($49.99). Team/Association/Academy unaffected.
- Owner = paying account. Staff = invited coaches tied to owner.
- Track-only billing (no Stripe charge yet). Show "3 included · X additional at $9.99/mo each" copy.

### Database (migration)
New table `elite_staff_coaches`:
- `owner_id` (uuid, FK auth.users) — Elite account holder
- `staff_user_id` (uuid, nullable until invite accepted)
- `email`, `full_name`
- `status` ('invited' | 'active' | 'removed')
- `invite_token` (uuid), `invited_at`, `accepted_at`, `removed_at`
- Unique (owner_id, email) where status != 'removed'

New table `elite_staff_team_assignments`:
- `staff_id` (FK elite_staff_coaches), `team_id` (FK teams)
- Unique (staff_id, team_id)

Security-definer helpers:
- `is_elite_staff_of(_owner uuid)` — is auth.uid() an active staff of owner
- `elite_owner_for(_user uuid)` — returns owner_id for a staff, or self
- `staff_assigned_team_ids(_user uuid)` — uuid[] of team ids visible to staff

RLS:
- `elite_staff_coaches`: owner sees own rows; staff sees their own row
- `elite_staff_team_assignments`: owner manages; staff reads own
- Public token lookup RPC `get_staff_invite_by_token(_token uuid)` (SECURITY DEFINER) for invite-accept page
- RPC `accept_staff_invite(_token uuid)` — binds auth.uid() to invite

GRANTs to authenticated and service_role on both tables.

### Server functions (`src/lib/staff.functions.ts`)
- `listMyStaff()` — owner: list staff + assigned teams + included/additional counts
- `inviteStaffCoach({ email, fullName, teamIds[] })` — owner: create row, send email via existing transactional email or Resend, return invite link
- `removeStaffCoach({ staffId })`
- `updateStaffTeams({ staffId, teamIds[] })`
- `acceptStaffInvite({ token })` — uses RPC
- `getMyEliteRole()` — returns `{ kind: 'owner' | 'staff' | 'none', ownerId, assignedTeamIds }` for the dashboard dispatcher

### Email (Resend, simple HTML)
- Use existing RESEND_API_KEY via server function. Email body: "You've been invited to join {Owner Name}'s coaching staff on PXF Hockey" + link to `/staff-invite/{token}`.

### Routes
- `src/routes/_authenticated/coach.staff.tsx` — staff management UI (owner only). List, invite modal with team multi-select, remove, edit teams. Show "3 included · N extra @ $9.99/mo".
- `src/routes/staff-invite.$token.tsx` — public-ish accept page. If not authed → redirect to /auth with redirect back; if authed → call accept RPC → /coach.
- Settings page: link "Manage staff coaches" → /coach/staff (owner only).

### Dashboard dispatcher (`src/routes/_authenticated/coach.index.tsx`)
```
tier !== 'elite' → existing TeamCoachDashboard
tier === 'elite' + role.kind === 'staff' → <EliteStaffDashboard assignedTeamIds=... />
tier === 'elite' + role.kind === 'owner' → <EliteOwnerDashboard /> (full rebuild)
```

### Owner dashboard — full rebuild
Sections in order, each its own subcomponent in `src/components/coach/elite-owner/`:
1. `GreetingHeader` — "Hey {first}," / "Here's what's happening."
2. `AlertsStack` — query: unassigned camp coaches, missing health forms (athletes in active camps without `athlete_health_profiles`), camps <50% enrollment, unpaid registrations. Amber cards. Hide whole section if zero alerts.
3. `RevenueSnapshot` — gross + net MTD, trend arrow vs same range last month. Click → `/coach/financials`.
4. `ActiveCampsScroll` — horizontal scroll cards (name, date range, `filled/capacity`, revenue). Trailing "Add Camp" card → `/coach/camps/new`.
5. `RegistrationsCard` — total this month + confirmed/pending split. Click → registrations list.
6. `MyAthletesRow` — owner's children only. Hide if none.
7. `NextUp7Days` — merge team_events + camp_sessions next 7d, badge GAME/PRACTICE/CAMP, sort by date+time.
8. `MyTeamsList` — coached + child-on-roster. Role badge COACH/PARENT routes accordingly.
9. `DrylandTop3` — top 3 across all owned teams via `get_team_dryland_leaderboard` aggregated.
10. `RecentMediaScroll` — last 3 from `game_media` + `camp_media` across owner's teams/camps.
11. `ActionButtons` — Add Ice Times + Create Session (teal outline).

### Staff dashboard — limited
Same component primitives, scoped to `assignedTeamIds`:
1. Greeting
2. My Athletes (children, if any)
3. Next Up — team_events filtered to assignedTeamIds only (no camp_sessions)
4. My Teams — assignedTeamIds only, no parent variant
5. Dryland This Week — across assignedTeamIds
6. Recent Media — game_media for assignedTeamIds
7. Action buttons

No revenue, camps, registrations, financials. Hide nav entries to `/coach/camps`, `/coach/financials`, `/coach/staff` for staff via `coach.tsx` layout (check role).

### Layout/nav gating (`src/routes/_authenticated/coach.tsx`)
- Fetch role once; if staff: remove Events nav item (or replace label "Schedule" pointing to team list), hide Broadcast button, hide Staff settings link.

### Files to create
- supabase migration
- src/lib/staff.functions.ts
- src/lib/email/staff-invite.ts (Resend helper)
- src/routes/_authenticated/coach.staff.tsx
- src/routes/staff-invite.$token.tsx
- src/components/coach/elite-owner/{greeting,alerts,revenue,active-camps,registrations,my-athletes,next-up,my-teams,dryland-top3,recent-media,action-buttons}.tsx
- src/components/coach/elite-staff/dashboard.tsx
- src/hooks/use-elite-role.ts

### Files to modify
- src/routes/_authenticated/coach.index.tsx — dispatcher + full owner layout
- src/routes/_authenticated/coach.tsx — nav gating for staff
- src/routes/settings.tsx — add "Manage staff coaches" link for owner

### Out of scope (explicit)
- Actual Stripe billing for extra staff
- Per-permission granularity beyond team assignments
- Notifying staff when teams change
- Editing staff after acceptance beyond team list + remove
