# PXF Hockey — Master Summary Document
*Last updated: June 25, 2026*

---

## THE VISION

PXF Hockey is a complete hockey coaching and athlete development ecosystem — combining a coaching business management platform, athlete training tools, athlete performance tracking, and a hardware product line that feeds data into a unified athlete profile. The long-term goal is a closed ecosystem where every piece of PXF hardware syncs to the PXF app, creating the world's first grassroots hockey combine database with global athlete rankings.

**Tagline:** POWER. FLOW. PERFORMANCE.

---

## THE BUSINESS MODEL

### Revenue Streams

**1. Software Subscriptions (SaaS)**
Monthly recurring revenue from coaches on Elite or Platinum plans.

**2. Transaction Fees**
PXF takes a percentage of every camp registration processed through the platform via Stripe Connect.

**3. Hardware Sales**
One-time product purchases (PXF Slip, GameIQ POD, Resistance Trainer, Shot Plate, Force Plate, Speed Gates).

**4. Home Coach Subscriptions**
Parents who want to train their own children pay a monthly fee for drill library and session builder access.

**5. Future: Scout Access**
Premium subscription for scouts, junior teams, and college programs to browse the PXF Combine athlete database.

**6. Future: Partner Channels**
Third-party coaches and content creators sell their drill content through PXF, taking a revenue share.

---

## PRICING TIERS

### V1 Tiers (Launch)

| Plan | Monthly | Annual (2 months free) | Who It's For |
|---|---|---|---|
| Parent | $10/mo | $100/yr | Parents managing athlete profiles, training, schedules, and payments |
| Team Coach | $35/mo | $350/yr | Coaches running rep teams — team management, drill library, practice plans, hardware integration. No camps. |
| Elite Coach | $75/mo | $750/yr | Coaches running a full hockey business — teams + camps + privates + revenue |
| Academy | $125/mo | $1,250/yr | Hockey schools and academies needing unlimited scale |

### Plan Limits

| Plan | Teams | Staff | Camps | Transaction Fee |
|---|---|---|---|---|
| Team Coach | 3 | 1 included | None | N/A |
| Elite Coach | 3 | 3 included | Unlimited | 1.5% |
| Academy | Unlimited | Unlimited | Unlimited | 1.5% |

### Transaction Fees
All transaction fees are passed to the consumer (parent pays on top of camp price). Stripe processing (~2.9% + $0.30) is included in the total fee passed through. Elite Coach and Academy subscribers get a 1.5% PXF transaction rate on all camp registrations.

### Camp Discovery
Elite Coach and Academy coaches get a full public profile at pxfhockey.com/coaches/[slug] + all camps listed in PXF marketplace + SEO-optimized discovery. Want to run camps? Elite Coach is the entry point — no workaround tier.

### Founding Member Program (Coaches Only — No Parent Discount)
First 250 coach subscribers lock in **25% off for life**:
- Team Coach founding rate: **$26/mo for life**
- Elite Coach founding rate: **$56/mo for life**
- Academy founding rate: **$94/mo for life**

**Terms:** 30-day free trial for all coach accounts. After trial, founding rate applies. After 250 founding members are reached, full pricing kicks in for new subscribers. Founding members are grandfathered at their discounted rate permanently.

Parents pay $10/mo from day one — no founding member discount.

### Parent Access
$10/mo: athlete profile, dryland training programs, team schedule & RSVP, camp updates, evaluations, media, payments, messaging. Standalone value — dryland programs work without a coach assigning anything.

### Team Coach Access
$35/mo: up to 3 teams, 1 staff coach included, full team management, drill library, preloaded practice plans, session builder, PXF hardware integration, attendance, RSVP, evaluations. No camps, no financials.

### Elite Coach Access
$75/mo: everything in Team Coach plus unlimited camps, unlimited private sessions and series, full financials with gross profit tracking, locations management, QR check-in, broadcast messaging, coach verification, analytics, public profile + marketplace listing, prebuilt website.

### Academy Access
$125/mo: everything in Elite Coach with no limits — unlimited teams, unlimited staff, unlimited camps, multi-location management, staff scheduling board (web portal), advanced reporting.

### Association Tier (V2 — Not in V1 Launch)
Associations join free during beta. Revenue from parent subscriptions and camp transaction fees. Full association dashboard (tryouts, registrations, referee management, live scoring) built in V2.

**Competitive context:** Upper Hand starts at $79/mo on annual billing plus $1,000–5,000 onboarding fees. TeamSnap Ultra is $17.99/mo per team (team scheduling only — no coaching content, no camps, no drill library). CoachNow PRO is $49.99/mo (video only). PXF Elite Coach at $75/mo replaces all three.

**Trial:** 30-day free trial on all coach subscription plans. Pay-per-camp has no trial — flat fee applies per camp.

**Annual pricing:** 2 months free on annual plans (pay 10 months, get 12).

### No Standalone Athlete Accounts
Athletes are profiles under a parent account. No separate athlete signup — parents manage their children's profiles.

---

## USER TYPES

| User | Account | Access |
|---|---|---|
| Parent | $10/mo | Athlete profile, dryland programs, team schedule & RSVP, camp updates, evaluations, media, payments, messaging |
| Team Coach | $35/mo (founding: $26/mo) | 3 teams, 1 staff, drill library, practice plans, session builder, hardware integration. No camps. |
| Elite Coach | $75/mo (founding: $56/mo) | 3 teams, 3 staff, unlimited camps + privates, financials, locations, QR check-in, analytics, public profile |
| Academy | $125/mo (founding: $94/mo) | Unlimited teams, staff, camps — everything in Elite Coach at full scale |
| Association | V2 / Free beta | Multi-team association umbrella. Full dashboard in V2. |
| Coach-Parent | Paid coach subscription | Full coach console + My Athletes section to manage their own children |

