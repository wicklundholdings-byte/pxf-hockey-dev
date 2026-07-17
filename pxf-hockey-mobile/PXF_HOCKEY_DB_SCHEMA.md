# PXF Hockey — Full Database Schema Design
*Audited against Master Summary — July 2026*

## Overview

This schema supports 4 subscription tiers (Parent, Team Coach, Elite Coach, Academy) across two products: mobile app (coaches + parents) and web portal (coaches + limited parent access).

All tables use UUID primary keys, include `created_at` / `updated_at` timestamps unless noted, and have RLS enabled.

Tags: `[V1]` = build at launch · `[V2]` = build later (association, combine hardware, etc.)

---

## EXISTING TABLES (V1 — Keep & Extend)

| Table | Action |
|---|---|
| `profiles` | EXTEND — see new columns below |
| `user_roles` | EXTEND — add more roles |
| `drills` | EXTEND — add source fields for IHS/social import |
| `drill_categories` | KEEP as-is |
| `drill_favorites` | KEEP as-is |
| `training_programs` | KEEP as-is |
| `program_drills` | KEEP as-is |
| `sessions` | EXTEND — add team_id, session_type, location_id |
| `session_drills` | KEEP as-is |
| `favorite_folders` | KEEP as-is |
| `favorite_folder_drills` | KEEP as-is |
| `user_favorites` | KEEP as-is |
| `subscriptions` | REBUILD — needs proper Stripe fields |

---

## COMPLETE TABLE DEFINITIONS

---

### 1. PROFILES (extend existing) [V1]

**New columns to ADD:**
```
phone                  text
avatar_url             text
slug                   text UNIQUE  -- public URL: pxfhockey.com/coaches/[slug]
subscription_tier      text  -- 'parent' | 'team_coach' | 'elite_coach' | 'academy'
organization_id        uuid FK → organizations (nullable)
stripe_customer_id     text
stripe_account_id      text  -- Stripe Connect payout account (coaches only)
is_founding_member     boolean default false
is_verified            boolean default false  -- Checkr background check passed
verification_expires_at timestamptz
onboarding_complete    boolean default false
role                   text  -- 'parent' | 'coach' | 'staff' | 'admin'
```

---

### 2. ORGANIZATIONS [V1]

For Academy tier coaches running a hockey school with multiple staff.

```
id           uuid PK
owner_id     uuid FK → profiles
name         text NOT NULL
logo_url     text
website      text
slug         text UNIQUE
created_at   timestamptz
updated_at   timestamptz
```

---

### 3. LOCATIONS [V1]

Pre-saved venues used across camps, ice times, sessions, and private lessons.

```
id               uuid PK
coach_id         uuid FK → profiles
organization_id  uuid FK → organizations (nullable)
name             text NOT NULL  -- "Rogers Arena Ice 2"
address          text
type             text  -- 'rink' | 'gym' | 'outdoor' | 'other'
cost_per_hour    decimal  -- auto-populates ice cost in Financials
notes            text
created_at       timestamptz
updated_at       timestamptz
```

---

### 4. ICE_TIMES [V1]

Booked ice slots. AI PDF import populates this table automatically.

```
id               uuid PK
coach_id         uuid FK → profiles
organization_id  uuid FK → organizations (nullable)
location_id      uuid FK → locations
date             date NOT NULL
start_time       time NOT NULL
end_time         time NOT NULL
cost             decimal  -- auto-calculated from location.cost_per_hour
camp_id          uuid FK → camps (nullable — linked when camp is created)
team_event_id    uuid FK → team_events (nullable)
notes            text
source           text  -- 'manual' | 'pdf_import'
created_at       timestamptz
updated_at       timestamptz
```

---

### 5. TEAMS [V1]

```
id               uuid PK
coach_id         uuid FK → profiles
organization_id  uuid FK → organizations (nullable)
name             text NOT NULL
age_group        text  -- "U13", "U15", "Midget AA"
season           text  -- "2025-2026"
division         text
association      text
logo_url         text
primary_color    text
secondary_color  text
is_active        boolean default true
created_at       timestamptz
updated_at       timestamptz
```

