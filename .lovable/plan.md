# Teams Section — TeamSnap Replacement (Prompt 21)

A fully independent Teams area in the coach console, separate from Camps and Playbook. A coach can run multiple teams (rep season, summer camp team, etc.) each with their own schedule, roster, practice plans built from the existing Playbook, and parent messaging.

## Scope

Build the Teams suite end-to-end:
- New top-level **Teams** tab in coach bottom nav (replacing/alongside current 5 items — see Nav below)
- Team list → team detail with its own 4-tab inner nav: **Schedule / Roster / Playbook / Messages**
- Three event types: Game / Practice / Team Event — each with RSVP, attendance, and type-specific extras
- Practice Plan builder pulling Sessions + Drills from the existing Playbook library
- Lineup builder (games), Duty assignments, Season stats (games)
- Dashboard "Next 7 Days" mixing camps + team events with color-coded labels

## Nav change

Current coach bottom nav (5 items): Dashboard / Events / Playbook / Inbox / Film.
Add **Teams** → drop **Film** from bottom nav (keep route accessible from Dashboard quick-link). Final 5: Dashboard / Events / Teams / Playbook / Inbox.

## Schema (one migration)

New tables — all under `public`, RLS enabled, GRANT to authenticated + service_role, owner = `teams.coach_id = auth.uid()`:

- `teams` — name, season, division, age_group, association_name, logo_url, primary_color, secondary_color
- `team_players` — team_id, athlete_id (FK attendees nullable), jersey_number, position, display_name (denormalized for invite-only players), parent_contact_id nullable
- `team_invites` — athlete + parent fields, invite_token uuid unique, status enum, invited_at, joined_at
- `team_events` — event_type enum (game/practice/team_event), opponent_name, home_away enum, venue text, date, start_time, end_time, notes, lineup_shared
- `team_event_rsvps` — event_id, athlete_id, parent_id, response enum, note
- `team_event_attendance` — event_id, athlete_id, status enum (present/absent/late), marked_by
- `practice_plans` — event_id (nullable for templates), template_name, coach_id
- `practice_plan_items` — plan_id, item_type enum (session/drill/note), session_id, drill_id, note_text, duration_minutes, display_order
- `team_lineups` — event_id, template_name, positions jsonb, created_by
- `team_duties` — event_id, duty_type, assigned_to_parent_id, is_open_signup
- `team_stats` — team_id, athlete_id, season, goals, assists, penalty_minutes, games_played

RLS summary:
- Coach (owner) full access to their teams and all child rows via `teams.coach_id = auth.uid()`
- Parents of a rostered athlete (via `current_user_contact_ids` → `team_players.parent_contact_id`) can SELECT their team's events, their own RSVPs (insert/update), their athlete's stats, and lineups where `lineup_shared = true`
- Practice plans / attendance / duty admin = coach-only

## Server functions (`src/lib/teams.functions.ts`)

- `createTeam`, `updateTeam`, `listMyTeams`, `getTeam`
- `addPlayer`, `importPlayersCsv`, `copyRosterFromCamp`, `sendInvites`, `resendInvite`
- `createEvent`, `updateEvent`, `listTeamEvents`, `getEvent`, `getUpcomingAcrossTeams` (for dashboard 7-day window)
- `submitRsvp`, `markAttendance`, `remindNonResponders`
- `savePracticePlan`, `loadPracticePlanTemplate`
- `saveLineup`, `shareLineup`
- `assignDuty`, `claimDuty`
- `recordGameStats`

## Route map