**Signup flow:** New users select "I'm a Coach" or "I'm a Parent / Athlete" at signup and are routed to their respective onboarding.

---

## THE APP — PLATFORM OVERVIEW

### Tech Stack (React Native / Expo Mobile App)
- **Framework:** React Native + Expo SDK 56, Expo Router (file-based routing)
- **Backend:** Supabase (auth, database, real-time chat, storage)
- **Payments:** Stripe Connect (marketplace payments, coach payouts)
- **Subscriptions:** RevenueCat (Elite/Platinum/Home Coach subscription management)
- **Email:** SendGrid (marketing campaigns, automated sequences)
- **SMS:** Twilio (notifications, reminders, RSVP prompts)
- **Background Checks:** Checkr API (coach verification)
- **Push Notifications:** Expo push notifications

---

## COACH CONSOLE

### Navigation (5 tabs)
`Dashboard · Events · Teams · Playbook · Inbox`

Header icons: Broadcast · Film (camera) · Notifications · Profile avatar · Settings

Coaches log in and land directly in the coach console. There is no separate athlete app for them — everything lives in one console.

### Dashboard
- Trial banner with Subscribe button
- Next 7 Days — upcoming Practices (green), Games (red), Camps (blue), Team Events (grey) all in one view
- Alert cards — unassigned ice slots, camps with no assigned coach
- Quick action buttons — Add Ice Times (teal) · Create Session (green)
- Quick access grid (icon cards) — Create Camp · Roster · Financials · Analytics · Ice Times · Memberships
- Athletes button (full width, teal-green gradient) — navigates to full athlete listing
- KPI strip: Gross Sales · Net Sales · Registrations · Contacts
- Registrations chart (7d / 30d / 90d toggle)

### Events
- Create and manage camps and 1-on-1 sessions
- Each event detail page includes:
  - Camp name, dates, time, capacity, price, LIVE badge
  - Booking Page button (public link to share)
  - Stats strip: Paid / Pending / Revenue
  - Session Plans button (teal, prominent)
  - Message Group button
  - Visual day strip showing each camp day with status (completed ✅ / active ▶️ / upcoming)
  - Roster card + Today's RSVP card
  - QR Check-in / Attendance / Photos action buttons
- Sub-pages: `/session-plans`, `/checkin`, `/attendance`, `/photos`

### Playbook (formerly Library)
Four sections: **Drills · Sessions · Camps · Favorites**

- **Drills** — individual drills with video, description, duration, skill tags. Folders supported.
- **Sessions** — ordered list of drills assembled into a practice plan. Folders supported.
- **Session Series** — named folder of sessions in order (e.g. "3 Day Skating Flow" = Session 1 + Session 2 + Session 3). Applied to camps in one tap.
- **Camps** — multi-day camp curricula (3-day, 5-day, custom). Assign a session to each day. One-tap apply to any Event.
- **Favorites** — all hearted content across Drills, Sessions, Camps.
- **Folders** — DB-backed flat folders per section (syncs across devices).

### Camp Session Runner
- Day strip shows each camp day with status
- Active day shows "Start Session" button
- Tapping launches the full drill-by-drill session runner (same as personal session runner)
- Coach advances through each drill with timer, video, description
- Completing the session marks the day with a green checkmark
- Next day becomes active automatically
- Progress indicator: "Day 2 of 5 complete"

### Inbox
- All coach-parent message threads
- Group chat per camp
- No athlete-to-athlete or parent-to-parent messaging

### Contacts
- Full CRM of all athletes and parents
- Email broadcast button
- Individual contact cards with registration history, notes, evaluations

---

## PARENT APP

### Navigation (4 tabs)
`Dashboard · Camps · Inbox · Profile`

### Dashboard
- Welcome back, [Parent Name]
- My Athletes: horizontal scrollable cards per child (name, age, position, skill level badge, PXF Combine stats)
- Tomorrow's RSVP: inline Attending / Not Attending buttons per child with a camp the next day
- Registered Camps: camp cards with countdown ("14 days away") or pulsing LIVE badge
- Unread Messages: message preview cards from coaches
- Latest Evaluation: most recent coach evaluation for any child
- Next Session: next scheduled camp day across all children

### Camps Tab
- Registered camps (already booked)
- Available camps from coaches parent has previously worked with
- Browse button to search all public camps

### Profile
- Parent name and avatar
- Children's Athlete Profiles (add/manage children)
- Authorized Caregivers per child
- My Bookings
- Payment Methods
- Account Settings

---

## CAMP REGISTRATION FLOW (Public, No Login Required)

`/camps/[slug]` → `/camps/[slug]/register` → `/camps/[slug]/waiver` → `/camps/[slug]/payment` → `/camps/[slug]/confirmed`

1. **Public Camp Page** — hero, description, coach bio, pricing, spots remaining, Register Now CTA
2. **Registration Form** — parent info, child info, custom fields set by coach (jersey size, medical, emergency contact, skill level)
3. **Waiver** — scroll-to-bottom requirement, checkbox + typed signature, cannot proceed without signing
4. **Payment** — order summary, promo code, payment plan option, Stripe form
5. **Confirmation** — animated checkmark, add to calendar, download receipt, create PXF account CTA

---

## KEY PLATFORM FEATURES