---

### 6. TEAM_MEMBERS (Roster) [V1]

```
id             uuid PK
team_id        uuid FK → teams
athlete_id     uuid FK → athletes
jersey_number  text
position       text  -- 'forward' | 'defense' | 'goalie'
line_position  text  -- 'LW' | 'C' | 'RW' | 'LD' | 'RD'
status         text  -- 'active' | 'inactive' | 'injured'
joined_at      date
created_at     timestamptz
```

---

### 7. TEAM_STAFF [V1]

Staff coaches and managers linked to a team.

```
id            uuid PK
team_id       uuid FK → teams
user_id       uuid FK → profiles
role          text  -- 'assistant_coach' | 'manager' | 'trainer' | 'goalie_coach'
permission_level text  -- 'owner' | 'manager' | 'coach' | 'assistant' | 'content_creator'
session_rate  decimal  -- flat fee per session (visible to owner only)
permissions   jsonb    -- granular: can_message, can_edit_roster, can_see_financials, etc.
invited_at    timestamptz
accepted_at   timestamptz
created_at    timestamptz
```

---

### 8. ATHLETES [V1]

Athlete profiles — created by a coach or parent. Not a separate login.

```
id                      uuid PK
first_name              text NOT NULL
last_name               text NOT NULL
date_of_birth           date
position                text  -- 'forward' | 'defense' | 'goalie'
jersey_number           text
headshot_url            text
parent_user_id          uuid FK → profiles (nullable — linked when parent signs up)
governing_body_number   text  -- Hockey Canada or USA Hockey registration number
governing_body_verified boolean default false
current_skill_level_id  uuid FK → skill_progression_levels (nullable)
notes                   text
created_by              uuid FK → profiles
created_at              timestamptz
updated_at              timestamptz
```

---

### 9. AUTHORIZED_CAREGIVERS [V1]

Additional adults authorized to pick up or manage an athlete (not a parent account).

```
id           uuid PK
athlete_id   uuid FK → athletes
parent_user_id uuid FK → profiles  -- the parent who added this caregiver
name         text NOT NULL
relationship text  -- "Grandparent", "Uncle", "Nanny"
phone        text
email        text
created_at   timestamptz
```

---

### 10. ATHLETE_STATS [V1]

Season stats per athlete per team.

```
id                  uuid PK
athlete_id          uuid FK → athletes
team_id             uuid FK → teams
season              text
games_played        int default 0
goals               int default 0
assists             int default 0
points              int default 0
plus_minus          int default 0
penalty_minutes     int default 0
save_pct            decimal  -- goalies only
goals_against_avg   decimal  -- goalies only
updated_at          timestamptz
```

---

### 11. SKILL_PROGRESSION_LEVELS [V1]

Coach-defined skill levels (up to 6 per coach). e.g. Foundational → Elite.

```
id           uuid PK
coach_id     uuid FK → profiles
name         text NOT NULL  -- "Foundational", "Development", "Competitive", "Elite"
description  text
color        text  -- hex color for badge
order_index  int   -- 1-6
created_at   timestamptz
```

---

### 12. ATHLETE_PROGRESS_LEVELS [V1]

Current and historical level per athlete, assigned by a coach.

```
id           uuid PK
athlete_id   uuid FK → athletes
coach_id     uuid FK → profiles
level_id     uuid FK → skill_progression_levels
assigned_at  date
notes        text
created_at   timestamptz
```

---

### 13. ATHLETE_EVALUATIONS [V1]

Formal coach evaluations — multiple skills rated at once, with written feedback.

```
id            uuid PK
athlete_id    uuid FK → athletes
coach_id      uuid FK → profiles
team_id       uuid FK → teams (nullable)
camp_id       uuid FK → camps (nullable)
title         text  -- "Mid-Camp Evaluation", "End of Season"
overall_rating int  -- 1-5 stars
written_notes  text
share_with_parent boolean default false
evaluated_at  date
created_at    timestamptz
```

