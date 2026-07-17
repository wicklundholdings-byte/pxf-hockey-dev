# PXF Hockey — Big Ideas & Future Roadmap

---

## SOFTWARE

### AI Assisted Drill Builder
- Coach uploads a video clip (Instagram, TikTok, phone camera, any source)
- AI analyzes the clip and auto-generates: drill name, obstacle layout on ice rink diagram, route/path arrows showing player movement, written description, skill tags, estimated duration
- Coach reviews and tweaks everything before saving to Playbook
- Depends on rink diagram builder (SVG-based, drag and drop editing)
- Tech stack: video upload → Supabase storage → OpenAI Vision API → auto-populate drill fields → SVG rink diagram with AI-generated paths
- Genuine differentiator — no other hockey software has this

---

## HARDWARE PRODUCTS

### PXF Slip (Current — Available Now)
- Synthetic ice slip board for shooting and skating training
- First product to market, generating initial revenue

### GameIQ POD (1 Year Out)
- Smart training pod for game intelligence and reaction training
- See spec sheet for details

### PXF Resistance Trainer (Ice Sprint System)
- Similar concept to 1080 Sprint — attaches to the boards on ice
- Measures and tracks: speed, quickness, acceleration, power output
- Data syncs to athlete profile in the PXF app
- World ranking system — athletes ranked globally among all PXF users by metric
- Profile shows personal bests, progress over time, and world ranking position
- Massive engagement and retention driver — athletes compete against each other

**Manufacturing Plan**
- First run: 100 units
- Pre-order campaign funds production before a single unit is built
- Three pre-order tiers:
  - Founding 10: $999 — first 10 orders only, named as founding members
  - Early Bird: $1,299 — next 40 orders
  - Pre-order: $1,499 — remaining units
- Full retail price after launch: $1,750
- Need 50-65 pre-orders to fully fund the production run

**Unit Economics (100 units)**
- Cost to manufacture 100 units: $65,000–$85,000
- Pre-order revenue (50 units avg $1,299): ~$65,000
- Full price revenue (50 units at $1,750): ~$87,500
- Total revenue: ~$155,000–$165,000
- Profit after costs: ~$70,000–$90,000 → funds next run of 250-500 units

**Pre-order Requirements Before Launch**
- Working prototype on ice with video proof
- Simple landing page: video, specs, pricing tiers, pre-order button (Stripe)
- Clear 6-8 month estimated ship date
- Refund policy
- Target first buyers: hockey training facilities and rinks (10 facilities × 2-3 units = 50 pre-orders)

**Patent note**
- File provisional patent before showing prototype publicly (~$1,500, 12 months patent pending)
- Research 1080 Motion patents — ice/board-mounted hockey-specific application may not be covered

### PXF Speed Gates (4-Gate Timing System)
- Set of 4 wireless timing gates that connect to each other and the PXF app
- Tracks sprint speed, acceleration, and distance — feeds directly into athlete Combine Profile
- Key innovation: **self-calibrating distance** — gates measure the exact distance between themselves so every test at every rink in the world is perfectly comparable regardless of rink markings

**The problem it solves**
Rink blue lines and red lines are not always the same distance apart. Speed tests done at different rinks using rink markings as reference points produce non-comparable results. PXF Speed Gates eliminate this — the gates know exactly how far apart they are, every time.

**How it works**
- Gate 1 is the master unit — connects to the PXF app via Bluetooth
- Gates 2, 3, 4 connect to Gate 1 via UWB (Ultra-Wideband) mesh — accurate to within 2cm
- Coach opens app, selects the test (e.g. "20-Foot Sprint")
- Gates light up RED while being positioned
- As distance approaches the target, lights pulse faster
- When gates are at exactly the correct distance apart, lights turn GREEN — ready to test
- Athlete breaks the infrared beam at Gate 1 to start the timer
- Breaking the beam at the final gate stops the timer
- Results sync instantly to the athlete's PXF profile

