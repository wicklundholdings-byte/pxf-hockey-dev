# Prompt 20 — Athlete Session Notes & Video Log

## Database

Two new tables:

**athlete_notes** — `id, coach_id, athlete_id, note_date, written_notes, drill_ids jsonb, session_rating int (1-5 nullable), is_shared bool, created_at, updated_at`

**athlete_note_videos** — `id, note_id, video_url, thumbnail_url, duration_seconds, created_at`

RLS:
- Coach can CRUD their own notes (`coach_id = auth.uid()`)
- Athlete/parent can SELECT notes where `is_shared = true` and they own/are linked to the athlete (reuse existing parent/athlete linkage patterns from `attendees`/`contacts`)
- Videos inherit via parent note check

Storage: reuse existing `athlete-media` bucket for video clips + thumbnails under `notes/{noteId}/...`.

## Server functions

`src/lib/athlete-notes.functions.ts`:
- `listAthleteNotes({ athleteId, from?, to?, drillId? })` — coach view, all notes for athlete
- `createAthleteNote({ athleteId, noteDate, writtenNotes, drillIds, sessionRating, isShared, videos: [{url, thumbnailUrl, durationSeconds}] })`
- `updateAthleteNote({ id, ...patch })`
- `deleteAthleteNote({ id })`
- `toggleNoteShared({ id, isShared })`
- `listSharedNotesForParent({ athleteId })` — parent-facing read

## UI — Coach side

New tab "Notes & Progress" on athlete profile page (find existing athlete profile route under coach).

Components in `src/components/athlete-notes/`:
- `notes-feed.tsx` — chronological list, filter chips (date range, drill tag)
- `note-card.tsx` — date, drill tags, expandable text, video thumbnail grid, star rating, share toggle, edit/delete menu
- `add-note-sheet.tsx` — bottom sheet form: date picker, drill multi-select (from playbook drills + free text), textarea, video upload (up to 4, camera or file), star rating, share toggle
- `video-thumbnail.tsx` — opens existing video analysis player from Prompt 15

## UI — Parent side

Add "Coach Updates" feed section to existing parent athlete profile route — read-only list using `listSharedNotesForParent`.

## Notes

- Drill multi-select pulls from existing `drills` table
- Video player reuse: existing standalone recorder / film review components
- Star rating: simple 5-star Lucide Star buttons
- Share toggle inline on each card, with confirmation when first sharing