---

### 14. ATHLETE_SKILL_RATINGS [V1]

Individual skill ratings within an evaluation (or standalone).

```
id              uuid PK
evaluation_id   uuid FK → athlete_evaluations (nullable)
athlete_id      uuid FK → athletes
coach_id        uuid FK → profiles
skill_name      text   -- "Skating", "Puck Handling", "Shooting", "Hockey IQ"
category        text   -- 'skating' | 'shooting' | 'defense' | 'mental'
rating          int    -- 1-10
notes           text
assessed_at     date
created_at      timestamptz
```

---

### 15. ATHLETE_SESSION_NOTES [V1]

Coach notes per athlete per session — with drill tags, rating, and video clips.

```
id              uuid PK
athlete_id      uuid FK → athletes
coach_id        uuid FK → profiles
session_id      uuid FK → sessions (nullable)
camp_id         uuid FK → camps (nullable)
drill_ids       uuid[]  -- drills covered from Playbook
written_notes   text
star_rating     int  -- 1-5
share_with_parent boolean default false
noted_at        date
created_at      timestamptz
```

---

### 16. TEAM_EVENTS [V1]

Practices, games, and team events on the team schedule. Separate from tournament games.

```
id              uuid PK
team_id         uuid FK → teams
title           text  -- "Practice", "Game vs Marlboros", "Team Dinner"
event_type      text  -- 'practice' | 'game' | 'team_event'
location_id     uuid FK → locations (nullable)
location_notes  text  -- free text if not a saved location
opponent        text  -- for games
date            date NOT NULL
start_time      time NOT NULL
end_time        time
is_home         boolean  -- home or away game
session_id      uuid FK → sessions (nullable)  -- linked practice plan
notes           text
created_at      timestamptz
updated_at      timestamptz
```

---

### 17. EVENT_RSVPS [V1]

Parent RSVP (Yes/No/Maybe) per team event per athlete.

```
id              uuid PK
team_event_id   uuid FK → team_events
athlete_id      uuid FK → athletes
parent_user_id  uuid FK → profiles
rsvp_status     text  -- 'yes' | 'no' | 'maybe'
responded_at    timestamptz
created_at      timestamptz
```

---

### 18. ATTENDANCE_RECORDS [V1]

Daily attendance — separate from RSVP. Coach marks present/absent/late.

```
id              uuid PK
team_event_id   uuid FK → team_events (nullable)
camp_id         uuid FK → camps (nullable)
camp_session_id uuid FK → camp_sessions (nullable)
athlete_id      uuid FK → athletes
status          text  -- 'present' | 'absent' | 'late' | 'excused'
marked_by       uuid FK → profiles
marked_at       timestamptz
notes           text
created_at      timestamptz
```

---

### 19. CHECK_INS [V1]

QR code scan log — one record per athlete per camp session day.

```
id                uuid PK
camp_registration_id uuid FK → camp_registrations
camp_session_id   uuid FK → camp_sessions
athlete_id        uuid FK → athletes
scanned_by        uuid FK → profiles
scanned_at        timestamptz
method            text  -- 'qr' | 'manual'
```

---

### 20. EVENT_DUTIES [V1]

Volunteer and duty assignments per team event (Scorekeeper, Snacks, Carpool, etc.).

```
id              uuid PK
team_event_id   uuid FK → team_events
duty_type       text  -- 'scorekeeper' | 'timekeeper' | 'gate' | 'snack' | 'carpool' | 'photographer'
assigned_to     uuid FK → profiles (nullable — parent/user)
open_for_signup boolean default false
created_at      timestamptz
```

---

### 21. GAME_LINEUPS [V1]

Forward lines, defense pairs, goalie assignment, PP/PK units for a game.