**Standard test distances (same worldwide for valid comparison)**
- 10-foot — first-step explosion
- 20-foot — short acceleration
- 30-foot — extended acceleration
- 40-foot — full speed burst (hockey equivalent of the 40-yard dash)
- Shuttle run — timed circuit between two gates, multiple reps

**Hardware**
- UWB ranging module (DW1000 or similar) in each gate for precise gate-to-gate distance measurement
- Infrared photoelectric beam sensor at each gate for timing triggers
- RGB LED strip on each gate — red/green status, visible from across the rink
- ESP32 microcontroller per gate
- Rechargeable battery, 10+ hour life
- Weatherproof and ice-safe housing (can take a puck hit)
- Tripod/spike base for ice and off-ice use

**App integration**
- Test setup wizard: select test → position gates → confirm green → run
- Live timer display on phone screen during the test
- Instant split times between each gate (Gate 1→2, 2→3, 3→4)
- Results saved to athlete profile automatically
- Agility tab in Combine Profile filled by Speed Gate data

**Circuit Mode — Smart Slip Integration**
- PXF Slips get a UWB beacon chip embedded — they join the same positioning network as the Speed Gates
- App shows a top-down rink diagram with exact target positions for every gate and slip
- As coach positions each slip, its dot on the diagram moves in real time
- Dot turns green when slip is at the exact correct position
- All dots must be green before the circuit timer is allowed to start
- If a slip is knocked or moved mid-run, app flags it: "Slip 3 moved — retest required"
- Every PXF circuit has standardized named dimensions (e.g. "Circuit A: 4 slips, 6ft spacing, figure-8") — results globally comparable
- Coaches can create custom circuits in the app and save them to their Playbook

**Product evolution**
- PXF Slip evolves from passive training tool to active node in the timing network
- Future Slips ship with chip embedded — existing owners can upgrade to Smart Slips
- Speed Gates + Smart Slips sold as a bundle — significantly higher average order value
- The network of gates + slips becomes a full on-ice performance testing ecosystem

**Pricing**
- 4-gate set: $1,499–$1,999
- Smart Slip upgrade chip kit: $49–$99 per slip
- Gates + 6 Smart Slips bundle: $1,999–$2,499
- Same pre-order strategy as Resistance Trainer when ready

**Patent note**
- The self-calibrating distance confirmation system (UWB ranging + LED color feedback + app-guided positioning) is a novel combination worth a provisional patent filing
- Smart Slip UWB positioning integrated into a timed circuit system is also patentable — file both together

### PXF Force Plate
- Similar to commercial force plates used in elite sport science
- Measures jumping power, explosiveness, balance, and ground force production
- Data syncs to athlete profile
- Tracks progress over time, benchmarks against age group and skill level

### PXF Shot Plate (Shooting Force Analyzer)
- Force plate designed specifically for hockey shooting
- Synthetic ice surface (UHMWPE) attaches over the plate
- Dual sensor system:
  - **Foot Force Plate** — 4 load cells measuring lower body force, weight transfer, and center of pressure through the shot
  - **Blade Contact Strip** — pressure sensor embedded in synthetic ice at the shooting zone, captures stick force, contact duration, and timing
- Samples at 1000Hz minimum to capture full shot sequence: backswing → load → release → follow-through
- Force direction breakdown: downward (into ice), forward (drive), rotational (hip/core engagement)
- Shot type classification by force signature: wrist shot vs snap shot vs slap shot
- Force curve overlaid on video frame-by-frame
- Heat map showing center of pressure movement through the shot
- **Shot Power Score** — composite score ranking athlete globally among all PXF users

**NHL Benchmark Data (key differentiator)**
- Partner with 20-30 NHL players across shot styles (power shooters, quick release, one-timers)
- Capture full force profiles per player per shot type
- Every athlete compares their force curve directly to NHL benchmarks
- App shows: "Your peak force release is 45ms later than average NHL wrist shot"
- App shows: "Your downward force at release is 18% of NHL average — weight not transferring through the puck"
- "Your shot most closely resembles [player]'s force signature"
- NHL data is the product — similar to what Rapsodo did for baseball with MLB pitcher benchmarks
- Long-term: named player partnerships — "Train your shot against the pros"