### Registration & Payments
- Custom registration forms per camp (medical info, emergency contacts, jersey size, skill level)
- Digital waiver signing with scroll-to-bottom enforcement
- Promo/discount codes (percentage or fixed, usage limit, expiry)
- Installment payment plans (deposit now, remainder auto-charged)
- Sibling discounts applied automatically
- Multi-child checkout in one flow
- Waitlist with auto-promote when spot opens (48-hour window to register)
- Stripe Connect for coach payouts

### Communication
- SMS notifications via Twilio (registration confirmation, reminders, absent alerts)
- Automated reminder sequences (7 days before, 1 day before, morning of)
- Post-camp follow-up sequence (thank you, feedback request, next camp announcement)
- Email broadcast to all contacts
- Broadcast with push + email toggle, send history

### Check-in & Attendance
- QR code check-in — parent shows phone, coach scans at the rink door
- Daily Attendance RSVP — parent confirms attendance the evening before, inline on parent dashboard
- Absent alert — auto SMS to parent if child not checked in 15 minutes after start
- Manual attendance override by coach

### Scheduling & Content
- Drag and drop session reordering within camp day strip
- Session Series (multi-day curriculum templates)
- One-tap Apply Camp Template from Playbook to Event
- PDF session plan export — printable for the ice
- Google Calendar / iCal / Outlook sync for parents

### Coach Verification
- "Get Verified" button in coach settings
- Identity check + criminal background check via Checkr API
- Blue shield "VERIFIED" badge on coach profile and all camp listings
- Annual renewal with 30-day reminder
- Parents see badge before registering

### Skills Progression
- Coach defines up to 6 progression levels (e.g. Foundational → Development → Competitive → Elite)
- Athletes advance levels through coach evaluations
- Level badge on athlete profile, coach roster, and parent dashboard
- Level history tracked over time

### Athlete Features
- Photo sharing per camp day (visible to registered parents only, private Supabase bucket)
- Achievement certificates — coach issues, parent receives via email and app
- Athlete progress tracking across camps over time
- Latest evaluation visible on parent dashboard

### Business Features
- Financials dashboard with revenue, payouts, transaction history
- Tax receipt generation (GST/HST for Canada, US sales tax)
- Multi-location support — multiple venues saved, assigned to events
- Referral program (planned — coach gets credit when their referral link generates a signup)
- Year-over-year reporting with date range comparison
- Analytics: KPI cards, registration/revenue charts, retention, email performance

### Discovery & Marketplace
- Public `/camps/browse` with location, age group, skill level, sport type filters
- Public `/coaches/[slug]` profile page (SEO-optimized)
- Verified badge displayed on public listings
- Parents discover coaches organically without a referral link

---

## PXF COMBINE — ATHLETE PERFORMANCE PROFILE

A standardized performance testing profile for every athlete — like the NHL Combine but accessible to any player at any level. Every PXF hardware product feeds data into the Combine Profile.

### Profile Display
- Overall **PXF Rating** out of 99 (large circular SVG ring, teal-to-green gradient)
- World rank: "#1,247 in the World" · "#23 in Ontario"
- Hexagonal radar chart with 6 axes
- Individual stat cards with 180° arc speedometer bars, percentile badges, world rank pills

### 6 Combine Categories

| Category | Metric | Hardware Source |
|---|---|---|
| Speed | First-step, top speed, backward | PXF Resistance Trainer |
| Power | Peak force, power output, stride efficiency | PXF Resistance Trainer |
| Shot | Slap shot mph, wrist shot mph, release time | PXF Shot Plate + Radar |
| Agility | Lateral, change of direction, reaction | PXF Speed Gates |
| Explosiveness | Vertical jump, peak force, rate of force | PXF Force Plate |
| Skating | Edge control, crossover speed, stop & start | PXF Resistance Trainer |

### Rankings
- Age group: U10 / U12 / U14 / U16 / U18 / Senior
- Region: Worldwide / Country / Province or State / City
- Position: All / Forward / Defence / Goalie
- Stat: Overall or individual category

### Current State
- Profile UI built with mock data (MOCK DATA watermark)
- Locked state ("Connect device to unlock") for all categories
- Unlocks as hardware ships
- The locked cards serve as marketing — parents and coaches see what's coming

---

## HARDWARE PRODUCT LINE

### PXF Slip (Available Now)
- Synthetic ice slip board for shooting and skating training
- First product to market, generating initial revenue
- **Future upgrade:** Smart Slip — UWB beacon chip embedded, joins Speed Gate positioning network

### GameIQ POD (1 Year Out)
- Smart training pod for game intelligence and reaction training

### PXF Resistance Trainer (Ice Sprint System)
- Board-mounted resistance/assistance trainer for ice hockey
- Measures: first-step explosion, top speed, backward skating power, edge-to-edge quickness, power output per stride
- Connects to PXF app via Bluetooth, syncs to athlete Combine Profile
- World ranking among all PXF athletes

**Manufacturing Plan:**
- First run: 100 units
- Pre-order campaign to fund production
- Founding 10: $999 | Early Bird: $1,299 | Pre-order: $1,499
- Full retail: $1,750
- 50-65 pre-orders needed to fund the run
- Target: hockey training facilities (10 facilities × 2-3 units = 50 pre-orders)
- Estimated ship: 6-8 months from pre-order close
- File provisional patent before showing prototype publicly