```
id              uuid PK
team_event_id   uuid FK → team_events
lineup_name     text  -- "Line 1", "PP Unit 1", etc.
lineup_type     text  -- 'forward_line' | 'defense_pair' | 'goalie' | 'pp' | 'pk' | 'scratches'
positions       jsonb  -- {"LW": athlete_id, "C": athlete_id, "RW": athlete_id} etc.
order_index     int
is_template     boolean default false
template_name   text  -- saved template name
created_at      timestamptz
updated_at      timestamptz
```

---

### 22. GAME_PLANS [V1]

Game preparation notes attached to a team_event of type 'game'.

```
id               uuid PK
team_event_id    uuid FK → team_events
opponent_notes   text
our_game_plan    text
key_matchups     text
pre_game_notes   text   -- pep talk
p1_adjustments   text   -- between-period adjustments
p2_adjustments   text
p3_adjustments   text
post_game_notes  text   -- private to staff
created_at       timestamptz
updated_at       timestamptz
```

---

### 22. CAMPS [V1]

```
id                       uuid PK
coach_id                 uuid FK → profiles
organization_id          uuid FK → organizations (nullable)
location_id              uuid FK → locations (nullable)
name                     text NOT NULL
slug                     text UNIQUE  -- public URL: /camps/[slug]
description              text
type                     text  -- 'camp' | 'clinic' | 'showcase' | 'tryout'
start_date               date NOT NULL
end_date                 date NOT NULL
price                    decimal NOT NULL
max_spots                int
spots_remaining          int
age_groups               text[]
status                   text  -- 'draft' | 'published' | 'full' | 'closed' | 'cancelled'
banner_image_url         text
stripe_price_id          text
sibling_discount_pct     decimal  -- e.g. 10 = 10% off second+ sibling
payment_plan_enabled     boolean default false
payment_plan_installments int  -- e.g. 2 = deposit + 1 more
registration_deadline    date
created_at               timestamptz
updated_at               timestamptz
```

---

### 23. CAMP_FORM_FIELDS [V1]

Custom registration form fields per camp — jersey size, medical, skill level, etc.

```
id            uuid PK
camp_id       uuid FK → camps
label         text NOT NULL  -- "Jersey Size"
field_type    text  -- 'text' | 'select' | 'checkbox' | 'date' | 'file'
options       text[]  -- for select fields: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL']
is_required   boolean default false
order_index   int
created_at    timestamptz
```

---

### 24. CAMP_REGISTRATION_RESPONSES [V1]

Answers to custom form fields per registration.

```
id               uuid PK
camp_registration_id uuid FK → camp_registrations
form_field_id    uuid FK → camp_form_fields
answer           text
created_at       timestamptz
```

---

### 25. CAMP_WAIVERS [V1]

Signed waivers per camp registration. Scroll-to-bottom enforced in UI.

```
id                   uuid PK
camp_registration_id uuid FK → camp_registrations
waiver_text          text  -- full waiver copy at time of signing
signed_by_name       text  -- typed signature
signed_by_user_id    uuid FK → profiles
ip_address           text
signed_at            timestamptz NOT NULL
created_at           timestamptz
```

---

### 26. ATHLETE_HEALTH_FORMS [V1]

Medical info per athlete per camp. Restricted to Owner/Manager/Coach via RLS only.

```
id                   uuid PK
athlete_id           uuid FK → athletes
camp_registration_id uuid FK → camp_registrations (nullable)
allergies            text
medications          text
medical_conditions   text
physician_name       text
physician_phone      text
emergency_contact_1_name  text
emergency_contact_1_phone text
emergency_contact_1_relationship text
emergency_contact_2_name  text
emergency_contact_2_phone text
emergency_contact_2_relationship text
medical_clearance_url text  -- Supabase Storage path (doc upload)
insurance_provider   text
insurance_policy_num text
created_at           timestamptz
updated_at           timestamptz
```

---

### 27. DISCOUNT_CODES [V1]

Promo/discount codes per camp — percentage or fixed amount.

```
id              uuid PK
camp_id         uuid FK → camps
coach_id        uuid FK → profiles
code            text NOT NULL UNIQUE
discount_type   text  -- 'percentage' | 'fixed'
discount_value  decimal  -- e.g. 10 = $10 off or 10%
max_uses        int  -- null = unlimited
uses_count      int default 0
expires_at      timestamptz
is_active       boolean default true
created_at      timestamptz
```

