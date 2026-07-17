# PXF Hockey — Session Notes
_Last updated: 2026-07-10_

---

## What Was Done This Session

### 1. Web Portal — Fully Removed Lovable

- `package.json` — all `@lovable.dev/*` packages removed
- `vite.config.ts` — now uses standard TanStack Start (no Lovable deps)
- 7 source files that imported from `@lovable.dev/mcp-js` were stubbed out:
  - `src/routes/mcp.ts` → 404 stub
  - `src/routes/[.mcp]/list-tools.ts` → 404 stub
  - `src/routes/[.mcp]/invoke-tool/$tool.ts` → 404 stub
  - `src/routes/[.well-known]/oauth-protected-resource.ts` → 404 stub
  - `src/lib/mcp/index.ts` → `export default {}`
  - `src/lib/mcp/tools/list-camps.ts` → `export default {}`
  - `src/lib/mcp/tools/today-schedule.ts` → `export default {}`
- `src/routes/__root.tsx` — removed `reportLovableError`, fixed meta tags (title: "PXF Hockey", removed Lovable og:image/twitter refs)
- Cloudflare Pages build now passes (commit 147ed24)

### 2. Mobile — Camp Creation Flow Fixed

Three files changed:

**`src/app/events.tsx`**
- Added `Modal`, `TextInput`, `KeyboardAvoidingView`, `Platform`, `Alert` imports
- Added `useLocalSearchParams` import from `expo-router`
- Added `showCreate` modal state + form fields: `campTitle`, `campStart`, `campEnd`, `campPrice`, `campSpots`, `campLocation`, `campDesc`
- Added `createCamp()` function — inserts to `camps` table with `status: 'draft'`
- Fixed `+` button: `onPress={() => setShowCreate(true)}`
- Added `useEffect` to auto-open modal when navigated with `?showCreate=1`
- Added full modal JSX (title, start/end date, price, max spots, location, description fields)
- Added modal styles

**`src/app/index.tsx`** (Dashboard)
- "Create Camp" button now pushes `{ pathname: '/events', params: { showCreate: '1' } }` instead of `/business`

**`src/app/business.tsx`** (Business screen)
- "New Camp" quick action now pushes `{ pathname: '/events', params: { showCreate: '1' } }` instead of `/events` bare

---

## Pending — Must Do Before App Store

### High Priority

- [ ] **Commit + push mobile changes** — git lock prevented sandbox commit. Run manually:
  ```bash
  rm /Users/evanwicklund/pxf-hockey-dev/pxf-hockey-mobile/.git/index.lock
  cd /Users/evanwicklund/pxf-hockey-dev/pxf-hockey-mobile
  git add -A && git commit -m "Add camp creation modal; wire Create Camp shortcuts"
  git push
  ```

- [ ] **Deploy `stream-sign-url` Edge Function** to Supabase:
  ```bash
  cd /Users/evanwicklund/pxf-hockey-dev/pxf-hockey-mobile
  npx supabase functions deploy stream-sign-url --project-ref kqamqlsimyelvzxqdnyp
  ```
  Then set the secret in Supabase dashboard → Edge Functions → stream-sign-url → Secrets:
  `CLOUDFLARE_STREAM_TOKEN` = (value is in 1Password / known — NEVER put in client code)

- [ ] **bunfig.toml cleanup** (web portal) — Remove Lovable entries from `minimumReleaseAgeExcludes`, then:
  ```bash
  cd /Users/evanwicklund/pxf-hockey-dev/pxf-hockey-web
  bun install
  ```

### Lower Priority

- [ ] **Android RevenueCat key** — Replace `goog_REPLACE_WITH_YOUR_ANDROID_KEY` in `src/lib/purchases.ts`
- [ ] **App Store Connect** — Create 4 IAP products before submission
- [ ] **Academy tier** — future work, existing members will be grandfathered

---

## Key Architecture Notes

### Supabase
- Project ID: `kqamqlsimyelvzxqdnyp`
- Key tables: `profiles` (role, is_founding_member), `teams`, `players`, `sessions`, `drills`, `drill_categories`, `messages`, `camps`, `games`
- `profiles.role` values: `'elite'` | `'team'` | `'parent'` — exact strings. `'coach'` routes to onboarding.
- Camps table fields: `id, coach_id, title, description, start_date, end_date, price_cents (default 0), max_spots, location, status (default 'draft')`
- Valid camp statuses: `'draft' | 'active' | 'full' | 'closed'`

### Web Portal (pxf-hockey-web)
- Stack: TanStack Start + Vite + Tailwind → Cloudflare Pages
- Repo: `https://github.com/wicklundholdings-byte/pxf-hockey-web`
- Deploy: push to `main` → auto-deploys
- Build: `npm run build` → output `.output/public`
- Auth: same Supabase project as mobile
- Role redirect (`src/lib/get-role.ts`): elite/null → `/dashboard`, team → `/team-coach`, parent → `/parent`

### Mobile (pxf-hockey-mobile)
- Expo Router — file-based routing
- Role switcher in Settings screen (DEV only) for testing all three views
- Tab bars: `ParentTabBar`, `TeamCoachTabBar`, Elite uses `AppTabs`
- All screens hide coach tab bar via `tabBarStyle: { display: 'none' }` in `_layout.tsx`

### RevenueCat
- iOS key: `appl_QGtSLOmVVPSdaTBiBsTLuYgZnvH`
- Android: placeholder (iOS only for now)

### Color Constants
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

### Text Clipping Rule
`fontSize >= 25` MUST include explicit `lineHeight`. Formula: `lineHeight = Math.ceil(fontSize * 1.2)`

---

## Subscription Tiers

| Tier        | Regular | Founding |
|-------------|---------|----------|
| Parent      | $10/mo  | $10/mo   |
| Team Coach  | $35/mo  | $25/mo   |
| Elite Coach | $80/mo  | $50/mo   |

- First 250 paying users (Team Coach + Elite) lock in founding price for life
- `is_founding_member` flag on `profiles` table
- Founding banner shown on Elite Coach dashboard when `is_founding_member = true`
