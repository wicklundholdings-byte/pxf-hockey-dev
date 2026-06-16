This is a large multi-screen build. Here's what I'll ship in one pass, all frontend (no backend yet — data will be in-file mock data so the UI feels real and is easy to wire to Lovable Cloud later).

## Screens

1. **Home** (`/`) — rebuild
   - Logo + welcome + streak chip + quick-access row
   - 8 main category tiles: Skating Flow, Edge Control, Puck Control, Passing, Shooting, Reaction Training, GameIQ, Circuits
   - Continue Training, Recommended Progression, Upcoming Session, Featured Drill cards

2. **Drills** (`/drills`) — drill library
   - Search bar, filter chips (Age, Skill Level, Equipment, Category)
   - Category sections with drill cards (name, difficulty, age group, equipment, thumbnail, progression level)

3. **Drill Detail** (`/drills/$drillId`) — new dynamic route
   - Hero video block, name, category, difficulty, equipment
   - Diagram, coaching notes, common mistakes, progressions, related drills
   - Start Session CTA

4. **Sessions** (`/sessions`) — session builder
   - Form: age group, skill level, # players, ice time, equipment
   - Generated session blocks: Warm Up, Skill Development, Progression Work, Game Transfer, Cool Down
   - Reorder (drag handles), save, edit

5. **Programs** (`/programs`) — progression pathways
   - 7 pathway cards with vertical Flow 1 → Flow 4 stepper
   - Lock state, % complete, est. time

6. **Progress** (`/progress`) — analytics dashboard
   - Stat cards: sessions, hours, pathways, streak
   - Skill rating bars/rings, badges grid, weekly chart

7. **GameIQ** (`/gameiq`) — new route, also linked from home category
   - Focus pillars, pod drills, reaction pathways, metrics, hardware teaser

8. **Membership** (`/membership`) — new route, linked from profile
   - 3 plan cards (30-day trial / monthly / annual), feature list

## Tech / Design

- Pure frontend, mock data in `src/data/pxf.ts`
- Reuse existing `AppShell` + dark theme tokens (Electric Teal #00E5D6, Volt Green #39FF14, Matte Black, White) already in `styles.css`
- Tailwind v4 utility classes + semantic tokens, no hardcoded colors
- shadcn primitives (Card, Button, Input, Badge, Progress, Tabs) where useful
- Charts via lightweight inline SVG / progress rings (no new deps)
- Drag-and-drop for session builder: native HTML5 DnD (no new deps) to keep it fast
- Bottom nav already exists in AppShell — add Programs/GameIQ entry points as needed

## Out of scope (this pass)
- Real auth, real video playback (thumbnails + play affordance only), real payments, backend persistence (saved sessions live in localStorage)

Reply "go" to build, or tell me what to drop/change.