---

### 28. PAYMENT_INSTALLMENTS [V1]

Installment plan tracking — deposit charged at registration, remainder auto-charged.

```
id                        uuid PK
camp_registration_id      uuid FK → camp_registrations
installment_number        int  -- 1 = deposit, 2+ = remainder
amount                    decimal
due_date                  date
status                    text  -- 'pending' | 'paid' | 'failed' | 'waived'
stripe_payment_intent_id  text
paid_at                   timestamptz
created_at                timestamptz
```

---

### 29. CAMP_SESSIONS (Days within a Camp) [V1]

```
id          uuid PK
camp_id     uuid FK → camps
date        date NOT NULL
start_time  time NOT NULL
end_time    time NOT NULL
location_id uuid FK → locations (nullable)
session_id  uuid FK → sessions (nullable)  -- linked practice plan
notes       text
status      text  -- 'upcoming' | 'active' | 'completed' | 'cancelled'
created_at  timestamptz
```

---

### 30. CAMP_REGISTRATIONS [V1]

```
id                        uuid PK
camp_id                   uuid FK → camps
athlete_id                uuid FK → athletes
parent_user_id            uuid FK → profiles
status                    text  -- 'pending' | 'confirmed' | 'waitlist' | 'cancelled' | 'refunded'
payment_status            text  -- 'unpaid' | 'paid' | 'partial' | 'refunded'
amount_paid               decimal
discount_code_id          uuid FK → discount_codes (nullable)
discount_applied          decimal
health_form_id            uuid FK → athlete_health_forms (nullable)
waiver_signed_at          timestamptz
qr_code                   text  -- unique QR token for check-in
stripe_payment_intent_id  text
platform_fee              decimal
waitlist_promoted_at      timestamptz
waitlist_expires_at       timestamptz  -- 48-hour window to complete registration
registered_at             timestamptz
confirmed_at              timestamptz
notes                     text
created_at                timestamptz
updated_at                timestamptz
```

---

### 31. CAMP_DAY_POSTS [V1]

Coach/staff posts photos+videos to parents after each camp day.

```
id              uuid PK
camp_id         uuid FK → camps
camp_session_id uuid FK → camp_sessions
posted_by       uuid FK → profiles
caption         text  -- max 280 chars
post_type       text  -- 'daily_update' | 'camp_wrap'
is_pinned       boolean default false  -- Camp Wrap pinned at top
created_at      timestamptz
updated_at      timestamptz
```

---

### 32. CAMP_DAY_POST_MEDIA [V1]

Media (up to 6 photos + 3 videos) attached to a camp day post.

```
id           uuid PK
post_id      uuid FK → camp_day_posts
media_id     uuid FK → media_files
order_index  int
created_at   timestamptz
```

---

### 33. CAMP_DAY_POST_ATHLETE_TAGS [V1]

Athletes tagged in a camp day post (parents of tagged athletes get individual notification).

```
id           uuid PK
post_id      uuid FK → camp_day_posts
athlete_id   uuid FK → athletes
created_at   timestamptz
```

---

### 34. TOURNAMENTS [V1]

```
id            uuid PK
team_id       uuid FK → teams
name          text NOT NULL
location      text
start_date    date
end_date      date
description   text
logo_url      text
created_at    timestamptz
updated_at    timestamptz
```

---

### 35. TOURNAMENT_GAMES [V1]

```
id                uuid PK
tournament_id     uuid FK → tournaments
home_team_name    text
away_team_name    text
game_date         date
game_time         time
rink              text
location          text
score_home        int
score_away        int
status            text  -- 'scheduled' | 'in_progress' | 'final' | 'cancelled'
notes             text
created_at        timestamptz
updated_at        timestamptz
```

---

### 36. SESSIONS (extend existing) [V1]