### PXF Speed Gates (4-Gate System)
- 4 wireless timing gates connecting to each other and the PXF app
- Self-calibrating distance via UWB (Ultra-Wideband) ranging — accurate to 2cm
- LED color feedback: RED while positioning, GREEN when at correct distance
- Standard test distances: 10ft, 20ft, 30ft, 40ft, shuttle
- Split times between each gate
- Circuit Mode with Smart Slips: app shows top-down diagram, all positions confirm green before timer starts
- Feeds Agility category in PXF Combine Profile
- Pricing: 4-gate set $1,499–$1,999 | Gates + 6 Smart Slips bundle $1,999–$2,499

### PXF Force Plate
- Measures jumping power, explosiveness, balance, ground force production
- Feeds Explosiveness category in PXF Combine Profile

### PXF Shot Plate (Shooting Force Analyzer)
- Dual sensor system:
  - Foot Force Plate — lower body force, weight transfer, center of pressure
  - Blade Contact Strip — stick force, contact duration, timing at blade
- Samples at 1000Hz — captures full shot sequence
- Force direction: downward, forward, rotational
- Shot type classification by force signature
- Force curve overlaid on video frame-by-frame
- **NHL Benchmark Data** — partner with 20-30 NHL players to capture force profiles per shot type. Every athlete compares their shot to NHL benchmarks.
- Shot Power Score — global ranking
- Pricing: Home $2,499 | Facility $7,500–$12,000
- File provisional patent before engaging manufacturers

---

## SOFTWARE IDEAS — SHELVED FOR LATER

### AI Assisted Drill Builder
- Coach uploads Instagram/TikTok/phone video clip
- AI analyzes and auto-generates: drill name, obstacle layout on rink diagram, route arrows, description, skill tags, estimated duration
- Coach tweaks and saves to Playbook
- Requires rink diagram builder (SVG-based, drag and drop)
- Tech: video → Supabase storage → OpenAI Vision API → SVG rink diagram with AI-generated paths
- Genuine differentiator — no other hockey software has this

### Social Share Extension (Growth Mechanic)
- 3 months free → post on socials about PXF Hockey → get 3 more months free
- Personal referral link — someone signs up through your link = extra month free
- Build after core platform is stable

### Live Streaming
- Parents watch camp sessions live from the app
- Infrastructure: Mux or Daily.co
- Build after core platform is stable

---

## COMPETITIVE LANDSCAPE

| Competitor | Strength | Our Advantage |
|---|---|---|
| Mindbody | Marketplace, AI front desk, integrations | Sport-specific, coaching content, athlete data |
| TeamSnap | Team management, live streaming | Camp management, payments, coaching tools |
| Jackrabbit | Registration, billing, multi-location | Modern UX, content library, performance tracking |
| Upper Hand | Facility management, staff scheduling | Coach-focused, athlete combine, hardware ecosystem |
| Sawyer | Parent marketplace, discovery | Coaching content, session builder, performance data |
| Helios Hockey | Hockey wearable, game performance metrics, shift video | Training performance, camp management, coaching business tools |

**The gap across all competitors:** None combine business management + coaching content tools + athlete performance data in one platform. That is PXF Hockey's lane.

### Helios Hockey — Strategic Partnership (Future)
- **What they do:** Hockey wearable sensor worn during games measuring stride speed, agility, active time, hustle score via AI (MIT + NHL data). Auto-clips shift video via Pixellot integration. Has birth year rankings. Raised $2.2M.
- **The overlap:** Both have athlete rankings and performance data
- **The difference:** Helios measures game performance. PXF measures training performance. Complementary, not duplicate.
- **The opportunity:** Integrate Helios game data as a 7th category in the PXF Combine Profile — "Game Performance." Together = complete player development picture no one else can offer.
- **The strategy:** Build PXF to 5,000+ athletes and hardware in market first. Then approach Helios from a position of strength. The pitch: their wearable + our platform = the complete hockey development ecosystem.
- **Timeline:** Approach when PXF has meaningful user base and at least one hardware product shipping.

---

## THIRD-PARTY INTEGRATIONS

### Build Now
| Integration | Purpose |
|---|---|
| **Apple Pay / Google Pay** | One-tap payment at camp registration, reduces checkout drop-off |
| **QuickBooks / Xero** | Camp revenue auto-flows into coach accounting software |
| **Meta Pixel** | Coaches track camp registration conversions from Facebook/Instagram ads |
| **Mailchimp / Klaviyo** | Sync PXF contacts to coach's existing email marketing tools |
| **Instagram / TikTok API** | Direct clip import for AI Drill Builder — no downloading required |
| **Google Maps** | Embedded directions to venue on camp detail and parent schedule cards |
| **Whoop / Garmin / Apple Health** | Athlete recovery and fitness data feeds into PXF Combine Profile |

### Build Later
| Integration | Purpose |
|---|---|
| **Zapier** | Connects PXF to 5,000+ apps — new registration → Google Sheet, Slack, invoice etc. |
| **Hudl** | Pull Hudl video clips directly into the Playbook drill library |
| **USA Hockey / Hockey Canada** | Player registration number verification on athlete profiles |
| **Zoom** | Virtual coaching sessions booked through the 1-on-1 system |
| **DocuSign** | Enhanced legally enforceable waiver signing |
| **Mux / Daily.co** | Live streaming for parents to watch camp sessions |
| **Google Analytics / Mixpanel** | Track public camp page conversion funnel and in-app behaviour |

### Strategic Partnership (Future)
| Partner | Purpose |
|---|---|
| **Helios Hockey** | Integrate game performance data (stride speed, agility, shifts) as 7th PXF Combine category. Approach when PXF has 5,000+ athletes and hardware in market. |

---

## NEW FEATURES ADDED (June 2026 Design Phase)

