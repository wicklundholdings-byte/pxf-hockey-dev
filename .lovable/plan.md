## Team Management System — Implementation Plan

This is a large feature spanning permissions, messaging rules, scheduling, and geography. I'll deliver it in scoped phases so each is reviewable.

### Phase 1 — Permission roles & schema (foundation)

**Database:**
- Extend `team_permission` enum to 5 roles: `owner`, `manager`, `coach`, `assistant`, `content_creator` (currently the project uses a coarser model).
- Add `home_area_lat`, `home_area_lng`, `home_area_label` to `team_members` (optional, city-level).
- Add `min_buffer_minutes` (default 30) to `profiles` (owner settings).
- Helper SQL functions: `team_role(_user uuid)`, `can_access_camp(_user, _camp)`, `can_message_contact(_user, _contact)`.

**Code:**
- Central `src/lib/permissions.ts` exposing `usePermissions()` returning capabilities `{ canViewFinancials, canMessageAnyone, canEditCamp(campId), canCheckIn(campId), canAccessPlaybook }`.
- Apply gates in existing routes (camps list, camp detail, messaging, playbook, settings).

### Phase 2 — Attendee payment status

- Compute status (`paid` / `pending` / `overdue`) from existing `registrations` + `payment_installments` via a SQL view `attendee_payment_status`.
- Add badge + filter on coach camp detail attendee list.
- Dashboard summary card "X attendees have outstanding payments" with drill-down sheet — visible to owner/manager only.

### Phase 3 — Messaging permission rules

- Server fn `listMessageableContacts()` returns contacts based on role:
  - owner/manager → all org contacts + staff
  - coach → parents/athletes in assigned camps only
  - assistant/content_creator → none
- RLS on `conversations` / `conversation_members` updated to enforce who can start a conversation.
- Existing chat UI unchanged; new-conversation picker filtered by the server fn.

### Phase 4 — Team Overview screen

- New route `/_authenticated/coach.team.tsx` — staff cards with name, role, this-month assigned camp count, availability indicator.
- Filters: date range, location, role.
- Tap card → drawer with that staff member's schedule calendar (reusing existing schedule components).

### Phase 5 — Unassigned alerts

- Dashboard warning card with quick-assign action.
- Orange badge on event cards where `camp_staff` is empty.
- Team screen tab listing all unassigned camps + sessions.

### Phase 6 — Conflict detection

- Server fn `checkAssignmentConflicts({ teamMemberId, campSessionId })` returning `{ hardConflicts: [...], softWarnings: [...] }`.
- Hard: overlapping `camp_sessions` for same team member → block assignment.
- Soft: gap < owner's `min_buffer_minutes` → warn, require confirm.
- Setting in owner settings page for buffer minutes.

### Phase 7 — Geography-aware scheduling (Google Maps)

- Uses existing Google Maps connector (already wired for the venue map feature).
- Server fn `getDriveTimes({ teamMemberId, campSessionId })` calls Routes API `computeRouteMatrix` for: home→venue and previousAssignmentVenue→venue.
- Assignment UI shows drive times inline.
- Smart suggestion: when assigning, sort eligible coaches by drive-time-from-home and no-conflict.
- Conflict warning text per spec; owner can override with confirmation modal.

---

### Technical notes
- All work is in TanStack server functions + new routes; no edge functions.
- Google Maps calls go through the existing connector gateway (`routes/distanceMatrix/v2:computeRouteMatrix`).
- Permission helper is the single source of truth — every gated UI reads from it.

### Scope confirmation
Phases 1–3 are foundational and unlock the rest. Phases 4–7 are larger UI/integration pieces.

**Should I proceed with all 7 phases in sequence, or would you like to confirm phase-by-phase?** Also: any role-name preferences (e.g. "Assistant" vs "Assistant Coach")?