**New columns to ADD:**
```
team_id       uuid FK → teams (nullable)
session_type  text  -- 'practice' | 'training' | 'skills' | 'video'
location_id   uuid FK → locations (nullable)
notes         text
```

---

### 37. DRILLS (extend existing) [V1]

**New columns to ADD:**
```
source_type  text  -- 'original' | 'ihs_import' | 'social_import'
source_url   text  -- original URL if imported
```

---

### 38. PLAYS (Playbook) [V1]

```
id              uuid PK
coach_id        uuid FK → profiles
title           text NOT NULL
description     text
diagram_url     text
category        text  -- 'offense' | 'defense' | 'special_teams' | 'neutral_zone'
tags            text[]
is_template     boolean default false
created_at      timestamptz
updated_at      timestamptz
```

---

### 39. PRIVATE_SERIES [V1]

Named private lesson packages (e.g. "5-Session Power Skating Series").

```
id                  uuid PK
coach_id            uuid FK → profiles
athlete_id          uuid FK → athletes
parent_user_id      uuid FK → profiles
name                text NOT NULL
description         text
total_sessions      int
price_type          text  -- 'per_session' | 'flat_fee'
price               decimal
total_amount        decimal  -- auto-calculated
status              text  -- 'draft' | 'published' | 'active' | 'completed' | 'cancelled'
payment_status      text  -- 'unpaid' | 'paid'
stripe_payment_intent_id text
created_at          timestamptz
updated_at          timestamptz
```

---

### 40. PRIVATE_LESSONS [V1]

Individual private sessions — standalone or linked to a series.

```
id                       uuid PK
coach_id                 uuid FK → profiles
athlete_id               uuid FK → athletes
parent_user_id           uuid FK → profiles
private_series_id        uuid FK → private_series (nullable)
location_id              uuid FK → locations (nullable)
date                     date NOT NULL
start_time               time NOT NULL
duration_minutes         int NOT NULL
price                    decimal
status                   text  -- 'requested' | 'confirmed' | 'completed' | 'cancelled'
payment_status           text  -- 'unpaid' | 'paid' | 'included_in_series'
stripe_payment_intent_id text
notes                    text
created_at               timestamptz
updated_at               timestamptz
```

---

### 41. MEDIA_FILES [V1]

Central media library for all uploaded videos and images.

```
id                uuid PK
uploaded_by       uuid FK → profiles
title             text
description       text
file_url          text NOT NULL
thumbnail_url     text
file_type         text  -- 'video' | 'image'
duration_seconds  int
file_size_bytes   bigint
storage_path      text  -- Supabase Storage path
is_public         boolean default false
is_shared         boolean default false  -- parent can see (RLS enforced)
created_at        timestamptz
updated_at        timestamptz
```

---

### 42. SESSION_MEDIA [V1]

Links media to sessions.

```
id          uuid PK
session_id  uuid FK → sessions
media_id    uuid FK → media_files
order_index int default 0
created_at  timestamptz
```

---

### 43. MEDIA_ATHLETE_TAGS [V1]

Tag athletes in session videos — tagged athlete's parent gets individual notification.

```
id                uuid PK
media_id          uuid FK → media_files
athlete_id        uuid FK → athletes
tagged_by         uuid FK → profiles
timestamp_seconds int  -- optional: when in video
created_at        timestamptz
```

---

### 44. ATHLETE_PROGRAM_ENROLLMENTS [V1]

Parent self-enrollment in dryland training programs.

```
id                   uuid PK
athlete_id           uuid FK → athletes
training_program_id  uuid FK → training_programs
enrolled_by          uuid FK → profiles  -- parent
training_days        text[]  -- e.g. ['monday', 'wednesday', 'friday']
start_date           date
status               text  -- 'active' | 'paused' | 'completed'
enrolled_at          timestamptz
completed_at         timestamptz
created_at           timestamptz
```

---

### 45. SUBSCRIPTIONS (rebuild) [V1]

Drop old table, recreate with full Stripe fields.

