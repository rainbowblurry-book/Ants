# Decision Records

Format: ID · question · options · debate summary · winner · reason · rejected · revisit-if.
Big creative decisions use the haiku debate (full transcripts in `docs/DEBATES.md`).
Other decisions use a compact 3-voice debate (Game Designer / Art Director / Tech Lead, 2 lines each).
Nothing appears in UI.md or PLAN.md without a Decision ID. Builder deviations are logged here as `OVR-###`.

---

## DR-001 · Art style
- **Question:** Which world art style do we ship?
- **Options:** (1) paper-cutout world + glossy curved UI · (2) Flash-style vector world + glossy UI · (3) curved notebook doodle
- **Debate (haiku, 3 rounds):** GD wanted the clearest terrain edge for reading shots. AD opened for paper cutout, then yielded because stacked shadow layers cost fill rate. TL showed that a vector outline can be generated from the terrain mask, so craters get the same inked curve for free. The vote was unanimous.
- **Winner:** (2) Flash-style vector world: thick plum outline, bright flat fills, one lit rim on terrain tops.
- **Reason:** It gives the best terrain-to-sky and ant-to-terrain contrast, and the outline comes from the mask (blur, then threshold, then stroke), so craters stay rounded and on-style. The atlas is flat fills, which is cheap on mobile.
- **Rejected:** paper-cutout (layered shadows cost fill, and torn edges drift toward jagged); notebook doodle (needs a wobble shader per crater, and scribbles hide small ants).
- **Revisit if:** the outline pass costs more than about 1 ms per frame on a mid-range phone, or playtesters call it "too slick". The fallback is a paper-grain overlay on terrain fills.

## DR-002 · Starter weapon trio
- **Question:** Which 3 original ant weapons ship first?
- **Options:** (a) Seed Spitter / Dewdrop Bounce / Pollen Pod · (b) Pebble Flick / Honeydew Glob / Aphid Herd · (c) beetle-shell utility trio
- **Debate (haiku, 3 rounds):** GD mapped the trio to three lessons: wind, timing, spread. AD gave each weapon a distinct silhouette (dot, drop, puff) and a gag. TL confirmed three simple physics paths. Pollen spread uses the match seed, and every crater is a plain circle erase.
- **Winner:** (a)

| Weapon | Role | Damage | Blast r (px @960x540) | Wind factor | Fuse | Behavior |
|---|---|---|---|---|---|---|
| Seed Spitter | direct fire, teaches wind | 30 | 28 | 0.6 | none | fast, flat, explodes on first contact |
| Dewdrop Bounce | timed lob, teaches angles | 45 | 48 | 0.3 | 3 s | jelly drop, up to 3 bounces, pops at fuse end or on direct ant hit |
| Pollen Pod | cluster / terrain shaping | 12 × 5 | 18 each | 0.8 | none | bursts at apex or on impact into 5 puffs on a seeded spread |

- **Reason:** Each weapon covers a different role, all three read clearly at phone size, and none resembles a Worms weapon.
- **Rejected:** Honeydew Glob (sticky terrain adds a physics state); Aphid Herd (walking-unit gimmick is too close to a known franchise); beetle-shell trio (no direct-fire weapon to teach the basics).
- **Revisit if:** Pollen Pod's maximum of 60 damage dominates the meta, or Seed Spitter is too weak to teach wind. Final numbers will be tuned in PLAN.md under their own DRs.
- **Judge's note:** I corrected the subagent's garbled fuse value ("3 turns-seconds") to 3 s.

## DR-003 · UI style
- **Question:** What visual language does the UI use over the DR-001 world?
- **Options:** (A) jelly candy buttons (thick plum outline, flat shade band, one hard curved glint) · (B) leaf/bark natural panels · (C) die-cut sticker/badge UI
- **Debate (haiku, 3 rounds):** GD argued that bark hides the wind readout and jelly pops. AD argued that stickers' white borders clutter a 540 px-tall canvas, and that the plum outline ties the UI to the world's ink. TL noted that jelly is nine-sliced flat fills with a tiny atlas and no textures.
- **Winner:** (A) Jelly candy UI: thick plum outline, a flat shade band along the bottom edge, and a solid plum drop shadow. No gradient sheen.
- **Amended by DR-003a:** the white glint streaks are removed.
- **Palette direction (finalised in UI.md):** plum ink `#2E1A47`, butter panel `#FFF1D0`, raspberry action `#E8456B`, Team Blue `#0072B2` + **circle** badge, Team Amber `#E69F00` + **rounded triangle** badge (Okabe-Ito, colorblind-safe), teal info `#1FA38A` (always paired with an arrow shape), glint `#FFFFFF`.
- **Fonts:** Lilita One (display, SIL OFL 1.1) + Nunito (body, SIL OFL 1.1), both from Google Fonts. Display text in-canvas is baked to a bitmap font.
- **Layout seeds:** touch targets ≥ 48 px logical (56 preferred); FIRE 96 px bottom-right; aim pad bottom-left; wind and turn banner top-center, never under a thumb.
- **Rejected:** bark/leaf (texture memory, buries readouts); stickers (space and clutter).
- **Revisit if:** glints hurt legibility in bright sunlight (lower glint opacity, thicken outlines).
- **Judge's note:** The butter panel is a UI panel fill over a saturated world, not a page background, so the anti-slop "cream background" ban does not apply. The token is named `panel-butter`, not `cream`.

## DR-004 · Engine version
- **Question:** Which Phaser version?
- **Options:** Phaser 3.90.0 (latest stable 3.x, verified on npm on 2026-11-16) · Phaser 4.2.1 (npm `latest`)
- **Debate:** GD: the brief says 3.x, so go with 3.x. AD: no visual difference for flat vector atlases. TL: 3.90.0 is the final, mature 3.x release with broad examples. Phaser 4 is a renderer rewrite, so it is outside scope unless the user asks.
- **Winner:** Phaser **3.90.0**, pinned exactly.
- **Revisit if:** the user asks to migrate to Phaser 4.