**Pricing**
- Home Unit: $2,499
- Facility Unit: $7,500–$12,000 (includes multi-player tracking dashboard)
- Elite Training Center: custom pricing

**Tech stack**
- ESP32 microcontroller with BLE + WiFi
- HX711/ADS1256 load cell amplifiers
- Rechargeable battery, 8-10hr life
- Streams real-time data to PXF app via Bluetooth LE
- Bill of materials at scale: $150–$250 per unit

**Patent note**
- Dual sensor system (foot plate + blade contact strip) with shot phase detection and force curve video overlay is a novel combination — file provisional patent before engaging manufacturers (~$1,500, gives 12 months patent pending protection)

---

## PXF COMBINE — Athlete Performance Profile System

The thread that ties every hardware product together. A standardized performance testing profile for every athlete on the platform — like the NHL Combine or NFL Scouting Combine but accessible to any player at any level, tracked across their entire career.

**The concept**
Every athlete has a Combine Profile on their PXF account. Coaches, parents, scouts, and the athlete themselves can see a complete performance snapshot updated every time they test. As they train and retest, the profile shows improvement over time and compares them globally.

**Combine test categories and data sources**

| Category | Metric | Hardware |
|---|---|---|
| Speed & Power | First-step acceleration, top speed, backward speed, power per stride | PXF Resistance Trainer |
| Jumping & Explosiveness | Vertical jump height, peak force, rate of force development, landing mechanics | PXF Force Plate |
| Shot Power | Peak shot force, blade contact timing, force direction, shot type classification | PXF Shot Plate |
| Shot Speed | Puck velocity (mph/kmh) by shot type | Radar gun integration |
| Agility & Circuits | Timed skating circuits, edge-to-edge, figure-8 | Speed gates integration |
| Strength | Force production benchmarks | PXF Force Plate |

**Profile features**
- Overall **PXF Combine Score** — composite of all tested categories, globally ranked
- Individual category scores with percentile ranking by age group and position
- Historical timeline — every test logged with date, so athletes see their development arc
- Compare to NHL benchmarks (once we have that data from pro partnerships)
- Share profile as a public link — athletes can send to scouts, coaches, teams
- Coach dashboard shows all their athletes' combine scores side by side

**The scouting angle**
Long-term this becomes a scouting tool. A bantam player with elite combine numbers gets visibility they'd never otherwise have. Scouts, junior teams, and college programs could browse the PXF combine database to find talent. This is a massive value-add that no platform currently offers at the grassroots level.

**Revenue implications**
- Drives hardware sales — athletes want to test every category, need the hardware
- Drives platform subscriptions — coaches pay to see their full roster's combine data
- Future: premium scout access subscription ($99-299/mo) to browse the global database
- Future: verified testing events at rinks — PXF-certified combine days where results are officially logged

**Build order**
Build the profile UI shell first (empty metric cards with "test pending" states). Each hardware product fills in its section when that product ships. The profile looks more complete and valuable with every new hardware launch.

---

## LANDING PAGE COPY — PXF Resistance Trainer

---

**PXF RESISTANCE TRAINER**
*Train like a pro. Know your numbers.*

The first resistance trainer built specifically for ice hockey. Mounts to any rink board in seconds. Measures your speed, quickness, acceleration, and power on every rep — and ranks you against every athlete in the PXF network worldwide.

**What it measures**
- First-step explosion off the mark
- Top-end skating speed
- Backward skating power
- Edge-to-edge quickness
- Power output per stride

**Your numbers. On your profile. Against the world.**
Every session syncs directly to your PXF athlete profile. See your personal bests, track progress over time, and see exactly where you rank globally among all PXF athletes in your age group.

**Built for serious players. Priced for real people.**
Commercial resistance trainers cost $15,000–$30,000. The PXF Resistance Trainer delivers the same data at a fraction of the price — designed from the ground up for hockey, not adapted from another sport.