```
id                       uuid PK
user_id                  uuid FK → profiles UNIQUE
plan                     text  -- 'parent' | 'team_coach' | 'elite_coach' | 'academy'
status                   text  -- 'trialing' | 'active' | 'past_due' | 'cancelled'
billing_interval         text  -- 'monthly' | 'annual'
amount                   decimal
stripe_subscription_id   text
stripe_price_id          text
current_period_start     timestamptz
current_period_end       timestamptz
trial_start              timestamptz
trial_end                timestamptz
is_founding_member       boolean default false
cancelled_at             timestamptz
created_at               timestamptz
updated_at               timestamptz
```

---

### 46. TRANSACTIONS [V1]

All money movement (camp registrations, private lessons).

```
id                       uuid PK
payer_id                 uuid FK → profiles
payee_id                 uuid FK → profiles
camp_registration_id     uuid FK → camp_registrations (nullable)
private_lesson_id        uuid FK → private_lessons (nullable)
private_series_id        uuid FK → private_series (nullable)
gross_amount             decimal NOT NULL
platform_fee             decimal NOT NULL  -- 1.5% PXF fee
stripe_processing_fee    decimal  -- ~2.9% + $0.30
net_amount               decimal NOT NULL
stripe_payment_intent_id text
stripe_transfer_id       text  -- Stripe Connect payout to coach
status                   text  -- 'pending' | 'completed' | 'refunded' | 'failed'
created_at               timestamptz
```

---

### 47. COACH_VERIFICATIONS [V1]

Checkr background check status per coach.

```
id                   uuid PK
coach_id             uuid FK → profiles UNIQUE
checkr_candidate_id  text
checkr_report_id     text
status               text  -- 'pending' | 'consider' | 'clear' | 'suspended'
submitted_at         timestamptz
cleared_at           timestamptz
expires_at           timestamptz  -- annual renewal
created_at           timestamptz
updated_at           timestamptz
```

---

### 48. MESSAGES [V1]

Team broadcasts and direct messages.

```
id              uuid PK
sender_id       uuid FK → profiles
team_id         uuid FK → teams (nullable — team broadcast)
camp_id         uuid FK → camps (nullable — camp group message)
recipient_id    uuid FK → profiles (nullable — direct message)
body            text NOT NULL
message_type    text  -- 'team' | 'camp' | 'direct' | 'announcement'
channels        text[]  -- ['push', 'email', 'sms'] for broadcasts
created_at      timestamptz
```

---

### 49. MESSAGE_READS [V1]

```
id          uuid PK
message_id  uuid FK → messages
user_id     uuid FK → profiles
read_at     timestamptz NOT NULL
```

---

### 50. NOTIFICATIONS [V1]

Push notification log.

```
id          uuid PK
user_id     uuid FK → profiles
type        text  -- 'message' | 'camp_registration' | 'game_reminder' | 'payment' | 'evaluation' | 'media_tag' | 'rsvp_reminder'
title       text
body        text
data        jsonb  -- deep link data (screen, entity id)
read_at     timestamptz
sent_at     timestamptz
created_at  timestamptz
```

---

### 51. USER_PUSH_TOKENS [V1]

Expo push notification tokens per device.

```
id           uuid PK
user_id      uuid FK → profiles
token        text NOT NULL
device_type  text  -- 'ios' | 'android'
created_at   timestamptz
updated_at   timestamptz
```

---

### 52. COMBINE_TEST_RESULTS [V2]

PXF Combine data per athlete per hardware test session. UI shell is V1, real data is V2.

```
id               uuid PK
athlete_id       uuid FK → athletes
category         text  -- 'speed_power' | 'explosiveness' | 'shot_power' | 'shot_speed' | 'agility' | 'recovery'
hardware_source  text  -- 'resistance_trainer' | 'force_plate' | 'shot_plate' | 'speed_gates' | 'manual' | 'apple_health'
score            decimal
raw_data         jsonb  -- full sensor output
tested_at        timestamptz
created_at       timestamptz
```

---

## STORAGE BUCKETS (Supabase Storage)