### Teams — Full TeamSnap Replacement
Independent Teams section (own nav tab) fully separate from Camps. Coaches can run a rep team and a camp business in the same app without overlap.

- **Team creation** — name, season, division, age group, association, colors, logo
- **Roster building** — manual entry, CSV import, copy from camp roster
- **Bulk invite** — coach adds players with parent email, hits "Add and Invite", Resend sends personalized signup email automatically. Parent accepts via unique link, account pre-populated.
- **Three event types:** Game · Practice · Team Event — all appear on dashboard Next 7 Days with color-coded labels
- **Practice Plan Builder** — browse and pick individual drills from Playbook OR add a full saved Session as a block. Mix both in the same plan. Total time auto-calculates.
- **Game Preparation:**
  - Lines tab — forward lines (4 lines × LW/C/RW), defense pairs (3 pairs), goalie, healthy scratches, PP units, PK units. Drag and drop. Save as reusable template. Share with team.
  - Game Plan tab — opponent notes, our game plan, key matchups, reference drills and video clips
  - Coach Notes tab — pre-game pep talk, between-period adjustments (P1/P2/P3), post-game notes (private to staff)
  - Game Summary — one-screen read-only view of everything. Share with staff, export PDF, share lines with team.
- **Game Media** — upload photos and videos to every game. Label clips (Highlight/Full Game/Period 1-3). Tag athletes. Build highlight reels. Parents notified when media posted, tagged athletes get individual notification. Parents save to camera roll.
- **RSVP system** — Yes/No/Maybe per event, coach sees live counts, send reminders to non-responders
- **Attendance** — mark present/absent/late, pre-filled from RSVPs, season attendance summary per player
- **Lineup sharing** — players and parents see their position before the game
- **Volunteer/duty assignments** — Scorekeeper, Timekeeper, Gate, Snack, Carpool, Photographer. Assign or open for signup.
- **Season stats** — goals, assists, penalty minutes, games played per player
- **Playbook access within Teams** — full drill and session library accessible from inside the team view

### Film — In-App Video Recording & Analysis
Camera icon in coach console header (teal-green gradient, always visible).

- **In-session recording** — Record button on active session/practice screen. Athlete picker before recording. Athlete name overlay while filming. Save → clip goes to athlete Media tab AND session Video Review tab simultaneously.
- **Standalone recording** — tap Film icon in header anytime, not tied to a session. Full roster picker. Untagged clips saved to review queue.
- **Video Analysis Player** — 1x/½x/¼x speed, frame-by-frame scrub, freehand/line/circle drawing on video, color picker (red/yellow/white), voiceover record, save annotated frame as PNG, Send to Athlete (posts to parent inbox with clip attached).
- **Session Video Review tab** — all clips from a session grouped by athlete. Raw/Reviewed/Annotated badges. Bulk send all annotated clips to athletes in one tap.
- **Athlete Media tab** — full grid of all clips per athlete. Filter by date or session.

### Dryland Training Programs
Self-serve training library for parents — athletes train year-round without needing coach assignment.

- **3 categories:** Stick Skills · Shooting · Strength & Explosiveness
- **Parent self-enroll** — browse library, select program, choose training days and start date, sessions appear on athlete calendar
- **In-app prompts** — prompt after camp registration, dashboard card if no program active, day-of push notification, 7-day nudge if no activity
- **Session Runner** — drill-by-drill guided flow. Video demo per drill (loops). Sets/reps/instructions displayed. Complete & Next button. Progress bar. Completion logged.
- **Coach assign or recommend** — hard assign or soft suggest. Completion rates visible per athlete.
- **Future:** full-length instructional session video with chapter markers per drill

### AI Ice Time Import + Log
- Coach uploads ice rental contract PDF → AI (GPT-4o) extracts all slots → coach reviews and confirms in a table → bulk imported to ice log
- Manual single-slot entry as fallback
- Calendar view of all booked slots, color-coded by rink
- Unlinked slots (no camp attached) show orange "Build Camp" button
- When creating a camp, link to a confirmed ice slot
- Conflict detection — two coaches on same slot = hard block

### Athlete Session Notes & Video Log
- Coach adds dated notes per athlete: drills covered (from Playbook), written notes, 1–5 star rating, up to 4 video clips
- Chronological feed with drill tags, expandable notes, video thumbnails
- Video clips open in full analysis player
- Toggle "Share with parent" — shared notes appear in parent app as Coach Updates feed

### Health & Medical Forms
- Collected during camp registration (after waiver, before payment)
- Allergies, medications, conditions, physician info, 2 emergency contacts, medical clearance upload, insurance info
- Red medical alert badge during QR check-in — tap shows quick-view card
- Visible to Coach, Manager, Owner roles only

### Parent Daily Camp Updates
- Coach/assistant posts photos + videos per camp day
- Up to 6 photos, 3 video clips, 280-char caption, athlete tags
- Parents notified on post; tagged athletes' parents get individual notification
- Thumbs-up reactions, save to camera roll
- Camp Wrap post type pinned at top at end of camp
- Private — registered parents only, never public

### IHS Drill Import
- Coach pastes an IHS (Ice Hockey Systems) shareable link
- App fetches the page and extracts drill name, description, instructions, rink diagram image
- Coach reviews and confirms → drill lands in Playbook with "Imported from IHS" badge
- Practice plan links import all drills at once, offer to create a Session in order
- Same flow as Instagram/TikTok import (Prompt 13)