Coach side (all under `_authenticated/`):
- `coach.teams.tsx` — team layout (Outlet + team switcher header when on `$teamId`)
- `coach.teams.index.tsx` — list of teams + "Create team" CTA
- `coach.teams.new.tsx` — create team form (3 roster modes)
- `coach.teams.$teamId.tsx` — team layout with inner 4-tab nav, Outlet
- `coach.teams.$teamId.index.tsx` → redirects to schedule
- `coach.teams.$teamId.schedule.tsx` — list of upcoming events + "Add event" sheet (type picker)
- `coach.teams.$teamId.schedule.$eventId.tsx` — event detail (RSVP counts, attendance, type-specific panels)
- `coach.teams.$teamId.schedule.$eventId.practice-plan.tsx` — plan builder
- `coach.teams.$teamId.schedule.$eventId.lineup.tsx` — lineup builder (games only)
- `coach.teams.$teamId.roster.tsx` — roster + invites + per-player attendance summary
- `coach.teams.$teamId.playbook.tsx` — reuses existing Playbook (renders the same `CoachDrylandLibrary` + Drills + Sessions tabs via shared component) — no duplication
- `coach.teams.$teamId.messages.tsx` — broadcast + per-event threads (lightweight wrapper around existing messaging tables, scoped to team)

Parent side:
- `parent.team.$teamId.tsx` — read-only team home (schedule, athlete's stats)
- `parent.team.event.$eventId.tsx` — event detail + RSVP one-tap + duty signup
- `rsvp.team.$token.tsx` — tokenized public RSVP (mirror of existing daily `rsvp.$token`)

## Dashboard integration

`coach.index.tsx` — add a "Next 7 Days" card that calls `getUpcomingAcrossTeams` and renders camps + team events together with colored chips:
- Camp = teal, Practice = green, Game = red, Team Event = grey
Each row links to its detail screen.

## Practice Plan builder

`PracticePlanBuilder` component:
- Top: drag-reorderable list of items (session / drill / note) with duration
- Footer actions: "Add Session" (sheet → searchable list from `training_programs` or saved sessions), "Add Drill" (sheet → `drills` library with category filter), "Add Note"
- "Save as template" checkbox
- "Run Practice" button on event day → opens existing `session-runner.tsx` in concatenated mode

## Lineup builder

`LineupBuilder` component:
- Forward lines (L/C/R) ×4, D-pairs ×3, Starter G + Backup, Scratches bucket
- Drag from roster pool to slots
- "Share with team" toggle → sets `lineup_shared = true`; parent view shows position + first name + last initial only

## RSVP + reminders

- `submitRsvp` writes `team_event_rsvps`
- `remindNonResponders` is a coach-triggered server fn (queues notifications — push infra not wired yet; leave TODO and log to `scheduled_messages`)
- Availability locks 2h before start (enforced in `submitRsvp` handler)

## Tokenized parent RSVP

Reuses pattern from existing `daily_rsvps` (`rsvp_token`, `get_rsvp_by_token`, `respond_to_rsvp` RPC) — add equivalents `get_team_rsvp_by_token` + `respond_to_team_rsvp` security-definer functions so parents can RSVP without auth via emailed link.

## Out of scope

- Real push notifications (no provider wired — log only, surface in-app)
- Actual stats analytics dashboards (just per-player season totals)
- Team messaging is a thin wrapper on existing conversation tables — no new realtime infra
- Public team page / shareable schedule link (can add later)

## Seed

No seed data — teams are user-created.

## Files

Created:
- `supabase/migrations/<ts>_teams.sql`
- `src/lib/teams.functions.ts`
- `src/components/teams/practice-plan-builder.tsx`
- `src/components/teams/lineup-builder.tsx`
- `src/components/teams/event-form-sheet.tsx`
- `src/components/teams/roster-import.tsx`
- `src/components/teams/team-event-row.tsx` (colored chip used on dashboard + schedule)
- `src/components/teams/upcoming-7-days.tsx` (dashboard card)
- `src/routes/_authenticated/coach.teams.tsx` + index/new
- `src/routes/_authenticated/coach.teams.$teamId.tsx` + 4 inner tabs + event detail + practice-plan + lineup
- `src/routes/parent.team.$teamId.tsx`
- `src/routes/parent.team.event.$eventId.tsx`
- `src/routes/rsvp.team.$token.tsx`

Edited:
- `src/routes/_authenticated/coach.tsx` — swap Film for Teams in bottom nav
- `src/routes/_authenticated/coach.index.tsx` — add Next 7 Days card
- `src/integrations/supabase/types.ts` — regenerated post-migration
- `src/routeTree.gen.ts` — regenerated by plugin