## DR-003a · Remove white glint streaks (user edit, checkpoint A review)
- **Question:** Keep the white curved glint on buttons and art, replace it, or drop it?
- **Options:** (1) keep · (2) replace with another accent (e.g. a dotted stitch or a darker inner rim) · (3) drop it, keeping the shade band and drop shadow
- **Debate:** GD: the glints add noise over the readouts and the eye goes to them first. AD: the shade band plus the plum drop already says "jelly", and a second accent would be decoration for its own sake. TL: one less layer per nine-slice and per sprite.
- **Winner:** (3) Drop all decorative white highlights on UI, ants, leaves, sun, logo and weapon icons. White stays only where it carries meaning: wind chevrons, the aim preview, badge borders, eye whites, speech bubbles.
- **Reason:** The user found the streaks odd. Removing them also makes the HUD calmer and easier to read (pillar 2).
- **Rejected:** keep (the user's feedback); replace (no accent earned its place yet).
- **Revisit if:** buttons read as flat or unclickable in playtests. Then try a darker inner rim, not a white glint.

## DR-005 · Ant character attitude (user edit, checkpoint A review) — SUPERSEDED by DR-006
- **Question:** How do we make the fighting ants feel rowdy while staying family-friendly?
- **Options:** (1) facial attitude only (brow, smirk) · (2) full rowdy kit: scowl, half-lidded eye, big mandibles, chipped-tooth grin, shaking raised fist, dented and tilted acorn-cap helmet, wide stance · (3) battle gear (bandanas, slings, war paint)
- **Debate:** GD: the raised fist makes a clear silhouette, so you can read their mood even at 80 px. AD: a dented cap tilted like a bad-boy beanie gives scrappy charm, while war paint pushes them toward "soldier". TL: everything stays inside one symbol and no extra textures are needed.
- **Winner:** (2) Full rowdy kit. Team identity stays on the cap colour plus the abdomen badge shape.
- **Reason:** It is clearly scrappy and funny without weapons-as-props or injuries (pillar 1), and it reads at phone size.
- **Rejected:** (1) too subtle at small sizes; (3) more militaristic and busier, and it competes with the team badge.
- **Revisit if:** faces turn to mush at the final in-game ant size. Then drop the tooth and keep the fist, brow and mandibles.

## DR-006 · Ant character design, rebuilt from scratch (user edit: DR-005 read as "a bird with a beak" on small screens)
- **Question:** Which ant body plan stays clearly an ant from a 35 px sprite up to a poster?
- **Options:** (1) side-profile crawler with forward mandibles (DR-005) · (2) upright chibi with a front-facing face, elbowed antennae, pinched waist, striped gaster, symmetric side jaws · (3) four-legged 3/4 crawler with a big head
- **Debate:** GD: in profile, the mandibles plus a single eye read as a beak, while two front-facing eyes and a grin read as a character and show attitude at any size. AD: the ant cues that survive shrinking are the elbowed antennae, the waist knot and the big striped gaster, and an upright chibi poses well for the poster, landing screen and comics. TL: one shared silhouette drawn at two levels of detail (full and small) means one rig and one atlas, with no per-size redraws.
- **Winner:** (2) Upright chibi ant. Its defining features:
  - **Ant cues:** elbowed antennae with round tips, a big round head (about 40% of height), a pinched waist knot, an oval thorax, and a large striped gaster tilted back.
  - **Rowdy cues:** angry V-brows, a toothy grin with one chipped tooth, symmetric side jaws (never a forward point), a raised shaking fist drawn in front of the body, and a dented acorn-cap helmet tilted -12°.
  - **Team identity:** helmet colour plus the badge shape on the gaster (blue circle, amber triangle).
  - **LODs:** `full` for 90 px tall and up (poster, landing, comics); `small` below 90 px (in-game), with no middle legs, tooth or motion lines, heavier strokes and bigger eyes and badge.
- **Reason:** It reads as an ant, and as rowdy, at 35, 48, 62, 86 and 300+ px (see `preview/chars-*.png`). The silhouette scales for poster and landing art.
- **Rejected:** (1) the beak problem; (3) four legs on the ground hide the fist and face, and the head turns into a blob at small sizes.
- **Revisit if:** in-game ants must shrink below 40 px, or animation rigging needs a different limb layout.

## DR-007 · Ant character locked to user-supplied concept (supersedes DR-006)
- **Question:** Which ant design do we build the art on?
- **Options:** (1) keep DR-006 SVG chibi · (2) adopt the user's Gemini concept sheet (`art/reference/ant-concept.webp`) as the design reference, redrawn as original SVG · (3) commission another concept round
- **Debate:** GD: the concept reads as an ant at 40 px, and its four expressions (cocky, aiming, oops, dizzy) map directly onto game states. AD: it has the right ant cues: elbowed antennae, three clear body parts, six legs, a huge expressive face and an acorn cap; the scaly cap texture and soft shading must be flattened to fit DR-001/DR-003a. TL: two poses (hero 3/4 and side gameplay) plus 4 face swaps make a small rig and a cheap atlas.
- **Winner:** (2). The rules for the redraw:
  - **Body:** upright 3/4 hero pose (hand on hip, fist raised) for posters, landing and comics; side-view gameplay pose with all 6 legs on the ground, facing right and mirrored for left.
  - **Head and face:** a big head with a wide mouth; four expression sets: cocky, aiming, oops, dizzy (stars, X-eyes, tongue; no injury).
  - **Art rules:** flat fills only, no gradients and no white glints; a smooth acorn cap with no scale texture; a thick plum `#2E1A47` outline.
  - **Teams:** **Amber `#E69F00` + rounded triangle** for the second team, replacing the concept's green to keep the Okabe-Ito colorblind-safe pair from DR-003. Blue `#0072B2` + circle for the first team.
- **Reason:** The user approved this concept ("these are more like it"). It passes the small-size check on its own sheet.
- **Rejected:** (1) the user found it unconvincing; (3) not needed.
- **Licensing note:** the concept is an AI-generated reference image used only as reference. Shipped art is original SVG drawn in `/art` and does not trace the image.
- **Revisit if:** the side-view pose is unreadable at the final in-game size (then enlarge the head and drop the middle legs in the small LOD).

## DR-008 · Biome sequence and per-biome structure
- **Question:** Which 10 biomes, in what order, and how is each biome paced?
- **Options:** (1) Jungle, Clearing, Camp, Trail, Village Garden, Picnic Park, Porch, Living Room, Pantry, Kitchen · (2) Jungle, Clearing, Camp, Village, Shed, Garage, House, Bathroom, Pantry, Kitchen · (3) a shorter outdoor arc (3 jungle variants) then 7 indoor rooms
- **Debate (compact):**
  - GD: (1) gives every biome a distinct terrain and wind toy (bouncy tent, slick tiles, fan rhythm), and the "follow the Queen's pot" thread explains the route.
  - AD: (1) alternates open outdoor palettes with cosy indoor ones, which keeps the levels looking varied. (2)'s shed and garage risk sharp tools and bathroom jokes.
  - TL: wind in (1) is either one system per biome or two telegraphed ones, so all are deterministic and seedable. (3) repeats terrain types.
- **Winner:** (1). The structure inside each biome is L1–3 teach, L4–6 test, L7–8 twist, L9 rest, L10 telegraphed boss.
- **Reason:** It follows the brief's arc (jungle, clearing, camp, village, house, kitchen). Each biome adds exactly one new terrain-and-wind idea (pillar 3), and the difficulty rhythm is fixed (pillar 4).
- **Rejected:** (2) sharp-tool props and an awkward bathroom; (3) too little variety.
- **Revisit if:** PLAN.md finds two biomes whose mechanics overlap too much, or the build budget forces fewer unique terrains.
- **Process note:** story content is not a screen or system, so the planner ran this as a compact debate without a subagent.

## DR-007a · Ant art status: placeholder cut-outs, final art NOT approved
- **Question:** The SVG redraw of DR-007 (especially the helmets) was rejected. What do we show until final art arrives?
- **Options:** (1) keep iterating SVG redraws now · (2) use cut-outs from the user's concept image as placeholders and lock the rest of the work · (3) stick-figure stand-ins
- **Debate (compact):** GD: the gameplay plan doesn't depend on final art, so unblock the plan. AD: the user's concept image is closest to what they want, so cut-outs are the honest stand-in. TL: cut-outs (`art/reference/placeholder/*.png`, made by `cut_placeholders.py`) keep the sizes and positions realistic for layout checks.
- **Winner:** (2). Hero and side poses are cut from `ant-concept.webp` with the background keyed out. Caps are hue-shifted to team blue and amber. Faces are taken as tiles.
- **Status:** **Ant art is NOT approved.** The user will supply better images later (see PROGRESS "How to send ant art"). The final art must be original, flat SVG following CREATIVE §2 and must not ship the AI image.
- **Revisit when:** the user delivers new ant images.

---

# Checkpoint B · Planner's judging summary

Six Sonnet debate subagents (medium effort) ran one compact debate per system: tech, terrain, physics, turn flow, campaign and bot AI. Their records follow, and I judged each one. When two records disagreed, I ruled as below. The affected records carry a **Judge's ruling** line, and that ruling is binding.

| # | Conflict | Ruling |
|---|---|---|
| J1 | Ant body: DR-035 assumed a 14 px circle; DR-027 set 88x63 drawn with a 56x32 capsule hurtbox | DR-027 wins. Damage distance is measured to the capsule surface. |
| J2 | Walking: step-up 10 px / slope 55–60° (DR-023) vs 8 px / 45° (DR-036); slick numbers | DR-036 for walking (8 px, 45°, slick decel 90, slide over 10°). DR-023 keeps "stand up to 60°". |
| J3 | Fall damage: DR-026 vs DR-036 formulas | DR-026. |
| J4 | Projectile stepping and despawn: DR-023/026 vs DR-038 | DR-023 (≤ 2 px steps) and DR-026 bounds. DR-038 keeps the 8 s flight cap. |
| J5 | Shot settle: 20 ticks / 15 s (DR-042) vs 30 ticks / 12 s (DR-038) | DR-038. |
| J6 | Retreat after firing: DR-042 yes vs DR-036 "fire ends the turn" | DR-042: leftover move budget is usable for 3 s after firing. |
| J7 | Camera after impact: 600 ms hold (DR-046) vs 400 ms + knockback pan (DR-038) | 400 ms, then follow the largest knockback, then return. |
| J8 | Fire input: hold-to-charge / drag-release (DR-015) vs set-then-fire (DR-033) | DR-033. Space and FIRE fire on press; drag only aims. DR-015's buffer windows apply. |
| J9 | Aim resolution: half-degrees (DR-011) vs bots needing float power (DR-061) | Angles in integer 0.1° and power in integer 0.1% in commands, with a literal 0.1° trig table. Player UI steps stay 1°/5% coarse. |
| J10 | Team sizes: up to 4v5 (DR-050) vs 3v3 default (DR-041) vs crowding (DR-027) | Max 4 per side. The campaign ramps per DR-050's judge note, and 3v3 is the two-player default. |
| J11 | Pickups: Honey only (DR-048) vs "loot crates" with ammo (DR-051/052/057) | Two pickups: Honey Drop and Seed Bundle. |
| J12 | Ammo: ∞/3/1 per match (DR-034) vs per-level tables (DR-052) vs 4/3 (DR-057) | DR-052 for the campaign; DR-034 (∞/3/1) as the two-player default. |
| J13 | Boss cluster numbers: DR-037 vs DR-053 | DR-037 (per-ant cap 60), fired on DR-053's loop round. |
| J15 | Boss accuracy: its level (DR-053) vs L+5 with true wind (DR-063) | DR-063. |
| J17 | Par and hint timing (DR-040 vs DR-055 vs DR-056) | Tip after 2 losses, skip after 3 (5 on bosses); par = 2 × rivals + 2, and 14 on bosses. |
| J18 | Save shape (DR-018 vs DR-047 vs DR-055) | One versioned progress key plus a separate match key. |
| J19 | Level pipeline: DR-025 vs DR-056 | Merged: DR-056 kits and slots, built by DR-025's build-time mask compiler. |
| J21 | Wind per biome: DR-050 summary vs DR-032 fields | DR-032 is authoritative. |
| J22 | Bot AI numbers assumed 8 px/s² wind and a centre-based radius | The planner recalibrated DR-062 to DR-065 by Monte-Carlo against the real numbers (see DR-063). |

J14, J16 and J20 were checked and needed no change: the loop round replaces `cooldownTurns`, the rest-level AI index is level − 8, and dew reuses the water line.

**Verified facts used in judging (2026-11-16):**
- On npm: `@biomejs/biome` 2.6.4 is the newest release at least 14 days old, and `vitest@5.0.5` peers accept `vite ^8`.
- `git ls-remote` shows the GitHub Actions majors `checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5` and `deploy-pages@v5`.

---

# Checkpoint B · Core loop, tech and deploy (DR-010 to DR-018)

## DR-010 · Simulation architecture
- **Question:** What step rate, loop shape and code split run the battle?
- **Options:** (1) 60 Hz fixed step, accumulator, interpolated render · (2) 120 Hz fixed step · (3) variable delta driven by Phaser `update`
- **Debate (compact):** GD: the same input must give the same flight on every phone, so no variable delta. 60 Hz feels identical to 120 Hz for lobbed shots.
  AD: interpolation keeps ants and shells smooth on 90/120 Hz screens and gives squash-and-stretch a clean frame. TL: pixel-alpha collision per shell per step is the cost, so 60 Hz halves it. Rules live in `src/sim/*` with zero Phaser imports and run under node.
- **Winner:** (1). `SIM_DT = 1/60`. Accumulator adds the Phaser `delta` clamped to 250 ms, runs at most 5 steps per frame, then drops any leftover time. Render draws `lerp(prev, curr, alpha)` for ants, shells and particles. Sim state is double-buffered. Scenes only read state and push input commands. Phaser Arcade and Matter are not used; the sim has its own gravity, wind and mask collision. Tab hidden means sim paused, so there is no big catch-up.
- **Reason:** Fixed 60 Hz gives pillar 4 at half the collision cost. The 5-step cap prevents the death spiral on slow phones (the game slows down instead of freezing).
- **Rejected:** 120 Hz (double cost for no felt gain); variable delta (not deterministic, so the bot cap test cannot be trusted).
- **Revisit if:** fast shells tunnel through thin terrain. Fix by sub-stepping the shell, not by raising the rate.
- **Judge:** Accepted as written.

## DR-011 · Determinism: RNG, numbers, banned APIs
- **Question:** How do we make runs reproducible across devices and browsers?
- **Options:** (1) sfc32 streams + float64 with fixed op order, trig from literal tables · (2) fixed-point integers everywhere · (3) mulberry32 single stream
- **Debate (compact):** GD: the bot-cap test and bug reports need "seed + inputs = same match", but nobody needs lockstep netplay. AD: cosmetic particles must never change a shot, so they get their own stream. TL: JS `+ - * / sqrt` are IEEE-exact on all engines, but `sin/cos/atan2/pow/exp` are not guaranteed identical, so the sim bans them.
- **Winner:** (1). **sfc32**, seeded by hashing `"{matchSeed}:{levelId}:{purpose}"` with cyrb128. Five independent streams: `terrain`, `wind`, `spread` (Pollen Pod), `ai`, `cosmetic`. The first four are sim state and are saved in replay and snapshot. `cosmetic` is never read by sim code. Aim angles are integer half-degrees (0 to 360 steps). Their sin and cos come from a 361-entry table pasted as literals in source, not computed at runtime. Sim values are float64 and evaluated in a fixed op order, with no `Math.fround` tricks and no `**`. Wind is stepped as a fixed-point-quantized value (units of 1/64). Input is recorded per sim tick, so a match is `(seed, level, [tick, command])`. Banned in `src/sim` and `src/ai`: `Math.random`, `Date.now`, `performance.now`, `new Date`, `Math.sin/cos/tan/atan2/pow/exp/log`, `Array.sort` without a comparator, and iterating a `Set` or `Map` whose insertion order depends on timing. A vitest "ban scan" test greps these out of those folders, and Biome `noRestrictedGlobals` backs it up.
- **Reason:** It is the cheapest way to get replayable matches and a trustworthy bot-cap test. Integers everywhere would make gravity and drag code painful for no gain at this scale.
- **Rejected:** fixed-point integers (dev cost, no netplay need); mulberry32 (32-bit state, one stream makes extra cosmetic calls shift the sim).
- **Revisit if:** online play is ever added (then re-test float parity per browser, or go fixed-point).
- **Judge's ruling:** Amended (J9). Aim angles are integer **tenths of a degree** and power is integer **per-mille** (0–1000), not half-degrees. Sin and cos come from a literal quarter-wave table at 0.1° (901 entries), generated once by a script and committed. Reason: the bot cap needs sub-degree aim (DR-061, DR-064). DR-032's Column falloff uses a smoothstep polynomial instead of cosine, and Oscillate reads the same table.

## DR-012 · Scene list and flow
- **Question:** Which scenes exist, and what is HTML versus canvas?
- **Options:** (1) all-canvas · (2) canvas for game and menus, HTML for rotate, fallback and Settings · (3) all-HTML menus over a canvas battle
- **Debate (compact):** GD: the flow must be short: Title, then Level Select, then Comic (first visit to a biome only), then Battle, then Results. AD: DR-003 jelly buttons and baked Lilita One bitmap text look right only in canvas. Settings needs real sliders, language select and screen-reader labels, which HTML gives free. TL: the rotate overlay must work before Phaser loads and when it crashes, so it cannot be a scene.
- **Winner:** (2). Phaser scenes: `Boot` (tiny: config, save load, audio-unlock gate) → `Preload` (progress bar, shared atlas, biome 0) → `Title` → `LevelSelect` → `Comic` (skipped if seen) → `Battle` + parallel `Hud` (launched on top, reads registry/state, sends input commands) → `Pause` (overlay scene, pauses `Battle` and `Hud` sim) → `Results` → back to `LevelSelect` or next `Comic`/`Battle`. HTML: (a) rotate overlay (`#rotate`, CSS `@media (orientation: portrait)`, covers the canvas and sets a `paused-by-orientation` flag the game loop reads), (b) loading, no-JS and WebGL-failure message, (c) Settings dialog (sound and music sliders, language, text size, performance mode, reset save), (d) fullscreen and install buttons live in the canvas HUD but call HTML APIs. Scene keys are lowercase strings and live in one `SceneKey` enum.
- **Reason:** Canvas keeps one visual language; HTML only where accessibility or a pre-boot guarantee matters.
- **Rejected:** all-canvas (Settings sliders and a11y cost a lot to hand-build); all-HTML menus (style drift from DR-003 and double asset paths).
- **Revisit if:** Settings text must be translated into scripts the baked bitmap font cannot cover (it is HTML already) or Title needs HTML for SEO.
- **Judge:** Accepted.

## DR-013 · Phaser game config and render scale
- **Question:** Exact `Phaser.Game` config, and how do we keep text crisp on 2x/3x phones?
- **Options:** (1) 960x540 canvas, CSS-upscaled · (2) canvas at 960·S × 540·S (S = 1 or 2), root camera zoom S, logical world stays 960x540 · (3) match canvas to device pixels exactly
- **Debate (compact):** GD: brief fixes 960x540 logical, so physics, terrain and levels never see S. AD: a 960-px canvas stretched to 2532 px looks soft on 3x phones, and soft ink outlines break DR-001. TL: Phaser 3.90 has no `resolution` config option, so the supported route is a larger canvas plus camera zoom. S=2 costs 4x pixels, so it needs a performance switch.
- **Winner:** (2). Config: `type: Phaser.AUTO` (WebGL first, Canvas fallback), `parent: 'game'`, `width: 960*S`, `height: 540*S`, `backgroundColor: '#2E1A47'`, `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`, `render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' }`, `input: { touch: { capture: true }, activePointers: 3 }`, `disableContextMenu: true`, `banner: false`, no physics block. S is chosen once at boot: 2 if `devicePixelRatio >= 1.5` and Performance mode is off, else 1. Changing it needs a reload. Auto-drop: if the median frame time is over 20 ms for 3 s in Battle, show a one-time "Switch to smooth mode?" prompt that sets S=1 and reloads. `roundPixels` is false because interpolated sub-pixel motion would jitter if snapped. All text is baked bitmap fonts at 2x source size (DR-003). Canvas `parent` has `100dvh` height with safe-area padding.
- **Reason:** Crisp ink is the style (DR-001), while the sim and levels stay at 960x540 as the brief requires.
- **Rejected:** (1) soft output on phones; (3) odd canvas sizes break atlas scale and cause moiré; S=3 (9x pixels, too slow).
- **Revisit if:** the camera-zoom centering spike (a 1-day task before Stage 1) shows seams or UI misalignment. Then fall back to S=1 plus 2x atlases drawn at 0.5 with linear filtering.
- **Judge:** Accepted. The S=2 camera-zoom spike is the first build task (HANDOFF stage 0). If it fails, use the S=1 fallback as written.

## DR-014 · Mobile texture-memory budget
- **Question:** How much GPU and canvas memory can we use, and how are atlases laid out?
- **Options:** (1) 2048 atlases, 96 MB budget, per-biome unload · (2) 4096 atlases, load everything once · (3) 1024 atlases, many files
- **Debate (compact):** GD: no mid-battle hitches, so loading happens only between screens. AD: flat vector fills compress well in size on disk but not in GPU, so cap by area, not by file size. TL: older iPhones and low-end Androids die around 200 to 300 MB of total page memory, and a 4096² RGBA texture is 64 MB alone.
- **Winner:** (1). Budget: **96 MB soft cap, 128 MB hard cap** for textures plus canvas, measured as `w·h·4` bytes (mipmaps off). Max atlas page **2048x2048 (16 MB)**. Plan: shared atlas (ants, weapons, UI nine-slices, FX) = 2 pages = 32 MB, always resident. Biome atlas = 1 page = 16 MB, plus 2 parallax strips at 1024x512 = 4 MB, loaded on entering the biome's `LevelSelect` and destroyed after leaving it for the next biome. Comic panels are loaded per biome (4 panels at 1024x576 = 9 MB) and destroyed when `Comic` ends. Battle runtime: terrain mask `Uint8Array` 960x540 = 0.5 MB (CPU alpha, not a texture); terrain colour RenderTexture 960x540 = 2 MB; outline RenderTexture 2 MB; terrain fill pattern 512² = 1 MB. Canvas backing at S=2 is 1920x1080 = 8 MB, ×2 buffered = 17 MB. Estimated peak ≈ 32 + 16 + 4 + 5 + 17 ≈ 75 MB. Atlases are generated at 2x from SVG by the build script, with a page-count check in CI that fails over 3 resident pages. Textures are PNG (WebP only if the size on disk matters later). A dev overlay (`?mem`) prints the sum of `textures` area.
- **Reason:** 2048 is safe everywhere, leaves ~20 MB headroom under the soft cap, and keeps per-biome loads under about 1.5 MB of PNG each.
- **Rejected:** 4096 pages (a single page can fail to allocate on old iOS); 1024 pages (more draw-call batches and texture binds); keeping all 10 biomes resident (160 MB+).
- **Revisit if:** a real-device test (assumed, none run yet) crashes below 96 MB, or the shared atlas needs a third page.
- **Judge:** Accepted. Device numbers are estimates until the stage-1 device check.

## DR-015 · Input buffering and mappings
- **Question:** How do keyboard, mouse and touch become sim commands, and what is buffered?
- **Options:** (1) per-tick command queue with short tick-based buffers · (2) direct event handlers calling game functions · (3) polling raw state in the sim
- **Debate (compact):** GD: a tap a hair before the turn becomes ready or an ant lands should still count, or the game feels like it eats inputs. AD: keep one aim model so HUD and preview agree: aim angle and power are state, not pointer positions. TL: commands are stamped with the sim tick, which makes replays trivial and the buffer deterministic (no ms clocks).
- **Winner:** (1). Input layer samples events, converts them to `Command` objects, and the Battle scene pushes the commands into the sim at the next tick. Ring buffer of 4. Buffer windows in ticks at 60 Hz: **fire 12 ticks (200 ms)**, **jump 9 ticks (150 ms)**, **weapon switch 0 (applies at once, allowed while aiming)**. Fire buffers only until the ant is grounded and settled and it is that ant's turn. Buffered commands are cleared on turn change. Walk and aim are held states, not buffered. Keyboard: A/D or ←/→ walk, W/S or ↑/↓ aim (hold = faster after 400 ms), Space hold-and-release = charge power then fire, Shift or Z = jump, Q/E or Tab cycle weapons, 1–3 select directly, Esc or P = pause, F = fullscreen. Mouse: left drag from the ant sets angle and power (slingshot), release fires, wheel cycles weapons, buttons for FIRE and jump. Touch: aim pad bottom-left, FIRE bottom-right (96 px), jump and weapon strip above FIRE, hit areas ≥ 48 px logical (DR-003); pointers handled independently (3 active) so thumbs never conflict. Exact HUD layout goes in UI.md.
- **Reason:** Forgiving but deterministic; one command path serves all three devices and the replay test.
- **Rejected:** direct handlers (no buffer, not replayable); ms-based timers (non-deterministic and different on slow frames).
- **Revisit if:** playtesters fire by accident (shorten fire buffer to 8 ticks) or say it "eats" jumps (raise to 12).
- **Judge's ruling:** Amended (J8). DR-033 set-then-fire wins. **Space fires on press** (no charge). Mouse drag from the ant sets angle and power, and release does **not** fire. FIRE or Space fires. These buffer windows (fire 12 ticks, jump 9 ticks) replace DR-042's general 120 ms buffer.

## DR-016 · Toolchain and version pins
- **Question:** Exact dependencies, test runner and lint/format?
- **Options:** (1) Vite 8.3.5 + TS 5.9.3 + Vitest 5.0.5 + Biome · (2) Vite 8.3.5 + TS 7.0.2 + Vitest 5.0.5 + ESLint/Prettier · (3) newest everything (Vite 8.3.8, Vitest 5.1.0)
- **Debate (compact):** GD: tests of rules and the bot cap must run in seconds in plain node. AD: a formatter that never argues keeps art-pipeline scripts tidy. TL: TS 7 is the native compiler, and tooling that needs the TypeScript JS API (typescript-eslint, some Vite plugins) may lag, so for a build that must not break we want the boring compiler. Anything under 2 weeks old is excluded: Vite 8.3.6 (11 days) and 8.3.8 are out.
- **Winner:** (1), all pinned exactly with `.npmrc save-exact=true` and a committed `package-lock.json`:
  - `phaser@3.90.0` (DR-004)
  - `vite@8.3.5` (26 days old)
  - `typescript@5.9.3` (typecheck only: `tsc --noEmit`; Vite transpiles)
  - `vitest@5.0.5` (32 days old), `environment: 'node'` for `src/sim`, `src/ai`
  - `@biomejs/biome` at the newest release at least 14 days old when installed (`npm view @biomejs/biome time`), pinned exact. This is not verified here.
  - Scripts: `dev`, `build` (rasterise art, then `vite build`), `typecheck`, `lint` (`biome check`), `test` (`vitest run`), `ci` (all four).
  - `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `target ES2022`, `moduleResolution bundler`.
  - Node 24 in CI and `.nvmrc` (assumed LTS; Vite 8 needs ≥ 20.19 or ≥ 22.12).
  - Test layers: unit (rng, terrain mask, physics, turn flow), a ban-scan test (DR-011), the headless bot-cap simulation (brief requirement), and a Playwright smoke test later (not in CI at first).
- **Reason:** Stability first. TS 7 gives faster typechecks but the project is small, so speed is not worth the compatibility risk.
- **Rejected:** TS 7.0.2 (tooling risk; try it in a later spike, just swap and run `typecheck`); ESLint + Prettier (3 more dev packages and a TS-API dependency); Jest (slow ESM setup); latest-everything (violates the 2-week rule).
- **Revisit if:** `tsc --noEmit` on TS 7.0.2 passes the whole repo and Biome supports it, then upgrade for speed. Also if vitest 5.0.5 and vite 8.3.5 show a peer-dependency warning (then use 5.1.0).
- **Judge's ruling:** Verified by the planner on npm, 2026-11-16: `@biomejs/biome` **2.6.4** (released 2026-10-28) is the newest release at least 14 days old, so pin it. Vitest 5.0.5's peer range includes `vite ^8.0.0`. Node 24 as the CI LTS line is assumed, not checked.

## DR-017 · Deploy: GitHub Actions to GitHub Pages
- **Question:** How do we build and publish, and which repo setting must the user flip?
- **Options:** (1) Actions artifact deploy (`deploy-pages`) · (2) push `dist` to a `gh-pages` branch · (3) manual upload
- **Debate (compact):** GD: every merge to main should be playable the same day. AD: PRs must not publish half-finished art. TL: official Pages actions need no deploy key and give a deployment URL. Tests gate the build, so a broken sim never ships.
- **Winner:** (1). Triggers: `push` to `main`, `workflow_dispatch`, and `pull_request` (runs the test job only). Jobs: `test` → `build` → `deploy` (the latter two only on main or manual runs). Vite `base` is `/Ants/` (set via `BASE_PATH` env in the workflow, default `/` for dev). The live URL is `https://rainbowblurry-book.github.io/Ants/`. Permissions: `contents: read` at top level, `pages: write` and `id-token: write` only on the deploy job. Concurrency group `pages`, `cancel-in-progress: false`. **The repo setting the user must switch on: Settings → Pages → Build and deployment → Source: "GitHub Actions".** (The repo must be public on a free plan.) The brief's repo name "project-ants" differs from `rainbowblurry-book/Ants`; I used the latter (standing addition).

```yaml
name: Deploy Ants to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test

  build:
    if: github.event_name != 'pull_request'
    needs: test
    runs-on: ubuntu-latest
    env:
      BASE_PATH: /Ants/
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - uses: actions/configure-pages@v6
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```
- **Reason:** Smallest official path, tests gate every publish, and PRs get CI feedback without publishing.
- **Rejected:** `gh-pages` branch (extra branch and token); a second "build" in `test` (slower, no gain).
- **Revisit if:** the repo goes private on a plan without Pages, a custom domain is added (change `base` to `/`), or build time passes 5 minutes (cache the rasterised atlases).
- **Judge:** Accepted. The brief calls the repo "project-ants". The real repo is `rainbowblurry-book/Ants`, so `base` is `/Ants/`.

## DR-018 · PWA and platform hooks
- **Question:** What do manifest, service worker, audio, gestures and saves look like?
- **Options:** (1) manifest + small hand-written service worker + versioned localStorage save · (2) manifest only, no service worker · (3) Workbox plugin
- **Debate (compact):** GD: kids play on trains and in cars, so offline matters and the "install" prompt is a bonus. AD: the splash and icon use plum `#2E1A47`, and the page must never zoom or bounce, which would break the fixed 16:9 frame. TL: a 40-line service worker avoids a build dependency, and storage should be one versioned key with try/catch because Safari private mode throws.
- **Winner:** (1).
  - **Manifest:** `display: "fullscreen"` with `display_override: ["fullscreen","standalone"]`, `orientation: "landscape"`, `start_url` and `scope` `/Ants/`, `background_color` and `theme_color` `#2E1A47`, icons 192, 512 and a maskable 512. iOS ignores `orientation`, which is why the HTML rotate overlay (DR-012) exists.
  - **Service worker** (`sw.js`, production only): cache name `ants-<build hash>`. Precache the hashed assets listed by a small Vite plugin. Cache-first for hashed assets, network-first with cache fallback for `index.html`. Old caches deleted on `activate`. New version applies on the next launch (no forced reload during a match).
  - **Audio unlock:** the "Tap to play" gate on `Boot` calls `audioContext.resume()` inside the first `pointerup`/`keydown`, and the same handler also tries a silent buffer play for iOS. Sound is synthesized in code, so there is no audio file to preload.
  - **Gestures:** `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`. CSS: `html, body { position: fixed; inset: 0; overscroll-behavior: none; touch-action: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }`. JS: non-passive `touchmove` `preventDefault`, plus `gesturestart` and `dblclick` blocked. Safe-area insets via `env(safe-area-inset-*)` on the HUD container.
  - **Save:** `localStorage` key `ants.save.v1` = `{ v: 1, progress: { [levelId]: { done, bestShots } }, comicsSeen: [], settings: {...} }`. Reads and writes are wrapped in try/catch (falls back to in-memory). Writes happen on level end and settings change. A `migrate(save)` chain upgrades older `v`. A corrupt blob is moved to `ants.save.bak` and a fresh save is made.
- **Reason:** Covers every platform line in the brief with no heavy dependency.
- **Rejected:** no service worker (no offline, no install prompt); Workbox (dependency for ~40 lines); IndexedDB (overkill for a few KB).
- **Revisit if:** the save grows over 100 KB or stale caches cause "old build" bug reports (then add an in-game update toast).
- **Judge's ruling:** Amended (J18). Save `ants.save.v1` holds `progress[levelId] = {done, acorns, skipped}` (DR-040, DR-055), `comicsSeen`, `unlocks` and `settings`. The mid-match slot is a separate key, `ants.match.v1` (DR-047).

---

# Checkpoint B · Terrain (DR-020 to DR-027)

## DR-020 · World size and mask resolution
- **Question:** Single 960x540 arena, or a wider world with camera pan?
- **Options:** (1) single screen 960x540 · (2) 1920x720 world with pan · (3) single screen for campaign, `size` field in the level format for later
- **Debate (compact):**
  - GD: one screen means the whole battlefield, the wind and every enemy are visible, which is pillar 2. A pan hides targets and makes shots feel blind.
  - AD: HUD, wind and thumb zones are placed on a fixed frame, and a panning world fights them. Ants at 88 px already fill the screen.
  - TL: a 1920x720 mask is 1.38 MB, and the visual layer is 5.5 MB at 1x, which squeezes the mobile texture budget. The brief says mask "at that resolution".
- **Winner:** (3). All 100 levels are 960x540, 1 mask px = 1 logical px (518,400 bytes). The level format carries `size` but v1 asserts `[960,540]`. The camera never reveals extra world: it may zoom up to 1.25x (the CREATIVE §4 shot follow) and pan only inside the 960x540 bounds, plus shake.
- **Reason:** Readability and memory. It also honours the brief literally: mask equals logical resolution.
- **Rejected:** wide world (blind shots, HUD conflict, 2.7x memory). A mask at 2x was also rejected: 4x the memory for no gameplay gain.
- **Revisit if:** playtesters want longer-range duels, or the boss fortresses will not fit in 540 px of height.
- **Judge:** Accepted. This resolves CREATIVE's "in-game size" open item together with DR-027.

## DR-021 · Mask data structure and visual sync
- **Question:** What is authoritative: a sim-side grid or canvas pixels? How does the Phaser layer stay in sync?
- **Options:** (1) `Uint8Array` material grid in the sim, visuals derived from it · (2) read alpha back from a canvas (`getImageData`) · (3) a vector or polygon terrain
- **Debate (compact):**
  - GD: the same shot must give the same crater on every device, so the sim owns the data.
  - AD: the visual only needs to look right, so it can be derived and cosmetic.
  - TL: canvas readback is slow, GPU-dependent and impossible headless. A grid is trivially testable under Node and costs 0.5 MB.
- **Winner:** (1).
  - `TerrainGrid { w:960, h:540, cells:Uint8Array }`, one byte per px, material ID 0..7 (DR-022).
  - The sim exposes `erase(cx, cy, r)`, which is per-pixel material-aware, and `solidAt(x, y)` (out of bounds = empty, except the DR-026 floor).
  - `erase` pushes a dirty rect into a list. It never touches Phaser.
  - The renderer drains the list once per render frame and merges the rects. Visual: 12 chunk canvases, 4x3 of 240x180 px each, one `CanvasTexture` each.
  - Per dirty px, the renderer copies the level's baked fill colour if the cell is solid, else alpha 0, then composites the ink (DR-024). Only touched chunks are refreshed (a 100 px blast touches 1 to 4 chunks).
  - Fill colours are baked once at load from the initial mask plus a biome palette. A surface band (grass etc.) is the top 10 px under the initial empty space, and it never regrows.
  - After an erase, delete solid fragments smaller than 60 px that were detached inside the dirty rect (a flood fill, deterministic), so there are no ink specks. Large floating islands stay.
- **Reason:** Deterministic, headless-testable, and the chunks keep the upload per blast small. Texture memory is about 2 MB of chunk canvases, 2 MB of fill copy and 0.5 MB of mask, roughly 4.5 MB in total.
- **Rejected:** canvas readback (slow, nondeterministic); `destination-out` circle erase on a single canvas (the sim and the picture could drift, and it cannot do per-material radii); vector terrain (cannot do a rounded inked edge from the mask, per DR-001).
- **Revisit if:** the chunk refresh costs more than 2 ms per blast, or the sim moves to a worker (the grid would then use a `SharedArrayBuffer`).
- **Judge:** Accepted.

## DR-022 · Materials
- **Question:** Which material types exist and how do they behave?
- **Options:** (1) 8 types with a per-pixel crater multiplier · (2) a blast-wide radius multiplier by the first material hit · (3) 2-hit hard material with per-pixel HP
- **Debate (compact):**
  - GD: each biome needs one clear toy (sawdust craters, bouncy tent, slick tiles), and reading it by colour must be instant.
  - AD: each material gets one fill and one surface treatment, so it reads before anyone tests it.
  - TL: per-pixel `dist <= r * mult[material]` is one lookup per pixel and is deterministic. Hit counters need extra state per pixel, so I would skip them.
- **Winner:** (1). Cells within the blast box are erased if `dist <= r * mult`, so a soft pixel is erased out to 1.5 r and a hard pixel only to 0.5 r. Restitution (e) applies to projectile bounces (Dewdrop) and to ant landings. Friction (mu) is how much ants slow down on it.

| ID | Material | Crater mult | e | mu | Biomes |
|---|---|---|---|---|---|
| 0 | EMPTY | - | - | - | all |
| 1 | SOIL | 1.0 | 0.35 | 0.8 | all (loam, ruts, beds) |
| 2 | SOFT | 1.5 | 0.10 | 0.9 | 2 sawdust, 3 marshmallow, 5 beds, 6 blanket and bread, 7 mat, 8 rug, 9 sugar |
| 3 | HARD | 0.5 | 0.30 | 0.7 | 1 roots, 2 stumps, 6 crust, 7 pots, 8 blocks, 9 cereal box, 10 cutting board |
| 4 | ROCK | 0 | 0.35 | 0.7 | 4 pebbles, 3 tent pegs, 9 shelves, 10 sink rim |
| 5 | BOUNCY | 0.6 | 0.85 | 0.6 | 3 tent canvas, 6 jelly, 8 cushions |
| 6 | SLICK | 1.0 | 0.40 | 0.05 | 10 tiles |
| 7 | WATER | non-solid | - | - | 4 puddles, 10 sink, bottom band |

  - Hard has no 2-hit rule: it takes 0.5x craters, so a stump needs about 4 shots, with no hidden state.
  - On SLICK, ants keep their momentum, with ground deceleration of mu x normal. They slide down any slope over 6 degrees.
  - Ants landing on BOUNCY rebound once at e = 0.6 and take no fall damage.
  - Cushions "absorb blasts" through the 0.6 multiplier.
  - Biome-specific extras are not materials: the toaster pop-up and the updraft and vent columns are scripted per level in the physics and wind DR.
- **Reason:** Eight IDs fit in 3 bits, and each biome row in STORY gets its toy from the table.
- **Rejected:** a blast-wide multiplier (weird craters on material borders); 2-hit hard (state per pixel).
- **Revisit if:** hard stumps are too tanky in playtest (then raise the mult to 0.65), or a biome needs a 9th material.
- **Judge's ruling:** Amended (J2). SLICK **ant** behaviour uses DR-036's numbers (decel 90 px/s², slide on slopes over 10°). The mu 0.05 in this table applies only to projectile tangential friction.

## DR-023 · Collision and settling
- **Question:** How do projectiles, bounces and ants touch the grid?
- **Options:** (1) sub-stepped point/ring sampling on the grid · (2) per-pixel-perfect sweep against alpha · (3) physics bodies (Arcade/Matter) with the terrain as a polygon
- **Debate (compact):**
  - GD: shots must never pass through a thin ridge, and bounces must go where the eye expects.
  - AD: tilting the ant to the slope sells the weight and the squash.
  - TL: the sim is pure TS, so Arcade/Matter are out. A 2 px step is sound for any feature over 2 px.
- **Winner:** (1).
  - **Projectile:** each 60 Hz tick moves in steps of 2 px or less, `ceil(speed*dt / 2)` steps. Speed is capped at 1500 px/s, which is at most 13 steps. It tests the centre plus 4 cardinal ring points (radius 4 for Seed and Pollen, 8 for Dewdrop). Ants are checked with circle versus hurtbox capsule at every step. On contact, back up to the last free step.
  - **Normal:** sum over a 9x9 window of `(solid ? 1 : 0) * (dx, dy)`, negated and normalised with `Math.sqrt`. If the sum is zero (embedded), use the reversed velocity.
  - **Bounce:** `v' = v - (1+e)(v.n)n`, then the tangential part x `(1 - 0.2 mu)`.
  - **Ant probes:** 3 foot probes at x = -16, 0, +16. Wall probes at x = +/-26, heights 10 and 28 above the feet. A head probe at 44 above the feet. Walking step-up is at most 10 px per move, so slopes up to about 55 degrees are walkable.
  - **Ground height:** the average of the left and right foot contacts. The sprite tilt is derived from that difference, visual only and not stored in sim state.
  - **Airborne:** no foot probe has solid within 2 px below. Falling uses the same gravity as projectiles, with terminal speed 700 px/s and 2 px vertical sub-steps. Landing snaps to the contact. If an ant is embedded, push it up at most 24 px.
  - **Slopes:** an ant stands on any slope up to 60 degrees and slides down steeper ones. On SLICK that limit is 6 degrees.
- **Reason:** Cheap, deterministic, no tunnelling through any solid thing of 2 px or more, and ants settle by themselves after the ground vanishes.
- **Rejected:** Arcade/Matter (not headless, not deterministic enough); pixel sweep (no benefit over 2 px steps).
- **Revisit if:** a projectile is ever faster than 1500 px/s, or playtesters see ants "stuck" in notches (then raise the step-up to 14).
- **Judge's ruling:** Amended (J2, J4). Walk step-up is 8 px and the walkable slope is 45° (DR-036). Standing without sliding up to 60° stays. Projectile stepping (≤ 2 px steps, speed cap 1500 px/s) wins over DR-038's 4 px sub-step formula, because features can be as thin as 6 px (DR-025) and the ring radius is 4.

## DR-024 · Outline and render pipeline
- **Question:** When and how is the DR-001 plum outline regenerated, and at what cost?
- **Options:** (1) separable box blur on the mask plus an ink LUT, only in the dirty rect · (2) regenerate the whole outline on each blast · (3) a marching-squares vector path
- **Debate (compact):**
  - GD: the outline must be there on the first frame after the blast, not 3 frames later.
  - AD: the stroke is 4 to 5 px and rounded; at 1x, GPU bilinear softens it nicely.
  - TL: the blur only needs a radius-2 window in the rect. The texture upload dominates, so chunking matters more than clever maths.
- **Winner:** (1).
  - Terrain is drawn at 1x (`terrainScale = 1`, bilinear). A 2x terrain canvas would be 8.3 MB per layer.
  - Per merged dirty rect (the blast box plus 4 px margin): two box-blur passes (radius 2) over the solid mask give `S` in 0..1. Out-of-bounds counts as the nearest in-bounds cell, so there is no ink at the screen edges. An ink-alpha LUT peaks at `S = 0.5` and is about 4.5 px wide. Fill and ink are composited into the chunk canvas through `Uint32Array` views.
  - **Cost budget (assumed, mid-range 2020 phone):** mask erase 0.2 ms, blur and composite 1.0 ms for a 150x150 rect, upload 1.5 to 2.5 ms for up to 4 chunks. Target median 3 ms and p95 6 ms per blast frame. Pollen's 5 puffs are merged into one pass.
  - **Fallback ladder:** if the 3-blast moving average is over 6 ms, (1) drop to a 1-bit edge plus a fixed stroke LUT; (2) spread the visual over 2 frames (the sim is already correct, so this is cosmetic); (3) shrink soft-material craters in the visual only (never in the sim).
- **Reason:** It meets DR-001's 1 ms-per-frame limit (the work happens only on blast frames, never per frame), and the rounded inked crater comes from the same mask the sim reads.
- **Rejected:** a full-canvas regen (~4x the cost); marching squares (more code, jaggier at 1 px).
- **Revisit if:** the build-stage perf probe on a real device exceeds p95 8 ms. Then use the fallback ladder before changing the pipeline.
- **Judge:** Accepted.

## DR-025 · Level authoring and data format
- **Question:** Hand-authored masks, procedural, or hybrid for 100 levels?
- **Options:** (1) hand-authored SVG/PNG masks for all · (2) fully procedural at runtime · (3) hybrid: a procedural base plus authored stamps, compiled at build time
- **Debate (compact):**
  - GD: 100 levels need variety and the 10 bosses need fortress designs, but the 70 teach/test/rest levels can share recipes.
  - AD: stamps are SVGs that we already know how to draw, with material colour-coded fills. It's about 60 stamps total.
  - TL: runtime noise risks float differences across engines. A build-time compile checked in as RLE bytes is deterministic, visible in review, and the test can load it under Node.
- **Winner:** (3).
  - **Pipeline:** a Node tool compiles each recipe to a material mask and packs it as a row-major RLE `.mask` (value, varint run) read in TS with no canvas, so no colour-management issues. Expect 5 to 15 KB per level.
  - **Base:** an integer-hash 1D heightfield by preset (`rolling`, `valleys`, `plateau`, ...).
  - **Stamps:** about 6 per biome, with material colours in the SVG.
  - **Bosses:** the 10 boss masks are hand-authored.
  - **Output:** a contact sheet per biome for review, and a validation test.
  - **Authoring rules:** solid features at least 6 px thick, tunnels at least 48 px high, no spawn embedded in solid, every spawn reachable on foot or by a one-shot shortcut.
  - **JSON per level:** `id`, `biome`, `name`, `seed`, `size [960,540]`, `mask` (path), `checksum`, `theme`, `base {preset, baseY, amp, rough}`, `stamps [{id, x, y, flip}]`, `spawns [{team, x}]` (y resolved by ground scan), `bottom` (`void`, `water`, `floor`), `waterY`, `zones [{type, rect}]` (wind and hazard zones, owned by the wind DR), `boss` (bool).
- **Reason:** About 1 recipe plus 1 eyeball pass per level is feasible for one builder, and the masks are fixed, reviewable bytes. This keeps pillar 4 (same input, same result).
- **Rejected:** all hand-drawn (100 SVG masks is too much); runtime procedural (platform float drift, can't review).
- **Revisit if:** recipe levels look samey in playtest (then add stamps, not noise).
- **Judge's ruling:** Merged with DR-056 (J19). DR-056's biome kits and slot templates are the authoring plan. This record's build-time compile to RLE `.mask` is how the plan is built. PLAN §6 has the single merged schema.

## DR-026 · Out of bounds, hazards and fall damage
- **Question:** What happens at the edges and on falling?
- **Options:** (1) void bottom that KOs, sides walled for ants, open top · (2) a bedrock floor everywhere · (3) all edges are void
- **Debate (compact):**
  - GD: a fatal bottom gives stakes and knockback tactics, but falls must not be nasty or unfair (pillar 1).
  - AD: a splash and a comic "WHEEE" read funnier than a bare death.
  - TL: walls on the sides mean we never lose ants or projectile state; a projectile removal margin is cheap.
- **Winner:** (1).
  - **Bottom** (per-level `bottom`):
    - `void`: an ant whose feet go below y = 580 is KO'd with a comic fall and a "dizzy" face (DR-005/CREATIVE: no injury shown). This is the default.
    - `water`: the bottom band (`waterY`) is WATER. An ant that stays in it for 6 ticks is pulled to the nearest dry standing point within 200 px, found by a deterministic scan. It takes no damage and loses its next turn.
    - `floor`: used only for tutorial levels.
  - **Sides:** invisible walls for ants only at x = 24 and 936, so knockback past them is clamped. Projectiles fly out freely and are removed beyond x < -150 or x > 1110 (a Dewdrop bounce can return).
  - **Top:** open. Lobs may leave the screen and are removed beyond y < -2000, and an edge arrow marks an off-screen projectile.
  - **Projectiles in water:** they fizzle with a splash and no blast, except Dewdrop, which skips (e = 0.5).
  - **Fall damage:** yes, mild. `h` is the free-fall distance in px. If `h <= 90` (about one ant length), 0. Otherwise `min(20, ceil((h - 90) / 9))`. It is halved on SOFT, 0 on BOUNCY and WATER. Fall damage never takes an ant below 1 HP, so a fall alone cannot KO it.
- **Reason:** It keeps stakes (void) and slapstick (splash, boing), with no cruel randomness.
- **Rejected:** a bedrock floor everywhere (no stakes); a void on the sides (ants lost off-screen).
- **Revisit if:** playtesters call void deaths cheap (then add a one-time "leaf rescue" per match), or fall damage hides shot damage (then raise the free height).
- **Judge's ruling:** Amended (J3, J4). This fall-damage formula wins, and DR-036's fall line is removed. These projectile despawn bounds win over DR-038's. Dew sudden death (DR-044) reuses the WATER line code, but it knocks out instead of swimming back.

## DR-027 · Ant footprint in the sim
- **Question:** What are the in-game drawn size and collision shapes? (Resolves the open item "final in-game ant size".)
- **Options:** (1) drawn 96x69 · (2) drawn 88x63 · (3) drawn 72x51
- **Debate (compact):**
  - GD: bigger ants are easier to hit and to read, but 8 ants at 96 px crowd the arena and make a 28 px Seed crater feel tiny.
  - AD: 88 px keeps the side pose's six legs visible. At 667x375 (scale 0.695) that is about 61x44 px on screen, above the 48 px floor.
  - TL: the hurtbox must be much smaller than the sprite so near-misses look fair and the blast radii in DR-002 stay meaningful.
- **Winner:** (2).
  - **Drawn:** 88x63 logical px (the 140x100 side frame at 0.63). It does not go below 48 px wide. Bosses are 1.6x. The small LOD of DR-006 applies.
  - **Terrain body** (DR-023): feet at x = -16, 0, +16, wall probes at x = +/-26, a head probe at 44 px.
  - **Hurtbox:** a horizontal capsule, radius 16, centre 22 px above the feet, straight segment x = +/-12, so 56x32 px. Blasts and direct hits test the circle against this capsule.
  - **Origin:** the sprite origin is at the centre-bottom (feet).
- **Reason:** It is a size that reads on phone and still leaves room for 8 ants. The 56x32 hurtbox is 64% of the drawn width, so hits feel earned.
- **Rejected:** 96x69 (crowding); 72x51 (0.69 scale gives about 50x35 px on screen, too close to the 48 px floor).
- **Revisit if:** 667x375 playtests cannot tell the pose, or the roster goes over 4 ants per team (then drop to 80x57).
- **Judge:** Accepted (J1). This hurtbox replaces the r=14 body circle that DR-035 assumed. Ants per side are capped at 4 (J10), so at most 8 ants share the 960 px arena.

---

# Checkpoint B · Physics, wind, movement and weapons (DR-030 to DR-038)

## DR-030 · Gravity, launch speed and integrator
- **Question:** What are g, the power-to-speed map and the integrator, and how far does a full shot go?
- **Options:** (1) g 600, v = 100 + 620p (p 0..1), semi-implicit Euler · (2) g 900, v up to 900 (snappier, harder to read) · (3) power maps to range directly (non-physical)
- **Debate (compact):** GD: A flat full shot should cover about 90% of the screen, so any two ants can hit each other and mid-power does the common 300-500 px work. / AD: Flight under 2 s keeps shots snappy and wobble-able. / TL: Semi-implicit Euler (v += a·dt, then x += v·dt) is stable, is a one-liner, and the aim preview and the sim share the same function.
- **Winner:** (1). g = 600 px/s². Speed v = wMul·(100 + 620·p), where p = power%/100 and wMul is a per-weapon speed multiplier (DR-034). Pod has wMul 1.0.
  - Full power at 45°: v = 720, range v²/g = 518400/600 = **864 px** (90% of width), flight time 2·720·0.7071/600 = **1.70 s**, apex 720²·0.5/1200 = **216 px**.
  - p = 50%: v = 410, range 280 px. p = 70%: v = 534, range 475 px. p = 0: v = 100, range 17 px.
- **Reason:** Typical shots of 300-500 px sit at 50-70% power, in the middle of the dial. A shot across the arena (840 px) needs about 98% power at 45°.
- **Rejected:** (2) 1.5× faster, too hard to read (pillar 2). (3) not deterministic physics, kills the wobble and bounce comedy.
- **Revisit if:** playtests show shots feel floaty (raise g to 700 and scale v_max by √(7/6) to keep range).
- **Judge:** Accepted.

## DR-031 · Wind strength and per-turn change
- **Question:** What does one wind level mean, and how does wind change between turns?
- **Options:** (1) integer levels −5..+5, a_w = level·25 px/s² × weapon factor · (2) continuous float wind · (3) levels −9..+9
- **Debate (compact):** GD: Levels 0-1 are nearly harmless (teach), 3 matters, 5 is a puzzle. / AD: 5 chevrons per side matches the preview gauge. / TL: Integer levels make the seeded schedule exact, so a next-turn hint can be shown.
- **Winner:** (1). K = 25 px/s² per level. Drift Δx = ½·a·T² (a = level·25·weapon factor, T = flight time):
  - A 500 px, 45° shot has T = 1.29 s (T² = 1.67). At level 5: Spitter (0.6) drifts **62 px**, Pod (0.8) **83 px**, Dewdrop (0.3) **31 px**. At level 1: Spitter 12 px (under its 28 px blast radius, so level 1 can be ignored).
  - Schedule: a dedicated wind RNG stream (separate from the pod-spread and bot streams) rolls wind one turn ahead. Each biome has `{maxAbs, maxStep, everyNTurns}`. At each change, W' = clamp(W + uniform int in [−maxStep, +maxStep]). The next turn's value is always known to the engine, so telegraphs are exact.
  - The wind is frozen at fire time for level wind. Wind never pushes ants, only projectiles.
- **Reason:** It is learnable, deterministic and telegraph-ready (pillar 4), and the gauge needs no decimals (pillar 2).
- **Rejected:** (2) unreadable. (3) needs more chevrons than fit the HUD.
- **Revisit if:** level 5 feels too weak or too strong in playtests. Retune K alone.
- **Judge:** Accepted. The bot-AI calibration (DR-063) uses K = 25.

## DR-032 · Wind field interface and biome mapping
- **Question:** What one interface fits all 10 biomes?
- **Options:** (1) one `WindField` interface with composable fields · (2) per-biome hardcoded wind · (3) full vector-field grid
- **Debate (compact):** GD: Every biome needs one new wind idea, so data-driven specs let me stack them. / AD: Each field needs a world prop (smoke, fan, sunflowers), so the field exposes a gauge and a hint. / TL: Fields are pure functions of (x, y, tick) plus state set at turn start, so replays stay exact.
- **Winner:** (1).
```ts
interface WindField {
  onTurnStart(turn: number, rng: Rng): void;              // only place RNG is used
  accel(x: number, y: number, tick: number): Vec2;        // px/s², at weapon factor 1, pure
  gauge(): { level: number; vertical: number; gust: boolean; next?: number };
}
```
  `CompositeWind` sums child fields. The projectile uses a = accel(x, y, tick) · weaponWindFactor. Three field types cover everything: **Level** (schedule rules), **Column** (a vertical or pull zone, cosine falloff, a half-width, strength in px/s² at factor 1) and **Oscillate** (A·sin(2π·t/P), on the global tick so its rhythm is learnable).
  - Biome mapping: 1 Level {max 2, step 1, every 1}. 2 Level {max 4, step 3, every 2}. 3 Level {max 1} + Column updraft 500 px/s², half-width 70 (boss grows to 700). 4 Level {fixed sign, 3..4} + gust turn +2 (bell). 5 Level swirl: magnitude 3 at 45° steps clockwise per turn, so Wx = round(3·cosθ) and Wy = round(3·sinθ), where Wy is a small up/down chevron. 6 Level {max 1} + gust turn 35% per turn of ±3. 7 Level 0 + gust turn ±5 (creak a turn ahead). 8 Oscillate A = 4, P = 6 s. 9 Level 0 + vent Column on 1 turn in 3 (telegraphed). 10 hood Column (upward pull) + fridge gust ±4 on alternating turns.
  - Boss "wind manipulation" is a scheduled gust or amplifier on the same fields. Total horizontal level clamps at ±5.
- **Reason:** All 10 biomes fit without special-case code, and every effect has a visible prop (pillars 2 and 4).
- **Rejected:** (2) 10 copies of the same math. (3) cost and authoring pain.
- **Revisit if:** a biome needs wind that depends on terrain shape (then add a terrain-aware field type).
- **Judge's ruling:** Amended (J9). The Column falloff is smoothstep, not cosine, and Oscillate uses the DR-011 table. This wind mapping is authoritative over the summary wind column in DR-050 (for example, Biome 8 amplitude 4). Boss tricks clamp to ±5. Garden swirl needs a small vertical chevron, which is flagged for UI.md.

## DR-033 · Aim input and preview
- **Question:** What are the angle and power steps, how is power set, and what does the preview show?
- **Options:** (1) set angle and power, then FIRE; short wind-free preview · (2) hold-to-charge, release to fire · (3) full-arc preview including wind
- **Debate (compact):** GD: A short launch line gives feel without solving the shot, and wind is the skill. / AD: The preview shows about 8 dots and a ring (as in the preview image), which is calm and readable. / TL: Set-then-fire is deterministic and forgiving of touch latency, and charge timing is frame-dependent and easy to bug.
- **Winner:** (1). Angle range −20°..+90° relative to facing. Facing flips for free by walking or a turn button. Step 1° fine, 5° coarse. Power 0..100% in steps of 1% (fine) or 5% (coarse). Hold-repeat: 15 steps/s for 0.3 s, then coarse steps at 10/s. Touch drag snaps to 1°. Each ant remembers its last angle and power per weapon. The first shot defaults to 45° and 60%.
  - Granularity check: at 548 px/s, 1% of power = 6.2 px/s, which moves the shot 2·548·6.2/600 = **11 px**. At 30°, 1° of angle moves it about 10 px. Both are well under a 28 px blast.
  - The preview uses the same integrator, with wind and fields zeroed. It shows 8 dots at 0.06 s spacing (0.48 s of flight), then a ring, and it stops at terrain. At full power that is about 345 px of arc, at 50% power about 197 px. An Assist setting shows 1.0 s.
- **Reason:** The player reads angle and power from the preview, and must read the gauge and props for wind (pillar 4). In the first 0.5 s, 5-level wind moves a shot under 9 px, so ignoring wind in the preview looks honest.
- **Rejected:** (2) timing luck, cannot be taught. (3) removes the wind skill.
- **Revisit if:** new players cannot hit the first 3 levels. Then default to the Assist preview.
- **Judge's ruling:** Amended (J9). Commands carry 0.1° and 0.1% resolution (DR-011 ruling). Player UI steps stay at 1°/5° and 1%/5%, and touch drag snaps to 1°.

## DR-034 · Weapon tuning (confirms DR-002, adds speed and ammo)
- **Question:** Are the DR-002 numbers right, and what are speed multipliers, ammo, bounce and spread?
- **Options:** (1) confirm damage, radius and wind as-is, tune the rest · (2) raise Pod damage · (3) lower Dewdrop to 40
- **Debate (compact):** GD: HP 100 means about 3 hits, which is the right rhythm. Ammo ∞/3/1 as shown in the preview. / AD: Dewdrop's wobble and pop need a readable 3 s countdown. / TL: A seeded fan plus small jitter keeps the pod spread fair and replayable.
- **Winner:** (1).

| Weapon | Dmg | r | Wind | wMul | Ammo per colony per match | Notes |
|---|---|---|---|---|---|---|
| Seed Spitter | 30 | 28 | 0.6 | 1.15 (v_max 828, flat 45° range 1143 px, needs ~83% power to cross) | ∞ | explodes on first contact |
| Dewdrop Bounce | 45 | 48 | 0.3 | 0.95 (v_max 684, 45° range 780 px) | 3 | fuse 180 ticks; restitution 0.55; tangential speed ×0.85 per bounce; bounces ≤3; below 60 px/s normal speed it rests; pops at fuse end or ant contact |
| Pollen Pod | 12×5 | 18 | 0.8 | 1.0 | 1 | bursts at apex if apex is ≥30 px above terrain, else at impact |

  - Pod fan: sub speed is 0.7× parent speed at burst, with offsets of −36°, −18°, 0°, +18°, +36° about the parent direction. At impact the base direction is the reflected velocity at 0.5×. Match-seeded jitter is ±4° and ±8% speed.
  - Approximate spread for a 500 px 45° shot (apex 125 px): the 5 puffs land between about +87 and +208 px past the apex, a span of about 120 px (hand-computed, verify in sim).
- **Reason:** Direct fire teaches wind, the lob teaches angles and timing, and the cluster teaches spread. None resembles a Worms weapon.
- **Rejected:** (2) the cap of 60 already dominates. (3) it would lose the "two good lobs = kill" tension.
- **Revisit if:** the headless sim shows Dewdrop dominating, or Spitter is too weak to teach wind.
- **Judge's ruling:** Amended (J12). This ammo row (∞ / 3 / 1, the approved preview tray) is the **two-player default**, replacing DR-057's 4/3. Campaign ammo per level comes from DR-052. The Dewdrop fuse is fixed at 180 ticks and is not player-set, so DR-060's 1/2/3 s fuse trial is removed.

## DR-035 · Damage model
- **Question:** How do falloff, direct hits, self-damage and knockback work?
- **Options:** (1) linear falloff from the ant body to the edge with direct-hit bonus · (2) flat damage inside the radius · (3) exponential falloff
- **Debate (compact):** GD: Near-misses should still hurt a little, and direct hits should reward skill. / AD: Knockback launches are the slapstick, so they should be big but not violent (dizzy, never hurt). / TL: Linear is one lerp, integer HP, no per-weapon curves.
- **Winner:** (1).
  - d = max(0, |blast centre − ant centre| − 14). If d ≥ r, no damage. Otherwise dmg = round(base · lerp(1, 0.25, d/r)). Minimum 1 HP.
  - Direct hit means the projectile touched an ant body: ×1.2 (Spitter 36, Dewdrop 54, puff 14).
  - Per-ant damage cap of 60 per shot (applies to clusters).
  - Friendly fire: on. Self-damage: on at ×0.5, floor 1 HP (cannot suicide by shell).
  - Knockback speed = min(600, 8 px/s per HP dealt), direction away from the blast, at least 25° above horizontal. Check: a 54 HP direct hit gives 432 px/s at 60°, so range 432²·0.866/600 = 269 px and apex 117 px. A 20 HP splash gives 160 px/s, about 37 px.
  - Airborne ants take full damage, no bonus.
- **Reason:** It rewards accuracy without a one-shot lottery, and launches stay funny and readable. Two direct Dewdrops kill (108), three direct Spitters kill (108).
- **Rejected:** (2) no reward for precision. (3) hard to teach.
- **Revisit if:** two-direct-hit kills trivialise bosses. Then drop the direct bonus to ×1.1.
- **Judge's ruling:** Amended (J1). d is measured to the DR-027 capsule surface: `d = max(0, dist(blast, capsule segment) − 16)`.

## DR-036 · Ant movement (motion side only)
- **Question:** What are walk speed, slope limits, hops, budget and slide rules?
- **Options:** (1) distance budget 160 px per turn, jump costs · (2) time budget · (3) unlimited walk
- **Debate (compact):** GD: A budget makes positioning a decision, and the hop/back-flip are fun verbs. / AD: The back-flip must look silly and the budget meter must be one bar. / TL: Distance is deterministic and easy to display. Surface friction is a numeric parameter that terrain supplies.
- **Winner:** (1).
  - Walk speed 80 px/s. Budget 160 px of horizontal distance (2.0 s). Unused budget does not carry over.
  - Auto step-up ≤8 px. Max walkable slope 45°; speed is full to 30° and falls linearly to 40 px/s at 45°; steeper is blocked.
  - Forward hop: v = (150, −300). Apex 300²/1200 = 75 px, range 150 px, 1.0 s, cost 50.
  - Back-flip: v = (−110, −420). Apex 147 px, range 154 px, 1.4 s, cost 80.
  - No air steering. Fire ends the turn. Ants use g = 600 when knocked or falling.
  - Fall damage: free fall above 100 px costs 0.25 HP per extra px, cap 25, never lethal (leaves 1 HP). The terrain debate owns hazards that remove the ant.
  - Normal surfaces stop the ant instantly. Slick tiles use decel 90 px/s² (stops a 80 px/s walk in about 35 px) and slide downhill on slopes over 10° at 0.5·g·sinθ.
- **Reason:** It supports tight positioning without turning into a platformer.
- **Rejected:** (2) harder to read. (3) removes the positioning decision.
- **Revisit if:** back-flip feels too strong. Lower to (−100, −380).
- **Judge's ruling:** Amended (J2, J3, J6). "Fire ends the turn" is replaced by DR-042's retreat: leftover move budget can be used for 3 s after firing. The fall-damage line is replaced by DR-026. Step-up 8 px wins over DR-023's 10 px.

## DR-037 · Boss cluster template
- **Question:** What generic cluster spec do bosses use, and how do biomes flavour it?
- **Options:** (1) one `ClusterSpec` plus a flavour table · (2) bespoke code per boss · (3) reuse the player's Pollen Pod
- **Debate (compact):** GD: Bosses should out-spread the player but never one-shot (cap 60 per ant). / AD: Each flavour changes the sprite and the sound, and one mechanical twist. / TL: The template is data, and the sub-projectile class is the same as Pod puffs.
- **Winner:** (1). `{count, fanDeg, subDmg, subR, windFactor 0.8, speedMul 0.7, burst 'apex', cooldownTurns 3, perAntCap 60, flavour}`. Boss b (1..10): count = 5 + floor((b−1)/3) (5, 6, 7, 8), subDmg = 8 + floor((b−1)/2) (8..12), subR 20, fan = ±(count−1)·9°. Max total: b1 = 40, b10 = 8·12 = 96 (capped at 60 per ant). Expected 2-3 hits, about 20-36.
  - Flavour table (modifiers to gravity, wind, restitution, count, damage, radius): 1 seed (none). 2 wood-chip (wind ×1.2). 3 puff (gravity 0.6, wind ×1.2). 4 gravel (gravity 1.2, wind ×0.5). 5 pea (restitution 0.5, one bounce). 6 sesame (count +2, dmg −2, r 14). 7 button (restitution 0.6, one bounce). 8 lint (gravity 0.5, wind ×1.25, r 24, dmg −2). 9 sugar cube (r 22). 10 sprinkle storm (count +4, dmg −2, spawned from the sky, x offsets seeded).
- **Reason:** One template and one data table cover all 10 bosses. It stays fair via the cap and telegraphed cooldown.
- **Rejected:** (2) 10 code paths. (3) no escalation.
- **Revisit if:** playtests find boss clusters unreadable. Reduce count first.
- **Judge's ruling:** Amended (J13). These numbers win over DR-053's (5–7 pellets, ≤ 75 total), and the per-ant cap of 60 keeps "no one-shot". The cluster fires on the boss loop's cluster round (DR-053), which replaces `cooldownTurns`.

## DR-038 · Projectile limits and settle rules
- **Question:** How many sub-steps, how long can a flight last, and when is a shot "over"?
- **Options:** (1) sub-steps by speed, 8 s flight cap, 0.5 s rest · (2) fixed 4 sub-steps · (3) continuous collision
- **Debate (compact):** GD: A shot never stalls the game, and a fizzle is a joke ("pffft"). / AD: The camera should linger on the funniest outcome, not on the first impact. / TL: The fastest Spitter is 828 px/s = 13.8 px/tick, so 4 sub-steps. The same code runs in the preview.
- **Winner:** (1). Sub-steps n = clamp(ceil(|v|·dt / 4 px), 1, 6), each with dt/n. Max flight 8 s (480 ticks), then fizzle. Despawn when x < −120 or x > 1080, or y > 740 (void).
  - The shot is over when no projectiles, fuses or pending bursts remain, and every ant and debris body is grounded at under 8 px/s for 30 consecutive ticks (0.5 s), and terrain collapse is idle. Hard timeout 12 s after fire: snap bodies to the ground and end.
  - Camera: follow the projectile with lerp, hold 0.4 s on the blast, then pan to the largest knockback, then back to the next ant.
- **Reason:** No tunnelling, no softlock, and a predictable turn handoff (pillar 4).
- **Rejected:** (2) wasteful when slow. (3) over-engineered.
- **Revisit if:** the camera pans feel slow. Drop the hold to 0.25 s.
- **Judge's ruling:** Amended (J4, J5, J7). The settle rule (all bodies under 8 px/s for 30 ticks) and the 12 s hard cap win over DR-042's 20 ticks and 15 s. Sub-steps and despawn come from DR-023 and DR-026. The camera hold of 400 ms followed by a knockback pan is merged into DR-046.

---

# Checkpoint B · Game loop and turn flow (DR-040 to DR-048)

## DR-040 · Meta loop and acorn rating
- **Question:** What is the screen flow, what earns acorns, and what happens on a loss?
- **Options:** (1) acorns from win, HP left and turns · (2) win + no ant lost + under par turns · (3) win only, no rating
- **Debate (compact):**
  - GD: HP left punishes bold play, because trading shots is the fun. "Keep every ant" and "be quick" are two clear goals a 9-year-old can state.
  - AD: three acorns need three readable icons on the results card, each lit or dim with a one-line reason.
  - TL: all three tests come from the match log (ants lost, own turns taken), with no extra tracking.
- **Winner:** (2)
  - Flow: Title → Level select → Comic (only before a biome's first level, skippable, replayable from the map) → Battle → Results → Next level or Level select.
  - Acorns: 1 for a win. +1 if no own ant is knocked out. +1 if won within the level's par (own turns, set in level data).
  - Par default is 6 own turns for a 3v3, and bosses get a larger par.
  - Acorns are bragging rights only and gate nothing. A win unlocks the next level. A boss opens after L9 is won.
  - Loss: card "Dizzy! Try again?" with Retry (same seed, pillar 4) and Map. After 2 losses in a row, Dot adds a one-line tip.
  - Two-player gives no acorns.
- **Reason:** The rules are simple, they are fair to each play style, and the same seed on retry lets the player learn from the loss.
- **Rejected:** HP-left scoring (punishes trades); no rating (no replay reason); acorn gating (blocks kids on a hard level).
- **Revisit if:** most players land on 2 acorns, or par feels arbitrary.
- **Judge's ruling:** Amended (J17). The default par is set in DR-055's judge note. Two-player gives no acorns.

## DR-041 · Teams, HP and ant order
- **Question:** How many ants per team, with what HP, and who acts when?
- **Options:** (1) fixed rotation within a team, teams alternate · (2) the player picks the ant each turn · (3) one ant per team
- **Debate (compact):**
  - GD: picking an ant adds a strong tactic, but it needs a selector UI and slows the loop on a phone. Fixed rotation keeps turns snappy.
  - AD: the next ant is shown by a bobbing arrow above it, which is one cue and nothing more.
  - TL: a rotation index per team keeps the state tiny and the replay log simple.
- **Winner:** (1)
  - Campaign: 3 player ants vs 3 rival ants by default. L1–2 use 2v2 and L3 uses 3v2 as the teach ramp.
  - A level may set 1–4 ants per team in its data.
  - Boss levels: 3 player ants vs the boss plus 2 minions. Boss stats go in the boss decision.
  - Ant HP is 100 (matches the preview).
  - Teams alternate, and within a team ants cycle in a fixed order, skipping knocked-out ants.
  - Campaign: the player moves first. Two-player: a seeded coin flip picks the first team.
  - The next ant carries the arrow, and the turn banner names the team.
  - Two-player default is 3v3, with a 2, 3 or 4 selector in match setup.
- **Reason:** It is predictable and quick, and it keeps the input log small.
- **Rejected:** player-picks (UI cost, slower turns); 1v1 ants (no rotation, so no variety in positions).
- **Revisit if:** playtesters say "my best ant is stuck behind a bad one". Then add a swap-once-per-round button.
- **Judge's ruling:** Amended (J10). 3v3 (selectable 2–4) is the **two-player** default. Campaign team sizes come from DR-050 as amended, with a cap of 4 per side.

## DR-042 · Turn phases as a state machine
- **Question:** Which phases make up a turn, and how long is each non-interactive one?
- **Options:** (1) separate Retreat phase after the shot resolves · (2) retreat window running alongside the shot · (3) no retreat
- **Debate (compact):**
  - GD: a short retreat is how Dewdrop Bounce's 3 s fuse becomes a decision. Running it alongside the flight avoids dead air.
  - AD: banner and wind tick must land in under a second, then the ant gets the spotlight.
  - TL: every gating phase is tick-counted in the sim. Banners and camera are render-only and never gate the sim except TurnStart.
- **Winner:** (2). The states are in the PLAN draft below, with these durations:
  - TurnStart: 900 ms (banner 300 in, 400 hold, 200 out; wind tick 400; camera pan 500).
  - Fire: 300 ms of input lock. The shot spawns at 300 ms (18 ticks) after a 120 ms squash.
  - Resolve: the retreat window is 3000 ms from the shot. The state ends when the window has elapsed and every body has been at rest for 20 ticks.
  - Resolve hard cap: 900 ticks (15 s) from the shot. At the cap the sim force-settles.
  - TurnEnd: 700–1800 ms depending on what happens. Knock-out 1200 ms (parallel), sudden-death rise 800 ms, pickup drop 700 ms, boss telegraph card 1200 ms (only when due), then the win check and wind roll.
  - A typical turn has about 2.6 s of non-interactive time. A tap fast-forwards TurnEnd at 2x.
  - Input buffering: a press up to 120 ms before a phase turns interactive is applied when it does.
- **Reason:** This gives a fast loop, a retreat decision, and a single state machine for the sim, the replay and the bots.
- **Rejected:** retreat after resolve (dead time); no retreat (the fuse is pointless).
- **Revisit if:** playtesters say turns feel long. Then cut TurnStart to 600 ms.
- **Judge's ruling:** Amended (J5, J8). The buffer windows come from DR-015, and the settle rule and cap from DR-038. The retreat window wins over DR-036's "fire ends the turn" (J6).

## DR-043 · Turn timer
- **Question:** How long is a turn, and what happens at zero?
- **Options:** (1) 30 s with skip on timeout · (2) 24 s as in the preview with auto-fire · (3) no timer
- **Debate (compact):**
  - GD: touch aiming needs time. Auto-fire at zero fires mistakes, so timeout just skips the turn.
  - AD: the last 5 s pulse the number, with a shape change as well as colour, and a tick sound.
  - TL: the timer counts sim ticks, not wall time. It stops while paused or the tab is hidden.
- **Winner:** (1)
  - 30 s for Move + Aim, starting once TurnStart ends (after the tap gate in two-player).
  - Aiming does not pause it.
  - A shot already fired stays fired.
  - At 0: the turn is skipped, with an "Oops, too slow!" pop. Nothing is fired.
  - The timer is off during Resolve and the retreat window.
  - Settings option "Relaxed turns": off or 60 s. In single-player it applies at once. In two-player it is a match-setup toggle.
- **Reason:** It keeps the pace without punishing slow thumbs, and the accessibility path is explicit.
- **Rejected:** auto-fire (accidents); 24 s (tight on touch).
- **Revisit if:** more than 15% of turns time out in playtests.
- **Judge's ruling:** Amended. Teach levels (L1–3 of each biome) use the 60 s relaxed timer. This is DR-051's "no timer pressure".

## DR-044 · Match end and sudden death
- **Question:** How does a match end, and how do we stop stalemates?
- **Options:** (1) rising dew after round 20 · (2) all ants to 1 HP · (3) turn cap with HP tiebreak only
- **Debate (compact):**
  - GD: all-to-1-HP is a coin flip and wastes the player's skill. A rising flood forces moves.
  - AD: "dew" is a gentle teal tide with bubbles that carries a swamped ant home in a bubble. It is family-friendly, with no harm shown.
  - TL: it is one hazard line that rises by a fixed amount per round. That is deterministic, trivial to replay, and shares the water code.
- **Winner:** (1)
  - Win: the other team has no active ants.
  - Draw: both teams end on the same TurnEnd with no active ants. The campaign counts it as a loss (Retry). Two-player shows "Draw" with Rematch.
  - A round is one turn each. A warning banner shows at round 18.
  - From round 21 the dew rises 24 px per round. An ant under the line is knocked out.
  - Boss levels start at round 30.
  - Hard cap at round 40: the team with more total HP wins, and a tie is a draw.
- **Reason:** It ends every match, it uses skill, and it stays gentle in tone.
- **Rejected:** 1 HP for all (luck); cap and tiebreak alone (stalling is still possible for 40 rounds).
- **Revisit if:** the terrain debate has no water hazard. Then I use the "sap tide" as a plain rising overlay.
- **Judge:** Accepted.

## DR-045 · Local two-player flow
- **Question:** How does hot-seat handover work, and how is a match set up?
- **Options:** (1) tap-to-start ready card each turn · (2) auto handover with no gate · (3) hidden aim for the waiting player
- **Debate (compact):**
  - GD: nothing is secret, since aim and map are public, so hiding aim is pointless. A ready gate stops the timer burning while the phone moves.
  - AD: a banner with the team badge and name ("Amber Colony's turn") plus the next ant's arrow. The gate is a big jelly button.
  - TL: the gate is one input-wait state at the end of TurnStart. It is logged as a normal input.
- **Winner:** (1)
  - Every turn in two-player ends TurnStart with a "Tap to start" gate. Tap, Space or Enter all work.
  - Aim and wind are never hidden.
  - Controls are identical for both players, with no mirroring: FIRE bottom-right, aim pad bottom-left (DR-003 layout seeds).
  - Setup screen: map pick from unlocked biomes (the first biome is always open) plus a seeded random terrain, with a "shuffle" button showing the seed number. Ants per team (2–4). Relaxed timer. Honey drops (default off). A swap-colours button.
  - Default colours: Player 1 Blue circle, Player 2 Amber triangle (DR-003).
- **Reason:** It keeps the timer fair, and it is clear on a shared phone.
- **Rejected:** no gate (the timer burns during a handover); hidden aim (no secrets to hide).
- **Revisit if:** two players on keyboard find the gate annoying. Then add a "Quick handover" setting.
- **Judge:** Accepted.

## DR-046 · Camera rules
- **Question:** What does the camera do each phase, and how does it respect reduced motion?
- **Options:** (1) always follow the action, with free drag pan · (2) fixed whole-map view · (3) manual camera only
- **Debate (compact):**
  - GD: following the shot makes misses funny and readable. Free pan lets the player study the map before aiming.
  - AD: zoom 1.15 on the ant at turn start, 1.2 on the shot, and a 600 ms hold on the blast. This matches the CREATIVE hit-stop and shake notes.
  - TL: the camera is render-only and never touches the sim state. It uses a smoothed follow, not physics.
- **Winner:** (1)
  - TurnStart: pan and zoom to the ant, 500 ms ease-out cubic, zoom 1.15.
  - Move/Aim: the camera is steady. A drag on the world area pans, clamped to the world. The aim pad and buttons are excluded from the drag.
  - Fire: the pan snaps back to the ant when FIRE is pressed. The camera then follows the projectile with an 180 ms smoothing time constant, a 40 px look-ahead, and zoom easing from 1.15 to 1.2.
  - Impact: hit-stop 75 ms, shake amplitude = blast radius × 0.15, capped at 6 px, over 220 ms. The camera holds on the blast for 600 ms, then returns to full view.
  - Reduced motion (and `prefers-reduced-motion`): no shake, no zoom (stays 1.0), no hit-stop. Pans become a 150 ms cut.
- **Reason:** It is readable, it is cheap, and it honours the accessibility setting.
- **Rejected:** a fixed map (loses the funny follow); manual-only (extra thumb work).
- **Revisit if:** the terrain debate sets a world larger than 960x540. Then add edge-pan limits.
- **Judge's ruling:** Amended (J7). After impact: hold 400 ms, follow the largest knockback until it lands, then return (DR-038). Zoom never exceeds 1.25 (DR-020).

## DR-047 · Pause, quit, resume and saves
- **Question:** What does pause offer, and what is saved mid-match?
- **Options:** (1) save between levels plus a mid-match replay snapshot · (2) save between levels only · (3) full state snapshot
- **Debate (compact):**
  - GD: a phone call mid-boss should not lose the match, so mid-match saves earn their cost.
  - AD: the pause menu is a butter panel with four big jelly buttons.
  - TL: the sim is deterministic, so the save is the seed plus the input log, written at each TurnEnd. That is a few KB. Resume re-simulates headless in about 3 s at most.
- **Winner:** (1)
  - Pause button: top corner, 56 px. It freezes the sim and the timer.
  - Auto-pause when the tab is hidden.
  - Menu: Resume, Restart, Settings, Quit to map (with confirm).
  - Quit costs nothing: no loss is recorded and no acorns are lost.
  - Progress save (localStorage in try/catch): unlocks, acorns, settings. It is written after each level.
  - Match save: one slot per mode, holding {levelId or setup, seed, build id, input log}.
  - Resume shows "The ants are remembering…" while it fast-forwards. A build mismatch or a failure offers Restart instead.
  - Progress is kept if storage is blocked, with a notice that saves are off.
- **Reason:** It is small, it relies on determinism, and it protects phone play.
- **Rejected:** a full snapshot (the terrain mask makes it large); level-only saves (a lost boss fight).
- **Revisit if:** replay resume takes more than 3 s on a mid-range phone, or floating-point differences break a resume (A5). Then snapshot the mask as RLE.
- **Judge:** Accepted. The save keys follow DR-018's judge note.

## DR-048 · Pickups (v1 minimal)
- **Question:** Do crates appear, and which?
- **Options:** (1) one pickup, the Honey Drop, in authored spots plus an optional two-player toggle · (2) none · (3) several crate types
- **Debate (compact):**
  - GD: STORY promises loot on rest levels, so something must exist. Random drops add luck, so two-player is off by default.
  - AD: a honey drop on a tiny leaf glider is cute and reads at 40 px.
  - TL: one type means one code path. It is placed by level data or by the seeded RNG at TurnEnd.
- **Winner:** (1)
  - Honey Drop: +25 HP, capped at 100.
  - Campaign: placed in level data. L9 rest levels get 3, other levels 0–1.
  - Two-player: the toggle is off by default. When on, one drops every 3rd round at TurnEnd (700 ms leaf-glider fall).
  - Collected by walking onto it, including during the retreat window.
  - A blast on it pops it with no effect, and a drop into the dew is lost.
  - Seed Bundle (extra ammo) is deferred to v1.1, because ammo is still undecided (A3).
- **Reason:** It gives the rest levels a purpose with the least new code.
- **Rejected:** none (the "loot" promise breaks); several types (UI and balance cost).
- **Revisit if:** playtesters never use honey, or ammo scarcity needs a refill.
- **Judge's ruling:** Amended (J11). There is a second pickup, the **Seed Bundle** (+2 Dewdrop, +1 Pollen). It is what DR-051, DR-052 and DR-057 call "loot crates". In two-player both pickups sit behind the one toggle (default off) and drop every 3rd round, which replaces DR-057's 4.

---

# Checkpoint B · Campaign and bosses (DR-050 to DR-057)

## DR-050 · Difficulty curve across 100 levels
- **Question:** What scales with level, what stays flat, and what are the numbers per biome?
- **Options:** (1) scale everything: HP, wind, counts · (2) scale only AI level and rival count; keep HP and ant stats flat · (3) fixed difficulty per biome, no within-biome ramp
- **Debate (compact):** GD: Flat HP keeps "100 HP" readable and fair (pillar 4). Count, wind and AI carry the ramp. / AD: At most 9 ants on a 960x540 screen, so the rival count caps at 5 and the player team at 4. / TL: Flat HP means fewer tuning knobs. The AI index is just the global level, so level data needs no AI numbers.
- **Winner:** (2). **Scales:** rival count, wind range, terrain feature count (1 + biome tier, max 8), AI index. **Flat:** ant HP 100, weapon stats, turn timer, ants have no armour. Rival HP stays 100 everywhere except bosses (DR-053).
- **AI rule:** AI index = global level 1–100. Rest levels (L9) use AI index = level − 8, which is the biome's first tier. The boss uses its own level number. The error math lives in the AI debate.

| # | Biome | Player ants | Rival ants (L1→L8) | Rival HP | Wind (−5..+5 magnitude) | New mechanic | AI band |
|---|---|---|---|---|---|---|---|
| 1 | Jungle Home | 1 in L1, then 2 | 1→3 | 100 | 0–2 steady | wind gauge, tearing leaf bridges | 1–10 |
| 2 | The Clearing | 2 | 2→3 | 100 | 0–3, changes every 2 turns | sawdust mega-craters, hollow-log tunnels | 11–20 |
| 3 | The Camp | 3 | 2→4 | 100 | 0–2 plus smoke updraft zone | bouncy canvas, springy marshmallow | 21–30 |
| 4 | The Trail | 3 | 3→4 | 100 | 3–4 steady, strong | puddles (swim back, lose a turn), indestructible pebbles | 31–40 |
| 5 | Village Garden | 3 | 3→4 | 100 | 1–4, direction rotates each turn | rotating wind with sunflower preview | 41–50 |
| 6 | Picnic Park | 4 | 3→5 | 100 | 0–5 kite gusts | short strong gusts, bread layers | 51–60 |
| 7 | The Porch | 4 | 3→5 | 100 | 0–1 calm, door gust 5 | door-gust timing, plank gaps | 61–70 |
| 8 | Living Room | 4 | 4→5 | 100 | −3..+3 oscillating (fan rhythm) | predictable sweeping wind, cushions absorb blasts | 71–80 |
| 9 | The Pantry | 4 | 4→5 | 100 | 0 plus vent draft column | vision-blocking flour clouds | 81–90 |
| 10 | The Kitchen | 4 | 4→5 | 100 | ±4 hood and fridge | slick tiles, toaster pops terrain | 91–100 |

- **Reason:** The ramp comes from things players can see (count, wind, terrain), not hidden stat inflation. Pillar 4 demands a fair, learnable curve.
- **Rejected:** (1) a player cannot tell why they lost; (3) it kills the sense of progress.
- **Revisit if:** playtest win rate at L50 falls below 55% or above 85%. Then tweak the rival count first.
- **Assumed:** player ants cap at 4 and ants are never lost between levels.
- **Judge's ruling:** Amended (J10, J21). Rivals are capped at **4** (DR-027 crowding, since 9 ants × 88 px is too many). Player ants: B1–2: 2 (L1 is 2v1), B3–5: 3, B6–10: 4. Rivals (L1→L8): B1 1→2, B2 2→3, B3 2→3, B4 3, B5–7 3→4, B8–10 4. The wind column is a summary only, and DR-032 is authoritative.

## DR-051 · Teach / test / twist / rest / boss slot templates
- **Question:** What does each slot concretely mean, and which earlier idea does each biome's twist borrow?
- **Options:** (1) slots are labels only · (2) slots set rival count, ammo, scripting and AI index · (3) slots chosen per level by hand
- **Debate (compact):** GD: A slot must be a recipe, so authors never debate "is this a test level". / AD: Rest levels carry the comedy (loot crates, silly props), so players remember them. / TL: A slot template is a block of default fields that a level overrides.
- **Winner:** (2).

| Slot | Levels | Rivals (biome range) | Ammo | Specials |
|---|---|---|---|---|
| Teach | L1–3 | low end, 1 in L1 of Biome 1 | generous, 1 new thing only | scripted prompt card (Dot tip) on the first turn, wind-gauge highlight, no timer pressure |
| Test | L4–6 | middle to high | normal | new thing used against a smarter AI, no prompts |
| Twist | L7–8 | high end | normal | biome idea + one earlier-biome idea |
| Rest | L9 | 2 rivals, AI index = level − 8 | double ammo, 3 loot crates | silly gimmick (below), objective is "knock out all rivals", crates restock |
| Boss | L10 | boss + escorts | boss kit (DR-052) | DR-053 |

- **Twist pairings:** B1 leaf bridge + a one-time mid-level wind flip (a preview of Biome 2, no earlier biome exists) · B2 stump fort + tearing log bridge from B1 · B3 bouncy tent + sawdust-soft piles from B2 · B4 puddles + bouncy ramps from B3 · B5 rotating wind + puddle rain from B4 · B6 kite gusts + rotating wind from B5 · B7 door gust + jelly bounce from B6 · B8 fan oscillation + door gust from B7 · B9 vent draft + rotating vent from B5 · B10 slick tiles + fan sweeps from B8.
- **Rest gimmicks:** B1 coconut crates fall from the sky · B2 sawdust slide · B3 marshmallow trampoline park · B4 pebble bowling · B5 vegetable pinatas · B6 jelly bounce arena · B7 mat trampoline · B8 toy-block tower · B9 sugar-rush (speed-up crates) · B10 cake-slice buffet.
- **Reason:** Rest before a boss rewards the player, and the twist re-uses learned ideas (pillar 3 and 4).
- **Rejected:** (1) too vague; (3) too many inconsistent levels.
- **Revisit if:** testers call rest levels "too easy to be fun". Then raise rival AI by 4 and keep the loot.
- **Judge's ruling:** Amended. "Loot crates" are DR-048 pickups. "No timer pressure" means the 60 s relaxed timer (DR-043).

## DR-052 · Weapon unlocks and ammo
- **Question:** When do Dewdrop Bounce and Pollen Pod unlock, and how much ammo?
- **Options:** (1) all three from L1 · (2) staged: Seed L1, Dewdrop at the first test, Pollen after Boss 1 · (3) one new weapon per biome
- **Debate (compact):** GD: Seed alone teaches wind, then Dewdrop teaches angles, then Pollen teaches spread (the order in DR-002). / AD: An unlock pop-up with the weapon art is a satisfying beat. / TL: Unlock flags are one save integer.
- **Winner:** (2). **Seed Spitter L1** (L1–3 Seed only). **Dewdrop Bounce unlocks at L4** with a scripted card. **Pollen Pod unlocks as the reward for Boss 1** (L10), available from L11.
- **Ammo (per team pool):** Seed Spitter always unlimited. Dewdrop and Pollen are limited:

| Level type | Dewdrop | Pollen |
|---|---|---|
| Teach (L4+) | 5 | 3 |
| Test | 4 | 3 |
| Twist | 3 | 2 |
| Rest | 9 | 6, plus 3 crates (+2 each) |
| Boss | 4 | 3, plus crate every 3rd round |

- **Reason:** Unlimited Seed means a player can never be soft-locked.
- **Rejected:** (1) overload; (3) leaves late biomes weapon-poor.
- **Revisit if:** testers ignore Dewdrop. Then lower Seed damage in the weapon debate rather than ammo.
- **Judge:** Accepted for the campaign. Two-player defaults are in DR-034.

## DR-053 · Boss template
- **Question:** How do bosses work, and what is the telegraph rule?
- **Options:** (1) a tough ant that shoots harder · (2) fortress plus scripted wind trick plus cluster, on a fixed telegraphed loop · (3) random boss tricks
- **Debate (compact):** GD: A fixed loop is learnable and a second playthrough is easier (pillar 4). / AD: Every trick needs a character animation and a sound that the player can name ("the bell!"). / TL: The loop is a small state machine keyed by the boss's turn counter, so it is deterministic and testable.
- **Winner:** (2). **Template:**
  - **Boss ant:** 1.6× scale. **Fortress:** a hard outer shell plus a soft core, with one weak seam facing the player. Breaking the seam exposes the boss. Escorts stand on the fortress.
  - **4-round boss loop (R = the boss's own turns):**
    - R1: plain aimed shot.
    - R2: **TELEGRAPH.** The cue plays at the start of the round and a "next round" icon shows on the HUD. The wind gauge shows a ghost arrow of the coming wind. The boss fires a plain shot.
    - R3: **TRICK FIRES** at the start of the round. The wind is set to the trick value and the boss fires a plain shot using that wind. The "cluster loading" cue plays.
    - R4: **CLUSTER** fires, and the wind decays back.
  - The player always gets one full turn between the cue and the trick.
  - **Boss AI:** uses the AI index of its level. It reads the real wind at fire time, including the trick wind it made, and then applies the normal error model. It does not aim better because of the trick.
  - **Cluster:** 5 pellets × 12 damage (B1–4), 6 × 12 (B5–8), 7 × 10 (B9–10). The cluster never does more than 75 damage, so no full-HP ant is one-shot.
  - **Phases:** at 50% HP (B3 and up) trick strength +1, the loop shortens by 1 round (3 rounds), and escorts refill to full. A phase change always has its own cue ("roar" plus a banner).

| # | Boss | HP | Phases | Trick (wind, rounds) | Telegraph cue (visual + sound) | Cluster | Escorts |
|---|---|---|---|---|---|---|---|
| 1 | Big Mama Leafy | 300 | 1 | leaf gust, away from boss, +3, 1 | giant leaf lifts + whoosh-rustle | seed cluster | 1 |
| 2 | Foreman Chip | 330 | 1 | sawdust storm, flips wind, 3, 2 | dust swirls + hammering clatter | wood-chip | 1 |
| 3 | Captain S'more | 360 | 2 | smoke thickens, updraft ×2, 2 | dark smoke puffs + crackle swell | puff | 2 |
| 4 | Sergeant Gravel | 390 | 2 | bike gust, 5, 1 | bell rings + bike whoosh | gravel | 2 |
| 5 | Rancher Rosa | 420 | 2 | vane sets wind, 4, 2 | weather vane spins + creak | pea | 2 |
| 6 | Duke of Crumbs | 450 | 2 | napkin flag gusts, +4 then −3, 2 | napkin flag stiffens + flap | sesame-seed | 2 |
| 7 | Lady Latch | 480 | 2 | door propped, sustained 3, 3 | door swings open + long creak | button | 3 |
| 8 | Sofa Sultan | 510 | 2 | fan to high, peak ±5, 3 | fan dial clicks + rising whine | lint-ball | 3 |
| 9 | Sugar Baron | 540 | 2 | vent draft, updraft ×2, 2 | vent grille rattles + sugar dust shivers | sugar-cube | 3 |
| 10 | Queen Gloria Glaze | 600 | 3 | see DR-054 | see DR-054 | sprinkle-storm | 2, then 0 |

- **Reason:** The cue-then-trick loop is learnable and always fair.
- **Rejected:** (1) no wind manipulation; (3) violates the telegraph rule.
- **Revisit if:** testers lose to a trick they say they did not see. Then lengthen the cue by 1 second and add an HUD banner.
- **Assumed:** boss HP is shown as a segmented bar. Boss ants have no blast resistance.
- **Judge's ruling:** Amended (J13, J15). The boss AI follows DR-063 (effective level min(100, L+5), true wind perception), not "its level". Cluster numbers come from DR-037. Trick wind clamps to ±5 (DR-032). Boss plus escorts never exceeds 4 (J10).

## DR-054 · Final boss: Queen Gloria Glaze
- **Question:** How does the 3-phase finale work?
- **Options:** (1) a bigger ordinary boss · (2) 3 phases that each add a system · (3) 3 separate fights
- **Debate (compact):** GD: Each phase teaches nothing new, it combines what the player already knows (hood from the updraft biomes, fridge from the fan biomes). / AD: Her throne cake visibly melts and slumps each phase, so progress reads. / TL: One boss, three config blocks keyed by HP thresholds.
- **Winner:** (2). **HP 600**, thresholds at 400 and 200, shown as 3 segments.
  - **P1 (600–400): The Hood.** The extractor hood pulls shots upward (updraft ×2.5, 2 rounds, loop R2 cue). Cue: hood light blinks, then a motor hum. Escorts: 2.
  - **P2 (400–200): The Fridge.** The hood alternates with the fridge gust (cold side gust 5, 1 round). Cue: door seal "thunk" plus a frost puff. The cake slumps and the shell cracks, exposing Gloria's seam. Escorts refilled to 2. Cluster: sprinkle storm of 7 × 10.
  - **P3 (200–0): The Duel.** Escorts leave. The toaster pops terrain up every 3rd round (cue: "ding" and a glow). The hood and fridge cues fire together on a 3-round loop, and each effect is shown as its own arrow in the HUD. Gloria climbs off the cake, so she is fully exposed on the counter.
  - **Defeat:** Gloria goes dizzy, is carried off on a leaf stretcher, and the epilogue panel plays.
- **Reason:** It is a graduation exam: every earlier cue returns in a form the player can read.
- **Rejected:** (1) anticlimactic; (3) breaks the HP bar.
- **Revisit if:** the clear rate for L100 is below 30%.
- **Judge's ruling:** Amended. Cluster numbers come from DR-037 (boss 10: 12 sprinkles × 10, capped at 60 per ant).

## DR-055 · Level unlocking and progression
- **Question:** How do players move through 100 levels without frustration?
- **Options:** (1) linear unlock, acorn gates · (2) linear unlock, no gates, skip after losses · (3) free level select
- **Debate (compact):** GD: Gating on acorns locks kids out, so acorns are bragging only. / AD: A skipped level shows a sticky-note bookmark, never a "failed" mark. / TL: Progress is three arrays in localStorage: cleared, acorns, skipped.
- **Winner:** (2).
  - **Unlock:** each level unlocks when the previous one is cleared or skipped. A biome's comic plays on first entry (replayable from the level select).
  - **Acorns:** 1 for a win, 2 if every own ant survives, 3 if also under the par turn count (`par` in the level data). Acorns are cosmetic rewards only (assumed: cap trims) and never gate anything.
  - **Skip:** after 3 losses in a row on the same level, a friendly offer appears: "Retry with a hint" or "Skip for now". Boss levels need 5 losses. A skipped level can always be replayed.
  - **Replay:** all cleared or skipped levels are replayable at any time. The AI index of a level never changes.
- **Reason:** Family accessibility (pillar 4) without removing the challenge.
- **Rejected:** (1) frustrating; (3) removes the teach/test/twist rhythm.
- **Revisit if:** more than 15% of players skip the same non-boss level. Then retune it.
- **Assumed:** a skipped final boss still shows the epilogue, with a "skipped" credit note.
- **Judge's ruling:** Amended (J17). Dot's tip comes after 2 losses in a row (DR-040), then the skip offer after 3 (5 on bosses). **Default par = 2 × rival ants + 2 own turns, and 14 for bosses**, tuned in playtests. This supersedes DR-040's 6 and DR-056's example value.

## DR-056 · Level production plan and data schema
- **Question:** How are 100 levels authored without 100 hand-built maps?
- **Options:** (1) hand-draw every level · (2) per-biome terrain kit + seeded layouts, hand-tuned bosses · (3) fully procedural levels
- **Debate (compact):** GD: Seeds let a designer reroll a layout until it feels right and then lock the seed. / AD: Each biome has 8–12 stamps (a stump, a tent, a pantry shelf) that match the art. / TL: A generator plus a headless validator (spawns stable, rivals in lob range, no spawn inside terrain) catches broken seeds in CI.
- **Winner:** (2). **Pipeline:** 10 biome kits (heightmap noise recipe + stamp list + background set) × per-level JSON; 90 levels are seeded, 10 bosses are hand-authored stamp lists. A CI test loads every level, runs the validator, and fails on any error.

```json
{
  "id": 37, "biome": 4, "slot": "test",
  "seed": 90417,
  "terrain": { "kit": "trail", "recipe": "ruts-pebbles", "features": 4, "stamps": ["pebble", "puddle"] },
  "spawns": { "player": 3, "rival": 4, "layout": "mirror-ish" },
  "rival": { "colony": "pebble-punchers", "ai": 37 },
  "wind": { "profile": "steady", "min": 3, "max": 4 },
  "ammo": { "dewdrop": 4, "pollen": 3 },
  "objectives": [ { "type": "eliminate" } ],
  "par": 14,
  "comic": "b4-p1"
}
```
- **Boss files** add `"boss": { "hp", "phases", "trick", "cue", "cluster", "escorts", "fortress": "stamp-list" }`.
- **Reason:** Seeded levels are cheap and deterministic. Hand-built bosses get the care that players remember.
- **Rejected:** (1) too slow; (3) bosses would feel samey.
- **Revisit if:** more than 10% of generated levels get rerolled in review.
- **Judge's ruling:** Merged with DR-025 (J19). PLAN §6 holds the single schema.

## DR-057 · Two-player maps
- **Question:** Which levels and arenas can be used in local two-player?
- **Options:** (1) campaign levels only · (2) one mirrored arena per biome, all open · (3) unlock by campaign progress
- **Debate (compact):** GD: Two kids at one screen cannot be asked to finish the campaign first. / AD: Mirrored arenas keep it fair and give each biome a poster-like stage. / TL: Arena = a seeded layout with mirror symmetry; same biome kit and wind profile.
- **Winner:** (2). 10 arenas (one per biome, using that biome's kit and wind), all unlocked from the start. Default 3 ants per side (2–4 selectable). Boss fortresses and boss tricks are excluded. Plus "Random arena" using a fresh seed. Ammo: Dewdrop 4 and Pollen 3 per team, crates every 4 rounds.
- **Reason:** Accessible fun for a visitor.
- **Rejected:** (1) too few arenas; (3) locks out guests.
- **Revisit if:** players ask for the boss fortresses as arenas.
- **Judge's ruling:** Amended (J12). Ammo uses DR-034's defaults, and pickups follow DR-048.

---

# Checkpoint B · Bot AI (DR-060 to DR-067)

## DR-060 · Shot solver, target, weapon, move-first
- **Question:** How does the bot find a "perfect" shot and pick target, weapon and position?
- **Options:** (1) full angle×power grid with `simulateShot` · (2) per-angle bisection on power, then local refine · (3) closed-form ballistics, ignoring terrain.
- **Debate (compact):** GD: Bots must use the same physics as the player, so they use `simulateShot`; terrain and bounces break closed forms. A bot that "cheats" with different physics would feel unfair.
  AD: The bot needs 0.8–2 s of visible thinking anyway (DR-066), so time-slicing across frames costs nothing in feel.
  TL: Range is monotone in power at a fixed angle, so bisect power (about 10 sims per angle). Cap the sims per turn and slice on a time budget.
- **Winner:** Option 2, time-sliced.
  - Per weapon: angles 15°–85° in 5° steps (15 angles). For each, bisect power to land the target (about 10 sims). Keep the top 3 angles by the score below, then do a 3×3 local refine at 0.25° and 0.25% steps (about 40 sims). Total ≤ 250 sims per weapon.
  - Candidates are the 2 best targets by a cheap pre-score (distance and HP) × 3 weapons = ≤ 1,200 sims hard cap per turn.
  - Slice budget is 4 ms per frame, and the solver must finish in ≤ 25 frames. At roughly 0.1 ms per sim on desktop and roughly 0.4 ms on a phone, that is about 0.5 s of CPU on a phone. It is hidden inside the think time.
  - Solver power is a float (0.1% resolution). See DR-061 on why integer power would break the cap.
  - Score = Σ enemy damage (from `simulateShot`, splash included) + 20 per kill + 0.2·(100−targetHP)/100 tiebreak, minus 1.5·selfDamage, minus 1.0·allyDamage. Choosing the best score covers target choice (lowest HP and most splash win naturally) and weapon choice.
  - Dewdrop fuse is tried at 1/2/3 s. Pollen Pod is scored by its 5 pod impacts.
  - Move first (≤ 3 stride candidates of 40 px, a reduced 8-angle grid each) only if best score < 12 or the best shot has self-damage > 5. Moving uses the turn's move allowance (DR-011+ owns it).
- **Reason:** One solver runs on the same sim as players, is deterministic, and fits a phone's budget.
- **Rejected:** Full 2D grid (about 3,000 sims). Closed-form ballistics, which cannot see terrain.
- **Revisit if:** Phone profiling shows the solver exceeds 25 frames, or `simulateShot` costs more than 0.3 ms.
- **Judge's ruling:** Amended (J9, J22). The fuse is fixed, so fuses are not searched. Tie-break: among candidates within 2 points of the best score, prefer launch angles of 40°–65°. In the planner's calibration, flat 30° shots were about 5 points less accurate at the cap. Angle and power resolution follow DR-011's ruling (0.1°, 0.1%).

## DR-061 · Error model (human-like, not a spray)
- **Question:** How is human-like error applied to the perfect solution?
- **Options:** (1) Gaussian noise on the impact point · (2) structured errors on the inputs: power, angle, wind perception, first-shot bias, brain-fart · (3) random pick from the top-N shots.
- **Debate (compact):** GD: Players read misses as "he forgot the wind" or "he pulled too hard". Input-space errors give exactly that, and follow-up shots close in like a person's bracketing.
  AD: The visible aim wobble (DR-066) should show the same angle and power the bot then fires with. Impact-space noise would look arbitrary.
  TL: Everything is a handful of draws from the AI RNG stream per shot, in a fixed order, so it is deterministic and costs nothing to run.
- **Winner:** Option 2. Per shot, with `u = level interpolation` (DR-063) and all draws N(0,1) from the AI stream, in this order:
  1. **Wind perception:** `W_perc = W_true·(1+k) + b·sign`, where k is an under-correction gain error (negative at low levels, 0 at cap) and b is a bias in wind levels. The solver is re-run with W_perc (power/angle re-solved by bisection on the perceived wind).
  2. **First-shot bias at a fresh target:** `E0 = B·s`. B is a random signed bias on power (% relative), s = ±1 from one draw. It shrinks on repeat shots at the same target: `E_n = E0·0.5^n` (n = previous shots at that target, reset on a new target), plus a small "lean-toward-last-impact" correction of 0.5×(last miss) in power and angle terms. This is the human bracketing.
  3. **Execution noise:**
     - `power_fire = power·(1 + σ_p·z1 + E_n)`
     - `angle_fire = angle + σ_a·z2`
     - Wind misjudgement also adds a per-shot jitter, `W_perc += σ_w·z3`.
  4. **Brain-fart, only for level ≤ 30:** with probability `p_bf` (12% at L1, falling linearly to 0 at L30), pick the 2nd–3rd best scored candidate instead of the best, or a weapon that is not optimal.
  - The cap floor (DR-064) applies after interpolation: the DR-064 floor (σ_p ≥ 1.35%, σ_a ≥ 0.8°, σ_w ≥ 0.05 levels).
  - Power must be a float with at least 0.1% steps. A 1% step at power ~60 is a 1.7% relative step, whose quantization σ (~0.5%) alone eats a large share of the cap budget. The player UI may still show integers (rounded fire value), but the physics API has to accept floats.
- **Reason:** Misses read as "he pulled too hard or forgot the wind", which is pillar 4. Calibration is easy because there are few parameters.
- **Rejected:** Impact-space noise. Top-N random picks, which can look dumb rather than human.
- **Revisit if:** Playtesters call early bots "random" or "psychic".
- **Judge's ruling:** Amended. The floor values are now in DR-064. `s_w` is a ±1 sign drawn per shot from the AI stream. The 'float power' requirement is met by per-mille power (DR-011).

## DR-062 · "Lethal radius" and the hit metric
- **Question:** What exactly counts as a hit for the cap and the tests?
- **Options:** (1) damage ≥ target's remaining HP · (2) d ≤ 0.6·blast radius of the chosen weapon · (3) any damage at all (d ≤ r).
- **Debate (compact):** GD: A 30-dmg seed cannot one-shot a 100 HP ant, so "kill" is the wrong test. "Meaningful hit" is: at least 40% of the weapon's max damage.
  AD: Any-damage (d ≤ r) feels like a graze to the player. "Solid hit" reads clearly in the replay.
  TL: A pure geometry test, with no terrain or HP state needed, makes the headless test trivial and stable. It doesn't depend on balance changes.
- **Winner:** Option 2, **amended by the planner**: `hit ⇔ d ≤ R_L = 0.5·r_blast`, where d is the distance from the impact point to the target's **hurtbox surface**, the same d as DR-035. A direct hit is d = 0.
  - Seed Spitter R_L = 14 px, which guarantees ≥ 19 damage (≥ 62% of base). Dewdrop R_L = 24 px.
  - "Lethal radius" here means the zone where a shot does most of its damage. A full-HP ant cannot be one-shot (DR-035), so the brief's "lands inside lethal radius" is measured this way.
  - **Stable wind** = a constant wind level from {−3, 0, +3, +5} for the whole flight, with no Column or Oscillate fields.
  - Benchmark weapon: Seed Spitter (the tightest radius).
- **Reason:** It is geometric, weapon-relative and independent of HP balance.
- **Rejected:** Remaining-HP kill test (unreachable at 100 HP). d ≤ r (too loose, a graze counts).
- **Revisit if:** DR-002 falloff is not linear, or damage numbers change.
- **Judge's ruling:** The Winner was rewritten by the planner after a Monte-Carlo calibration against the checkpoint-B physics. The debate's draft (0.6·r from the centre, 8 px/s² wind) gave 99% at L90.

## DR-063 · Difficulty curve and bosses
- **Question:** How do levels 1–100 map to error parameters, and do bosses get a bonus?
- **Options:** (1) linear σ ramp · (2) piecewise log-interpolation across anchors, floor at 90 · (3) per-level hand-tuned.
- **Debate (compact):** GD: Levels 1–20 must feel beatable (teach, test, twist). A steep drop in σ early gives the "she's good now" feeling by level 40. Then a long flat approach to lethal.
  AD: 100 levels is too many to hand-tune. Log-interpolation between 8 anchors is enough, and tunable.
  TL: A pure function `botParams(level)` is trivially unit-testable and diffable.
- **Winner:** Option 2, **recalibrated by the planner** against the checkpoint-B physics (DR-030, DR-031, DR-027 hurtbox, DR-062 metric). The draft anchors gave 99% at L90, so every σ was refit.
  - Interpolation: σ_p, σ_a and σ_w are log-interpolated between anchors. k, b and B are linear. p_bf is linear from 0.12 at L1 to 0 at L30.
  - "Hit %" is the benchmark-suite average (DR-065). It includes the first-shot bias B (every trial is a fresh first shot) and excludes the brain-fart and rattled rules.

  | Level | σ_p (rel %) | σ_a (°) | σ_w (levels) | k | b | B (%) | p_bf | Hit % (calibrated) |
  |---|---|---|---|---|---|---|---|---|
  | 1 | 15 | 9 | 1.2 | −0.5 | 1.5 | 12 | 0.12 | 25 |
  | 10 | 11.5 | 6.2 | 1.0 | −0.3 | 1.0 | 9.5 | 0.08 | 32 |
  | 20 | 9 | 5 | 0.8 | −0.2 | 0.6 | 7 | 0.04 | 39 |
  | 40 | 6 | 3.6 | 0.48 | −0.1 | 0.3 | 3.6 | 0 | 55 |
  | 60 | 3.6 | 2.1 | 0.25 | −0.05 | 0.1 | 1.7 | 0 | 72 |
  | 80 | 2.05 | 1.25 | 0.12 | 0 | 0 | 0.6 | 0 | 87 |
  | 90 | 1.35 | 0.8 | 0.05 | 0 | 0 | 0 | 0 | 95 |
  | 100 | 1.35 | 0.8 | 0.05 | 0 | 0 | 0 | 0 | 95 |

  - Measured between anchors: L30 46%, L50 63%, L70 80%, L85 91%. The curve is monotonic.
  - Per distance at L90: 200 px 97%, 400 px 99%, 700 px 89%.
  - **Bosses:** effective level min(100, L+5). They perceive the true wind including their own trick (k = 0, b = 0). They get no other accuracy bonus.
- **Reason:** Gentle early ramp, hard cap, bosses are strong through mechanics rather than aimbot.
- **Rejected:** Linear ramp (too slow early). Boss aimbot (violates pillar 4).
- **Revisit if:** Playtest completion drops sharply around L25–40 or L80+.
- **Judge's ruling:** The Winner was rewritten by the planner after a Monte-Carlo calibration against the checkpoint-B physics. The debate's draft (0.6·r from the centre, 8 px/s² wind) gave 99% at L90.

## DR-064 · Cap mechanism (~95%)
- **Question:** How is 95% guaranteed at 90+?
- **Options:** (1) error floor in the inputs, real randomness decides hits · (2) dice roll "miss on purpose 5%" · (3) hard clamp, perfect aim above 90.
- **Debate (compact):** GD: A bot that purposely whiffs is a lie; players can't read it. An error floor produces real near misses (it skims the ant) that look human.
  AD: Near misses at level 100 are charming ("she rolled a bit short"). A forced miss is a bug.
  TL: The floor is three constants, the test checks the realised rate, no hidden dice.
- **Winner:** Option 1, an error floor applied at every level ≥ 90 and never reduced: **σ_p 1.35%, σ_a 0.8°, σ_w 0.05 levels**, with k = b = B = 0.
  - Target band: suite average 0.93–0.97.
  - Per-distance guard: the 700 px bucket must be ≥ 0.80 (calibrated 0.89). Far shots missing more is accepted as human.
  - The cap depends on the angle mix. The suite fixes 45°/60°, and DR-060's tie-break keeps in-game shots in 40°–65°. Flat 30° shots would land about 90%.
- **Reason:** No hidden dice, real near misses.
- **Rejected:** Forced misses. Perfect aim.
- **Revisit if:** Physics or power resolution changes (re-run the calibration), or a flat per-distance 95% is demanded.
- **Judge's ruling:** The Winner was rewritten by the planner after a Monte-Carlo calibration against the checkpoint-B physics. The debate's draft (0.6·r from the centre, 8 px/s² wind) gave 99% at L90.

## DR-065 · Headless simulation test
- **Question:** What exactly verifies the cap?
- **Options:** (1) Monte-Carlo on `simulateShot` with fixed seeds, Vitest, node, no Phaser · (2) analytic check on σ only · (3) manual playtest only.
- **Debate (compact):** GD: The test must read like a spec: "level 100 lands 95%". Numbers a designer can edit.
  AD: Nothing visual, but the scenario list must include hilly terrain, since that is where bots look dumb.
  TL: Seeded, deterministic, and fast. Binomial CI sets N.
- **Winner:** Option 1, `tests/ai-cap.test.ts` (Vitest, node environment, no Phaser).
  - **Suite (144 scenarios):** distance {200, 300, 400, 500, 600, 700 px} × target height {−60, 0, +60 px} (target on a 140 px plateau or pit in a test mask) × stable wind {−3, 0, +3, +5} × launch angle {45°, 60°}. The solver runs in a test mode with a fixed angle and bisects power on the perceived wind. Weapon: Seed Spitter. Hit = DR-062.
  - **Trials:** 30 per scenario at L90 and L100 (4,320 each, SE 0.33%). 10 per scenario at L1, 10, 20, …, 80 (1,440 each).
  - **Seeds:** AI seed = hash(level, scenario, trial). The world seed is fixed.
  - **Asserts:**
    1. L90 and L100 within [0.93, 0.97].
    2. |hit(L90) − hit(L100)| ≤ 0.02.
    3. Boss-effective levels 95–100 ≤ 0.97.
    4. L1, L10 and L20 within [0.18, 0.48].
    5. Monotonic: hit(L+10) ≥ hit(L) − 0.02.
    6. 700 px bucket at L ≥ 90 ≥ 0.80.
    7. Determinism: the same seeds give identical hit counts and the first 100 impact points.
  - **Budget:** about 10.6k trials × ~19 sims ≈ 200k Seed sims, about 10–20 s in CI. If it goes over 30 s, halve the non-cap trials.
  - **Calibration rule:** the anchors come from the planner's Python model (`g 600`, `K 25`, 60 Hz, 2 px steps, DR-027 capsule). Stage 2 of the build refits the constants against the real `simulateShot`. Refitting constants to pass these asserts is logged as a `DR-063 tuning` line. Changing an assert needs an Override record.
- **Reason:** A real statistical test with margins, and deterministic so it never flakes: the result is the same every run.
- **Rejected:** Analytic-only check, which misses terrain. Manual playtest.
- **Revisit if:** Runtime exceeds 30 s, or `simulateShot` is slower than assumed.
- **Judge's ruling:** The Winner was rewritten by the planner after a Monte-Carlo calibration against the checkpoint-B physics. The debate's draft (0.6·r from the centre, 8 px/s² wind) gave 99% at L90.

## DR-066 · Readability: think time and visible aim
- **Question:** How does the player see the bot aiming?
- **Options:** (1) instant shot · (2) fixed 1 s think · (3) level-scaled think plus visible aim wobble that ends exactly on the fired values.
- **Debate (compact):** GD: Pillar 1/2: players should watch the ant "decide". Low-level bots deliberate longer and visibly waver.
  AD: A crosshair drifting, the ant's antennae twitching and the power bar creeping up read as a person aiming, in the wobbly paper-cutout style.
  TL: The wobble is cosmetic and runs after the solver finishes. It tweens to the already-drawn `angle_fire` and `power_fire`, so it cannot desync the sim.
- **Winner:** Option 3. Think time = `1.8 s − 1.0 s·u` (L1 1.8 s, L100 0.8 s), including solver slices (DR-060). Aim phase 0.6–1.2 s: the crosshair oscillates around the final angle with amplitude `3·σ_a` (capped 12° at L1, ~1.4° at L100), settling on the exact fired value. A power bar climbs to the final value with a slight overshoot at low levels. Tuning of the visuals is UI.md's job.
- **Reason:** It is readable and fair, and it is cosmetic only.
- **Rejected:** Instant shots. A wobble that changes the fired value (the sim would no longer be a pure function of the draws).
- **Revisit if:** Players feel turns are slow (cut the think time).
- **Judge:** Accepted. The wobble amplitude cap of 12° binds at low levels (σ_a 9° × 3).

## DR-067 · Anti-frustration for early levels
- **Question:** Should early bots avoid killing the player's last ant two turns running?
- **Options:** (1) no rule · (2) hard "never lethal twice in a row" · (3) soft mercy: after a damaging hit, widen the error next turn.
- **Debate (compact):** GD: Yes to something at L1–20, but not a scripted miss. Players sense scripts.
  AD: A "rattled" bot (wobblier crosshair, shown by the wobble in DR-066) explains it in-fiction.
  TL: Soft rule is one multiplier on σ, deterministic, and testable, with no special cases in the solver.
- **Winner:** Option 3, levels 1–20 only. If the previous bot shot dealt ≥ 50% of the player ant's max HP, or the player's remaining ants ≤ 1 and the previous shot hit (DR-062), then next turn σ_p, σ_a and B ×1.5 ("rattled"). Hard cap: none above L20. The L1–20 hit-rate band in DR-065 is measured without the multiplier. A unit test checks the multiplier toggles from the stated trigger.
- **Reason:** Protects early fun without a scripted miss.
- **Rejected:** Hard never-twice rule (feels scripted). No rule (early frustration).
- **Revisit if:** Early levels are still too punishing after playtest.
- **Judge:** Accepted.


---

# Checkpoint B · User edit after review (DR-058, DR-059)

## DR-058 · Level 0 "Training Grounds" (user edit)
- **Question:** How do new players try everything safely before Level 1?
- **Options:** (1) no extra level; L1–3 teach as planned · (2) a Level 0 practice match: a very weak bot, unlimited ammo on all three weapons, no way to lose · (3) a non-combat sandbox with target dummies only
- **Debate (compact):**
  - GD: the user wants a place to "play to get ideas". A real match against a bot that rarely hits teaches the turn loop better than dummies, and "can't lose" keeps it relaxed.
  - AD: it reuses the Jungle kit and Dot's tip cards, so no new art is needed beyond a "Training Grounds" sign on the level select.
  - TL: it is one level file, a new AI index 0 and a "min 1 HP" flag for the player team. All of it is deterministic and testable.
- **Winner:** (2).
  - **Where it appears:** it is offered automatically on a new save before L1, with "Skip to Level 1" always visible. It appears on the level select as a "0" leaf sign before L1, replayable any time. It gives no acorns and gates nothing: L1 is open either way (DR-055).
  - **Part 1, Practice:** the Jungle arena, 2 player ants vs 2 sparring rivals (Leafcutter Louts, amber).
    - The bot runs at **AI index 0**: σ_p 40%, σ_a 12°, σ_w 3, k −0.8, b 3, B 30%, p_bf 0.12, which gives **~11% benchmark hits** (planner-calibrated, DR-063 model). It misses the way a beginner does: way too hard or too soft, and it ignores the wind.
    - **The player cannot lose.** Player ants stop at 1 HP and pop back up dizzy.
    - **Unlimited ammo** for Seed Spitter, Dewdrop Bounce and Pollen Pod.
    - No turn timer.
    - Scripted wind: 0 on turns 1–2, 2 on turns 3–4, 4 on turns 5–6, then a seeded ±4.
    - One Dot tip card per new thing, tap to close: move, aim, power, fire, wind gauge, hop, Dewdrop, Pollen.
    - A "Next" button appears after the player's 3rd turn. Part 1 ends when the rivals are knocked out or the player presses Next.
  - The campaign still unlocks weapons as in DR-052. The L4 and L11 cards say "Dewdrop Bounce joins your kit" and "Pollen Pod joins your kit", so Level 0 is a free trial and not a permanent unlock.
- **Reason:** the user asked for it. It also lowers the first-play barrier (pillar 4), and every miss stays funny (pillar 1).
- **Rejected:** (1) it doesn't let players experiment freely; (3) dummies don't teach turns, wind reading against a bot, or retreating.
- **Revisit if:** many players skip it (shorten the tip cards), or playtesters still lose L1 (then add a 4th tip card on bracketing).

## DR-059 · Sneak Peek: 3 high-level teasers inside Level 0 (user edit)
- **Question:** How do players get a taste of what the later game looks like, so they know what's coming and can plan?
- **Options:** (1) a non-interactive trailer · (2) three short playable teasers back-to-back against capped-accuracy bots in late biomes · (3) unlock one late level early
- **Debate (compact):**
  - GD: playing beats watching. Short rounds that can't be lost, with a bot that clearly can aim, set a goal ("I want to beat that!") without frustration.
  - AD: three late biomes with a title card each show off the variety: strong wind, a moving fan, and a kitchen boss cue.
  - TL: these are three level files using existing fields, a round cap and a bot weapon lock. No new systems.
- **Winner:** (2). **Part 2, Sneak Peek** follows Part 1 directly. It can also be launched alone from the Level 0 sign.
  - **Rounds:** three 1v1 rounds, each lasting at most 2 rounds or until the rival is knocked out. A 1.5 s card sits between rounds ("Biome 4 · The Trail. You'll get here around Level 31!"). A Skip button is always shown.
  - **Rival:** 40 HP. The **bot is at AI index 90** (about 95% accurate, the cap) and is locked to Seed Spitter, so it can deal at most 72 damage in 2 rounds. **The player's 100 HP ant cannot be knocked out.**
  - **Player:** unlimited ammo on all three weapons, no timer.
  - **Teaser 1, The Trail (B4):** a steady strong wind of 4 (DR-032). Lesson: "The wind gets strong."
  - **Teaser 2, Living Room (B8):** the oscillating fan (A 4, P 6 s) and cushions. Lesson: "Wind that moves."
  - **Teaser 3, The Kitchen (B10):** slick tiles. A Crumb Crown rival uses the hood telegraph: the cue plays on round 1 and the updraft fires on round 2 (DR-053 rule). Queen Gloria Glaze watches from her cake in the background, so the finale stays a surprise. Lesson: "Bosses warn you first."
  - **End card:** "That's what's ahead. Ready?", which leads to Level 1. Win or lose, every teaser simply moves on. There are no acorns and no penalty.
- **Reason:** this is the user's "3 high-level teasers in quick succession". Players see late mechanics and a near-perfect bot early, which makes goals and planning part of the fun (pillar 4), and they can't lose.
- **Rejected:** (1) passive; (3) breaks the teach/test/twist order (DR-008).
- **Revisit if:** the teasers scare young players. Then lower the teaser bot to AI index 70 and keep the visuals.
- **Process note:** like DR-003a, these are user edits after review, debated by the planner without a subagent.
- **Cross-record effects:** DR-063 gains an "index 0" row outside the 1–100 curve. DR-065 gains assert 8 (L0 hit rate in [0.06, 0.16]). DR-055: Level 0 never blocks L1. DR-052: Level 0 ammo is a trial only.