### PXF Combine Profile (UI Shell)
- 6 category cards: Speed & Power, Jumping & Explosiveness, Shot Power, Shot Speed, Agility & Circuits, Recovery & Wellness
- All cards show "Test Pending" until hardware or device is connected
- Recovery & Wellness pulls from Apple Health / Whoop / Garmin
- Historical timeline per category (line chart of all past tests)
- Coach view: Combine tab on athlete profile, sortable Combine Score column in roster
- Public share link — athlete sends profile to scouts, coaches, teams
- Manual entry for Shot Speed (only live-entry field until hardware ships)

### Staff Permission Hierarchy (Team Management)
5-level permission model: Owner · Manager · Coach · Assistant · Content Creator
- Conflict detection — overlapping assignments blocked
- Geography-aware scheduling — drive time warnings for back-to-back assignments at different rinks
- Manager sees attendee payment status across all camps
- Coach and Manager can message parents/athletes within their scope

---

## FEATURES TO ADD (FROM COMPETITIVE RESEARCH)

**Priority 1 — Build Now:**
- ✅ Coach Verification / Background Checks (Checkr)
- ✅ Public Marketplace / Discovery
- ✅ Google Calendar / iCal Sync
- ✅ Skills Progression Levels
- ✅ Authorized Caregiver

**Priority 2 — Build Later:**
- Live Streaming (Mux or Daily.co)
- Sponsorship management for coaches/teams
- Staff payroll reporting
- "Track Anything" custom fields
- Multi-location / franchise support
- Auto-renewal with lapsed client re-engagement

---

## ASSOCIATION DASHBOARD (v2 Build)

The association dashboard is a separate management layer above teams. Associations join PXF free during beta. Revenue comes from parent subscriptions and registration fees processed through PXF.

### Association Web Portal — Left Sidebar
- Dashboard
- Teams
- Registrations
- Coaches
- Athletes
- Ice Times
- Financials
- Inbox
- Settings

### Registrations Section (Core Association Feature)
This is one of the biggest pain points for associations currently — most use Google Forms or paper. A clean built-in registration system is a major selling point.

**Tryouts**
- Create tryout event with age groups, capacity, fee, custom registration form
- Parents register child online through public link
- Association reviews submissions — Accept / Waitlist / Decline per player
- Accepted players notified automatically via push + email
- Waitlisted players auto-promoted when spot opens (48-hour window)

**Season Registration**
- Annual player registration flow for the full association
- Collects: player info, birth certificate upload, medical info, emergency contacts, payment
- Issues confirmation and association membership number on completion
- Coach can see registration status per player on their roster

**Team Transfers**
- Player requests transfer from one team to another within the association
- Requires approval from both the releasing coach and the receiving coach
- Association admin has final override
- Transfer history logged on athlete profile

**Waitlist Management**
- Players on waitlist for oversubscribed teams or tryouts
- Auto-promote with configurable window (24hr / 48hr / 72hr)
- Parent notified immediately when promoted off waitlist

**Payment Tracking**
- Who has paid registration fees, who is outstanding
- Send payment reminders to unpaid families in one tap
- Export payment report as CSV

**Registration Form Builder**
- Custom fields per registration type (tryout vs season vs transfer)
- Standard fields: player info, DOB, position, skill level, medical, emergency contacts
- Optional fields: jersey size, previous association, coach references
- Digital waiver signing integrated

### Association Dashboard — Home
- Total teams, total athletes, total coaches at a glance
- Registration revenue this season
- Alerts: missing documents, unassigned coaches, unpaid fees, incomplete health forms
- Upcoming tryout events
- Recent registrations feed

### Hockey Canada / USA Hockey Integration
Athletes need to be linked to their national governing body registration. This is especially important for associations who need to verify player eligibility before allowing them to play.

**What the integration does:**
- Athlete profile has a field for Hockey Canada or USA Hockey registration number
- PXF verifies the number against the governing body's database (API or manual upload)
- Verified badge appears on the athlete profile
- Association can see verification status across their full roster — who is registered, who is pending, who is unverified
- Unverified players flagged in alerts before games
- Registration number links to governing body profile (age verification, birth year, previous teams)
- Coach and association admin can see status — parents cannot edit their own verification status once set

**Build approach:**
- Hockey Canada and USA Hockey both have varying levels of API access — may require partnership or manual CSV import initially
- Phase 1: manual registration number entry + association admin verification
- Phase 2: direct API verification if partnership established
- Add to the integrations build-later list until association dashboard is in active development

### Association Pricing (TBD)
Free during beta. Pricing model to be determined — associations will be a paid tier. Current tools associations pay for that PXF replaces: SportsEngine ($2,000-8,000/yr) + Refr Sports ($299-499/mo) + website ($100-200/mo) + TeamSnap for all teams ($500-900/mo) = $15,000-30,000/yr total spend. PXF replacing all of it at $500/mo ($6,000/yr) is an obvious value proposition. Free beta builds dependency — by the time pricing is introduced associations can't leave because their entire operation runs on PXF.

### Association — Additional Features (Full V1 Build)

**Referee / Official Management**
- Referee database with certification level, availability, and contact info
- Game assignment — assign 2-3 refs per game, system checks availability and cert level required
- Conflict of interest rules — ref cannot be assigned to a game involving an affiliated team
- Ref accepts/declines via push notification
- Automatic payment after game via Stripe — direct deposit to referee
- T4A / 1099 generation at year end
- Referee performance ratings (internal only)
- Shortage alerts — no ref assigned 48 hours before game

