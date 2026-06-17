## PXF Digital Coach

A new bottom-tab destination where a coach picks a saved session and runs an entire practice guided by **video of a real coach on the ice** demonstrating and explaining each drill. No AI voice — every cue comes from pre-recorded coach footage tied to each drill.

### 1. Navigation change

Update `src/components/app-shell.tsx`:
- Replace the `Progress` nav item with `Coach` → `/coach` (Whistle icon).
- The `/progress` route stays so existing links still work; it's just removed from the bottom bar.

### 2. New route: `/coach` (Coach hub)

`src/routes/coach.tsx`. Mobile-first, matte black / Electric Teal / Volt Green, consistent with the rest of the app:
- Header: "Digital Coach" + tagline "Your on-ice coach for every drill."
- List of saved sessions from the existing `localStorage` `SESSIONS_KEY` store.
- Each card: session name, date, age group, skill level, total duration, drill count, big `START PRACTICE` button → `/coach/$sessionId`.
- Empty state with a CTA back to `/sessions`.

### 3. New route: `/coach.$sessionId` (Practice Mode)

`src/routes/coach.$sessionId.tsx`. Full-screen, video-first layout. Three phases:

**a. Pre-flight**
- Session summary, drill list, big `START PRACTICE` button.
- Requests wake lock when started.

**b. Active drill view (one drill at a time)**
- Top bar: `Drill X of N`, session name, Exit (with confirm).
- **Coach video player (hero element):** plays the drill's coach-explanation video full-width with native controls. Autoplay muted on drill load (browser autoplay rules); a clear Play / Unmute button overlays until tapped. Falls back to a "Coach video coming soon" placeholder card when a drill has no video yet.
- Below the video: drill name, focus area, duration, equipment chips, coaching points list.
- Buttons: `Diagram` (links to drill detail), `Replay video`.
- Timer (mm:ss) with Pause / Resume and +30s / -30s.
- Note input (saved into in-memory practice log for the summary).
- Footer actions: `Skip`, `Complete Drill`, `Next Drill`.

**c. Summary**
- Total time, drills completed vs skipped, per-drill actual time, notes captured.
- `Mark Session Complete` (persists `completed: true` to the session via existing save helper) and `Back to Coach`.

### 4. Drill videos

Each drill in the drill catalog gets an optional `videoUrl` (and optional `posterUrl`). For initial wiring:
- Add the field to the existing drill type.
- Seed 2–3 sample drills with publicly hostable demo MP4s so the flow is testable end-to-end; the rest show the "coming soon" placeholder.
- Later you (or your editor) can paste real Vimeo / Mux / direct MP4 URLs per drill — no code change needed.

If you'd like, this can also be a Lovable Cloud-backed media library so you upload coach videos in-app instead of editing URLs. Say the word and I'll fold that in as a follow-up.

### 5. Wake lock helper

`src/lib/coach-runtime.ts` (client-only, SSR-safe):
- `useWakeLock()` — `navigator.wakeLock.request('screen')` on mount, re-request on `visibilitychange`, release on unmount. Silent no-op where unsupported.

No Web Speech, no AI voice synthesis — explicitly removed per your clarification.

### 6. Data model

Reuse the existing localStorage session shape. Per-drill `completed` / `actualSeconds` / `notes` live in an in-memory practice log; only `session.completed` is persisted on finish.

### Technical notes

- New TanStack Start routes: `src/routes/coach.tsx`, `src/routes/coach.$sessionId.tsx`. Router plugin regenerates `routeTree.gen.ts`.
- Video uses the native `<video>` element with `playsInline`, `controls`, and `preload="metadata"` so it works on iOS Safari without extra dependencies.
- No new npm packages.
- Existing Run Session modal on Session Detail stays untouched.

```text
Bottom nav: Home  Drills  Sessions  [Coach]  Profile
                                     └─ /coach (pick session)
                                          └─ /coach/$sessionId (Practice Mode)
                                               Pre-flight → Coach video per drill → Summary
```
