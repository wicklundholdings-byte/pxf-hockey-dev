## What's actually in the codebase

There is **no separate Tournament Game Detail screen** built yet. In the Tournament Schedule tab, GAME rows just expand inline for RSVP — tapping a game doesn't navigate anywhere.

The existing **Team Schedule Game Detail** lives at `src/routes/_authenticated/coach.teams.$teamId.schedule.$eventId.index.tsx`. It is **not tabbed**. It renders, top to bottom:

- `‹ Back` link to Team Schedule
- Event header card (type, title, date/time/venue, notes)
- 4-stat RSVP grid (YES / NO / MAYBE / NONE)
- Action buttons (`Game Prep`, `Stats`)
- Attendance list with present/late/absent toggles
- Inline `GameStats` post-game entry (G / A / PIM)
- `GameMediaTab`

Sibling routes handle the deeper flows:
- `…/schedule/$eventId/game-prep.tsx`
- `…/schedule/$eventId/stats.tsx` (full stats entry)
- `…/schedule/$eventId/game-summary.tsx`

There is no Lines tab or tabbed layout anywhere on this screen today.

## What you described vs. what exists

Your prompt mentions "tabs, score card, lines builder, stats table" on the existing screen. None of those exist yet. So "reuse the existing component" and "add Lines/Stats tabs to both so they stay in sync" describe two different things:

- **Option A — Mirror what exists today.** Make tournament game rows tappable, open a new route that renders the same sectioned layout (header card, RSVP counts, attendance, post-game stats, media), with `‹ Schedule` back to the Tournament Schedule tab and the tournament name as a muted subtitle. No new tabs added anywhere.
- **Option B — Redesign the Team Game Detail into a tabbed layout (Overview / Lines / Stats), then reuse it for tournaments.** Larger refactor; touches the working team flow and the existing `game-prep` / `stats` sibling routes.

## Other things I need to confirm before building

1. Tournament games are **mock SEED data** inside `coach.teams.$teamId.tournaments.$tournamentId.tsx` (no DB rows), while team schedule games are **Supabase-backed** (`team_events`, `team_event_rsvps`, `team_event_attendance`, `game_player_stats`). The existing component can't be dropped in unchanged because it queries Supabase by `eventId`. Two paths:
   - **A1.** Extract the sectioned JSX into a presentational component (`<GameDetailView />`) that takes plain props, then feed it Supabase data on the team route and mock data on the tournament route.
   - **A2.** Build the tournament game route as a static mock screen that visually copies the same JSX/Tailwind classes.
2. Where should the tournament game route live and what should it match? Suggested: `coach.teams.$teamId.tournaments.$tournamentId.game.$gameId.tsx`, with tap target on `GAME`-type schedule rows.

## Recommended path

**Option A + A1**: extract `<GameDetailView />` from the existing screen, leave the Team Schedule game detail visually unchanged, add the new tournament game route that renders the same component with mock data, `‹ Schedule` back link, and tournament-name subtitle. No new tabs. Smallest blast radius, exact visual match guaranteed.

## Question

Confirm one:

1. **Option A** — mirror the existing sectioned screen exactly. No Lines tab, no Stats tab added. (Recommended.)
2. **Option B** — redesign the Team Game Detail into Overview / Lines / Stats tabs first, then reuse for tournaments. Bigger change to a working flow.

And confirm the route path `…/tournaments/$tournamentId/game/$gameId` is OK.