**Facility / Rink Management**
- Rink profiles: surfaces, dressing rooms, capacity, rental rates, contact info
- Dressing room assignment per game and practice
- Resurfacing/Zamboni schedule
- Facility maintenance log
- Concession scheduling

**Auto-Generated Public Website**
- Public site at associationname.pxfhockey.com
- Custom domain support
- Auto-populated with standings, schedule, news, team pages, sponsor logos
- Post once → appears on website and app simultaneously
- Live standings updated in real time
- Photo gallery and sponsor banner rotation

**USA Hockey / Hockey Canada Direct Integration**
- Player registration number verified instantly against national database
- Age verification pulled directly — no birth certificate upload needed
- Transfer portal notifies governing body
- Insurance coverage verification per player
- Coaching certification pulled directly from governing body database

**Live Scoring & Standings**
- Scorekeeper dedicated app view — simple interface for score clock operator
- Live score updates pushed to all parents following the game
- Real-time standings update on final score entry
- Play-by-play entry: goal scorer, assist, period, time
- Penalty tracking during live game
- Public live scores page for non-app users

**Scholarship & Financial Assistance**
- Scholarship fund management with total amount per season
- Family application form with financial need documentation
- Committee review workflow — confidential
- Award tracking per season
- Donor management with tax receipts for donations

**Tryout Scoring System**
- Tryout event creation with evaluator assignments
- Standardized scorecard builder with weighted criteria
- Multi-evaluator blind scoring — averages calculated after all submitted
- Evaluator bias detection — flags when one evaluator scores consistently higher/lower
- Automatic ranking and cut list generation by position
- Parent notification: accepted / waitlisted / not selected
- 48-hour appeal window

**Association-Level Drill & Practice Library**
- Shared drill and session library available to all coaches in the association
- Coach coordinator publishes approved content
- Association development curriculum — age-appropriate skill progressions all coaches follow
- Coaches browse association content alongside personal Playbook

**Jersey & Equipment Management**
- Equipment inventory tracker — item, quantity, condition, location
- Jersey assignment per player with number tracking
- Jersey return tracking at end of season
- Equipment loan log with due dates
- Low stock alerts and purchase order triggers

**Apparel Orders**
- Association or coach creates apparel order: item, supplier, deadline, price
- Parents submit athlete size and quantity through app
- Name and number customization per item — duplicate number detection
- Payment collected through app at order submission
- Multi-team orders combined for volume discounts
- Clean order export (CSV/PDF) for supplier
- Distribution tracking — who has picked up their order
- Future: direct supplier integration (Bauer, CCM) with order tracking

**Parent Engagement & Community**
- Association news feed visible to all families
- Player spotlight — association highlights a player each week
- Community board — carpool requests, equipment for sale/trade
- Poll/survey tool for association-wide feedback
- Photo galleries with privacy controls

**Discipline Committee**
- Incident reports feed into discipline queue automatically
- Committee member assignment (non-affiliated with involved teams)
- Hearing scheduling and decision recording
- Suspension tracking across all teams — flagged in lineup builder
- Appeal process workflow
- Escalation path to Hockey Canada / USA Hockey
- Full audit trail

**Multi-Sport Support (Future)**
- Sport selector at association level — hockey, ringette, ball hockey
- Training library, combine profile, and dryland adapt by sport
- Path to all ice sports, then all winter sports, then all youth sports

---

## SECURITY REVIEW CHECKLIST (Build Phase)

Items flagged during design phase that require RLS audit or security review before production:

- **private_booking_requests.owner_id** — in `hockey-schools.functions.ts`, a parent inserts a booking request row with an `owner_id` field. RLS policy must ensure the `owner_id` can only be set to a valid Elite Coach user ID — not an arbitrary user ID. Parents should not be able to spoof requests to coaches they have no relationship with.
- **coach.bookings.tsx** — confirm BlockForStaff guard is in place so staff coaches cannot access the private session bookings screen.
- **Health & Medical forms** — confirm RLS restricts visibility to Owner, Manager, and Coach roles only. Parents and athletes must never have read access to other athletes' medical data.
- **Financials screen** — confirm staff coaches cannot access revenue, gross profit, or other coaches' session rates via direct URL or API call. BlockForStaff + TierGate must both be enforced server-side, not just client-side.
- **Athlete media** — confirm is_shared flag on athlete_media table is enforced via RLS so parents can only see clips explicitly shared with them.

---

## BUILD PHASE ROADMAP

### Phase 1 — Foundation
1. Export and review Supabase schema from Lovable
2. Set up real Supabase project with all tables
3. Set up Stripe account + enable Connect with Express accounts
4. Set up RevenueCat with Elite/Platinum/Home Coach subscription products + trial logic
5. Set up Twilio for SMS
6. Set up SendGrid for email
7. Set up Checkr for background checks

### Phase 2 — Core Coach Experience
1. Coach onboarding flow (role selection → plan → trial start)
2. Coach console navigation (5 tabs)
3. Playbook — drill library, session builder, session series, camp templates
4. Events — create camp, session plans, apply template, day strip
5. Camp session runner

### Phase 3 — Camp Operations
1. Public camp booking flow (register → waiver → payment → confirm)
2. QR check-in
3. Daily attendance RSVP
4. Broadcast and messaging
5. Photo sharing

### Phase 4 — Parent Experience
1. Parent onboarding + add children
2. Parent dashboard
3. Schedule, inbox, profile
4. Calendar sync
5. Authorized caregivers

### Phase 5 — Growth & Analytics
1. Coach verification (Checkr)
2. Public marketplace and discovery
3. Analytics dashboard
4. Email sequences and automation
5. Referral program and social share extension
6. Tax receipts