| Bucket | Contents | Access |
|---|---|---|
| `avatars` | Profile photos | Public read |
| `team-logos` | Team logos | Public read |
| `camp-banners` | Camp banner images | Public read |
| `session-media` | Practice videos and images | Private (RLS — coach and tagged athlete's parent) |
| `drill-media` | Drill diagrams and videos | Private (RLS — coach only) |
| `play-diagrams` | Playbook drawings | Private (RLS — coach only) |
| `camp-day-photos` | Daily camp update posts | Private (RLS — registered parents only) |
| `health-forms` | Medical clearance document uploads | Private (RLS — owner/manager/coach only) |
| `waivers` | Signed waiver PDFs | Private (RLS — coach and parent who signed) |
| `ice-time-contracts` | PDF contracts uploaded for AI import | Private (RLS — coach only) |

---

## SUBSCRIPTION TIER ENFORCEMENT

Limits enforced at the application layer:

| Plan | Teams | Staff | Camps | Privates | Transactions |
|---|---|---|---|---|---|
| Parent | 0 | 0 | 0 | 0 | N/A |
| Team Coach | 3 | 1 | None | None | N/A |
| Elite Coach | 3 | 3 | Unlimited | Unlimited | 1.5% fee |
| Academy | Unlimited | Unlimited | Unlimited | Unlimited | 1.5% fee |

---

## KEY SECURITY RULES (RLS)

All tables have RLS enabled. Critical policies:

- **athlete_health_forms** — `SELECT` restricted to coach_id, team manager, or org owner. Parents NEVER read other athletes' records.
- **transactions / financials** — `SELECT` restricted to the payee (coach) or payer (parent). Staff coaches see only their own `session_rate` and `My Earnings` — not total revenue.
- **media_files** — `SELECT` requires either: uploader_id = user, OR athlete is tagged AND athlete's parent_user_id = user, OR is_shared = true.
- **camp_day_posts** — `SELECT` restricted to coaches on the camp OR parents with a confirmed camp_registration for that camp.
- **private_lesson bookings** — `owner_id` on booking requests must resolve to a valid Elite Coach — parents cannot spoof coach IDs.
- **combine_test_results** — Athlete's parent_user_id can read their own child's data. Public share requires explicit `is_public` flag on athlete profile.

---

## MIGRATION ORDER

Run SQL in this sequence to avoid FK errors:

```
1.  organizations
2.  profiles (ALTER)
3.  locations
4.  teams
5.  athletes
6.  authorized_caregivers
7.  team_members
8.  team_staff
9.  athlete_stats
10. skill_progression_levels
11. athlete_progress_levels
12. athlete_evaluations
13. athlete_skill_ratings
14. athlete_session_notes
15. team_events
16. event_rsvps
17. attendance_records
18. event_duties
19. game_lineups
20. game_plans
21. ice_times
22. camps
23. camp_form_fields
24. camp_sessions
25. camp_registrations
26. camp_registration_responses
27. camp_waivers
28. athlete_health_forms
29. check_ins
30. camp_day_posts
31. camp_day_post_media
32. camp_day_post_athlete_tags
33. discount_codes
34. payment_installments
35. tournaments
36. tournament_games
37. sessions (ALTER)
38. drills (ALTER)
39. plays
40. media_files
41. session_media
42. media_athlete_tags
43. athlete_program_enrollments
44. private_series
45. private_lessons
46. subscriptions (DROP + recreate)
47. transactions
48. coach_verifications
49. messages
50. message_reads
51. notifications
52. user_push_tokens
53. combine_test_results
```

---

## SUMMARY COUNT

| Category | Tables |
|---|---|
| Core auth & profiles | 2 |
| Organizations & teams | 4 |
| Athletes & caregivers | 7 |
| Scheduling & events | 6 |
| Camps & registration | 10 |
| Tournaments | 2 |
| Training & playbook | 5 |
| Media | 5 |
| Private lessons | 2 |
| Payments & subscriptions | 3 |
| Communication | 4 |
| Combine (V2) | 1 |
| **Total** | **51** |
