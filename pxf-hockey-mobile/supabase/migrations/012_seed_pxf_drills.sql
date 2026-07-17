-- ============================================================
-- PXF Hockey — Migration 012: Add description column + Seed PXF Library Drills
--
-- 1. Adds drills.description TEXT (full step-by-step drill text).
--    short_description = 1-line summary; description = full detail.
--    playbook.tsx queries 'description' — this makes it functional.
--
-- 2. Inserts the base PXF drill library (coach_id = NULL,
--    is_template = TRUE, is_published = TRUE). These appear
--    in the Playbook Library tab for all coaches.
--
-- Drills reference drill_categories seeded in 002_schema_updates.
-- ============================================================

-- Add full description column if not present
ALTER TABLE drills ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
DECLARE
  cat_skating        UUID;
  cat_puck_control   UUID;
  cat_passing        UUID;
  cat_shooting       UUID;
  cat_defense        UUID;
  cat_goalie         UUID;
  cat_systems        UUID;
  cat_conditioning   UUID;
BEGIN
  SELECT id INTO cat_skating      FROM drill_categories WHERE title = 'Skating'      LIMIT 1;
  SELECT id INTO cat_puck_control FROM drill_categories WHERE title = 'Puck Control' LIMIT 1;
  SELECT id INTO cat_passing      FROM drill_categories WHERE title = 'Passing'      LIMIT 1;
  SELECT id INTO cat_shooting     FROM drill_categories WHERE title = 'Shooting'     LIMIT 1;
  SELECT id INTO cat_defense      FROM drill_categories WHERE title = 'Defense'      LIMIT 1;
  SELECT id INTO cat_goalie       FROM drill_categories WHERE title = 'Goalie'       LIMIT 1;
  SELECT id INTO cat_systems      FROM drill_categories WHERE title = 'Systems'      LIMIT 1;
  SELECT id INTO cat_conditioning FROM drill_categories WHERE title = 'Conditioning' LIMIT 1;

  -- ── SKATING ─────────────────────────────────────────────────────────────────
  INSERT INTO drills (coach_id, category_id, title, short_description, description,
    difficulty_level, age_group, duration_minutes, equipment_needed, coaching_points,
    is_template, is_published)
  VALUES
  (
    NULL, cat_skating,
    'Figure-8 Edge Work',
    'Tight figure-8 loops to build inside/outside edge control.',
    'Set up two cones 8 feet apart. Players skate tight figure-8 loops around the cones, alternating inside and outside edges on each turn. Focus on clean weight transfer and knee bend through the apex of each loop.',
    'Beginner', 'U9+', 8,
    ARRAY['2 cones'],
    ARRAY['Push off inside edge at each turn', 'Keep knees bent — do not stand up through the turn', 'Look ahead, not down at feet', 'Drive off the toe on exit'],
    TRUE, TRUE
  ),
  (
    NULL, cat_skating,
    'Blue-to-Blue Crossovers',
    'Forward and backward crossovers between the blue lines.',
    'Players start at one blue line and skate forward crossovers to the other blue line, pivot, then return with backward crossovers. Repeat x5 sets. Focus on over-under crossover mechanics and maintaining speed through the stride.',
    'Intermediate', 'U11+', 10,
    ARRAY['Ice surface'],
    ARRAY['Cross the outside leg fully over — do not just shuffle', 'Maintain low crouch position', 'Use arm swing to generate momentum', 'On backward crossovers: push with the inside edge of the crossing leg'],
    TRUE, TRUE
  ),
  (
    NULL, cat_skating,
    '4-Corner Transition Skate',
    'Forward-to-backward pivots at all four corners.',
    'Set cones at all four corners of a zone. Players skate forward to first cone, pivot to backward, skate backward to second cone, pivot back to forward. Continue through all four corners. Focus is on tight, efficient pivots without losing speed.',
    'Intermediate', 'U13+', 12,
    ARRAY['4 cones'],
    ARRAY['Attack the pivot — do not slow down before it', 'Keep hips square on pivot initiation', 'Extend push leg fully through pivot', 'Use strong arm swing to help rotation'],
    TRUE, TRUE
  ),
  (
    NULL, cat_skating,
    'Explosive 10-Foot Bursts',
    'Short-area speed acceleration: 10-foot max-effort starts.',
    'Set two lines of tape 10 feet apart. Players start in an athletic stance, explode to the second line on coach''s whistle, stop hard, and immediately explode back. 6 reps = 1 set. Rest 60 seconds between sets. Purpose: develop first-step acceleration and stop-start power.',
    'Advanced', 'U13+', 12,
    ARRAY['Tape or cones'],
    ARRAY['Toes pointed out on first stride for maximum push angle', 'Drive arms aggressively — they power the legs', 'Head up, spine neutral', 'Stops should be explosive, not passive'],
    TRUE, TRUE
  ),

  -- ── PUCK CONTROL ────────────────────────────────────────────────────────────
  (
    NULL, cat_puck_control,
    'Stationary Stickhandling Circuit',
    'Three-station stationary stickhandling: wide, tight, and toe-to-toe.',
    'Three 3-minute stations: (1) Wide hands — large sweeping stickhandles side-to-side, (2) Tight hands — short rapid-fire handles close to the body, (3) Toe-to-toe — rolling puck from toe to toe of the blade. 30 sec rest between stations.',
    'Beginner', 'U9+', 12,
    ARRAY['Puck', 'Stick'],
    ARRAY['Soft hands — absorb the puck, don''t slap it', 'Eyes up (place tape on wall at eye level to train vision)', 'Top hand controls the puck — bottom hand is a guide', 'Relax grip pressure to 5/10'],
    TRUE, TRUE
  ),
  (
    NULL, cat_puck_control,
    'Cone Weave Deke Series',
    'Five-cone weave with a deke move at the final cone.',
    'Set 5 cones in a straight line, 4 feet apart. Players carry the puck through the weave at game speed, then execute a specific deke at the final cone (alternate: forehand-to-backhand, backhand tuck, or between-legs). Coach calls the deke at the start.',
    'Intermediate', 'U11+', 10,
    ARRAY['5 cones', 'Pucks'],
    ARRAY['Keep puck close to body through weave — small, controlled handles', 'Explode out of each gate at full speed', 'Head up before the deke — sell the read, not the move', 'Commit to the deke — hesitation kills effectiveness'],
    TRUE, TRUE
  ),
  (
    NULL, cat_puck_control,
    '1-on-1 Board Battle',
    'Two players battle for puck possession along the boards.',
    'Coach dumps puck into a corner. Two players race from the blue line and battle for possession. The player who wins possession must escape the corner and skate to the hash marks to score on an open net. Reset and repeat, switching sides.',
    'Intermediate', 'U13+', 15,
    ARRAY['Pucks', 'Net'],
    ARRAY['Body position first: get hip and shoulder on the opponent before touching the puck', 'Protect the puck with your body — wide base, low center of gravity', 'Use a reverse pivot to shield and escape', 'Quick escape after winning: accelerate immediately'],
    TRUE, TRUE
  ),

  -- ── PASSING ─────────────────────────────────────────────────────────────────
  (
    NULL, cat_passing,
    'Stationary Partner Passing',
    'Tape-to-tape passing with a partner from 15 feet.',
    'Partners stand 15 feet apart and make crisp tape-to-tape passes. Round 1: backhand receive, forehand pass. Round 2: forehand receive, backhand pass. Round 3: one-touch back. 2 minutes per round.',
    'Beginner', 'U9+', 8,
    ARRAY['Pucks', 'Partner'],
    ARRAY['Receive the puck softly — cushion it with the blade', 'Pass through the puck, not at it — follow through to the target', 'Lead the receiver''s skates on moving passes', 'Keep blade flat on ice on reception'],
    TRUE, TRUE
  ),
  (
    NULL, cat_passing,
    'Give-and-Go Rush',
    'Three-player give-and-go sequence into the offensive zone.',
    'Set up in a line with three players at the red line. Player 1 carries puck toward the blue line, passes to stationary player 2 on the wall, receives a return pass, then passes to player 3 crashing for a shot. Rotate positions after each rep.',
    'Intermediate', 'U11+', 12,
    ARRAY['Pucks', 'Net'],
    ARRAY['Make the pass before the defender reads it — decisive and early', 'The wall player receives and returns in one motion where possible', 'Player 3 times their crash to receive the puck in stride', 'Shooter should one-time or take only one touch'],
    TRUE, TRUE
  ),
  (
    NULL, cat_passing,
    'Saucer Pass Gate Drill',
    'Saucer passes through raised gate (stick or cone) from distance.',
    'Set up a stick or cone at 20 feet. Players take turns saucering the puck over the stick to a partner on the far side. Partner cushions and returns with a saucer. Increase distance each set: 20, 25, 30 feet.',
    'Advanced', 'U13+', 10,
    ARRAY['Pucks', 'Sticks as gates'],
    ARRAY['Release point is key: blade rolls through underneath the puck', 'Wrist rotates fully — forehand finishes palm-down', 'Trajectory = low arc, flat landing', 'Receiver should cushion immediately — saucers are harder to control'],
    TRUE, TRUE
  ),

  -- ── SHOOTING ────────────────────────────────────────────────────────────────
  (
    NULL, cat_shooting,
    'Wrist Shot from Static',
    'Isolated wrist shot mechanics from a stationary position.',
    'Players take 10 wrist shots from 3 different angles: (1) straight on from the slot, (2) left circle, (3) right circle. After each sequence, shift to the next position. Focus on mechanics — not just on shooting as many pucks as possible.',
    'Beginner', 'U9+', 10,
    ARRAY['Pucks (15+ per player)', 'Net'],
    ARRAY['Weight on back foot on load, transfer to front foot on release', 'Cup blade through the puck — don''t flick', 'Snap the wrists fully — top hand pulls, bottom hand pushes', 'Follow through points at the target, blade finishes high'],
    TRUE, TRUE
  ),
  (
    NULL, cat_shooting,
    'Off-the-Rush One-Timer',
    'One-timer practice from a cross-ice pass at the slot.',
    'Feeder stands at one hash mark with pucks. Shooter starts at far hash, skates toward the slot, and receives a cross-ice pass timed to their arrival. They one-time without stopping. 5 reps, then switch sides.',
    'Intermediate', 'U13+', 12,
    ARRAY['Pucks', 'Net', 'Feeder'],
    ARRAY['Read the pass early — position your body before the puck arrives', 'Open your hips to face the passer — do not stay square to the net', 'Weight on the back leg at load, explode forward through contact', 'Keep head up: pick your corner before the puck arrives'],
    TRUE, TRUE
  ),
  (
    NULL, cat_shooting,
    'Quick-Release Slot Shots',
    'Rapid-fire slot shots with minimal touches — less than 1 second from receive to release.',
    'Feeder at the half wall fires passes to a shooter stationary in the slot. Shooter must release in under 1 second from receiving the puck. 10 passes per set. Coach counts "one... two" — any shot released after "two" doesn''t count.',
    'Advanced', 'U15+', 10,
    ARRAY['Many pucks (20+)', 'Net', 'Feeder'],
    ARRAY['Pre-load your weight before the puck arrives', 'Catch and release in one fluid motion — the catch IS the backswing', 'Pick your corner BEFORE the pass: shoot to a pre-decided spot', 'Grip pressure: start light, snap hard at contact only'],
    TRUE, TRUE
  ),

  -- ── DEFENSE ─────────────────────────────────────────────────────────────────
  (
    NULL, cat_defense,
    'Gap Control Angle Drill',
    'Defenseman angles a forward toward the wall using proper gap.',
    'Forward starts at one blue line with puck; D-man starts at far blue line. Forward carries puck toward the D-man at 75% speed. D-man must maintain 1-stick-length gap while skating backward, then angle the forward into the boards at the hash marks.',
    'Intermediate', 'U13+', 12,
    ARRAY['Pucks'],
    ARRAY['Maintain 1 stick-length gap — close too fast and get beaten; too wide and lose the angle', 'Skate backward on the heels — weight forward allows quick pivots', 'Use the crossover glide to cut off angle — do not pivot until needed', 'At contact: lead with the hip and shoulder — NOT just the stick'],
    TRUE, TRUE
  ),
  (
    NULL, cat_defense,
    'D-Zone Coverage: 2-on-1 Reads',
    'Defenseman manages a 2-on-1 rush: covers the pass, not the carrier.',
    'Two forwards start at the red line; D-man starts at the top of their circle. Forwards carry down in a 2-on-1. D-man must take away the pass lane and force the shooter, while goalie plays the rush. After shot, D-man pivots to clear the rebound.',
    'Intermediate', 'U13+', 15,
    ARRAY['Pucks', 'Net', 'Goalie (or cone in net)'],
    ARRAY['Never cheat toward the puck carrier — play the middle of the lane', 'Stick in the passing lane at all times', 'Force the carrier to the outside, not the middle', 'After the shot: pivot and front the net — do NOT watch the puck'],
    TRUE, TRUE
  ),
  (
    NULL, cat_defense,
    'D-to-D Breakout Pass',
    'Quick D-to-D pass in the defensive zone with a forward breakout.',
    'Two D-men set up at the blue line. Coach dumps puck behind the net. D1 retrieves, D2 slides across, D1 passes to D2. D2 passes to a forward (coach or player) breaking up the far wall. Reset and repeat x8.',
    'Beginner', 'U11+', 10,
    ARRAY['Pucks', 'Forwards or cones'],
    ARRAY['D retrieving the puck: stop behind the net on the strong side', 'D2 moves as soon as D1 touches the puck — do NOT wait', 'Crisp D-to-D pass is fundamental: quick, flat, accurate', 'Communicate: verbal call from D2 to D1 before the pass'],
    TRUE, TRUE
  ),

  -- ── SYSTEMS ─────────────────────────────────────────────────────────────────
  (
    NULL, cat_systems,
    '1-3-1 Power Play Setup',
    'Walk through the 1-3-1 power play structure and puck movement.',
    'Set up 5 skaters in the 1-3-1 power play alignment. Without opposing PK, walk through the four passing options from the point: (1) cross-ice to the weak-side half-wall, (2) down to the bumper, (3) back to the other point, (4) direct to the net-front. Execute each option 5 times at walking pace, then 75%, then game speed.',
    'Intermediate', 'U13+', 20,
    ARRAY['Pucks', 'Net', 'Cones for opponent positions (optional)'],
    ARRAY['Point player: hold the puck until a passing lane opens — be patient', 'The bumper player must move to create the lane — be dynamic', 'Net-front player: screen and deflect, not just stand there', 'All four options must look the same from the point — sell the fake'],
    TRUE, TRUE
  ),
  (
    NULL, cat_systems,
    'Neutral Zone Forecheck Trap',
    'Trap neutral zone forecheck — 1-2-2 structure and reads.',
    'Set up a 1-2-2 trap alignment in the neutral zone. Walk through how the 1 forward pressures the puck carrier, the 2 wingers seal the boards, and the 2 D hold the blue line. Practice transitioning from forecheck to the trap when the puck is dumped in.',
    'Advanced', 'U15+', 15,
    ARRAY['Pucks', 'Cones for alignment'],
    ARRAY['The F1 pressures without overcommitting — angle, don''t dive', 'Wingers: stay wide — force the puck carrier to the middle where help is', 'D at the blue line: stick on the ice in potential passing lanes', 'The trap is about reads, not rigid positions — stay reactive'],
    TRUE, TRUE
  ),

  -- ── GOALIE ──────────────────────────────────────────────────────────────────
  (
    NULL, cat_goalie,
    'Butterfly Recovery Series',
    'Drop-to-butterfly and immediate recovery to stance — 10-rep circuit.',
    'Goalie in ready stance at the top of the crease. On coach call, drops to butterfly, makes a simulated pad save, pushes back up to stance in under 1.5 seconds. 10 reps, 30 second rest, 3 sets. Add simulated high shot (glove) after the recovery on the last set.',
    'Beginner', 'U11+', 12,
    ARRAY['Goalie pads', 'Optional: balls or pucks for coach to toss'],
    ARRAY['Drop straight down — do not fall forward', 'Weight on inside of pads, not toes, for faster recovery push', 'Post recovery: chin up and set before the next read', 'Full butterfly: both pads flush on ice, blocker and glove covering low post'],
    TRUE, TRUE
  ),

  -- ── CONDITIONING ────────────────────────────────────────────────────────────
  (
    NULL, cat_conditioning,
    'Dot-to-Dot Conditioning',
    'Full-ice conditioning using face-off dots as waypoints.',
    'Players skate as fast as possible from dot to dot across the full ice surface in a prescribed pattern: (1) center dot → left wing dot → right wing dot → far center → far left → far right. That''s one rep. 4 reps with 45 second rest. Focus on explosive edges at each dot stop.',
    'Intermediate', 'U13+', 15,
    ARRAY['Ice surface'],
    ARRAY['Attack each stop — decelerate with two hard edges, not a glide', 'Plant and push hard out of each stop — this is where conditioning translates to game speed', 'Maintain forward lean on straightaways — do NOT sit upright', 'Track pace: each rep should be within 2 seconds of the first'],
    TRUE, TRUE
  ),
  (
    NULL, cat_conditioning,
    'Bag Skate with Puck',
    'High-intensity skating circuit where every player must have a puck.',
    'Traditional bag skate structure (blue to red, blue to far blue, full ice, full ice + back) but every player carries a puck. The puck must be on the stick at all times — any player who loses the puck must stop, retrieve it, and finish the segment. Coach calls stops randomly to force puck pickups at full speed.',
    'Advanced', 'U15+', 20,
    ARRAY['Pucks (1 per player)'],
    ARRAY['Puck is an extension of the skate — keep it on the forehand', 'Use this to simulate fatigue with the puck: game reality', 'Shorten the stride when fatigued — do not break form', 'Mental toughness cue: the last rep should look like the first'],
    TRUE, TRUE
  )
  ON CONFLICT DO NOTHING;

END $$;

-- Ensure all inserted drills are properly indexed
-- (indexes already exist from migration 002/004)