---

🏒 Founding Member — $999 (10 units only — named as founding members)
⚡ Early Bird — $1,299 (next 40 units)
📦 Pre-Order — $1,499 (remaining units)

Full retail price after launch: $1,750
Ships in 6–8 months | Full refund if we don't deliver

[RESERVE YOUR UNIT →]

---

---

## CONTENT PRODUCTION

### Dryland Video Content — Production Vision
- **Garage home setup:** TV mounted on wall, iPad on wall mount. Athlete walks in, starts session on iPad, casts to TV. Follows along like a personal trainer in the room. Clean, aspirational, exactly what hockey parents spend money on.
- **Lighting:** 2–3 LED panels make a garage look like a professional studio. Good lighting is 80% of the production quality.
- **Consistent background:** Same wall, same equipment every shoot so the full library looks cohesive.
- **Branding:** Athlete always in PXF gear. iPad and TV visible in frame occasionally — product placement that also markets the app.
- **Field/ice setup:** iPad on adjustable stand for on-ice and outdoor dryland sessions.

### PXF Coach Stand — Product Idea
A PXF-branded iPad stand designed specifically for rink and outdoor field use:
- Heavy-duty adjustable stand (works on ice, turf, concrete, gym floor)
- Built-in shade visor — makes iPad screen readable in direct sunlight
- Integrated battery pack mount — power bank attaches to the stand so iPad never dies mid-session
- Anti-glare screen protector included
- Otterbox-compatible design
- Folds flat for transport in a hockey bag

**Why it works:**
iPads in direct sun overheat above 35°C and become unreadable from glare. No good solution exists for coaches who want to run dryland sessions outside. This solves both problems in one branded product coaches would buy alongside the app subscription.

**Pricing estimate:** $149–199 retail. Bundle with Elite Coach subscription at a discount.

---

## HOCKEY SCHOOLS MARKETPLACE

A phased build-out of the Hockey Schools discovery and monetization layer. Builds on top of Elite Coach accounts.

**Phase 1 — Foundation (now)**
Hockey Schools are Elite Coach accounts. Parents find them through word of mouth or a shared link. Basic public profile showing camps, instructors, and booking requests. No discovery layer yet.

**Phase 2 — Discovery (once meaningful user base exists)**
Add a "Find a Hockey School" browse screen in the parent app. Schools listed by location and specialty. Organic ranking based on ratings and session volume. Parents leave star ratings and short reviews after camps and private sessions complete. Ratings accumulate publicly on the school's profile.

**Phase 3 — Featured Placement Monetization**
Schools pay for featured placement at the top of browse results in their city or age group. New schools with no rating history can buy visibility before organic ranking kicks in. Established schools can buy placement in adjacent markets to expand their reach.

**Ranking algorithm:**
- Overall star rating (parent reviews after camps and privates)
- Session volume (total sessions completed on PXF)
- Response rate (how quickly coach responds to booking requests)
- Completion rate (sessions completed vs cancelled)
- Featured placement (paid) overrides organic rank in sponsored slots only

**Featured placement pricing (estimated):**
- $99–199/mo per market (city or region)
- Schools already paying $49.99/mo subscription — featured placement is a clear upsell with measurable ROI (2-3 camp registrations covers the cost)
- Major markets (Toronto, Calgary, Boston, Chicago, Minneapolis) will command premium pricing

**Why this works:**
Parents are already in the app. Hockey schools are already paying for Elite Coach. The marketplace layer monetizes the network effect that builds naturally as both sides grow. No new infrastructure needed — just a browse screen, a rating system, and a featured placement toggle.

---

## NOTES
- Hardware products create a closed ecosystem: PXF hardware → PXF app → PXF data → world rankings → coach platform
- Data from all hardware products lives on the athlete profile and is visible to their coach
- World ranking system across all hardware products drives virality and retention
- Long-term: licensing hardware data for hockey analytics and scouting platforms
