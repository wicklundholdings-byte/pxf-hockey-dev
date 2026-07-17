# PXF Hockey — Design Audit Brief
### Prepared for Anti Gravity
*Confidential — June 2026*

---

## Who We Are

PXF Hockey is a hockey coaching and athlete development platform built for the North American hockey market. We're a startup in active development — the product exists, it works, and we're now in fine-tuning mode before our first real coach users go live.

The founder is Evan Wicklund, who runs Pond Sessions (pondsessions.com), a real hockey training business that currently uses Citrus for camp registration. PXF Hockey is being built to replace every tool a hockey coach uses — and eventually every tool a hockey association uses — with one cohesive platform.

**Tagline:** POWER. FLOW. PERFORMANCE.

---

## What We've Built

Two connected products:

**1. Mobile App (React Native / Expo)**
A coaching and parent app available on iOS and Android. Coaches manage their teams, camps, and athletes. Parents track their kids, RSVP to sessions, and receive updates from coaches.

**2. Web Portal (React, Supabase)**
A full desktop management dashboard for Elite Coach accounts — the coaches running hockey schools/businesses with multiple staff, locations, and revenue streams.

**3. Public Booking Page**
A public-facing page auto-generated for every Elite Coach (e.g. `pxfhockey.com/book/coach-maddox`). Parents browse camps, teams, privates, and register. This replaces third-party tools like Citrus, Mindbody, and similar platforms.

---

## User Tiers

**Coaches (3 tiers):**

| Tier | Price | Description |
|---|---|---|
| Association Coach | $14.99/mo | Coaches under an association — team management only |
| Team Coach | $24.99/mo | Independent coaches running 1-3 teams |
| Elite Coach | $49.99/mo | Coaches running a full hockey school — camps, privates, revenue, staff, locations |

**Parents:** $7.99/mo — dryland training programs, athlete profile, team schedule, camp access

**Associations:** Free during beta — multi-team umbrella with admin dashboard (built in v2)

---

## The Primary User We Need Audited

**Elite Coach** — this is the most complex user and our primary revenue driver. They use both the mobile app and the web portal. They are:

- Independent hockey skills coaches or hockey school operators
- Running 1-5 staff coaches, 2-6 camps per year, 10-50 athletes in private training
- On the ice several times a week, managing their business from their phone
- Sending their public booking link to parents via Instagram and text

This user needs the platform to feel like a premium business tool — not like a generic SaaS dashboard.

---

## Current State of the Product

The product is built in **Lovable** (a rapid prototyping platform connected to Supabase). It is functional and visually designed but we are not satisfied with the design quality and UX consistency. We've taken design inspiration from Citrus, Mindbody, and Glofox and built a dark-themed product in teal/green.

**What's working well:**
- Overall dark theme and teal color system — feels hockey-appropriate
- The public booking page structure (hero, camps, teams, privates, gallery, testimonials)
- Camp card design with skill level badges and urgency indicators
- The web portal two-column dashboard layout
- Bottom navigation on mobile (Home, Schedule, Teams, Athletes, Inbox)

**What we know needs work:**
- The Elite Coach mobile dashboard is too busy — trying to show too much at once
- The web portal dashboard needs to be simplified — currently has too many widgets
- The Operations section on mobile is underdeveloped
- Navigation consistency between web and mobile needs alignment
- Several screens are missing back buttons
- The overall visual design is functional but not premium enough for the $49.99/mo price point

---

## Access

**Mobile App (Lovable preview):**
The app is accessible via a Lovable preview link — Evan will provide direct access.

Use the dev test account switcher (bottom right) to toggle between:
- **Elite Coach** — primary audit target
- **Team Coach** — secondary audit target
- **Assoc. Admin** — lower priority for now
- **Parent** — review the parent experience as a secondary

**Web Portal:**
`https://preview--puck-palace-coach.lovable.app`

**Public Booking Page:**
`https://preview--puck-palace-coach.lovable.app/book/coach-maddox`

---

## What We're Asking For

### Phase 1 — Cold Audit (Priority)

Go through the Elite Coach experience cold — no briefing beyond this document. Evaluate as a first-time hockey coach who just signed up for a $49.99/mo subscription.

We want honest answers to:

1. **Does the dashboard give me what I need in the first 5 seconds?** Or does it overwhelm?
2. **Can I find what I'm looking for without thinking?** Navigation audit — web and mobile separately.
3. **Does this feel worth $49.99/mo?** Visual quality, polish, confidence it projects.
4. **Where do I get confused or stuck?** Any friction point, missing back button, dead end.
5. **What's the single biggest visual design problem?** Be direct.
6. **What's the single biggest UX problem?** Be direct.

### Phase 2 — Specific Screen Feedback

After the cold audit, we'll ask for detailed feedback on specific screens one section at a time. We'll drive that process — you respond to what we send.

### Delivery Format

We prefer:
- **Annotated screenshots** — mark up directly on the screen what's working and what isn't
- **Short written notes per section** — 3-5 bullet points, not a 20-page report
- **Priority ranking** — what to fix first vs what's nice to have

We have a session with our AI product partner (Claude via Anthropic's Cowork) who will synthesize your feedback and convert it directly into build instructions. The cleaner and more specific your feedback, the faster it becomes a shipped fix.

---

## What's Already Decided — Do Not Redesign

These decisions are locked. Feedback on the following will not be actioned:

- **Dark theme** — not changing. Hockey is a dark sport. The aesthetic is intentional.
- **Teal/green accent color** — brand color, locked.
- **Bottom navigation structure on mobile** — Home · Schedule · Teams · Athletes · Inbox. Locked.
- **Web portal sidebar navigation** — we are actively refining this but the sidebar-left layout is staying.
- **The public booking page concept** — replacing Citrus is a core product decision.
- **Subscription tier structure** — not a design question.

Everything else is fair game.

---

## What We're NOT Looking For

- A full rebrand or concept redesign
- New logo or color palette suggestions
- Competitive analysis (we've done this)
- A proposal to rebuild from scratch

We want surgical improvements to what exists, delivered in a format that can be immediately actioned.

---

## Working Relationship

The intended working model:

1. **Anti Gravity** conducts audits and delivers annotated feedback in agreed format
2. **Evan** shares feedback into the Cowork session
3. **Claude (AI product partner)** synthesizes, prioritizes, and converts to build prompts
4. **Lovable** builds the changes
5. **Anti Gravity** reviews the result and gives a next round of feedback

This is an iterative loop, not a one-time engagement. We move fast — feedback to shipped fix can happen within hours. We need a partner who can keep pace with that cadence.

---

## One More Thing

The founder runs his own hockey school (Pond Sessions) and is an active hockey coach. He is the primary user of his own product. Feedback that doesn't make sense for a real coach on the ice will be pushed back on. Ground all feedback in the reality of how coaches actually work — not in abstract UX theory.

---

*Questions? Contact Evan directly. He'll loop in the appropriate parties.*