### Phase 6 — PXF Combine
1. Combine profile UI (already designed, mock data in place)
2. Wire hardware data ingestion as each product ships
3. Global ranking engine
4. Scout access subscription

---

## WEB PORTAL — PLATFORM DECISION (June 2026)

PXF will ship both a mobile app and a web portal. Both hit the same Supabase backend. Parents are app-only. Coaches use both.

**Mobile app — coach use cases:**
- On-ice session runner
- Attendance and QR check-in
- Film recording and quick annotation
- Notifications and alerts
- Dashboard and quick stats on the go

**Web portal — coach use cases:**
- Building practice plans and drill library
- Uploading and editing video
- Camp creation and management
- Roster and health form management
- Staff scheduling board (Elite)
- Financials and reporting
- Ice time management
- Full playbook library management
- Private series creation and management
- Locations management

**Parent:** App-first. Parents register for camps on web (account created at checkout). After registration they can log into web to view registrations, download receipts, and see camp schedules — with a prominent "Download the PXF app for the full experience" prompt. All ongoing features (dryland, RSVP, evaluations, media, payments, messaging) are app only. No full parent web dashboard in V1.

**Build approach:** Lovable builds the web portal alongside the app. Same Supabase project, different frontend. Web portal is especially critical for Elite Coach operators managing staff, ice, and revenue at scale.

### Web Portal — Operations Scheduling Board (Elite Coach)
The full staff scheduling board lives on the web portal only. Layout: instructors across the top (or left column), ice times down the rows. Each cell shows the assigned instructor for that ice slot. Coaches with availability for that time slot are shown in full color — unavailable coaches are greyed out. Owner drags an available instructor onto an ice time to assign them. Conflicts (double-booked instructor, unavailable time) are blocked with a visual indicator. This is the primary management tool for hockey schools running multiple instructors and high ice volume. Mobile Operations screen shows alerts and simplified list view only — full scheduling board is web-only.

---

## ELITE COACH — STAFF & FINANCIALS DETAIL

### Staff Coach Management
- Owner invites staff coaches by email via Resend
- Each staff coach gets a 'Session Rate' (flat fee per session) set on their profile — visible to owner only
- When a staff coach is assigned to a session or camp, their rate auto-applies to financials
- Financials screen shows Coach Costs broken down per staff coach (name, sessions, total cost)
- Staff coaches see their own 'My Earnings' card — read-only, no access to owner revenue or other coaches' rates
- 3 staff coaches included in Elite Coach plan. Additional coaches at $9.99/mo each (tracked in UI, Stripe wired later)

### Locations
- Owner pre-loads venues (rinks, gyms, outdoor, other) with name, address, type, notes, and optional cost per hour
- All camp, session, and private creation flows use a location selector instead of free-text
- Cost per hour set on a location auto-feeds ice cost tracking in Financials
- Staff coaches can select from locations but cannot add/edit/delete them

### Financials — Gross Profit Tracking
- Gross Sales (existing)
- Net Sales (existing)
- Ice Costs — pulled from ice time entries with hourly cost set, or manual monthly entry
- Coach Costs — auto-calculated from staff coach session rates × sessions assigned
- Gross Profit — Gross Sales minus Ice Costs minus Coach Costs. Green if positive, red if negative. Month-to-date.
- Private Series revenue tracked as its own line item separate from camp revenue

### Privates & Private Series
- 'Book Private' flow with toggle: Single Session · Series
- Series: named package for one athlete, multiple sessions, per-session or flat fee pricing, total auto-calculates
- Sessions can be added or deleted after series is published
- Parent sees and pays the series through their app — not publicly listed like a camp
- Series sessions appear in parent Events tab under their child's name after payment
- Upcoming Privates section on Elite dashboard shows both single sessions and series (SERIES badge)

---

## CURRENT STATUS

- ✅ React Native mobile app (Expo) — core screens built
- ✅ Lovable design phase — 70+ screens designed
- ✅ Supabase backend (Lovable-generated schema)
- ✅ Apple Developer account set up
- ✅ EAS Build configured for iOS device testing
- ⏳ Supabase schema export and review
- ⏳ Stripe Connect setup
- ⏳ RevenueCat setup
- ⏳ Build phase begins

---

---

## LOVABLE DESIGN PHASE — STATUS

All prompts sent and confirmed. Design phase complete.

| Prompt | Feature | Status |
|---|---|---|
| 1–4 | Trust & Safety, Session Series, Attendance, Camp Day Editing | ✅ Done |
| 5–9 | Apple Pay, QuickBooks, Meta Pixel, Mailchimp, Google Maps, Apple Health, Social Import | ✅ Done |
| Team Mgmt | Permission hierarchy, team overview, alerts, conflict detection, geography | ✅ Done |
| 10–14 | Apple Pay UI, Meta Pixel UI, Recovery Card, TikTok Import, PXF Combine | ✅ Done |
| 15 | Video Analysis + In-Session Recording + Film Tab | ✅ Done |
| 16 | Health & Medical Forms | ✅ Done |
| 17 | AI Ice Time Import | ✅ Done |
| 18 | Parent Daily Camp Photo & Video Updates | ✅ Done |
| 19 | Dryland Training Programs | ✅ Done |
| 20 | Athlete Session Notes & Video Log | ✅ Done |
| 21 | Teams — Full TeamSnap Replacement | ✅ Done |

**Next step:** Export Supabase schema from Lovable → begin real build phase in React Native mobile app.

---

*This document covers all major product, business, and technical decisions made through June 23, 2026.*
