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

## DR-058 · Level 0 "Training Grounds" (user edit) — amended by DR-070
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

## DR-059 · Sneak Peek: 3 high-level teasers inside Level 0 (user edit) — SUPERSEDED by DR-070
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


---

# Checkpoint B · User edit 2 (DR-009, DR-070 to DR-072)

The user clarified the Level 0 request. Part 1 should add **one trial shot each of 3 new weapons that unlock soon**. Part 2 should be **one hard but beatable match at the level-70 setup** (bot at level 70, one chance). Levels 1–10 should feel quick and rewarding. DR-009 is a big creative decision (weapons), so it used the haiku debate (Debate 4 in `DEBATES.md`). DR-070 to DR-072 used a compact debate. Both ran as Sonnet subagents at medium effort.

| # | Conflict | Ruling |
|---|---|---|
| J23 | Weapon unlock levels: L14/24/34 (DR-009) vs L20/40/60 boss rewards (DR-072) | DR-009: weapons arrive sooner, and the boss rewards become cosmetics. |
| J24 | New-weapon ammo: per-weapon table (DR-009) vs flat 2/2/1/4/2 (DR-072) | DR-009. |
| J25 | Mound Plop adds terrain, but DR-021 only erases | Add `fill()` to the grid, with the same dirty-rect path. |
| J26 | "Cap trinkets" vs team identity on the cap | Trinkets anchor beside the stem and never recolour or hide the cap or badge. The coconut "hat" becomes a charm. |

## DR-009 · Three unlockable weapons (haiku debate, Debate 4)
- **Question:** Which 3 original ant weapons unlock later in the campaign, and when? Each must fill a role the starter trio lacks and interact with destructible terrain.
- **Options:** (a) Tunnel Grub (dig) / Pill Roller (roll) / Mound Plop (build) · (b) Gust Puff (knockback-only shove) / Silk Snare (delayed trap) / Mildew Cloud (area denial that clears after a turn) · (c) Ember Spark (burning ground) / Hornet Seeker (homing) / Twig Ladder (bridge)
- **Debate (haiku, 3 rounds):** GD wanted three jobs the starters never do: dig, build, roll. AD gave each a silhouette unlike dot, drop and puff (cream sausage, brown blob, grey striped ball) and a sound gag. TL showed all three are pure functions of (angle, power), with no new RNG and only a small terrain-delta overlay. Unanimous for (a).
- **Winner:** (a)

| Weapon | Role | Damage | Blast r (px) | Wind factor | wMul | Fuse / special | Behavior |
|---|---|---|---|---|---|---|---|
| Tunnel Grub | dig through cover | 40 (direct 48) | 30 | 0.15 | 1.0 | tunnel 60 ticks at 150 px/s | Flies ballistic. On its first non-rock terrain contact it keeps its heading, gravity off. It erases a circle of r 11 × material mult every tick (soil 11, soft 16.5, hard 5.5). It pops at tunnel end, when it breaks out into air, or on touching an ant. ROCK (mult 0) stops it at once, so it pops on the surface. A direct hit in flight is ×1.2. |
| Pill Roller | ground-hugging roll | 38 (direct 46) | 40 | 0.5 in air, 0 rolling | 0.85 | fuse 150 ticks from landing | Lands, curls up and rolls in its launch direction along the surface. Roll speed starts at min(200, 0.35 × landing speed). Acceleration is 0.5·g·sinθ downhill minus 120·mu. It rolls off ledges and falls on. It bounces once off a wall taller than 8 px at half speed. It pops on touching an ant or at fuse end. |
| Mound Plop | build: bridge, plug, shield | 6 (direct 7) | 34 (fill) | 0.4 | 0.9 | none, sticks on first contact | Fills EMPTY and WATER cells within 34 px with SOIL, so it is a plug, wall or bridge. Cells within 18 px of any ant's body stay empty, so ants are never entombed or crushed. No crater. The tiny damage and knockback (56 px/s) give a plop on the head. |

  Sanity checks (g 600, v = wMul·(100+620p)):
  - **Range.** Full power at 45°: Grub 720² / 600 = 864 px, Roller 612² / 600 = 624 px, Plop 648² / 600 = 700 px. Typical 300–500 px shots sit at 50–75% power, as with the starters.
  - **Drift.** At level 5 on a 500 px 45° shot (T² = 1.67, DR-031): Plop 0.4 × 125 × ½ × 1.67 = 42 px, so wind matters against its 34 px fill. Roller in air is 52 px. Grub is 16 px, under its 30 px blast, so it ignores wind. Rolling is wind-free.
  - **Damage.** Grub 40 ×1.2 = 48, so three hits kill (two direct hits do 96). Roller 38 / 46 is similar. The 60 cap is never reached. Linear falloff on the Grub's 30 px blast bottoms out at 10 HP.
  - **Roll.** On SOIL (mu 0.8, decel 96 px/s²) a 158 px/s landing rolls 158² / 192 = 130 px in 1.65 s, before the fuse. A 20° downhill gains 103 px/s² (more than the 96 decel), so the ball runs away downward. On SLICK (decel 6) it slides about 490 px, which is a big gag.
  - **Tunnel.** 60 ticks × 2.5 px = 150 px of tunnel. That is enough to pass a 100 px stump but not to cross a stage.

- **Unlock levels** (the first test slot of Biomes 2, 3 and 4, the same pattern as Dewdrop at L4 in DR-052, each with a scripted card):

| Weapon | Unlock | Why |
|---|---|---|
| Tunnel Grub | **L14** | Biome 2 stump forts (HARD cover) are what it answers. |
| Pill Roller | **L24** | Biome 3 camp slopes and bouncy tent. |
| Mound Plop | **L34** | Biome 4 puddles, where it bridges WATER. |

  The sequence L4, L10, L14, L24, L34 puts a new toy every 4 to 10 levels, and all three are unlocked by L34, well before L70. Level 0 gives one trial shot each, with the tag "Unlocks at Level 14 / 24 / 34". The Level 0 trial arena needs a stump or wall for the Grub, a slope for the Roller and a gap for the Plop.

- **Campaign ammo (per team pool):**

| Slot | Grub | Roller | Plop |
|---|---|---|---|
| Teach (first level using it) | 3 | 4 | 5 |
| Test | 3 | 3 | 4 |
| Twist | 2 | 2 | 4 |
| Rest | 5 | 6 | 8 |
| Boss | 3 | 3 | 4 |

  **Two-player default:** Grub 1, Roller 2, Plop 2, added to the existing ∞ / 3 / 1 row. Plop is cheap because it deals almost no damage. The weapon tray scrolls, because it now holds 6 slots.

- **Sound and visual gags:**
  - Grub: loud "munch-munch-crunch", cheeks puffing, crumbs spat sideways. It pops out of the far wall wearing a dirt hat.
  - Roller: a rising "brrrr" rattle, googly eyes spinning inside a grey striped ball. At fuse end it unrolls dizzy, with a "boing", and the blast is a petal-and-confetti puff.
  - Plop: a wet "splorp", a mud hat on any ant it hits, and a wobbly mud tower that jiggles for 1 s.
  - Silhouettes: Grub is a long cream segmented sausage with tiny mandibles. Roller is a round grey ball with plum rings and 2 little legs poking out. Plop is a squat brown rounded blob with 3 trailing crumbs. All have plum outlines.

- **Reason:** The starter trio covers direct fire, timed bounce and spread. This trio adds dig (reach ants behind HARD or ROCK cover), roll (reach ants in trenches and down slopes, and craters become ramps) and build (shape terrain instead of erasing it). That meets pillar 3 directly and sets up combos: dig a tunnel, then roll through it, or plug a crater to stop a roll. A miss is funny for each: the Grub exits the wrong wall, the Roller rolls past, and the Plop makes a lopsided bridge to nowhere (pillar 1). None resembles a Worms weapon or name. All are deterministic, with no new RNG.
- **Rejected:** (b) Snare and Cloud need state that persists across turns (like a mine or napalm), and a knockback-only shove has weak terrain interplay. (c) Ember is burning ground (damage over time, napalm-like) and Seeker is homing, which is forbidden and hard to simulate. Twig Ladder duplicates the Plop's job.
- **Revisit if:** Grub tunnelling trivialises HARD stump forts (then cut its tunnel to 45 ticks), Plop is only ever used to entomb (then widen the ant keep-out to 24 px), or players still miss "something new" after L34 (add a boss-reward reskin or ammo crates).
- **Bot AI note:**
  - **Grub:** the standard angle × power search. The sim runs the tunnel, so no extra parameter is needed. Since its wind factor is 0.15, bots ignore wind error for it.
  - **Roller:** landing x is not monotone in power on slopes. The solver adds one extra refine step, with power offsets ±2% around each top candidate (+9 sims), and scores the final pop point.
  - **Plop:** it is scored by damage only, so bots would never pick it. Bots do not use it, except scripted boss moves (DR-053 telegraphs).
  - **Budget:** with 5 or more weapons, cap each at ≤ 120 sims, so the 1,200 sim hard cap holds. Skip weapons that are out of ammo or out of range on a cheap check.
- **Determinism note:** New sim state:
  - Grub: heading vector, tunnel tick counter, and an erase-delta overlay inside `simulateShot` (a sparse set of dug cells, so the real mask is not copied).
  - Roller: mode (air or roll), roll speed, direction and fuse counter.
  - Plop: a deterministic row-major fill, with ants' keep-out zones.
  - Slope uses 7 integer height samples and the ratio dy / sqrt(dx² + dy²) (sqrt only, no trig). There is no new RNG stream and no `Math.random`. Timing is all in fixed ticks. Every effect is a circle erase or fill, so no banned APIs are needed.
- **Judge's ruling:** Accepted, with the unlock levels **L14 / L24 / L34**. They win over DR-072's boss-reward slots (L20/40/60) because the user asked for weapons that unlock "soon" and a rewarding early game (J23). The ammo table here wins over DR-072's generic row. Two-player defaults: Grub 1, Roller 2, Plop 2 (J24). Mound Plop needs a new terrain op, `fill(cx, cy, r, SOIL)` on EMPTY/WATER cells with an ant keep-out. It pushes dirty rects like `erase`, which amends DR-021 and DR-024 (J25). The Level 0 practice arena must include a HARD stump, a slope and a gap for the three trial shots (DR-070).



## DR-070 · Level 0 revised (supersedes DR-059, amends DR-058)
- **Question:** How do Part 1 and Part 2 of Level 0 give a free trial of the new weapons and a taste of L70?
- **Options:** (1) keep DR-058 plus 3 teasers · (2) Part 1 plus Sneak Shots, Part 2 = one Level 70 Preview match · (3) Part 2 as a replayable sandbox with a retry button
- **Debate (compact):**
  - GD: One real match against a ~80% bot gives the "hard but fair" thrill. One attempt makes it feel big. A retry button turns it into a grind, so no retry.
  - AD: A Porch arena with all six weapons in the bar shows "what is coming". Greyed lock chips with "Unlocks at Level N" read in one glance. Lady Latch must not appear.
  - TL: It reuses the L64 level file, the bot at `botParams(70)`, and the existing level data. New: a `kit` field, a per-team HP override and a `maxAttempts` flag.
  - GD: Rival HP 100 vs a player with 3 ants is a loss for a new player. Bot needs about 4 hits per ant; a beginner needs 3-4 hits per rival at 30-40% accuracy. So rivals get less HP, not the bot less skill.
  - TL: A headless test checks the odds (see below).
- **Winner:** (2).
  - **Part 1 Practice (DR-058 kept):** AI index 0 (~11% hits), can't lose, unlimited Seed/Dewdrop/Pollen, no timer, scripted wind, tip cards. Two changes: sparring rivals pop back up with 50 HP at TurnEnd, so Part 1 never ends by itself. It ends on "Next" (shown after turn 3), as before.
  - **Sneak Shot:** after the player's 3rd turn, a Dot card (tap to close, 1.5 s auto): "Sneak Shot! One try of three weapons you'll earn later." Three greyed chips appear in the weapon bar: W4 "Unlocks at Level 21", W5 "Level 41", W6 "Level 61" (pending DR-009 for names and levels). Tapping a chip arms it for exactly 1 shot. The chip then shows "tried" and stays dim. Sneak ammo is per ant, cosmetic of the trial only, and does not unlock anything.
  - After all 3 are used (or Next is pressed), Dot says "Ready for a peek at Level 70?" with Go and Skip buttons. Skip leads to L1. Part 1 total: about 3 min.
  - **Part 2 "Level 70 Preview":** one match, launched after Part 1 or alone from the Level 0 sign.
    - **Arena:** the Porch test layout (L64), non-boss. The door is shut and Lady Latch is not shown. Door gust is capped at 3 here (the real Porch uses 5). Plank gaps stay.
    - **Teams:** 3 player ants (100 HP, blue circle caps) vs 2 rival ants at **60 HP** (amber triangle caps, "Porch Scouts"). This is a Level 0-only HP exception to DR-050.
    - **Bot:** AI index 70 (~80% hits), using the same kit and ammo as the player.
    - **Kit:** all 6 weapons. Seed ∞, Dewdrop 4, Pollen 3, W4/W5/W6 2 each (pending DR-009). One Honey Drop on the player's side at round 4.
    - **Timer:** 45 s. Sudden-death warning at round 8, dew from round 10 (normal 21), so it ends by round 14, about 4 min.
    - **One attempt:** Restart is hidden in the pause menu. Quit and Resume keep the same match (`ants.match.v1`). Result saved as `level0.previewResult`.
    - **Win card:** "You beat a Level 70 bot! Imagine you after the whole trip." Reward: cap trinket "Brass Doorknob Pin" (cosmetic, once).
    - **Lose card:** "Dizzy! That is as tough as the Porch gets. You'll be ready by Level 61." Reward: sticker "Brave Scout". Both cards end on "Let's go!" to L1. Replaying Part 2 from the Level 0 sign is always allowed, with no second reward.
- **Reason:** It meets the request: real thrill, one chance, and no soft-lock. Lowering rival HP keeps the bot's behaviour honest, because the lesson is "this bot aims well".
- **Rejected:** (1) too passive and fake accuracy caps; (3) kills the one-chance thrill. Kitchen or Pantry arena (shows late visuals and spoils the finale). A boss arena (spoils Lady Latch).
- **Revisit if:** the headless test (an AI-25 stand-in as the "new player", 200 seeds) wins outside 35-60%. Then adjust rival HP (50-70), not bot skill. Also revisit if playtesters call it unfair, or if more than 60% skip it.
- **Judge's ruling:** Accepted, with these changes. The Sneak Shot chips read **"Unlocks at Level 14 / 24 / 34"** (DR-009). The Preview kit uses DR-009's test-slot ammo: Seed ∞, Dewdrop 4, Pollen 3, Grub 3, Roller 3, Plop 4. The Preview rival-HP exception (60 HP) applies to Level 0 only. Assert 9 joins DR-065's test list.

## DR-071 · Quick, rewarding first 10 levels
- **Question:** How do L1-L10 feel fast, with a reward on every clear?
- **Options:** (1) acorn stars only · (2) a cosmetic reward on every clear L1-10 plus the two kit unlocks · (3) a currency shop
- **Debate (compact):**
  - GD: The first 30 minutes decide retention. A reward on every clear plus fast turns makes "one more level" easy. Acorns give no reward now, so add one.
  - AD: A 24 px trinket slot on each ant, placed off the cap and off the badge, so team identity (cap colour and shape) never changes. Pop-ups show the item art and one line.
  - TL: Rewards are string ids in `save.unlocks` (a bump of `v`, with `migrate()`). The table is data, one reward per level.
- **Winner:** (2).
  - **Pacing:** L1-3 about 1.5-2 min each (2v1, 2v1, 2v2, par 4/4/6). L4-8 about 2.5-3 min. L9 about 3 min. L10 boss about 5 min. Total about 28 min.
  - TurnStart is 600 ms (down from 900) in L1-10, and a tap skips it. Bot think time is capped at 1.0 s through L10 (amends DR-066's 1.8 s at L1). Cards are tap-to-close with an auto-close. The comic stays skippable. Teach levels keep the 60 s timer but need no Dot card after L1 unless something is new.
  - Reward pop-up is the last row of the Results card. A tap skips it. No ads, no currency, no IAP, nothing that changes damage.
  - A 3-acorn clear upgrades the same reward to a gold-shimmer variant (cosmetic, DR-055).

| Lvl | Reward | How shown | Pop-up |
|---|---|---|---|
| 1 | Cap trinket: Leaf Feather | item flies to the ant on the card | 1500 ms |
| 2 | Sticker page 1 (Dot waves) | album page flips in | 1200 ms |
| 3 | Ant nicknames (pick from 12 silly names) | name picker with Skip | 1500 ms |
| 4 | **Dewdrop Bounce joins your kit** | weapon art card (DR-052) | 2200 ms |
| 5 | Victory dance: Wiggle | the winning ant dances once | 1500 ms |
| 6 | Cap trinket: Seed Pin | flies to the ant | 1500 ms |
| 7 | Sticker page 2 | album page flips in | 1200 ms |
| 8 | Victory dance: Spin | the winning ant dances once | 1500 ms |
| 9 | Cap trinket: Coconut Hat (rest-level gag) | silly pop with a boing | 1800 ms |
| 10 | **Pollen Pod joins your kit** plus sticker page 3 | weapon art card, then album | 2800 ms |

- **Rhythm L11-100:** every biome gives 4 rewards: sticker page on its first level (with the comic), a dance or nickname on its L5, a trinket on its rest level (L9), and a boss reward on its L10. Boss rewards: new weapons at L20, L40, L60 (pending DR-009), and a big trinket or dance at the other bosses. Test and twist levels give only the 3-acorn shimmer. That is one reward about every 2.5 levels.
- **Wardrobe:** a screen on the level select where each ant gets one trinket, one dance and one nickname.
- **Reason:** It rewards every early win while keeping all fun cosmetic, and it never touches team colour or badge shape (DR-003).
- **Rejected:** (1) no early hook; (3) a currency shop breaks the "no IAP" rule. A "sneak shot token" (power creep; Level 0 already gives the trial). Per-level trinkets for all 100 levels (art cost, noise).
- **Revisit if:** median time for L1-10 is over 35 min, or testers skip pop-ups (shorten to 1000 ms), or trinkets crowd the cap.
- **Judge's ruling:** Accepted, with these changes (J26). Trinkets attach at a fixed anchor beside the cap stem. They never recolour the cap, hide the cap's outline or cover the gaster badge, so team identity stays readable (DR-003, DR-007). L9's "Coconut Hat" becomes the **Coconut Charm** trinket, because a hat would replace the team cap. Weapon unlocks at L14, L24 and L34 are extra reward moments. The boss rewards at L20, L40 and L60 become a big trinket or a dance instead of weapons. Bot think time is capped at 1.0 s through L10 (amends DR-066). TurnStart is 600 ms through L10 (amends DR-042). Sticker album, nickname picker and Wardrobe are new UI screens for checkpoint C.

## DR-072 · Unlock schedule for the full 6-weapon kit and rival kits
- **Question:** When do the 6 weapons unlock, who gets which kit, and how much ammo?
- **Options:** (1) the player's save decides every kit · (2) each level fixes its own kit by level number, rivals mirror it · (3) rivals always have everything
- **Debate (compact):**
  - GD: A level that defines its own kit stays fair, replayable and deterministic (pillar 4). Rivals with a weapon the player has never seen are unfair.
  - AD: A first use of a new weapon should have a Dot card and art; one per unlock keeps the beat special.
  - TL: `kit` and per-slot ammo live in level data, so replay and the replay log (`ants.match.v1`) stay deterministic whatever the save holds.
- **Winner:** (2).
  - **Unlock schedule:** Seed L1 (∞) · Dewdrop L4 · Pollen reward of L10, usable L11 · W4 reward of Boss 2 (L20), usable L21 · W5 reward of Boss 4 (L40), usable L41 · W6 reward of Boss 6 (L60), usable L61. All in kit by L70, as in the Level 0 Preview. W4-W6 levels and names are **pending DR-009**.
  - **(a) Rivals:** the same kit and the same ammo table as the player at that level. Replaying an old level keeps its old kit, so a later weapon never makes an earlier level easier.
  - **(b) Bosses:** the boss uses its plain shot, trick and cluster loop (DR-053), not the unlock list. Escorts use the level kit with the boss ammo row (Dew 4, Pollen 3, W4-6: 2 pending). The player's boss kit is the level kit. A boss's reward arrives after the win, never during it.
  - **(c) Two-player:** all 6 weapons from the first match, so a friend on a fresh save is not stuck with Seed. Setup gets a "Starter kit only" toggle (Seed, Dewdrop, Pollen). Defaults per DR-034: Seed ∞, Dewdrop 3, Pollen 1, and W4/W5/W6 1 each (pending DR-009).
  - **(d) Ammo for W4-W6 (pending DR-009), per team pool:**

| Slot | Teach | Test | Twist | Rest | Boss |
|---|---|---|---|---|---|
| W4 / W5 / W6 | 2 | 2 | 1 | 4 | 2 |

  - On a weapon's first level (L21, L41, L61): ammo 3 and a Dot card.
- **Reason:** Level-defined kits keep campaign fairness and determinism. All 6 weapons in two-player keeps the friend-on-a-phone case fun.
- **Rejected:** (1) replay makes old levels trivial and breaks seeds; (3) unfair. Two-player locked by save (a friend with an empty save has only Seed).
- **Revisit if:** the haiku debate (DR-009) changes unlock levels or ammo, or testers find the new weapons too rare or too common.
- **Judge's ruling:** Accepted, with DR-009's unlock levels (Grub L14, Roller L24, Plop L34) and DR-009's ammo table. Rivals use the level's kit, but the bot never chooses the Mound Plop (DR-009 bot note). Two-player: all 6 weapons from the start, plus a "Starter kit only" toggle.




---

# Checkpoint C · Planner's judging summary (UI, DR-080 to DR-183)

Ten Sonnet debate subagents (medium effort) ran one compact debate per screen or system, with PLAN.md and DR-001 to DR-072 as required reading: tokens, title and boot, level select, comic, battle HUD, results and rewards, Level 0, album and wardrobe, settings and pause, two-player setup. I judged every record. Where records disagreed with each other or with earlier decisions, I ruled as below. **These rulings are binding and win over the record text that follows.** `docs/UI.md` already applies them.

Process note: the battle HUD (DR-120 to DR-131) and settings (DR-170 to DR-175) agents hit a rate limit before saving their files. I copied their records from their reports and normalised colour names to the DR-080 tokens (for example "raspberry" became `action`). I changed no values other than those the rulings below name.

| # | Conflict | Ruling |
|---|---|---|
| J27 | DR-003 loads fonts from Google Fonts; DR-018 needs offline play and OFL files must ship | Self-host Lilita One and Nunito as woff2 with their OFL texts (DR-174). |
| J28 | Touch targets: DR-003/DR-015 say 48 (56 preferred); DR-082 says 64 hit (72 preferred) | DR-082. The 48 and 56 values now describe the drawn visual inside the hit rect. |
| J29 | The preview raspberry `#E8456B` fails contrast for both white and plum text | DR-080: `action` is `#EE6083` with **ink** text (4.90). Every "white on raspberry" in the records becomes ink: FIRE label, timer numeral at ≤ 5 s, gate and button labels. Level-node numbers use the fill's `onColor` text. A cleared node uses `success` `#22662C` with white text, because leaf-600 fails with both (ink 4.35, white 3.57). |
| J30 | Scrim alpha 50% / 60% (DR-140, DR-153, DR-171, DR-172, DR-131) vs 70% (DR-080) | 70% ink everywhere. At 60%, butter text over white world art drops to 3.79. |
| J31 | Focus rings: teal (DR-170, DR-172, DR-140, DR-160), butter (DR-150), white+ink (DR-086) | DR-086 everywhere: 4 px white, 2 px gap, 2 px ink, no pulse. HTML uses the same through `:focus-visible`. |
| J32 | DR-013 pads the canvas parent by the safe-area insets; DR-085 uses overlap margins | DR-085. It amends DR-013, because padding shrinks FIT on notched phones. |
| J33 | Fullscreen on the Battle HUD (DR-120, DR-151) vs "never on the Battle HUD" (DR-095) | DR-095. Battle top-right is **Pause 880,16,64,64**, **Find-my-ant 880,88,64,64** and the Level 0 **Next 800,16,72,64**. The F key still toggles fullscreen. |
| J34 | Text size setting: DR-012 lists it, DR-170 drops it, DR-081 scales Nunito and HTML | Keep it, as **Normal / Large (1.0 / 1.2)** in Settings > Display. It scales Nunito runtime text and HTML only, never the bitmap bakes. DR-087 sizes boxes for +30%, so Large fits. |
| J35 | Reduced motion: DR-164 uses the OS query only; DR-170 has Auto/On/Off | DR-170's setting applies everywhere, including dances (DR-164) and comics. |
| J36 | Back button: hit 72 at (16,16) (DR-090), 64 at (M,12) (DR-100), 64 elsewhere | One spec: visual 56, hit 64x64, at (M, M) on every screen. The level-select header row aligns to y = 16. |
| J37 | Level 0 sign position (DR-100 vs DR-150) and panel rect (DR-150 656,96 vs DR-102 672,88) | Sign hit (40,160,80,88) from DR-100, with the visuals and states from DR-150. The Level 0 panel uses the DR-102 card rect (672,88,272,412), so the card never jumps. |
| J38 | Dot tip placement: DR-151 slots at y 120, DR-131 bubble 16,148; both overlap the effects row (y 132..172) | One Dot bubble component: **392x112 at (16,180)**, or mirrored at **(552,180)** when the active ant is on the left. Level 0 tip cards (DR-151) use it, with DR-151's timing and collapse-to-chip rules. |
| J39 | Sneak chip tray anchor x=336 (DR-152) vs the tray grid at 408,372 (DR-124) | DR-124 geometry. DR-152 chip looks, labels ("Unlocks at Level 14 / 24 / 34") and states stay. 3 trial shots **per team**. |
| J40 | Level 70 Preview pause: n=3 buttons (DR-171) vs the Restart slot becoming a caption row (DR-153) | DR-153. The panel keeps its n=4 size, so players do not hunt for a missing button. |
| J41 | Skip and hint flow: DR-104 (panel above the buttons) vs DR-143 (rows inside the defeat card) | DR-143 layout and copy. The hint is DR-104's definition: same seed, Assist preview 1.0 s for that attempt, the level's `hint` as a turn-1 Dot card, and the suggested weapon pulsing. DR-104's map trace (the sticky-note thwap, then peel-off on clear) stays. |
| J42 | Gold variant: twinkle dots (DR-105), a butter band sweeping twice (DR-141), a 4-point sparkle (DR-162) | DR-105's twinkle dots everywhere. The sweep and the sparkle read as glints and break DR-003a. |
| J43 | L3 nickname reward: random auto-names (DR-141) vs the picker (DR-163, DR-071) | The reward row shows a "Pick names" chip that opens the DR-163 picker. Ants stay "Ant N" until named. Nickname "Pip" becomes "Peanut", because Captain Pip is a story hero. |
| J44 | Free-text names: "Write my own" (DR-180) vs no free text (DR-163) | No free text anywhere (kid safety, no on-screen keyboard, no blocklist to maintain). Two-player names come from a 12-entry locale preset list. DR-012's HTML list stays unchanged. DR-180's preset "Pip" also becomes "Peanut". |
| J45 | Team copy: "Blue/Amber Colony" (DR-045, DR-180, DR-182) vs "Blue/Amber Caps" (DR-131, DR-145) | **"Blue Caps" / "Amber Caps"** are the defaults (STORY names the player colony the Blue Caps). Campaign rivals use their STORY colony names. |
| J46 | Two-player who-is-up: DR-131 full-screen gate with dimming vs DR-183 button gate, frame and turn chip | DR-183's 8 px team frame, coin-flip pop, and a button-only gate with a 400 ms lockout, placed in the clear zone at **300,212,360,96** (DR-183's 300,404 overlaps the tray). There is no dimming (DR-045: nothing hidden). The DR-127 turn plate is the banner, so DR-183's extra turn chip is dropped (the top-left belongs to the team pills). The "swap colours" button in DR-045 and PLAN §3 is removed. |
| J47 | Epilogue flow: DR-113 (comic to LevelSelect) vs DR-144 (adds "The End" card) | L100 Results, then the DR-144 boss sequence, then the epilogue comic (DR-113), then the "The End" card, then LevelSelect. DR-012 gains a Results to Comic(epilogue) edge. |
| J48 | The save stores an acorn count only, and has no loss counter; the level data lacks UI strings | The save keeps **3 goal bits per level** (won, no ant knocked out, par), with the count derived by DR-055's cumulative rule, and adds `losses` per level, `settings.twoPlayer` (DR-182) and `wardrobe` (DR-161). Level data adds `name`, `tagline`, `windHint` and `hint` locale keys. This amends J18 and DR-056. |
| J49 | DR-046 follows the projectile, but J6 lets the ant retreat for 3 s at zoom 1.2 | During the retreat the camera eases to zoom 1.0 (the whole 960x540 world), so the ant and the shot both stay visible. The edge indicators (DR-130) are the fallback. |
| J50 | Ants can spawn under HUD controls | The level linter fails a level whose spawn feet fall inside any DR-120 hit rect, in either handedness. This amends DR-025 and DR-056. |
| J51 | Comic frame outline 6 and radius 34 (reference) vs tokens 4 and 24 | Outline 6 is allowed as the single frame exception (`outline.frame`). Radius is 24. Panels stay at 1024x576 (DR-014). |
| J52 | Two-player W4–W6 ammo: 1 each (DR-072c) vs Grub 1 / Roller 2 / Plop 2 (J24) | J24. |
| J53 | Key map: DR-015's list vs DR-121's | DR-121 is the full map. Tab cycles weapons in Battle only and moves focus everywhere else (DR-086). |
| J54 | Comic replay entry: a book button in the header (DR-110) vs a "Story" button in the left strip (DR-100) | DR-100's left strip. |
| J55 | The audio gate is in Boot (DR-012, DR-018), but the bar is fed by Preload (DR-091) | Confirmed as written: Boot owns the gate state, and Preload only feeds the shared HTML splash. |
| J56 | Pause music duck 25% (DR-171) vs DR-047 | DR-171. |

Records and rulings were checked against the pillars: pillar 2 (one-glance HUD, shape plus colour), pillar 4 (telegraphs, no hidden state, a skip offer never says "failed") and pillar 5 (no glints, rounded everything).

---

# Checkpoint C · Foundation tokens (DR-080 to DR-088)

## DR-080 · Final palette and contrast
- **Question:** Which exact hexes and text colours for every UI fill, with WCAG AA at 0.69 FIT?
- **Options:** (1) keep preview hues, fix only failing fills · (2) white text on all fills, darken fills · (3) plum text on all light fills, white only on blue and dark fills
- **Debate (compact):** GD: Text must read in sunlight, so the contrast rule is 4.5:1 for every text pair, because at 0.69 nothing below 35 logical px bold counts as large. / AD: Raspberry `#E8456B` fails (plum 4.06, white 3.82). Darkening it for white text turns it brick, so lighten it for plum text and keep the candy feel. / TL: A script computes every pair from `theme.json` and fails CI under 4.5, so the table cannot drift.
- **Winner:** (3). Computed with WCAG 2.x relative luminance. Fill / shade / text colour / ratio:
  - panel `#FFF1D0` / (none) / ink `#2E1A47` 13.83; ink-soft `#4A2F6B` 9.81
  - action `#EE6083` (was `#E8456B`) / shade `#C03055` / ink 4.90
  - info and wind `#1FA38A` / `#137463` / ink 4.92 (always with an arrow)
  - secondary `#FFD978` / `#F7B932` / ink 11.40
  - team A blue `#0072B2` / `#00527F` / **white** 5.19 (ink 2.99 fails)
  - team B amber `#E69F00` / `#A66F00` / ink 6.88
  - disabled `#B7AFC4` / `#8E869C` / ink-soft 5.21 (was `#5B5266`, 3.50 fails)
  - danger `#B52A4C` / white 6.18; on panel as text 5.51
  - success `#22662C` / white 6.99; on panel as text 6.24
  - ink as a fill (toast, letterbox, bars): butter 13.83, secondary 11.40, teal 4.92, amber 6.88
  - **scrim** = ink at **0.70** alpha. Butter text on it is 5.22 worst case over white. At 0.60 it is 3.79 and fails.
  - **letterbox** = ink `#2E1A47`. Sky, terrain, soil, leaves are world art, not UI tokens.
  - Shade bands carry no text. Non-text 3:1 is met by the 4 px ink outline. The blue badge always has a white ring (blue on ink is 2.99).
- **Reason:** One light-text rule (plum) plus one exception (blue) is easy to enforce.
- **Rejected:** (1) leaves `#E8456B` failing; (2) muddy brick action; white-on-amber (2.25).
- **Revisit if:** The action fill clashes with Team Amber in playtests (try `#F0698B`, plum 5.24).
- **Builds on:** DR-003, DR-003a, DR-007
- **Judge:** Accepted. Action `#EE6083` with ink text; scrim 70% (J29, J30).

## DR-081 · Type scale
- **Question:** Which roles, sizes, weights and baked fonts?
- **Options:** (1) all bitmap, many sizes · (2) all Nunito runtime · (3) few Lilita bakes for display roles, Nunito runtime for body
- **Debate (compact):** GD: Numbers and verbs must pop. Body copy must reflow for translations. / AD: Lilita is one weight, so hierarchy comes from size. Small text is Nunito 800, because heavier is clearer at 0.69. / TL: A bake must be 2x its logical size (DR-013) or it blurs. Each bake costs atlas area, so only four exist.
- **Winner:** (3). Roles (logical px / line height / letter spacing):
  - display 64 Lilita / 1.0 / +1 · title 40 Lilita / 1.05 / +0.5 · label 28 Lilita / 1.1 / +0.5
  - HUD numerals 32 Lilita / 1.0 / +1 · body 22 Nunito 700 / 1.3 / 0 · caption 18 Nunito 800 / 1.25 / +0.2 (floor)
  - Four bakes: **F56** (label, ASCII + Latin-Ext used in locale files, fill only) · **F64** (numerals `0-9 % ° / : x + - .`, fill + stroke) · **F80** (title, fill only) · **F128** (display, caps + digits + `!?.'`, fill + stroke).
  - Stroke layer = second BitmapText tinted ink, same metrics. Plain plum text on buttons and panels needs no stroke.
  - Use a bake only at 0.9 to 1.1 of its size at S=2.
  - Nunito: self-hosted woff2, Phaser `Text` with `resolution` = S, created once per scene. Settings text size scales Nunito and HTML by 1.0/1.2/1.4 and never the baked fonts.
  - Bake area is about 1.7 MP (6.8 MB). This is an estimate.
- **Reason:** Four bakes cover every number and verb. Body text stays flexible.
- **Rejected:** (1) 8 or more bakes; (2) Nunito for numerals.
- **Revisit if:** Wind digits shimmer at S=1 (bake F64 at 32).
- **Builds on:** DR-003, DR-013, DR-012
- **Judge:** Accepted. The text size setting is Normal/Large 1.0/1.2, not 1.4 (J34).

## DR-082 · Touch targets
- **Question:** Hit sizes, padding, gaps, clamping?
- **Options:** (1) 48 min · (2) 64 min, 72 preferred, padded hit rects · (3) 88 min
- **Debate (compact):** GD: A thumb mis-tap during a turn costs a shot. At 0.69, 64 logical is 44 CSS px, the Apple minimum. / AD: Visuals stay 48 to 56 inside the hit rect, so the HUD stays light. / TL: A hit rect is a separate invisible zone object. It can be larger than the art, and a test asserts rects never overlap or leave the safe rect.
- **Winner:** (2). Hit min **64x64**, preferred **72x72**.
  - Visual 48 in a 64 hit (8 pad) or 56 in a 72 hit (8 pad). FIRE visual 96, hit **112x112**.
  - Gap between hit rects at least 8, so visual gaps are 24. No overlaps.
  - Hit rects (not visuals) are clamped inside the safe rect (DR-085). Margin from visual edge = max(16, inset + 8), so the hit edge sits at least 8 from the screen edge.
  - Menu buttons act on pointer-up inside the rect. Moving more than 16 logical px out cancels. FIRE and aim steppers act on pointer-down (DR-033).
  - States: default, pressed, disabled (still hit-tested for a deny nudge), selected, focus.
- **Reason:** Sets 44 CSS px on the smallest phone and keeps the thumbs apart.
- **Rejected:** (1) 32 CSS px, too small; (3) fills the screen.
- **Revisit if:** Playtesters mis-tap on neighbours (raise the gap to 12).
- **Builds on:** DR-003, DR-015, DR-033
- **Judge:** Accepted. Supersedes the DR-003/DR-015 48 px seeds (J28).

## DR-083 · Spacing, radii, outlines, shadows
- **Question:** Scale values and the press offset?
- **Options:** (1) 4 px grid · (2) 8 px grid · (3) the working scale
- **Debate (compact):** GD: Consistent gaps keep the HUD calm. / AD: Radius 24 for buttons and panels matches CREATIVE §3. Smaller radii are for inner pieces. / TL: Three radius sets times three nine-slice layers is the whole atlas cost.
- **Winner:** (3).
  - Spacing 4/8/12/16/24/32/48.
  - Radius 8 (tags), 16 (inner cards, 32-high chips), 24 (buttons, panels), pill = h/2.
  - Outline 4 (2 under 40 visual px). Text stroke 6 on display, 4 on numerals.
  - Hard plum shadow, no blur, offset y: **4** (chips, icon buttons), **6** (buttons, panels), **8** (dialogs, toasts).
  - Shade band 8 high (6 on small).
  - **Pressed**: face moves down 4 (2 on small), shadow shrinks to 2, scale 1.03 x 0.95.
- **Reason:** CREATIVE says "5 px shadow". This record picks 6 for buttons and keeps 5 out of the scale.
- **Rejected:** Blur or soft shadows (DR-003).
- **Revisit if:** Shadows are lost against dark terrain (add a 2 px butter rim).
- **Builds on:** DR-003, DR-003a
- **Judge:** Accepted. Button shadow 6 replaces CREATIVE §3's 5.

## DR-084 · Motion tokens
- **Question:** Durations and easings?
- **Options:** (1) linear, short · (2) bouncy everywhere · (3) bouncy on rewards and releases, quick elsewhere
- **Debate (compact):** GD: Input must never wait for an animation. / AD: Jelly = squash and release overshoot. Rewards get one big pop. / TL: UI tweens use scene tween time, not sim ticks, so pause menus animate.
- **Winner:** (3):
  - press 60 ms `Quad.easeOut`
  - release 140 ms `Back.easeOut` (action fires at pointer-up, not at the end)
  - hover 100 ms `Sine.easeOut`, scale 1.04
  - panel open 220 ms `Back.easeOut` + alpha 120 ms; close 140 ms `Quad.easeIn`; scrim 160 ms
  - screen transition 220 ms fade out + 260 ms in, `Sine.easeInOut`, to ink
  - toast in 180 ms `Back.easeOut` from y -24; hold 2000 ms (+40 ms/char over 40); out 160 ms `Quad.easeIn`
  - reward pop 360 ms `Back.easeOut` (overshoot 2.2), stagger 120 ms; count-up 600 ms `Cubic.easeOut`
  - deny nudge ±4 px, 160 ms `Sine.easeInOut`
  - **Reduced motion** (`prefers-reduced-motion` or the Settings toggle): durations capped at 120 ms, `Sine.easeOut` or linear only, no overshoot, scale or shake, only alpha and at most 8 px translate. Transition 120 ms fade. Reward = 160 ms fade, instant count. Press keeps a translate.
- **Reason:** Matches CREATIVE §4 and the reduced-motion line.
- **Rejected:** Elastic (long ring-out), gating input on animation.
- **Revisit if:** Release overshoot reads as lag on slow phones.
- **Builds on:** DR-003, DR-015, DR-033
- **Judge:** Accepted. The reduced-motion switch is the DR-170 setting (J35).

## DR-085 · Safe area and layout anchors
- **Question:** How do CSS insets become logical margins under FIT at S=1/2?
- **Options:** (1) pad the canvas parent by the insets · (2) full-viewport canvas, HUD margins computed from overlap · (3) ignore insets
- **Debate (compact):** GD: Thumb controls must never sit under the home bar. / AD: Wide phones already letterbox, and padding would shrink the whole UI. / TL: With padding, FIT on an 812x375 phone drops from 0.694 to 0.655. Computing the overlap avoids that.
- **Winner:** (2). **This amends DR-013's "safe-area padding" on `#game`.**
  - `viewport-fit=cover`. `#game` is fixed to the full viewport with no padding.
  - A probe element reads `env(safe-area-inset-*)` on resize and orientation change.
  - scale = canvasCssWidth / 960. For each side, letterbox = (viewport − canvas) / 2.
  - overlap = max(0, inset − letterbox). Margin(side) = max(16, overlap / scale + 8).
  - Example: an 812x375 phone has 72 CSS letterbox per side, so side insets of 47 are absorbed. Bottom inset 21 overlaps, giving 21 / 0.694 + 8 = **38**.
  - A `Layout` service exposes `safeRect`, nine anchors (TL TC TR ML C MR BL BC BR) and a `resize` event. UI camera zoom = S. Snap to 0.5 logical px at S=2, whole px at S=1.
  - Letterbox = ink `#2E1A47` (also `theme-color` and the DR-013 `backgroundColor`).
- **Reason:** Keeps the largest scale and still protects the thumbs.
- **Rejected:** (1) smaller UI; (3) controls under the bezel.
- **Revisit if:** A device report shows `env()` returning 0 in landscape.
- **Builds on:** DR-012, DR-013
- **Judge:** Accepted. Amends DR-013 (J32).

## DR-086 · Focus ring and keyboard navigation
- **Question:** What shows focus, and how does keyboard navigation work in canvas scenes?
- **Options:** (1) single butter ring · (2) two-tone ring · (3) none (pointer only)
- **Debate (compact):** GD: Menus must work with a keyboard, but Battle keys stay as DR-015. / AD: A white ring then an ink ring reads on butter, plum and world. / TL: One shared `Focus` manager with a registry of focusables.
- **Winner:** (2). Ring = 4 px white (`#FFFFFF`) outside a 2 px gap, then 2 px ink outside it, following the button's radius. Static, no pulse. White carries meaning, so DR-003a allows it.
  - Shown only after keyboard input (like `:focus-visible`). Pointer-down hides it.
  - Arrows move to the nearest focusable in that direction (primary distance + 2 × cross distance), optional explicit neighbours. Tab and Shift+Tab follow registration order.
  - Enter and Space activate (press visual on keydown, act on keyup). Esc = back or close.
  - Initial focus on the primary action. Dialogs trap focus and restore it on close. Disabled items are skipped.
  - **Battle:** the ring is off. Tab cycles weapons (DR-015). Esc opens Pause, which has the ring.
  - A DOM live region `#sr` announces scene changes and selections. Canvas has an `aria-label`.
  - HTML Settings uses native `:focus-visible`: `outline: 4px solid #fff; outline-offset: 2px; box-shadow: 0 0 0 8px ink` (values from theme CSS vars).
- **Reason:** Visible on every background, small code.
- **Rejected:** Butter ring (1.21 on panel).
- **Revisit if:** Gamepad support is added (map the d-pad to arrows).
- **Builds on:** DR-003a, DR-012, DR-015
- **Judge:** Accepted. Used on every screen and in HTML (J31).

## DR-087 · i18n text fitting
- **Question:** How do strings fit, and how do we test it?
- **Options:** (1) truncate · (2) shrink, then wrap, then ellipsis for non-critical text · (3) size boxes for the longest language
- **Debate (compact):** GD: A verb or number is never cut. / AD: Shrinking is allowed only to a floor, not into mush. / TL: A `fitText()` helper has one contract for all roles, with a dev-only warning.
- **Winner:** (2):
  - Boxes are sized for EN × 1.3. Budgets (chars EN, 30% spare): standard button 192x64 → 9 (Lilita 28 ≈ 14 px/char); panel body 432 inner → 38 per line (Nunito 22 ≈ 11.4); caption 18 ≈ 9.4 px/char.
  - Order: shrink in 1 px steps to the floor (display 48, title 32, label 22, body 20, caption 18 never shrinks), then wrap to the component's `maxLines` (buttons 1, or 2 on tall 72 variants, panels per spec), then ellipsis.
  - Ellipsis is allowed only for names and level titles. Never on verbs, numbers, wind or cost. A dev build throws on forbidden ellipsis.
  - All strings from locale files with ICU-style placeholders, `Intl.PluralRules`, `Intl.NumberFormat`. No text baked in art.
  - **Pseudo-locale** `en-XA`: accents, +40% padding of `~`, wrapped in `⟦ ⟧`. A Playwright test opens every scene in it and asserts no overflow and no forbidden ellipsis.
  - Glyphs outside the bake charset make the build fail or route to Nunito (Cyrillic, Vietnamese). CJK and RTL are out of scope.
- **Reason:** Predictable and testable.
- **Rejected:** (1) hides verbs; (3) wastes space in English.
- **Revisit if:** A target language needs CJK or RTL.
- **Builds on:** DR-012, DR-081
- **Judge:** Accepted.

## DR-088 · UI asset pipeline
- **Question:** How do SVG sources become atlas frames and tokens reach code?
- **Options:** (1) hand-exported PNGs · (2) build script from SVG · (3) runtime-drawn Graphics
- **Debate (compact):** GD: Fast iteration on button looks. / AD: SVG with token variables, one source of truth. / TL: A deterministic script and tests catch drift. Graphics shapes cost draw calls and are blurry at S=1.
- **Winner:** (2).
  - Sources in `/art/ui/*.svg`: icons (32 viewbox, `currentColor`), badges, three nine-slice sets (radius 24/16/8), each with 3 white silhouette layers: outline (also the shadow, tinted ink), fill, band.
  - `tools/build-ui.ts`: substitutes `var(--token)` from `src/ui/theme.json`, rasterises at 2x with resvg, packs into the shared atlas (DR-014). No hex in SVG except `#fff`.
  - UI budget at most 2 MP (8 MB) of the 32 MB shared pages. The CI report prints it.
  - Nine-slices use `add.nineslice`, corner slice = radius. Pill heights fixed per variant.
  - `tools/bake-fonts.ts`: opentype.js plus resvg, charset from locale files, BMFont XML with kerning, fill and stroke layers (DR-081).
  - `theme.json` (primitive → semantic → component) generates `theme.ts` (0xRRGGBB), `theme.css` (vars for HTML).
  - **No colour literals in code.** A Vitest scan of `src/**` and CSS/HTML fails on `#hex`, `0x......`, `rgb(`, outside `theme.json` and generated files. A second test recomputes contrast for every component text-on pair (4.5 text, 3 non-text).
- **Reason:** One token file drives canvas, HTML and art.
- **Rejected:** (1) drift; (3) blur and cost.
- **Revisit if:** Atlas UI area exceeds 2 MP.
- **Builds on:** DR-003, DR-013, DR-014, DR-016
- **Judge:** Accepted. Fonts are self-hosted (J27).

## Conflicts found
- DR-003 says touch targets at least 48 (56 preferred). The foundation values (64 hit, 72 preferred) supersede it. 48 and 56 now describe visuals.
- DR-013 says the canvas parent has safe-area padding. DR-085 replaces that with overlap-based margins, because padding shrinks FIT on notched phones.
- CREATIVE §3 says button shadow 5 px and minimum text 16 px, body 20. DR-083 uses 6, and DR-081 uses 18 and 22.
- DR-015 uses Tab to cycle weapons, which conflicts with Tab as focus. DR-086 gives Tab to weapons in Battle only.
- The preview's action `#E8456B` fails contrast. DR-080 changes it to `#EE6083`.

---

# Checkpoint C · Title, boot and system screens (DR-090 to DR-096)

## DR-090 · Screen map and back navigation
- **Question:** How do scenes connect, and what does one `goBack()` do on every screen for the UI back button, browser/Android back and Esc?
- **Options:** (1) each scene handles its own back · (2) one `Nav` module: history entry per forward step, all back sources funnel into `goBack()` · (3) no history integration, Esc and UI button only
- **Debate (compact):** GD: kids hit Android back by reflex, so it must never dump them out of a match or lose a result. AD: one back button look (round jelly, left arrow) on every screen, always top-left. TL: use `history.pushState` for depth only (no URL change), and make the UI button call `history.back()` so there is exactly one code path (popstate).
- **Winner:** (2). `Nav.goBack()` rules, topmost layer first (HTML dialog, confirm, Level card, Dot card, Pause), else the scene rule:
  - Boot, Preload: ignored (re-push guard).
  - Title: not handled. Browser/Android back leaves the page or PWA. Esc does nothing.
  - LevelSelect: to Title. 2P Setup: to Title. Settings (HTML): close.
  - Comic: skip, mark seen, replace with Battle or LevelSelect (the one that launched it).
  - Battle (incl. 2P ready gate): open Pause (re-push guard, sim frozen). Pause: Resume. Quit confirm: cancel.
  - Results: to LevelSelect (campaign) or 2P Setup (hot-seat).
  - Battle, Results, Comic exits use `replaceState`, so history never contains a finished match.
  - UI back button: hit 72x72 at (16,16), visual 56 (butter-300, plum outline 4, arrow). Shown on LevelSelect, 2P Setup, Comic ("Skip" pill). States: default, pressed (+4 y, shadow 0), focus ring, hidden on Title/Battle/Pause. Not shown in Battle, where Pause owns the corner (DR-047).
  - Esc and P both open Pause in Battle. Forward popstate (depth too high) is ignored.
- **Reason:** One path means replays, tests and all three devices agree.
- **Rejected:** per-scene handlers (drift); back leaving mid-match (lost match).
- **Revisit if:** playtests show Android back at Title exits too easily.
- **Builds on:** DR-012, DR-047, DR-018, DR-015
- **Judge:** Accepted. The back button is 64 hit at (M,M) (J36). Results gains the epilogue edge (J47).

## DR-091 · Boot and Preload screen
- **Question:** What shows during load, with what progress, minimum time and failure state?
- **Options:** (1) canvas-only bar in Preload · (2) HTML `#splash` from first paint, fed by Preload progress events · (3) spinner only
- **Debate (compact):** GD: no blank screen, ever, and no flash on fast loads. AD: plum `#2E1A47` field, wordmark, one chunky pill bar. TL: DR-012 says loading is HTML and Lilita One is CSS-loaded, so the splash works before Phaser exists.
- **Winner:** (2). Splash fills the viewport, bg `ink` #2E1A47.
  - Wordmark "ANTS!" in HTML text (Lilita One 64 logical equiv, butter-300, plum 8 stroke), centred at y=150.
  - Bar: track (240,320,480,32), pill, plum-700 fill, plum 4 outline. Fill butter-300 with a 4 px shade band `butter-500`. A 28 px ant head rides the fill end.
  - Label below (y=372, caption 22 body, butter-100): "Gathering the colony…".
  - Progress is smoothed (lerp, never goes backward) and is bytes-weighted: shared atlas 70%, biome 0 25%, fonts 5%.
  - Min display 600 ms. Bar hits 100% only after create.
  - Error: any file fails: auto-retry 2x (500 ms, 1500 ms), no progress for 20 s counts as fail. Panel butter-100 (280,230,400,150): "Couldn't load the ants." (label 28) + caption "Check your connection." + raspberry "Try again" 72 high reloading the failed files only. States: loading, ready, error, retrying (bar dim). WebGL failure uses the DR-012 HTML message.
- **Reason:** Instant first paint, no layout shift, works offline via the service worker.
- **Rejected:** canvas bar (blank until Phaser boots); spinner (no progress feel).
- **Revisit if:** cold load on 3G exceeds 8 s (split biome 0 off).
- **Builds on:** DR-012, DR-014, DR-018, DR-003
- **Judge:** Accepted (J55).

## DR-092 · Audio unlock gate
- **Question:** Tap-to-play: combined with Preload or separate?
- **Options:** (1) separate screen before Preload · (2) same `#splash`: the bar becomes the button when loaded · (3) unlock silently on the first Title tap
- **Debate (compact):** GD: one tap total, and the "pop" confirms sound works. AD: the bar morphs into the raspberry jelly button, no new screen. TL: DR-012 gives Boot the gate: Boot owns the gate state, Preload only feeds the bar, so the contract holds.
- **Winner:** (2). When loading completes (and min time passes), the bar fades 150 ms and a button appears at (300,310,360,80): raspberry, label "Tap to play" (28). Handler on `pointerup`, `keydown` Enter/Space: `game.sound.context.resume()`, silent-buffer play (iOS), then the first-tap "pop" SFX, splash fades 250 ms, start `Title`. Always shown, even on desktop, even if muted (the tap is also the user gesture for later fullscreen). Splash pulses scale 1.0 to 1.04 every 1.2 s (static under reduced motion). If the context is already `running`, skip the silent buffer only. States: default, pressed, focus. No disabled state (not shown until ready).
- **Reason:** One screen, one tap, satisfies autoplay rules everywhere.
- **Rejected:** separate gate (extra tap); silent first-tap unlock (first sounds missing).
- **Revisit if:** autoplay is allowed on all target browsers.
- **Builds on:** DR-012, DR-018, DR-091, CREATIVE §5
- **Judge:** Accepted (J55).

## DR-093 · Title screen layout
- **Question:** What is on Title, and how does a new save reach Level 0?
- **Options:** (1) 4 buttons incl. a "Training Grounds" button · (2) 3 buttons, Play routes a new save to Level 0 offer · (3) Campaign label as in the reference
- **Debate (compact):** GD: DR-058 says Level 0 is offered on a new save with Skip always visible, so it needs no Title slot. AD: keep the reference composition: logo top-left, signpost buttons right, two ants duelling. TL: label "Play"/"Continue" is data from the save.
- **Winner:** (2). Rects at 960x540 (right column shifts left by safe inset):
  - Logo "ANTS!" (48,24,460,180), tilt -4°, butter-300, plum 8, shadow 8. Tagline "Small ants. Big shots." label 28, butter-100 + plum 4 stroke, at (56,232).
  - Buttons 320x72, x=608, y=168 / 252 / 336 (gap 12): Play or Continue (raspberry), 2 Players (teal + people icon), Settings (butter-300 + gear, opens HTML dialog).
  - Corner: sound toggle hit (16,16,72,72) visual 56; fullscreen hit (872,16,72,72) (DR-095). Version caption 18 at (16,506).
  - Hero ants 112 px tall, feet y=430: Blue circle-cap at x=150, Amber triangle-cap at x=470, 8-dot arc and seed every 6 s, amber ant ducks ("eep"). Static under reduced motion.
  - No save: "Play" routes to LevelSelect and opens the Level 0 card (Start Training / Skip to Level 1). Level 0 is later reached from the "0" leaf sign (DR-058).
  - Save: "Continue" plus pill "Lv N" (56x28) inside the button, opens LevelSelect on the frontier level. If `ants.match.v1` exists, Dot card first: "Resume your match?" Resume / Map. Storage blocked: Play, plus notice "Saves are off".
  - Button states: default, pressed (+4 y, shadow 0), focus (4 px butter-100 ring + 2 plum), disabled (stone-400, not used on Title). Keys: arrows/Tab move, Enter/Space activate.
- **Reason:** Keeps the approved look and puts the new player on the shortest path.
- **Rejected:** a 4th Training button (clutter); "Campaign" label (no Continue state).
- **Revisit if:** testers miss the Level 0 card.
- **Builds on:** DR-003, DR-012, DR-055, DR-058, DR-070, DR-047
- **Judge:** Accepted.

## DR-094 · Rotate overlay
- **Question:** What does the portrait overlay show and what pauses?
- **Options:** (1) full-screen plum overlay with animated phone · (2) small banner over a squashed game · (3) auto-lock only
- **Debate (compact):** GD: pausing must be automatic and lossless, no Pause menu popping up. AD: one big phone icon turning, short copy. TL: pure HTML/CSS so it works before Phaser; the media query must not trigger on narrow desktop windows.
- **Winner:** (1). `#rotate`, z-index max, shown by `@media (orientation: portrait) and (pointer: coarse)`. Bg `ink`, centred column: phone icon 96 CSS px (butter-300 body, plum outline 4) rotating 0 to -90° over 1.2 s ease-in-out, hold 1.2 s, loop; heading Lilita One 40 "Turn your phone sideways"; body Nunito 22 "ANTS! plays in landscape." in butter-100; ant peeks from one edge. Reduced motion: static landscape phone plus arrow. Side gutters 16 plus safe inset.
  - Sets `paused-by-orientation`: sim tick and turn timer frozen, music and SFX paused (`sound.pauseAll`), input ignored. No Pause scene, no history entry. Shows within 1 frame; hides after landscape holds 250 ms (debounce), then resumes with 400 ms input grace. In hot-seat the ready gate is unaffected. Covers splash and Settings too.
  - States: shown, hidden. No buttons.
- **Reason:** iOS ignores manifest `orientation`; this is the safe net.
- **Rejected:** banner (game unreadable); showing on desktop portrait windows.
- **Revisit if:** foldables report wrong orientation.
- **Builds on:** DR-012, DR-018, DR-045
- **Judge:** Accepted. The `pointer: coarse` refinement of DR-012 is approved.

## DR-095 · Fullscreen button, iOS fallback, install hint
- **Question:** Where does fullscreen live and what do iPhone and non-installed users see?
- **Options:** (1) fullscreen in Battle HUD · (2) Title corner + Settings row + F key, iOS shows install hint · (3) auto-prompt on load
- **Debate (compact):** GD: Battle HUD is crowded, never add a button there. AD: icon swaps, same corner as the reference. TL: iPhone Safari has no element Fullscreen API; iPad does. Standalone launch needs none.
- **Winner:** (2). Title top-right hit (872,16,72,72) visual (880,24,56,56); Settings dialog has a "Full screen" row and an "Install" row; F toggles.
  - Supported: `requestFullscreen` on `pointerup`, icon swaps enter/exit on `fullscreenchange`, then `scale.refresh()`; try `screen.orientation.lock('landscape')`, errors swallowed.
  - iPhone Safari (no API): same corner button shows a phone-plus icon, opens an HTML sheet (butter-100, plum 4, 440x260): "Add to Home Screen for full screen" and steps "Tap Share, then Add to Home Screen". Close button 72 high.
  - Android Chrome: `beforeinstallprompt` is kept and the Settings "Install" row calls it.
  - Standalone/fullscreen launch (`display-mode` or `navigator.standalone`): fullscreen button hidden, Install row hidden. No automatic nagging.
  - States: default, pressed, active (exit icon), hint-variant, hidden, focus.
- **Reason:** Never fails silently, never nags kids.
- **Rejected:** HUD placement; auto-prompt.
- **Revisit if:** iOS ships element fullscreen.
- **Builds on:** DR-012, DR-018, DR-093
- **Judge:** Accepted. Binding over DR-120 and DR-151: no fullscreen button in Battle (J33).

## DR-096 · PWA manifest UI fields and icon set
- **Question:** Which manifest fields and icon sizes?
- **Options:** (1) 192/512/maskable only · (2) plus apple-touch 180, favicons, screenshots · (3) full iOS splash set
- **Debate (compact):** GD: the home-screen icon sells the game. AD: ant face on butter-300, plum outline, readable at 48. TL: maskable needs content inside the 80% safe circle; iOS fills transparent areas black.
- **Winner:** (2). Manifest: `name` "ANTS!", `short_name` "ANTS!", `description` "Small ants. Big shots. A turn-based ant artillery game.", `id` and `start_url` and `scope` `/Ants/`, `display` fullscreen (override fullscreen, standalone), `orientation` landscape, `background_color` and `theme_color` #2E1A47, `lang` en, `categories` ["games"], 2 wide screenshots 1280x720 (title, battle).
  - Icons: 192 and 512 `any` (rounded plate, radius 22%, transparent corners); 512 `maskable` (full-bleed bg butter-300 #FFD978, ant face inside the central 410 px circle, i.e. 80%); apple-touch 180 (full-bleed opaque, same art as maskable); `favicon.svg` plus 32 PNG.
  - Art: blue-cap ant face, plum outline 4% of size, no text, no glint. Meta: `apple-mobile-web-app-capable`, status bar `black-translucent`, `theme-color` #2E1A47.
- **Reason:** Covers Android, iOS, desktop install UIs with 5 files.
- **Rejected:** iOS splash image set (many sizes; plum body bg is enough).
- **Revisit if:** store listings need 1024 art.
- **Builds on:** DR-018, DR-003, DR-012
- **Judge:** Accepted.

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- DR-012 and DR-018 say the audio gate is on `Boot`, and Preload has the progress bar. DR-091/092 resolve this by making Boot own the gate state and Preload feed a shared HTML splash. Please confirm this reading.
- DR-012 gives the rotate overlay plain `orientation: portrait`; DR-094 adds `pointer: coarse` to avoid desktop false positives (a refinement).
- The reference landing image labels the top button "Campaign"; the brief here asks for Play/Continue. DR-093 follows the brief.
- DR-018 lists only 192/512/maskable icons; DR-096 adds apple-touch 180 and favicons (an addition, not a contradiction).
- DR-047 puts Pause in a top corner while DR-095 keeps fullscreen off the Battle HUD, so there is no clash.

---

# Checkpoint C · Level select (DR-100 to DR-105)

## DR-100 · Level select layout (per-biome page)
- **Question:** How is one biome page laid out at 960x540, and where do Level 0, Wardrobe and Stickers sit?
- **Options:** (1) full-width scroll map, card as overlay · (2) fixed page: 10-node snake path left, info card right (as reference) · (3) list of level rows
- **Debate (compact):** GD: A 2-row snake of 5+5 shows the whole teach/test/twist/rest/boss arc in one glance and keeps "next" reachable in 2 taps. / AD: The reference already reads well; card at right, path on the art, header pill centred. / TL: A fixed page needs no scroll physics. Only the pager moves, and the card stays still.
- **Winner:** (2). M = max(16, safe-inset+8).
  - Header (y 12..76): Back (M,12,64,64; visual 56, butter-gold chevron). Pager-left hit (216,12,64,64). Title pill (304,16,352,56) "N · Biome", Lilita 40, shrinks to 28. Pager-right hit (680,12,64,64). Acorn pill (792,16,152,56), right edge at 960-M.
  - Path: row A y=204, L1..L5 at x=184/288/392/496/600. Row B y=376, L6..L10 at x=600/496/392/288/184 (boss at 184). The turn at x≤648 is a cubic curve. Path = plum 12 px line with butter dots (r 3), the part up to "next" bright, the rest 50%.
  - Level 0 sign: page 1 only, hit (40,160,80,88), dotted path to L1.
  - Left strip (x=M, w 96, h 72, gap 8, y 292/372/452): Wardrobe, Stickers, Story (replay comic, DR-040).
  - Info card (672,88,272,412). Page dots y=497, centred x=480.
- **Reason:** Everything sits at the edges, thumbs stay free, and the card and Play sit in the right-hand thumb zone.
- **Rejected:** (1) scroll fights swipe. (3) loses the journey feel.
- **Revisit if:** long names overflow the pill after localisation.
- **Builds on:** DR-008, DR-013, DR-040, DR-055, DR-058, DR-071
- **Judge:** Accepted. The header aligns to y 16 (J36). The Level 0 sign uses this rect (J37).

## DR-101 · Level node component
- **Question:** What do the nodes look like, and what are all the states?
- **Options:** (1) fill colour carries both status and type (reference) · (2) fill = status, badge shape = type · (3) icons only
- **Debate (compact):** GD: A kid asks "where do I go, what did I finish?" Status first, so fill = status. / AD: Rest and boss must read without colour, so shape and size carry type. / TL: One `LevelNode(status,type,acorns)` container, all state art baked in the atlas.
- **Winner:** (2). Node 64 (hit 72x72), boss 88 (hit 96x96). Outline 4, bottom shade band 10 (boss 14), hard plum shadow 4 (boss 6). Number Lilita 28, white, plum 3 stroke.

| State | Fill / shade | Extra |
|---|---|---|
| locked | stone #B7AFC4 / plum-300 | plum lock 28, no number |
| next | raspberry / rasp-700 | pale ring 96 (butter-100, plum 3 both sides), pulse 1.0 to 1.08 over 900 ms |
| cleared | leaf-600 / leaf-800 | acorn row below (y+12) |
| skipped | butter-300 / butter-500 | plum number, sticky-note 28x28 at top-right, tilt 10°, no acorns |
| rest L9 | any status fill | teal 28 hammock badge top-left |
| boss L10 | plum-700 body, crown 36 | locked: lock badge, next: ring, cleared: butter-300 body + 3 acorns (y+12), skipped: note |
| selected | | butter-300 ring, gap 6, plum 3 outer |
| focus | | same ring plus scale 1.1 |
| pressed | | down 4, shadow 0, scale 0.94, 80 ms. Release spring 120 ms |

- Locked tap: 120 ms shake and the card explains. Hover: lift 2.
- **Reason:** Rest and boss are shapes, so colour is never the only cue.
- **Rejected:** (1) a rest or boss that is next had no distinct "next" cue. (3) no numbers.
- **Revisit if:** the cleared green looks like "go" next to raspberry for colour-blind testers (add a check mark).
- **Builds on:** DR-003, DR-040, DR-051, DR-055
- **Judge:** Amended (J29). Numbers use the fill's onColor text. Cleared fill is `success` with white text.

## DR-102 · Level info card
- **Question:** What does the card show, and how do Level 0, locked and skipped look?
- **Options:** (1) card per selected node (reference) · (2) tooltip over node · (3) full-screen sheet
- **Debate (compact):** GD: Players need: what's new, what earns acorns, the wind. Not HP numbers. / AD: Mini node as the header keeps identity with the map. / TL: Data-driven from the level JSON: `name`, `tagline`, `kit`, `windHint`, `par`, `hint`.
- **Winner:** (1). Card (672,88,272,412), panel-butter, outline 4, radius 24, pad 16, inner 240.
  - Header: mini node 44 + name Lilita 28, 2 lines max (y 104, h 64).
  - Tagline: Nunito 800 22, 2 lines, 40 chars.
  - Kit row: weapon chips 36 (gap 4, up to 6). The new weapon has a raspberry ring and a "New!" pill (caption 18, 46x22, -8°).
  - Best: 3 rows (acorn 28 + 22 text, shrink to 18): "Win", "Lose no ants", "Win in {par} turns".
  - Wind row: teal arrow icon + hint, ≤14 chars.
  - Play (688,420,240,64) raspberry, "Play" or "Play again". Pressed: down 4.
  - Skipped: sticky on the mini node. Boss and rest: crown or hammock on the mini node.
  - Locked level: lock 56, "Clear or skip Level N first", button "Go to Level N" (butter-gold).
  - Level 0: "Training Grounds", Practice and Level 70 Preview buttons (64 each), "Skip to Level 1" third on a new save. Preview and Practice show a check once done.
  - Swap: 140 ms fade plus 8 px slide.
- **Reason:** The third text per DR-055 ties to par, so the card answers "how do I get 3?"
- **Rejected:** (2) too small for text; (3) leaves the map.
- **Revisit if:** local text overflows twice.
- **Builds on:** DR-040, DR-055, DR-058, DR-070, DR-072
- **Judge:** Accepted. The Level 0 panel reuses this rect (J37). Goal strings follow DR-140.

## DR-103 · Biome pager
- **Question:** How do players move between 10 biomes, and what do locked ones look like?
- **Options:** (1) arrows only · (2) arrows, swipe, dots · (3) a world overview screen
- **Debate (compact):** GD: Curiosity matters, so locked pages stay viewable. / AD: A fog over flat colour reads "not yet", and silhouettes would spoil bosses. / TL: DR-014 loads one biome at a time, so locked pages must not need that atlas.
- **Winner:** (2).
  - Arrows (visual 56, hit 64). Default teal chevron. Pressed: down 4. Disabled: stone at the ends. Focus: ring. A raspberry "!" dot marks a newly unlocked biome.
  - Swipe: |dx|>|dy|, page follows the finger 1:1, flips at 48 px or 0.5 px/ms, 280 ms settle, rubber band 0.25 at the ends, tap slop 12 px. Keys: Q/E or PageUp/PageDown.
  - Dots (18, active pill 34x16 raspberry) are not buttons. Done biome: leaf, locked: stone outline.
  - Loads: current ±1 map backdrops (4 MB each).
  - Locked page: three flat tokenised hill layers under a plum-300 55% fog, stone nodes, boss as a "?" medallion, title pill gets a lock. Card: lock plus "Clear or skip Level N" and a "Back to {biome}" button.
  - Unlock animation: boss cleared, vine grows 600 ms, arrow pops 1.2x, Dot card "New place!" with Go or Later, page slides, L1 locks flip to "next" with a 12-crumb burst (≤ 900 ms total). Reduced motion: no slide.
  - Opens on the page of the next level.
- **Reason:** No spoilers and no extra memory.
- **Rejected:** (3) one more screen. Silhouettes (atlas not loaded, spoils bosses).
- **Revisit if:** swipe misfires on the node taps.
- **Builds on:** DR-008, DR-014, DR-055
- **Judge:** Accepted.

## DR-104 · Skip offer, hint flow and map trace
- **Question:** How do the hint and skip offers appear, and what does the map show afterwards?
- **Options:** (1) modal over the Results card · (2) inline panel on the Results card · (3) only on the map
- **Debate (compact):** GD: Offer at the moment of frustration, never a "failed" mark. / AD: Dot's tone: "Tough one?". The sticky note is a friendly bookmark. / TL: Loss counter per level is needed in the save. The hint is UI only, the sim is unchanged.
- **Winner:** (2).
  - After 2 losses: Dot tip line (DR-040).
  - After 3 (boss 5): a Dot face 96 plus panel above the Results buttons, "Tough one? Dot has a hint, or skip it for now." Buttons 240x64: "Retry with a hint" (raspberry), "Skip for now" (butter-gold), "Map" stays. Esc closes. Pressed: down 4.
  - Hint = same seed, Assist preview 1.0 s for that attempt, the level's `hint` as a turn-1 Dot card, and the best weapon pulsing. Acorns still count.
  - Skip: the map opens with a note "thwap" (scale 1.6 to 1, 220 ms), the path to the next node lights, the next node pops. Dot: "It will wait for you."
  - Clearing later: the note peels off 300 ms and the node goes green.
  - A skipped boss reads the same, with a dim crown.
- **Reason:** Friendly and truthful, and it keeps the challenge.
- **Rejected:** (1) blocks the retry; (3) too late.
- **Revisit if:** more than 15% skip the same level (DR-055).
- **Builds on:** DR-040, DR-055, DR-066
- **Judge:** Amended (J41). The layout is DR-143. The hint definition and map trace here are kept.

## DR-105 · Acorn presentation
- **Question:** How big are acorns, how do filled and empty differ, and what is the 3-acorn variant?
- **Options:** (1) acorn count numbers · (2) three acorn icons, lit or hollow · (3) stars
- **Debate (compact):** GD: Icons plus the reason text (DR-040). / AD: DR-003a bans white streaks, so a gold body with twinkle dots replaces the shimmer sweep. / TL: One atlas icon plus a gold variant, sizes by scaling.
- **Winner:** (2). Sizes 28 (map row, card), 32 (header pill, "8 / 30" in Lilita 32), 64 (Results). Outline 2 (3 at 64).
  - Filled: soil-400 body, soil-600 shade crescent, soil-800 cap.
  - Empty: stone body, plum-300 cap, no shade.
  - Gold variant (3 acorns, DR-071): butter-500 body, soil-600 cap, 2 butter-300 twinkle dots r 3 popping 1 s, every 3 s. Reduced motion: static dots.
  - Earn pop: scale 0 to 1.25 to 1, 160 ms stagger, once.
  - Header pill is per biome. Gold rim at 30/30.
- **Reason:** Consistent and glint-free.
- **Rejected:** (1) low feeling; (3) pointy stars forbidden.
- **Revisit if:** twinkle dots read as glints.
- **Builds on:** DR-003a, DR-040, DR-055, DR-071
- **Judge:** Accepted. Its gold variant is the only gold spec (J42).

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- DR-040 (acorns independent) vs DR-055 ("3 if also under par", cumulative). The save stores only a count, so the card could light a goal the player did not meet. Proposal: store 3 goal bits per level (count = popcount).
- DR-055 needs a "losses in a row" counter, but the save schema (PLAN §1) has no field. Add `losses`.
- Level data needs `tagline`, `windHint` and `hint` strings (not in DR-056).
- DR-003 (≥48 touch) and CREATIVE (16 px min text) are older than the foundation (64 hit, 18 floor). Foundation wins.
- Skipping Boss 1 skips the Pollen reward, but DR-072's per-level kits still give it at L11. Intended, but the Wardrobe should show unearned rewards as "Beat Level N".
- Card height: the 6-chip kit row and a 2-line name leave 2 px spare, so no more rows can be added.

---

# Checkpoint C · Comic viewer (DR-110 to DR-113)

## DR-110 · Comic viewer flow and controls
- **Question:** How does the Comic scene show 3-4 panels, advance, skip, reveal text and replay?
- **Options:** (1) one panel per screen, tap to advance (as the reference) · (2) whole comic page, 2x2 grid · (3) vertical scroll strip
- **Debate (compact):** GD: kids read at their own pace, so tap-to-advance with no auto-play, and Skip always visible. / AD: the reference frame (880x420) gives each panel a full stage; a 2x2 page would shrink bubbles under the 22 px floor at 0.69 scale. / TL: one panel on screen means one texture is live at a time and no scroll physics.
- **Winner:** (1). Scene data `{biome, mode:'first'|'replay'|'epilogue'}`. Layout in DR-111. Advance: tap anywhere outside the buttons, Space, Enter, →, or Next. Back: ←, Backspace, swipe right >=48 px. Skip: Skip button, Esc, S. Input cooldown 250 ms after each advance (stops double-tap skips). First input while text reveals completes all text; the next input advances. Reveal: caption 40 chars/s, bubble starts 150 ms after caption ends (pop scale 0.8 to 1.0, 120 ms), cap 1.6 s per box (CJK 20 chars/s). Panel in: art slides from x+880, 300 ms Cubic.easeOut, scale 1.04 to 1.0; text boxes fade out 100 ms before. Reduced motion or "instant text": 150 ms crossfade, no reveal. No auto-advance. Idle 6 s: Next pulses 1.0 to 1.06, 600 ms loop. Skip hit (40,460,128x64), visual 120x56, label "Skip" (replay: "Close"), butter-300 + butter-500 band. Next hit (744,460,176x64), visual 168x56, raspberry-500 + raspberry-700 band, label "Next" with chevron; last panel "Let's go!" (replay "Done"). States: default, pressed (y+4, band gone), focus (4 px teal ring, keyboard only), loading (Next shows spinner, input ignored). Dots (centre 480,492): done/upcoming 18 px circle butter-100, current raspberry pill 34x18, outline 3, gap 10, not tappable. Exit: first play marks `comicsSeen` then goes to Battle; replay goes to LevelSelect. Replay entry: 64x64 book button in each entered biome's LevelSelect header (DR-055). Orientation pause freezes reveal timers.
- **Reason:** One-panel screens keep text large, memory low, and kids in control.
- **Rejected:** page grid (tiny text); scroll strip (drag vs tap conflicts); auto-play (reading speed varies); tappable dots (mis-taps).
- **Revisit if:** playtests show kids tapping through captions unread (then lengthen cooldown to 400 ms).
- **Builds on:** DR-012, DR-055, DR-013, DR-046 (reduced motion), DR-003a
- **Judge:** Amended (J54). Replay starts from the DR-100 "Story" button, not a header book button.

## DR-111 · Comic panel frame and art spec
- **Question:** Frame geometry, layers, source and raster size, and per-biome load/unload?
- **Options:** (1) 1024x576 standalone PNG per panel, cover-cropped into the frame · (2) 1280x720 per panel · (3) 4 panels packed into one atlas page
- **Debate (compact):** GD: panel 1 must show instantly; the rest can stream. / AD: ink outlines must stay crisp, so 1280 is nicer, but DR-014 already budgets 1024x576. / TL: separate textures allow progressive load and per-panel destroy; a packed page blocks on one file.
- **Winner:** (1). Card background: plum-700 #4A2F6B with three plum-900 50% circles, drawn as vectors (no texture). Frame outer rect (40,28,880x420), outline 6 plum-900 (frame exception to outline 4), radius 24, hard shadow y+8 plum-900, fill sky-400 until loaded. Inner art rect (46,34,868x408), inner radius 18, clipped by a Graphics GeometryMask (fallback: four plum-700 corner cutters if the S=2 spike shows seams). Source: `art/source/comic/bNN_pN.svg`, viewBox 1024x576, rasterised by the build script at 1x to `assets/comic/bNN/pN.png` (key `comic_bNN_pN`, no mipmaps). Cover-fit scale 0.848 shows source rows 48..528: art safe band y48..528, faces and key props inside it. Layers: L0 baked art (ink included), L1 pop words from shared atlas ("BOING"), L2 bubbles, L3 caption. Load: Comic start queues p1 first, shows it on arrival, streams the rest. Memory: 4 x 1024x576x4 = 9.4 MB per biome, epilogue alone 2.4 MB. Comic peak 32+16+4+9.4+17 = 78 MB, under the 96 MB soft cap. All panel textures are removed on scene shutdown, before Battle loads.
- **Reason:** Matches DR-014 and the reference, and keeps the soft cap.
- **Rejected:** 1280x720 (+5.5 MB, kept as upgrade); packed page; live parallax layers (extra textures).
- **Revisit if:** ink looks soft at S=2 (art is upscaled 1.7x): move to 1280x720.
- **Builds on:** DR-013, DR-014, DR-003, DR-003a, DR-012
- **Judge:** Accepted (J51).

## DR-112 · Caption box and speech bubble components
- **Question:** Sizes, fonts, tails, placement and i18n growth for comic text?
- **Options:** (1) fixed-size boxes · (2) auto-height boxes with max width and authored placement, build-time fit lint · (3) runtime font shrink
- **Debate (compact):** GD: captions carry the story, so never truncate. / AD: keep the reference: tilted butter caption bottom-right, white bubble top-left, tail to the speaker. / TL: auto-height is cheap; a lint over panel JSON at +30% text catches overflow before shipping.
- **Winner:** (2). Text-safe rect (70,58,820x360). Caption: butter-100 fill, outline 4, radius 16, shadow 4, padding 12x18, max width 560, rotation -1.5 deg (left side: +1.5), anchored to bottom edge 418 and right edge 890 (or left edge 70), grows upward. Kicker (panel 1 only, "Chapter 2 · The Clearing") Lilita 22 raspberry-700; main Lilita 28 / line 31 plum-900. Max 3 lines (English fits 2, +30% fits 3); height cap 148. Bubble: white fill, outline 4, radius 24, Nunito 900 22 / 25 plum-900, padding 12x18, width 96..280, max 3 lines, lives in y58..280. Tail 28x30, base at least 24 from corners, tip 12 to 20 px above the speaker's head, never over a face. Max 2 bubbles, 1 caption, 3 pops per panel; no rect overlaps (lint). Text size setting scales bubble text up to 1.2x (bubble widens to 320). States: hidden, revealing, complete. Not interactive.
- **Reason:** One component set serves 33 panels and +30% languages.
- **Rejected:** fixed boxes (overflow); runtime shrink (text under the 22 floor).
- **Revisit if:** a language needs more than 3 lines (widen caption to 640).
- **Builds on:** DR-003, DR-003a (white allowed in bubbles), DR-012 (bitmap fonts), DR-110, DR-111
- **Judge:** Accepted. Text size Large scales bubble text 1.2x (J34).

## DR-113 · Epilogue and boss-victory comic variant
- **Question:** When does the epilogue play, how does it differ, and do boss wins get comics?
- **Options:** (1) epilogue plays after L100 won or skipped, one panel · (2) comic after every boss · (3) credits-only
- **Debate (compact):** GD: the L100 win deserves a reward, and a skipped final boss still gets the party with no shame (DR-055). / AD: reuse biome-10 panel 4 and its party composition. / TL: reuse the viewer with `mode:'epilogue'`; no new assets or scene.
- **Winner:** (1). Trigger: Results of L100 with `done` or `skipped`, once (`comicsSeen` has `epilogue`). Content: STORY biome-10 panel 4, kicker "Epilogue". One panel, so dots and Skip are hidden, the Next label is "Finish", and Finish goes to LevelSelect. Reveal 30 chars/s. 12 flat confetti pieces drift (none under reduced motion). Skipped variant: sticky note (butter-300, outline 4, rotated -3, rect (70,58,300x72), Nunito 800 22) reads "Level 100 skipped. Rematch anytime!"; L100 keeps its bookmark. Replay of biome 10 after L100 is resolved appends the epilogue as panel 4 (4 dots). Boss wins in biomes 1 to 9 show no comic in v1 (Results handles it, DR-071); the spare 4th slot is reserved for a postcard panel.
- **Reason:** Rewards completion fairly with zero new tech.
- **Rejected:** comic after every boss (9 more panels, 24 MB art); credits-only.
- **Revisit if:** playtesters want the postcards, which would fill the reserved slots.
- **Builds on:** DR-055, DR-012, DR-014, DR-110, DR-111, DR-071
- **Judge:** Amended (J47). The "The End" card (DR-144) follows the epilogue panel.

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- DR-014 (1024x576 panels) vs DR-013 (S=2): the frame is 868 logical px, 1736 device px, so art is upscaled 1.7x on 2x phones. Kept; 1280x720 fits the budget as the fix.
- DR-012 flow (Results goes to LevelSelect or the next Comic) lacks a Results to Comic(epilogue) edge for L100; DR-055 assumes it. Add it.
- Frame outline 6 and the reference's radius 34 differ from the tokens (outline 4, radius max 24); I used 6 as a frame exception and radius 24.
- 576 px art tall, 481 shown: about 16% of each panel is cropped off.

---

# Checkpoint C · Battle HUD (DR-120 to DR-131)

## DR-120 · Battle HUD zones and layout rules
- **Question:** Where does every HUD element sit at 960x540, which areas are thumb zones, how does left-handed mirroring work, and what stays clear for play?
- **Options:** (1) top readouts, bottom-left aim and body, bottom-right shot, tray centre-bottom · (2) all controls in one bottom bar · (3) controls on the screen edges, world in the middle
- **Debate (compact):** GD: left thumb moves and aims, right thumb sets power and fires, one-glance data stays on top (pillar 2). / AD: the reference has pills on top and jelly controls in the bottom corners; a bottom bar would eat a quarter of the world. / TL: one pure function `layout(S, insets, handed, mode)` returns every rect, so tests can assert no overlap.
- **Winner:** (1). M = max(16, safe overlap + 8) per DR-085, expected 16. Hit rects ≥ 64, gap ≥ 8. Rects (x,y,w,h) at M = 16:
  - TOP: Team A pill 16,16,232,48 · Team B pill 16,68,232,48 (boss: plate 16,68,232,72) · Turn plate 270,16,420,56 · Wind gauge 300,80,360,48 · Effects row y 132, h 40, centred, max w 480 · Level 0 "Next" 696,16,96,64 · Pause 808,16,64,64 (visual 56) · Fullscreen 880,16,64,64 · Find-my-ant 880,88,64,64 · Notice slot 240,184,480,72 · Dot bubble 16,148,392,112.
  - BOTTOM-LEFT: Dial 16,380,144,144 · Angle up 168,388,64,64, down 168,460,64,64 · Flip 240,372,72,72 · Hop 320,372,72,72 · Walk left 240,452,72,72, right 320,452,72,72 · Move bar 240,344,152,24.
  - BOTTOM-CENTRE: Tray grid 408,372,224,152 (4-6 weapons) or a bottom-anchored 88-tall row for 1-3, centred at x 520 · Name pill 416,328,208,40.
  - BOTTOM-RIGHT: Power slider 648,332,72,192 · Power up 728,388,64,64, down 728,460,64,64 · FIRE 824,404,120,120 (visual 104), 32 px from every other hit rect.
  - **Left-handed:** mirror every bottom rect with x' = 960 − x − w, then swap pairs so ◀ stays left of ▶. The top is never mirrored.
  - **Clear zone:** x 16..944, y 176..328 holds no control. If the active ant overlaps a control, that control fades to 40% (still live). The level linter warns on spawns inside HUD rects.
  - **Z-order:** world indicators < HUD < notices < gate < pause.
- **Reason:** Thumbs stay off the action and every rect is checkable.
- **Rejected:** (2) too much cover; (3) thumbs reach edges badly.
- **Revisit if:** real-device thumbs cannot reach the Hop row, or M > 24 is common (scale clusters by 0.94).
- **Builds on:** DR-003, DR-012, DR-013, DR-015, DR-020, DR-045, DR-047
- **Judge:** Amended (J33, J38, J46). No fullscreen button. Level 0 Next is 800,16,72,64. The Dot bubble is at y 180.

## DR-121 · Aim controls: angle, power, facing, keyboard and mouse
- **Question:** How does a player set angle and power under set-then-fire on touch, mouse and keyboard?
- **Options:** (1) dial plus power slider, each with steppers, plus slingshot drag from the ant · (2) slingshot only · (3) two sliders
- **Debate (compact):** GD: 1% power is 11 px of range, so touch needs steppers (DR-033). / AD: the dial matches the reference; a vertical slider reads "more power" at a glance. / TL: all paths write the same `aim` state, so HUD, preview and bot mirror agree.
- **Winner:** (1). Nothing fires on release (J8).
  - **Angle dial:** full-circle needle with two allowed arcs, −20°..+90° per facing. Dragging into the other half flips facing (DR-033's free turn). Centre shows "52°" and a ◀/▶ facing glyph. Drag snaps to 1°. Steppers: tap 1°, hold 15 steps/s for 0.3 s, then 5° at 10/s.
  - **Power slider:** track 28x160, knob 56 showing the number. Drag snaps to 1%. Steppers repeat the same way with 5% coarse.
  - **Slingshot:** a drag starting within 56 px of the active ant pulls back opposite the shot; power = pull / 150 px; dead zone 20 px; band line drawn. Any other drag pans (DR-046).
  - **Keys:** A/D or ←/→ walk · W/S or ↑/↓ angle · `=`/`+`/NumPad+/PgUp power up · `-`/NumPad−/PgDn power down · Space or Enter fire (key repeat ignored) · Shift or Z hop · X back-flip · T turn · Q/E/Tab cycle weapons · 1-6 pick · C recentre · Esc or P pause · F fullscreen.
  - **Mouse:** wheel over world cycles weapons; wheel over dial or slider steps 1; hover tips after 500 ms.
  - Switching weapon tweens dial and slider to that weapon's remembered values in 150 ms.
  - States (dial, slider, steppers): default, pressed (shift 4, knob 1.1x), limit (3 px bump), disabled (55%, stone ring, mirrors the bot).
- **Reason:** One state model, three input skins.
- **Rejected:** (2) too coarse; (3) two slider drags are fiddly.
- **Revisit if:** steppers go unused (drop them) or accidental slingshot grabs appear (radius 40).
- **Builds on:** DR-015+J8, DR-033+J9, DR-046, DR-036
- **Judge:** Accepted. This is the full key map (J53).

## DR-122 · FIRE and Jump buttons
- **Question:** Sizes and states, and how is a buffered press shown?
- **Options:** (1) big FIRE alone in the corner, separate Hop and Flip · (2) FIRE with Hop stacked above · (3) one multi-purpose button
- **Debate (compact):** GD: FIRE fires on press, so it sits far from every other target; Hop and Flip join the walk cluster. / AD: FIRE is the one action-colour circle with the butter ring of the reference. / TL: buffer windows are ticks (fire 12, jump 9), so visuals read the sim buffer state.
- **Winner:** (1). FIRE hit 120, visual 104, `action` with shade band. Hop and Flip 72x72, each with its move cost in a corner (caption 18: 50, 80).
  - **FIRE:** ready (butter ring pulses 1.6 s) · pressed (down 4, fires at once) · queued (ring sweeps 200 ms, auto-fires when legal) · rejected (3 × 6 px shake in 120 ms) · disabled (stone, ring off) when not your turn, in TurnStart/Fire/Resolve, the 2P gate or a bot turn.
  - **Hop/Flip:** ready, pressed, queued (150 ms ring), disabled when budget < cost, airborne, not your turn, or after the retreat.
  - A press arriving while the buffer clears on turn change is dropped silently.
- **Reason:** Forgiving, and the player sees why a press did nothing.
- **Rejected:** (2) stray fires; (3) hides verbs.
- **Revisit if:** accidental fires exceed 5% of turns.
- **Builds on:** DR-015+J8, DR-036, DR-042, DR-003
- **Judge:** Amended (J29). The FIRE label and fill use action and ink.

## DR-123 · Move controls, move budget and the retreat phase
- **Question:** How are walk and jump shown, and how does the 3 s retreat read?
- **Options:** (1) walk buttons plus a one-bar budget, retreat reuses the turn plate · (2) numeric budget · (3) separate retreat panel
- **Debate (compact):** GD: the bar shows what a hop (50) or flip (80) will cost. / AD: one bar, no numbers; the plate says "Run for cover!". / TL: the retreat is a 180-tick sim window; the HUD reads `retreatTicks`.
- **Winner:** (1). Walk ◀ ▶ 72x72, held. Move bar 152x24: butter track, leaf-600 fill = remaining/160, plum ticks at 50 and 80, foot icon. Pulses at 0. Walk states: default, held, disabled (budget 0, airborne, slope > 45°).
  - **Retreat (J6):** after FIRE, dial, steppers, slider, tray and FIRE dim to 55% and go inactive; walk, Hop, Flip stay live while budget remains. Plate text "Run for cover!", timer disc becomes a butter 3-2-1 disc with a runner icon, a 6 px teal line drains on the move bar over 3000 ms. No retreat UI if budget is 0.
- **Reason:** Cost and window shown with shapes and numbers.
- **Rejected:** (2) busy; (3) extra panel.
- **Revisit if:** players do not run from a Dewdrop (add a fuse ring on the ant).
- **Builds on:** DR-036, DR-042+J6, DR-043, DR-015
- **Judge:** Accepted.

## DR-124 · Weapon tray
- **Question:** How do 6 weapons fit, and what are the slot states?
- **Options:** (1) 3x2 grid, no scroll · (2) scrolling strip of 4 · (3) collapsed pop-out
- **Debate (compact):** GD: Level 0, two-player and L34+ show 6, and switching must take one tap. / AD: a grid keeps every silhouette visible. / TL: a fixed 224x152 panel is trivial to hit-test; scroll only as a 7+ fallback.
- **Winner:** (1). Slots 64x64, gap 8, padding 8. 1-3 weapons one row, 4-6 two rows of 3. Slot: icon 40, ammo badge 28 with numeral 22 (∞ for Seed).
  - States: default · selected (raised 6, `secondary` fill; name pill shows the name) · empty (ammo 0: stone, badge crossed) · locked (stone, padlock; name pill "Unlocks at Level 14/24/34") · pressed · focus.
  - **Sneak chip (Level 0):** dim silhouette + padlock; tap arms 1 shot (dashed outline, badge 1); fired = ✓ "tried", stays dim.
  - **"New!" tag:** 44x24 `action` pill, caption 18, wobbles, on a weapon's first level; clears on first select.
  - **Pickups:** a Seed Bundle bumps the badge (1.3x, 300 ms).
- **Reason:** One-tap switch, no hidden slots.
- **Rejected:** (2) hides weapons; (3) two taps.
- **Revisit if:** more than 6 weapons ship.
- **Builds on:** DR-009, DR-052, DR-070, DR-072, DR-015, DR-048+J11
- **Judge:** Accepted. Binding geometry for the Sneak chips (J39).

## DR-125 · Wind gauge, vertical fields and Oscillate
- **Question:** How do levels −5..+5, Column, Oscillate, gusts and calm show?
- **Options:** (1) horizontal chevron gauge plus an effects row · (2) one dial · (3) numbers only
- **Debate (compact):** GD: chevron count is the skill, the sign must read at arm's length. / AD: the reference teal pill; white chevrons are allowed (DR-003a). / TL: `gauge()` returns {level, vertical, gust, next}; the HUD only draws it.
- **Winner:** (1). Pill 300,80,360,48, `info` fill. Five slots (28) left, hub 64, five right. Lit chevrons white, pointing away from the hub on the wind's side; unlit are `info-shade` outlines. Hub shows the signed numeral (32) "+3"/"−3"; level 0 shows "Calm" (22).
  - Wind tick: chevrons pop from the hub outward at 40 ms each.
  - Gust: chevrons shake ±2 px 600 ms and a "Gust" chip with a bolt joins the effects row.
  - Vertical (Garden swirl): chip with 1-3 stacked up/down chevrons and "Up"/"Down".
  - Column zones: "Updraft" chip (bracket icon, "×2" on bosses) while active; "Vent next" dashed chip a turn ahead; in the world, teal dashed zone edges with rising chevrons.
  - Oscillate: a 360x24 wave strip replaces the chips; a dot rides one sine period at the phase (6 s). The gauge updates live.
  - Effects row: up to 4 chips, 40 tall, text 22.
- **Reason:** One gauge covers 10 biomes; every effect has a word and a shape.
- **Rejected:** (2) slow to read; (3) no gut feel.
- **Revisit if:** testers miss the wave strip.
- **Builds on:** DR-031, DR-032+J9, DR-003a
- **Judge:** Accepted.

## DR-126 · Boss telegraph HUD
- **Question:** How does the HUD telegraph next-round tricks and phase changes?
- **Options:** (1) "Next" chip, ghost chevrons on the gauge, and a banner · (2) banner only · (3) separate ghost gauge
- **Debate (compact):** GD: the cue shows a full turn before the trick (pillar 4). / AD: dashed means "not yet", a shape cue. / TL: the engine knows the next wind exactly, so the ghost is exact.
- **Winner:** (1).
  - **Next chip:** dashed plum outline, clock icon, trick name ("Leaf gust"); leads the effects row from the TurnEnd card until the trick fires, then becomes a solid chip with rounds left.
  - **Ghost arrow:** dashed hollow chevrons on the slots of the coming wind with its own sign; the hub keeps the real wind.
  - **Telegraph banner:** 480x72 in the notice slot, text 28: "[Boss]: [cue]. Wind changes next round", 1200 ms.
  - **Phase banner:** 480x96, "PHASE 2!" at 40 plus one 22 line, 1600 ms; boss plate segment pops and shakes (no shake in reduced motion).
  - **Boss plate** (replaces the Team B pill): name 22, segmented HP bar (one segment per phase) 200x20, numeral.
- **Reason:** No unseen tricks: words, shape and timing.
- **Rejected:** (2) easy to miss; (3) duplicate gauge.
- **Revisit if:** testers still lose to unseen tricks (hold the banner 2000 ms).
- **Builds on:** DR-053, DR-054, DR-032, DR-042, DR-031
- **Judge:** Accepted.

## DR-127 · Turn plate, timer and warnings
- **Question:** How do the turn banner and timer look in each state?
- **Options:** (1) persistent plate that animates at TurnStart · (2) big centre banner each turn · (3) no plate
- **Debate (compact):** GD: whose turn reads in one glance; a centre banner each turn blocks the action. / AD: badge, name, timer disc as in the reference. / TL: the plate reads sim state; TurnStart is 600 ms through L10 (DR-071).
- **Winner:** (1). Plate 270,16,420,56. Badge 40 at 278,24 (circle or rounded triangle, white ring). Name 28 in x 326..626, shrinks to 22. Timer disc 48 at 634,20.
  - TurnStart: plate drops in, 300/400/200 ms (900) or 200/250/150 (600) through L10; wind ticks 400 ms (300); a tap skips.
  - Timer disc: normal butter with plum numeral 32 · ≤10 s `action` ring and numeral · ≤5 s rounded square, `action` fill, ink numeral, pulse 1.0→1.2 per second, tick sound (shape + colour + motion). Hidden in Level 0 Part 1 and in Resolve.
  - Timeout: disc shows 0, "Oops, too slow!" pops over the ant.
  - Sudden death: from dew start − 3, chip "Dew in 3 rounds" counts down plus a 480x72 banner once; from dew start the chip says "Dew rising".
- **Reason:** Persistent, light, shape-coded.
- **Rejected:** (2) covers play.
- **Revisit if:** the plate is missed on bot turns.
- **Builds on:** DR-041, DR-042, DR-043, DR-044, DR-071
- **Judge:** Amended (J29). The ≤ 5 s numeral is ink. The plate is also the two-player banner (J46).

## DR-128 · Ant tags, active marker, team bars, damage numbers, knock-out
- **Question:** How is health shown per ant and per team?
- **Options:** (1) pill tag per ant plus team bars · (2) bars over ants · (3) numbers only
- **Debate (compact):** GD: the HP number is what matters. / AD: the reference tag (badge + number); the active ant gets the bobbing arrow. / TL: the Hud scene draws tags from the Battle camera transform, clamped and pixel-snapped.
- **Winner:** (1).
  - Tag 76x32, butter, plum outline 3, team badge 24 + HP numeral 22, 12 px above the ant; overlapping tags offset 36 px vertically.
  - Active ant: tag 96x40 with `action` outline 4 and nickname, plus an `action` arrow 40x44 bobbing 8 px at 1.2 s.
  - Low HP (≤25): `danger` numeral and ±3° wobble.
  - KO: tag turns stone with a dizzy-star icon, shrinks out after 1200 ms.
  - Team bars: badge 32, 100x16 bar in team colour with shade band, numeral 32; drains over 400 ms after the number lands; the active team pill rises 4 px with a ▸ notch.
  - Damage numbers: Lilita 40, white with plum 4 stroke, "−30", rise 56 px over 900 ms; direct hit 56 with "!"; heal "+25" in leaf-200; hits within 300 ms summed; reduced motion: no rise.
- **Reason:** Readable at 667x375, shape plus number.
- **Rejected:** (2) too small; (3) no team context.
- **Revisit if:** tags crowd in 4v4.
- **Builds on:** DR-041, DR-035, DR-003, DR-007, DR-048
- **Judge:** Accepted.

## DR-129 · Aim preview and bot aim visuals
- **Question:** What does the preview show, and how is a bot's aim made visible?
- **Options:** (1) same 8-dot preview for everyone, crosshair and power bar for bots · (2) no preview for bots · (3) full-arc preview
- **Debate (compact):** GD: DR-033 keeps wind the skill, so the preview stays short. / AD: white dots with plum outline plus a ring (white allowed, DR-003a). / TL: cosmetic, tweens onto the already-fired values (DR-066).
- **Winner:** (1).
  - Player preview: 8 dots r 6, 0.06 s spacing, ring r 16 stroke 5 at 0.48 s; stops at terrain with the ring squashed 14x6. Assist 1.0 s (16 dots), dots after the 8th at 50%. Hidden in Fire, Resolve and other teams' turns. Drawn in the Battle world layer below the HUD.
  - Bot aim: same dots; the ring becomes a crosshair (r 18, 4 ticks, amber with plum outline), wobbling ±3σ_a (max 12°) and settling over 0.6-1.2 s on the fired value; a 16x72 power bar behind the ant climbs with slight overshoot at low levels; HUD dial and slider mirror it at 55%.
  - Reduced motion: wobble amplitude halved, shorter settle.
- **Reason:** The player watches the bot decide (pillar 2).
- **Rejected:** (2) hides the show; (3) removes the wind skill.
- **Revisit if:** the crosshair hides the target.
- **Builds on:** DR-033, DR-066, DR-003a, DR-061
- **Judge:** Accepted.

## DR-130 · Camera UI
- **Question:** How does the player re-find their ant, pan, and track off-screen things?
- **Options:** (1) conditional find button, edge hints and edge indicators · (2) always-visible camera buttons · (3) no UI
- **Debate (compact):** GD: being lost must cost one tap. / AD: one conditional button, not a toolbar. / TL: visibility test is camera centre vs follow target.
- **Winner:** (1).
  - Find-my-ant 880,88,64,64 (ant-head target icon): shown when the camera centre is > 120 px from the follow target or the active ant is off-screen; recentres in 500 ms (150 ms cut in reduced motion). Key C; double-tap on the world does the same.
  - Pan affordance: hand cursor on drag; a faint 28x56 chevron at an edge that can still pan, fading after 2 s idle; a first-time Dot tip teaches the drag.
  - Edge indicators: 48 px circles, non-interactive, clamped to x 24..936, y 188..350, rotated to the target. Projectile: white with plum outline and arrow. Ant: team badge plus arrow. Distance "↑ 320" at 22.
  - Pan clamped to the world (DR-020), zoom ≤ 1.25.
- **Reason:** Least screen area, one tap.
- **Rejected:** (2) clutter; (3) lost players.
- **Revisit if:** players pan by accident while aiming.
- **Builds on:** DR-046+J7, DR-020, DR-026, DR-121
- **Judge:** Accepted. During the retreat the camera eases to zoom 1.0 (J49).

## DR-131 · Two-player tap gate, Dot tips, toasts and queue rules
- **Question:** How does the hot-seat gate look, and how do tips, banners and toasts share the screen?
- **Options:** (1) one notice slot with priorities, a yielding Dot bubble, and a full-screen gate · (2) free-floating popups · (3) modal cards only
- **Debate (compact):** GD: a gate is one clear tap; tips never block a shot. / AD: butter bubble, Dot's face, pulse ring on the target. / TL: one priority queue makes ordering testable.
- **Winner:** (1).
  - Gate: world dims (scrim), cut-out r 96 around the next ant and its arrow. Banner 240,196,480,88 with a 64 badge and "Amber Caps' turn" (40, shrinks to 28). Button 320,300,320,96 "Tap to start" (40) with caption "Pass the device". Whole screen is the hit area (tap, Space, Enter); the first press is consumed. HUD controls 60% and inactive; timer full and frozen.
  - Dot bubble: max 16,148,392,112. Dot 64, body 22, max 3 lines, tail, dashed `action` pulse ring on the target. Tap to close, or it completes when the taught action is done. Never in Fire or Resolve. Max 1, 600 ms between tips. Any banner collapses it to a 64 px Dot chip.
  - Notice slot 240,184,480,72: banner (28), toast (22, 1600 ms) or prompt (480x120+, buttons 200x64). Priority: phase > telegraph > sudden death > pickup > info. Higher preempts after 600 ms. Queue of 3, duplicates collapse. Held during gate and pause; pickups wait until TurnEnd.
- **Reason:** Predictable, never covers controls.
- **Rejected:** (2) overlaps; (3) blocks play.
- **Revisit if:** testers miss pickup toasts.
- **Builds on:** DR-045, DR-058, DR-070, DR-044, DR-053, DR-013
- **Judge:** Amended (J38, J46). The gate is DR-183's button gate at 300,212,360,96 with no dimming. The Dot bubble is at y 180. The notice queue is accepted.

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- DR-015 hold repeat "faster after 400 ms" vs DR-033 "15 steps/s for 0.3 s, then coarse 10/s": DR-033 used. DR-015 lacks power keys, X, T, C and keys 4-6; DR-121 adds them.
- DR-009/DR-072 say the tray "scrolls"; DR-124 uses a 3x2 grid, scroll only as a 7+ fallback.
- DR-070 chips say Level 21/41/61; the judge ruling says 14/24/34, used.
- DR-003 seeds (touch 48, FIRE 96) vs foundation (64/72): foundation used, FIRE hit 120, visual 104.
- DR-047 pause 56 vs hit min 64: visual 56, hit 64.
- DR-042 TurnStart 300/400/200 vs DR-071's 600 through L10: scaled to 200/250/150.
- DR-046 follows the projectile while J6 lets the ant run for 3 s: propose framing ant and projectile together at zoom 1.0 during the retreat; the off-screen indicator is the fallback.
- DR-045 Space/Enter start the gate while DR-015 Space fires: the gate consumes the first press.
- DR-020 fixed world vs HUD: ants can spawn under controls; needs a level-linter rule (no spawn feet inside HUD rects).
- HP tag uses 22, not the 32 HUD numeral (does not fit 76x32).
- DR-053 "icon at the start of the round" vs DR-042 "boss card at TurnEnd": treated as the same moment.
- DR-044 warning at round 18, dew at 21; for bosses and Level 0 Part 2, warning = dew start − 3.
- "Left-handed layout" is a new Settings toggle.
- Horizontal budget is exact: 376 + 224 + 296 + 2×16 = 928; above M = 24 the 0.94 scale fallback applies.

---

# Checkpoint C · Results and rewards (DR-140 to DR-145)

## DR-140 · Results card layout (victory and defeat)
- **Question:** How is the Results card laid out, in what order does it reveal, and where do Map / Retry / Next sit?
- **Options:** (1) one fixed 3-row checklist card with the reward as the last row · (2) full-screen results with a big acorn centrepiece · (3) tiny toast then straight to the next level
- **Debate (compact):** GD: kids must state the 3 goals (DR-040), and "one more level" needs Next under the right thumb. / AD: one lit or dim acorn per row with a one-line reason, a hero ant on the card to receive trinkets (DR-071 flies items to "the ant on the card"). / TL: everything comes from the match log. The reward is saved at Results start, so a skip tap can never lose it.
- **Winner:** (1). Card `panel-butter`, ink outline 4, radius 24, shadow 6, rect 140,40,680x448. Title "Victory!" display 64 at 164,52,632x64. Hero ant (cocky, scale 1.0) at 164,124,160x160. Goal rows at x340, w456, h48, gap 8, y 124/180/236: acorn 40 + body-22 text: "Won the level" / "No ant knocked out" / "Done in {par} turns or fewer". Lit acorn = soil body + checkmark disc (leaf-600). Dim = stone `locked` + empty ring (never colour alone). **Reward row** 164,296,632x72, `secondary` fill, outline 4, radius 16 (DR-141). With no reward it shows "Your best: 2 acorns, 5 turns" ("New best!" when beaten), so the layout never shifts. Buttons y392, h72, order **Map (176w, secondary) · Retry (176w, secondary) · Next (248w, primary raspberry)** at x164/356/548, gap 16. Next is bottom-right, the same thumb spot as FIRE.
  - Reveal: card in 250 ms (scale 0.9 to 1, back-out) · title stamp 200 ms · rows at 450/800/1150 ms (acorn pop 1.25 then 1, plink pitch +2 semitones; dim acorn gets a soft "bup", no buzzer) · buttons slide in at 1500 ms, reward row starts at 1500 ms.
  - **Tap-to-skip:** any tap before 1500 ms jumps to the final state and is consumed (it never presses a button). Buttons are live from 1500 ms. Enter = Next (the first Enter skips), Esc = Map, R = Retry. Reduced motion: rows fade in 100 ms each.
  - **Defeat:** card 200,96,560x348. Title "Dizzy!" 64 with a 2-cycle wobble, plus "Try again?" at 28. Dizzy ant 120 px at 224,184. Text at body 22: "Same map, same wind. Take another go!" Buttons y348: Map (176w secondary) · **Retry (320w, primary)**. A bonk-boing sound, no buzzer. Rows are absent and there is no reward.
  - States for every button: default · pressed (down 4, shadow shrinks) · focus (teal 4 px ring, offset 4) · disabled (`locked`) · hidden until 1500 ms.
- **Reason:** The layout is stable and the primary action always sits in the same place. A skip never costs a reward.
- **Rejected:** (2) too slow for 100 levels; (3) hides the acorn goals.
- **Revisit if:** testers tap Next by accident (raise the live time to 1800 ms) or the reveal feels slow after L10 (cut it to 900 ms).
- **Builds on:** DR-040, DR-055, DR-071, DR-003a, J17
- **Judge:** Amended (J30, J31). Scrim 70%, DR-086 focus ring.

## DR-141 · Reward pop-up components
- **Question:** How does each reward type present in the reward row, how long, and how do several queue?
- **Options:** (1) one row component with 5 type skins · (2) a separate modal per reward · (3) a toast only
- **Debate (compact):** GD: each win needs one clear "got it" beat in about 1.5 s. / AD: trinkets fly to the ant, and the gold variant has no white glint (DR-003a). / TL: rewards are string ids in `save.unlocks`. Skins are data keyed by the id prefix.
- **Winner:** (1). Row rect 164,296,632x72. Icon slot 172,304,56x56. Title Lilita 28 and subtitle Nunito 22 at x240. Action chip 628,304,160x56 on the right. Durations are DR-071's and include 200 ms in and 200 ms out.
  - **Cap trinket (1500, 1800 for the L9 Coconut Charm with a boing):** the icon pops in the row, holds 400 ms, then flies to the ant's trinket anchor (fixed beside the cap stem, 24 px slot scaled with the ant, never over the cap or badge, J26). It flies on a 450 ms arc, then does a 120 ms squash and a cocky "hah!". Reduced motion: a 150 ms crossfade.
  - **Sticker page (1200):** the page icon flips (scaleX 0 to 1, 300 ms). Text: "Sticker page 2".
  - **Nickname (1500):** the ant gets random auto-names. A "Pick" chip opens the Wardrobe. Tapping it cancels the auto-close. Skip is implicit.
  - **Victory dance (1500):** the hero ant dances once.
  - **Gold shimmer** (3 acorns): +600 ms. The item squashes and recolours to gold (`butter-500` body, plum outline). A flat `butter-300` band sweeps twice, 4 round dots pop, and a "Gold!" pill (raspberry) appears. Reward ids stay the same, with a `gold` flag.
  - **Queue:** at most 2 per clear. Order: weapon, trinket or dance, sticker, nickname. Gap 150 ms. A tap settles everything. Settled state: the icon at 40 px plus "{name} added". States: queued · playing · settled · skipped.
- **Reason:** One component covers every type, keeps one-tap skip, and keeps trinkets off the cap and badge.
- **Rejected:** (2) a modal per reward (too slow); (3) a toast cannot hold a flying item.
- **Revisit if:** testers skip pop-ups (cut each to 1000 ms).
- **Builds on:** DR-071, J26, DR-003, DR-003a, DR-140
- **Judge:** Amended (J42, J43). No sweep band. The nickname reward opens the DR-163 picker.

## DR-142 · Weapon unlock card
- **Question:** How does the unlock card for Dewdrop (L4), Pollen (L10), Grub (L14), Roller (L24) and Plop (L34) look, and what does "Try it" do?
- **Options:** (1) a modal sheet with art, name and a one-line description · (2) a reward-row pop-up only · (3) a full-screen scene
- **Debate (compact):** GD: it is a milestone, so it earns a big beat and an instant way to use it. / AD: each weapon silhouette is unique: cream sausage Grub, grey striped ball Roller, brown blob Plop, teal drop Dewdrop, yellow pod Pollen. / TL: a single `WeaponCard` component, shown once per weapon id via a `seen` flag.
- **Winner:** (1). Sheet 200,36,560x468, `panel-butter`, radius 24, shadow 8, over a plum 60% dim. Ribbon "NEW WEAPON!" (Lilita 40, raspberry) at 200,48,560x56. Art plate: a `sky-100` circle 160 at 400,116, outline 4, with the weapon at 120 px. Name (display 40) at y288. Description (body 22, max 2 lines) at y342. Buttons y416, h72: **Later** (144w, secondary) at 260 · **Try it** (280w, primary) at 420.
  - Copy: Dewdrop "Bounces up to 3 times, then pops after 3 seconds." · Pollen "Bursts into 5 seeds in the air." · Grub "Digs through cover, then pops." · Roller "Lands, rolls downhill, then pops." · Plop "Builds soil to plug holes and make bridges."
  - **Pollen:** shown on the L10 Results (after the boss), and **Try it** goes to L11 with the weapon pre-selected.
  - **Dewdrop, Grub, Roller, Plop:** shown as a scripted card at the start of L4, L14, L24 and L34, the weapon's first level, with the Dot card (DR-072). **Try it** closes the card and pre-selects the tray slot. The Results of that level shows a 2200 ms recap row ("Added to your kit").
  - Animation: pop-in 220 ms, art does 2 squash bounces, 12 flat crumbs (no glints), and a weapon sound gag. After 2200 ms (2800 ms on L10, which then adds the sticker row) the card shrinks into the reward row. Buttons then act normally and the weapon carries a "New!" tag in the tray. States: default · pressed · focus · collapsed.
- **Reason:** It is a moment, never a block, and the weapon is used at once.
- **Rejected:** (2) too small for a milestone; (3) a scene and extra load.
- **Revisit if:** testers miss the new weapon in the tray.
- **Builds on:** DR-052, DR-009, DR-072, DR-071, J26
- **Judge:** Accepted.

## DR-143 · Hint offer and Skip offer
- **Question:** What do the Dot tip (after 2 losses) and the Skip offer (after 3, or 5 on bosses) look like and say?
- **Options:** (1) extra rows on the "Dizzy!" card · (2) separate pop-up · (3) tip only, no skip
- **Debate (compact):** GD: help comes early, skip comes late, and it is never a gate. / AD: Dot is a friendly row, and the word "fail" is banned. / TL: the loss streak is a counter per level in the save. The tip is chosen from the match log.
- **Winner:** (1).
  - **Loss 2+ (Dot tip):** add a Dot row 80 high inside the defeat card (card h 436, y52): Dot avatar 56 plus a bubble (white, plum 4). Body 22, 2 lines, up to 60 characters. Chosen by cause: "Check the wind arrow, then nudge your angle." · "Your shots landed short. Try more power." · "Blasts hurt your own ants too. Keep your distance." · "Take your time. Relaxed turns are in Settings." For bosses, name the cue: "Listen for the bell. A gust comes next turn."
  - **Loss 3, or 5 on bosses (Skip offer):** the card is 560x360 at y90. Title "Dizzy!". The Dot row says "Stuck? No worries! I can show you the aim, or we can skip this one for now." Buttons: **Retry with a hint** (512w, primary, y), then **Map** (176w) · **Skip for now** (320w, secondary) below, gap 8.
  - **Hint** (assumed): Dot's tip card on turn 1 plus the aim preview held on for that attempt. Skip unlocks the next level and puts a sticky-note bookmark on the map, with the toast "Sticky note saved on the map". It needs no confirm and is replayable. The offer repeats on every later loss.
  - Never use "failed", "lost", "game over" or "try harder". States: default · pressed · focus.
- **Reason:** Help is kind, skip is cheap, and a tired kid never hits a wall.
- **Rejected:** (3) a wall; a skip confirm (friction).
- **Revisit if:** more than 15% skip the same non-boss level.
- **Builds on:** DR-040, DR-055, J17, DR-033, DR-053
- **Judge:** Accepted, with the DR-104 hint definition (J41).

## DR-144 · Boss victory and biome-complete
- **Question:** What plays when a boss goes down, and how does the biome end and hook the next one?
- **Options:** (1) the stretcher gag, a banner, the Results card and a postcard panel · (2) straight to Results · (3) a full cutscene
- **Debate (compact):** GD: bosses are the 10-level payoff and deserve a beat of about 3 s. / AD: reuse the knock-out stretcher (CREATIVE §2). The next biome hook is Queen Marigold's postcard (STORY). / TL: this is a Results sub-state, with no new scene key.
- **Winner:** (1).
  - **Boss down (3300 ms):** 75 ms hit-stop, then the boss goes dizzy with orbiting stars. At 600 ms the medic ants enter with a leaf stretcher scaled 1.6. The boss loads at 1000 ms and is carried off by 3000 ms. Escorts go off in parallel. **Banner** 0,212,960x96 (raspberry, plum 4 top and bottom), "{Boss} is dizzy!" at 64 (shrinks to 40), in 300 ms at 900 ms, out at 3000 ms. A tap goes to Results after at least 800 ms. Reduced motion: a static pose, with a 300 ms banner.
  - **Boss Results:** the normal card (DR-140), title "Boss dizzy!", par 14, and the boss reward in the reward row. Next becomes "Next stop".
  - **Biome-complete panel** (in the Results scene): card 180,60,600x420. Header "{Biome} cleared!" at 40. Acorn tally "24 / 30" (acorn 40). A postcard 520x180: stamp (next biome icon, 64), then Marigold's one-line hook in Lilita 28, e.g. "Wish you were here! The sky grew a shoe. M." Buttons: Map (secondary) · **Next stop: The Clearing** (primary), which opens that biome's Comic. Slide in 400 ms.
  - **Final boss (Gloria):** the same sequence at 4000 ms, "The Crumb Crown is dizzy!". Results title "You did it!", with Next = "Epilogue". Then comic panel 4, then a "The End" card: "The rowdiest ants have a home!", acorn total, Map and Title. A skipped L100 shows the epilogue plus the note "Level 100 skipped, replay it anytime" at 22.
- **Reason:** It reuses existing art and gives a calm hook for the next biome.
- **Rejected:** (2) flat; (3) too costly (art and load).
- **Revisit if:** the stretcher beat feels long on the 10th boss (cut it to 2000 ms).
- **Builds on:** DR-053, DR-054, DR-055, DR-071, DR-012, DR-014, CREATIVE §2
- **Judge:** Accepted (J47).

## DR-145 · Two-player result card
- **Question:** How is a two-player result shown, with team colour and badge shape?
- **Options:** (1) a team-colour ribbon with the badge plus a small stats row · (2) the same card as the campaign · (3) text only
- **Debate (compact):** GD: no acorns or rewards (DR-040), so it is just a winner moment and a fast rematch. / AD: colour plus shape: Blue circle, Amber rounded triangle, in the ribbon and on the ants. / TL: it uses the same Results scene with a `mode: versus` branch.
- **Winner:** (1). Card 140,40,680x448. Ribbon 164,64,632x88 in the team colour (`team-a` or `team-b`, with the shade band), with a badge 56 at each end (white ring, plum keyline). Text "Blue Caps win!" / "Amber Caps win!" at 64, white fill with a plum 6 px stroke. A draw: plum-700 ribbon, both badges, "Draw!". The winner's hero ant (cocky) is at 420,164, 120x150. The loser (dizzy) is at 300, scale 0.6. Stats row 164,316,632x56: per team badge 40, name 22, ant icons (alive filled, others dim) and "Turns 14". Buttons y392, h72: **Title (176) · Setup (176) · Rematch (248, primary)**. Rematch keeps the setup and a random seed re-rolls. Slide in 250 ms. States as in DR-140.
- **Reason:** It reads without colour and puts Rematch under the thumb.
- **Rejected:** (2) shows acorns that do not exist; (3) no identity.
- **Revisit if:** players ask for a stats screen.
- **Builds on:** DR-003, DR-007, DR-040, DR-044, DR-045, DR-140
- **Judge:** Accepted. The copy is "Blue Caps" / "Amber Caps" (J45).

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- **DR-072 vs DR-009/J26:** DR-072 says W4-W6 are rewards of Bosses 2, 4 and 6. DR-009 puts them at L14/L24/L34, and J26 makes the L20/40/60 boss rewards a big trinket or dance. I followed DR-009 and J26.
- **DR-071 vs DR-052:** DR-071 gives Dewdrop as the L4 Results reward, but DR-052 and the ammo tables put it in L4's kit (ammo 5). I resolved this with an intro card at level start plus a Results recap row (DR-142).
- **DR-055:** "Retry with a hint" has no defined hint. I assumed Dot's tip plus the aim preview on.
- **DR-045 vs "Blue Caps win!":** DR-045 says "Amber Colony's turn". I used "Amber Caps" for symmetry, so the DR-045 banner copy should change.
- **DR-045 "swap-colours button" vs the fixed pairing (blue circle, amber triangle):** I read the swap as swapping which player has each team, never changing the colour-badge pairing.
- **DR-071 durations vs gold shimmer:** the table has no time for the gold upgrade. I added +600 ms.
- **DR-003 and DR-015 "touch targets 48/56" vs foundation 64/72:** the foundation values apply (buttons here are 72 high).
- **DR-012 scene list:** the biome-complete and "The End" panels are Results sub-states, not new scenes. The Sticker album, Wardrobe and nickname picker (J26) are outside this DR set.

---

# Checkpoint C · Level 0 screens (DR-150 to DR-154)

## DR-150 · Level 0 entry: sign, panel, states, launching
- **Question:** How does a player find and launch Level 0 (Part 1 or Part 2 alone), and what does the sign show?
- **Options:** (1) a Title button · (2) a signpost on the map plus the usual detail panel, auto-opened on a new save · (3) a separate Level 0 scene
- **Debate (compact):** GD: it must be offered once, never nag, and Skip must be one tap (DR-058, DR-055). / AD: the reference map already has a right-hand detail panel, so a leaf signpost needs no new screen. / TL: derive "new" from the save, with no new flag: `progress` empty and `level0` empty.
- **Winner:** (2).
  - **Sign:** biome 1 page only, 96x88 hit rect at (n1.x−48, n1.y−128), above node 1 and clear of the Back button. Leaf board 96x56 (`leaf-600` #3E9A3A, plum 4, R16) with "0" in Lilita 40 (`panel` #FFF1D0). Below it a 88x24 plate reading "Training" (caption 18).
  - **Sign states:** new = ±2° wiggle (2.4 s) and a bobbing raspberry arrow · default = still · selected = lift 6 and shadow 8 · pressed = down 4 · focus = 4 px `secondary` ring · Part 1 done = 28 px check badge, top-right · Preview tried = 28 px reward badge, top-left (Brass Doorknob Pin icon on a win, Brave Scout leaf sticker on a loss; never a fail mark) · match saved = raspberry dot badge, bottom-right.
  - **Panel** (656,96,288,412), the same butter panel as the L4 panel. Title "Level 0" (40), "Training Grounds" (28), body 22 "Free play. Nothing to lose." Buttons: Part 1 Practice 256x72 (caption "about 3 min") · Part 2 Level 70 Preview 256x72 (caption "one try · about 4 min") · "Skip to Level 1" 256x64 (`secondary`). Button states: Play / Replay (P1 done) · Play / Resume ("Match saved") / Replay ("Reward collected. Replay for fun.") for P2. Nothing is ever disabled.
  - **New save:** Title Play opens LevelSelect with Level 0 selected and the panel open. Auto-open only while `progress`, `p1Done` and `previewResult` are all empty.
  - **Launch:** Part 1 goes straight to Battle (200 ms fade) and never plays the Jungle comic. Part 2 opens the DR-153 intro card first.
- **Reason:** It reuses the existing map panel, so no new scene, and it offers without nagging.
- **Rejected:** (1) clutters Title; (3) a new scene for one level.
- **Revisit if:** more than 60% skip it (shrink the panel to a single "Train?" prompt).
- **Builds on:** DR-058, DR-070, DR-055, DR-012, DR-003.
- **Judge:** Amended (J37). The sign rect is from DR-100 and the panel rect from DR-102.

## DR-151 · Dot tip cards in Part 1
- **Question:** How do tip cards look, where do they sit, and when do they close, without covering aim, wind or FIRE?
- **Options:** (1) a modal card that pauses play · (2) a non-modal card in fixed top slots that collapses to a Dot bubble · (3) a speech tail pointing at each control
- **Debate (compact):** GD: the player can't lose and there is no timer, so a card may wait, but it must not block the shot. / AD: Dot in a butter card, with a teal ring (plus a bobbing arrow) on the target control. / TL: the slots are fixed rects, and a keep-out test picks the side.
- **Winner:** (2).
  - **Card:** 400x112 butter panel, R24, plum 4, shadow 6. Dot disc 64 at left (`sky-400` fill, plum 4). Title 28 Lilita plus body 22, at most 2 body lines. A whole-card hit area closes it.
  - **Slots:** TL (16,120) or TR (544,120). That is below the wind gauge (y ≤ 112) and above the aim dial and FIRE (y ≥ 400), so those are covered by construction. Choose the side away from the active ant, its tag and the 8-dot preview. If neither is free, show the bubble only.
  - **Timing:** enter 220 ms (slide 24 and back-out). At 8 s, or on any aim, walk or fire input, it collapses (180 ms) to a 64x64 Dot bubble in the same corner. Tap the bubble to reopen it for 8 s. Doing the taught action closes the card at once. One card at a time, with a 400 ms gap. Reduced motion: a 100 ms fade.
  - **Order:** T1 move, aim, power, fire · T2 hop, Dewdrop · T3 wind, Pollen. The target control gets a 4 px `info` #1FA38A ring (+8) that pulses at 900 ms. Input outside the card is never blocked.
  - **Next:** a 152x64 pill at (648,16), `action`, label "Next". It appears after the player's 3rd turn (220 ms pop), pulses 3 times, then stays still. Pause is (880,16) and Fullscreen is (808,16).
- **Reason:** Non-modal cards keep Level 0 feeling like play.
- **Rejected:** (1) blocks the shot; (3) the control is far from the top slots.
- **Revisit if:** testers miss the cards (move the slot nearer the control).
- **Builds on:** DR-058, DR-070, DR-071, DR-033, DR-003.
- **Judge:** Amended (J33, J38). The cards use the DR-131 bubble rect. Next is 800,16,72,64. No fullscreen button.

## DR-152 · Sneak Shot chips and Dot announcement
- **Question:** How do the 3 greyed trial chips look, what do they say, and how do they behave?
- **Options:** (1) a separate row of buttons · (2) chips 4 to 6 in the weapon tray, with a short label on the chip and a full label in a tab · (3) a text-only list
- **Debate (compact):** GD: "Unlocks at Level 14 / 24 / 34" must read at a glance, and a tap must arm exactly 1 shot. / AD: the grey chip says "not yours yet" while the armed chip gets the real art. / TL: the tray is one component with 3 or 6 slots.
- **Winner:** (2).
  - **Tray:** 64x64 hit per chip, 8 gap, 12 padding. Left anchor x=336, y=436. 3 slots (232 wide) before the offer; it grows to 448 wide to the right (200 ms), with chips popping in 60 ms apart. Live slots never move. The name tab moves above the selected chip. Keys 4 to 6 select chips.
  - **Chip** (56 visual, R16, plum 4): ribbon "L14 / L24 / L34" (Lilita 18).
    - **Idle:** `locked` #B7AFC4 fill, silhouette in `plum-700`, a 24 px plum padlock badge at top-right.
    - **Pressed:** down 4, and the tab shows a 2-line label: name, then "Unlocks at Level 14" (22 / 18).
    - **Armed:** lift 6, `secondary` fill, full-colour art, ammo badge "1". Tap again to disarm.
    - **Tried:** locked fill, check badge (`leaf-400`), ribbon "tried". It shows the tab only and cannot be armed.
    - **Focus:** 4 px ring.
  - **Rule:** 3 trial shots per team, not per ant. After a trial shot, Seed Spitter is reselected.
  - **Dot card:** "Sneak Shot! One try of three weapons you'll earn later." Placed as in DR-151. It holds 1.5 s after its entrance, then collapses to the bubble. The chips pulse 2 times (raspberry ring, 600 ms).
- **Reason:** The short label sits on the chip, the full label appears on touch, and a tap arms the shot.
- **Rejected:** (1) off-tray; (3) hides the weapon art.
- **Revisit if:** testers fire a trial shot by accident (require a second tap to arm).
- **Builds on:** DR-070 (Judge), DR-009, DR-072, DR-015, DR-003a.
- **Judge:** Amended (J39). DR-124 tray geometry. 3 trials per team.

## DR-153 · "Ready for a peek at Level 70?" and the Preview intro card
- **Question:** How do the Go/Skip card and the one-attempt intro look, and how does "one attempt" show in the pause menu?
- **Options:** (1) one merged card · (2) a Go/Skip card, then an intro card with 3 rows · (3) a text-only pause note
- **Debate (compact):** GD: Skip must cost nothing. The expectation rows are what make one try feel fair. / AD: both are modal butter cards with a plum scrim at 60%. / TL: the pause menu keeps its slots, and a caption replaces Restart.
- **Winner:** (2).
  - **Ready card:** (192,112,576,316). Dot 96, title 40 on 2 lines, body 22 "One try against a tough bot. Skip and you can still try it later from the Level 0 sign." Buttons Skip (`secondary`) and Go (`action`), 256x72 each, gap 16. Default focus is Go. Esc focuses Skip but does not activate it. Skip goes to the L1 flow (comic if unseen).
  - **Intro card** (160,70,640,400): title "Level 70 Preview" (40) and a raspberry ribbon "ONE TRY" (Lilita 28). 3 rows (icon 48, text 22, 64 high):
    1. "One try. There is no Restart."
    2. "You (3 blue circles) vs 2 Porch Scouts (amber triangles). They have 60 HP."
    3. "They aim like a Level 70 bot. All 6 weapons are yours. About 4 minutes."
    - Buttons: "Let's go!" (`action`) and "Not now" (`secondary`), 72 high. Not now returns to the map, or goes to L1 when reached from the Ready card.
    - Variants: a saved match swaps "Let's go!" for "Resume". If already played, the title gets "(replay)" and a row "Rewards already collected."
  - **In match:** a non-interactive pill (800,88,144,32), `secondary`, plum text, "One try". The pause menu has 3 buttons (Resume, Settings, Quit). The Restart slot becomes a 64 px caption row with the Dot head: "One try! No restarts here." The panel size is unchanged. The Quit confirm says "Your match is saved. Resume it from the Level 0 sign."
- **Reason:** It is honest about the stakes without any pressure, and the pause panel stays the same size.
- **Rejected:** (1) too dense; (3) players hunt for the missing button.
- **Revisit if:** testers still ask "where is Restart".
- **Builds on:** DR-070, DR-047, DR-058, DR-012, DR-003.
- **Judge:** Accepted. Binding over DR-171 for the Preview pause (J40). Scrim 70%. The "One try" pill moves to 672,88,144,32 to clear Find-my-ant.

## DR-154 · Preview win and lose cards, and the replay state
- **Question:** What do the result cards look like, and what changes on a replay?
- **Options:** (1) the standard Results card with an acorn row · (2) a custom Level 0 card: ant hero art, one copy block, one reward row · (3) a full-screen cutscene
- **Debate (compact):** GD: no acorns here, only the reward. Losing must feel funny, not failed. / AD: win = a cocky hero with a confetti of rounded leaves. Lose = a dizzy ant with orbiting stars (never pointy stars). / TL: it is the Results card with a different row template.
- **Winner:** (2). Card (128,60,704,420). Hero art 240x300 on the left. Copy on the right.
  - **Win:** title "You beat a Level 70 bot!" (40), body "Imagine you after the whole trip." (22). Reward chip (304x64, `secondary`): pin art 40 + "Brass Doorknob Pin" and caption "Cap charm". It flies to the hero's cap anchor beside the stem (1500 ms, J26: never over the cap or badge).
  - **Lose:** title "Dizzy!" (64) and body "That is as tough as the Porch gets. You'll be ready by Level 61." The reward chip is the Brave Scout sticker (80 px, peel-in 1200 ms).
  - **CTA:** "Let's go!" (`action`, 280x72) to the L1 flow. A tap skips the reward animation.
  - **Replay** (a result already saved): the reward row is stone-outlined with greyed art, a check and "Already collected". The buttons are "Back to map" (`action`) and "Play again" (`secondary`). The copy is unchanged. Nothing is saved.
- **Reason:** One card, one reward, one button keeps the first-time path fast.
- **Rejected:** (1) acorns would imply failure; (3) too slow.
- **Revisit if:** players miss the sticker (add an album shortcut).
- **Builds on:** DR-070, DR-071, J26, DR-055.
- **Judge:** Accepted.

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- **DR-070 "1.5 s auto" vs reading time:** 11 words in 1.5 s is too fast. Resolved: it collapses to the Dot bubble (the text is still reachable) and the chips carry the label.
- **DR-070 "ammo per ant" vs PLAN "1 trial shot each" and "after all 3 are used":** I used per team (3 shots total). If it is meant per ant, the chip state must follow the active ant.
- **Tray position:** a 6-slot tray (448 wide) cannot be centred at x=480 without hitting the aim cluster (x ≤ 304). I set a left anchor of x=336 for the HUD spec. The reference slot pitch is about 81, and I used 72.
- **DR-015 keys 1 to 3:** extended to 1 to 6 for Level 0 and the Preview.
- **DR-070 "Skip leads to L1" vs DR-012 flow:** Skip goes to the Comic (if unseen), then Battle.
- **Lose copy "ready by Level 61":** under J23 the full kit is in by L34. The copy is binding, so it now means skill, not kit.
- **DR-071 sticker album:** Brave Scout is earned before page 1 (L2). The album needs a "Bonus" slot.
- **HUD positions** (Pause (880,16), Fullscreen (808,16), banner ≤ 640 wide) are working values. The HUD record must confirm them.

---

# Checkpoint C · Sticker album, Wardrobe, nicknames (DR-160 to DR-164)

## DR-160 · Sticker album
- **Question:** How is the album laid out, how do slots and page flips work, how many pages, and how do players enter and leave it?
- **Options:** (1) one scrolling grid of all stickers · (2) book pages, 6 slots each, one page per biome plus extras · (3) per-biome tabs with small lists
- **Debate (compact):** GD: pages are the reward unit (DR-071 "album page flips in"), so a page must be a real object with a count that fills up. / AD: a butter book panel with big silhouettes shows "what is left" without any text-heavy list. / TL: stickers are string ids in `save.unlocks`; the page list is data, rendered by one `AlbumPage` container.
- **Winner:** (2). **Pages: 13** = Page 0 "The Porch" (Level 0 sticker Brave Scout) + Jungle Home pages 1-3 (the L2, L7 and L10 reveals of DR-071) + one page for each of biomes 2-10 (revealed on that biome's first level, DR-071 rhythm). 6 slots per page.
  - Back button 64x64 at x16,y16 (inset-aware). Title "Sticker Album" (title 40) centred y20. Count "17 / 78" (label 28) top-right, right-aligned to x944.
  - Book panel x96,y88,w768,h368, butter `#FFF1D0`, plum 4 outline, radius 24, shadow 6. Page name (label 28) at y100. Slots 3x2, each 224x140 at x120/368/616, y148/304 (gap 24/16).
  - Arrows 72x72 hit (visual 56) at x16,y234 and x872,y234. Footer y468: "Page 3 / 13" (label 28) plus a raspberry NEW pill on any unseen page. Swipe, arrows and Left/Right keys flip.
  - Slot states: earned (butter card, art 96x96, name caption 18), unearned (flat stone `#B7AFC4` silhouette, caption = hint such as "Level 7"), new (raspberry NEW pill, jelly wiggle 200 ms), focus (4 px teal ring, 2 px gap). Locked page: all silhouettes plus a lock and "Clear Level N".
  - Flip: 320 ms (scaleX 1 to 0 in 160, then 0 to 1 in 160). Reduced motion: instant swap.
  - Entry: a Level Select button, or "See in album" on the reward pop-up (opens on the new page). Exit: Back, Esc or the Results pop-up tap.
- **Reason:** Pages give a collect-them-all goal, and 6 slots at 224x140 stay readable at 0.69 scale.
- **Rejected:** (1) no sense of a page reveal; (3) small targets and text.
- **Revisit if:** testers cannot tell which level earns a slot (add tap-to-hint toast), or art cost is too high for 78 stickers.
- **Builds on:** DR-071, J26, DR-055, DR-003, DR-012, DR-013, J18
- **Judge:** Accepted. Focus ring per DR-086. Brave Scout lives on Page 0.

## DR-161 · Wardrobe
- **Question:** How does a player give each ant one trinket, one dance and one nickname, and see the result?
- **Options:** (1) one list of ants, each with three dropdowns · (2) ant tabs plus a preview plus tabbed item grids · (3) drag items onto the ant
- **Debate (compact):** GD: kids want to see the change at once, so equip on tap with no Save button. / AD: preview must show the hero pose and the real in-game size so the trinket never looks bigger than it is. / TL: it writes `wardrobe{antId:{trinket,dance,nickname}}` (J18) on every change, nothing else.
- **Winner:** (2). Opened from Level Select. 4 ant tabs always shown (max 4 per side, DR-050), even if the level has fewer.
  - Back 64x64 at x16,y16. Title "Wardrobe" centred.
  - Ant tabs x16,y88,w168,h96, gap 8, down to y496. Shows side sprite 56 px, nickname (caption 18), small trinket icon. States: default, selected (raspberry outline), focus, pressed (down 4 px).
  - Preview panel x200,y88,w400,h408: hero pose at 1.5x (180x225) at x310,y108. Below, "In battle" strip x216,y352,w368,h92, leaf `#7CCB3E` fill, side ant at 1:1 (96 px) with a 24 px trinket.
  - Options x616,y88,w328,h408: 3 tabs (Trinket, Dance, Name) 104x64 at y88. Item area y160..496, vertical drag scroll. Trinket grid 4 columns of 72x72, gap 8. Dance rows 304x72 (DR-164). Name tab shows the current name plus a 200x72 "Change" that opens DR-163.
  - Tap equips at once. Tap the equipped item again, or the first "none" cell, to remove it. The same trinket may be on two ants.
  - Locked item: flat stone silhouette, 24 px padlock bottom-right, tap shows a toast with the source ("Clear Level 6"). Never hidden.
  - Two-player: both teams read slots 0-3 of the same wardrobe (team colour differs).
- **Reason:** Immediate feedback and visible goals suit kids. All hit areas are at least 72.
- **Rejected:** (1) no preview; (3) drag is poor on touch.
- **Revisit if:** more than 25 trinkets make the grid scroll too long (add a filter).
- **Builds on:** DR-071, J26, DR-050, DR-041, J18, DR-003, DR-013
- **Judge:** Accepted.

## DR-162 · Trinket item component and anchor rule
- **Question:** What size is a trinket, where does it attach, and how does it scale on the hero pose?
- **Options:** (1) fixed screen offset from the cap · (2) per-frame anchor point beside the stem, size tied to head scale · (3) free placement by the player
- **Debate (compact):** GD: it must never change team reading (J26). / AD: 24 px beside the stem, fully outside the cap silhouette, behind the cap in z-order. / TL: anchors are data in the ant atlas JSON per frame, and a CI pixel test checks overlap.
- **Winner:** (2).
  - Source art 48x48, shown at **24x24** on the side pose (about 0.25 of the 96 px ant width, DR-071).
  - Anchor `trinketAnchor` (x,y) per atlas frame (all walk and idle frames, hero, faces). It sits on the rear side of the cap stem (away from facing, so it mirrors with the ant), with the item box 2 px outside the cap outline.
  - Hard rules (J26): the box never overlaps the cap mask, the cap outline or the gaster badge. Draw it below the cap. CI test: mask overlap = 0 px on every frame.
  - Hero scale: size = 24 x (hero head width / side head width), clamped to 24..64. Wardrobe hero at 1.5x gives about 54 px. Assumed: side head about 40 px, hero head about 90 px.
  - States: default, equipped, locked (stone silhouette plus padlock), new (raspberry dot), gold-shimmer, focus (4 px teal ring), pressed (down 4 px).
  - Gold variant (3-acorn clear, DR-071): `#FFD978` fill, plum outline, a flat 4-point plum-outlined sparkle in `#F7B932` pulsing at 800 ms. No white glints (DR-003a). Reduced motion: static sparkle. Gold replaces the plain item; a 64x64 toggle in the preview lets the player go back.
- **Reason:** Per-frame anchors keep the rule exact while the ant bobs.
- **Rejected:** (1) drifts off the stem; (3) breaks team identity.
- **Revisit if:** any trinket reads as part of the cap at 0.69 scale.
- **Builds on:** DR-071, J26, DR-003, DR-003a, DR-007, DR-055
- **Judge:** Amended (J42). Gold uses the DR-105 twinkle dots, not a sparkle.

## DR-163 · Nickname picker
- **Question:** How do players name ants, and is free text allowed?
- **Options:** (1) free text field · (2) 12 preset silly names with Skip · (3) auto-names only
- **Debate (compact):** GD: DR-071 gives the L3 reward as "pick from 12 silly names with Skip", fast and fun. / AD: big name chips look like jelly buttons and fit the 540 px height. / TL: no free text means no keyboard on phones, no profanity filter, no personal data, and the names are locale strings.
- **Winner:** (2). **No free text entry**, for kid safety and for no on-screen keyboard.
  - Names (proposal, keys `nick.01`..`nick.12`): Biscuit, Noodle, Sprout, Pickle, Waffles, Pip, Bubbles, Zigzag, Mochi, Dumpling, Turbo, Squeak.
  - Modal panel x96,y64,w768,h412 (butter, radius 24). Title "Name your ant" (title 40) at y80. Left column x120,w160: side ant preview and Skip 160x72 at y380 (raspberry outline, secondary).
  - Chip grid x296,y150: 3 columns x 4 rows, chips 176x72, gap 8 (544x312). Label 28 Lilita, auto-shrink to 22 minimum. CI test: each locale name is at most 12 characters.
  - Chip states: default, pressed, selected (check), taken (name already used in this team, stone, small ant icon), focus.
  - Flow: pick sets the name and advances to the next ant (progress dots). Skip leaves this ant as "Ant N" and advances. Close X or Esc exits. Names are locale strings, never concatenated.
- **Reason:** Safe, quick, translatable.
- **Rejected:** (1) kids-safety and keyboard cost; (3) loses the reward.
- **Revisit if:** testers want more names (add packs per biome).
- **Builds on:** DR-071, DR-041, J18, DR-012
- **Judge:** Amended (J43). "Pip" becomes "Peanut".

## DR-164 · Dance preview and selection
- **Question:** How does a player preview and pick a victory dance, and what happens with reduced motion?
- **Options:** (1) pick from a text list, no preview · (2) tap plays once and selects · (3) separate Play and Select buttons
- **Debate (compact):** GD: dances are fun to watch, so the tap must show it. / AD: the hero pose in the preview does it, at most 1500 ms like the reward pop-up. / TL: dances are short sprite-tween clips, no loops, so reduced motion is easy.
- **Winner:** (2). Dance rows 304x72: name (label 28), mini icon 48, and a 56x56 replay button (hit rect 64x64) that plays without changing the selection.
  - Tap row: select and play once on the hero preview and in the in-game strip. Max 1500 ms (Wiggle, Spin, and later dances). Tapping again restarts. The dance ends on the cocky idle.
  - Row states: default, selected (raspberry outline plus check), playing (replay icon animates), locked (stone, padlock, source toast), focus, pressed.
  - Reduced motion (OS media query read at boot): no tween. Show the key pose and peak pose, swapped as a hard cut over 900 ms total with at most 3 changes. The same rule applies to the Results victory dance.
  - The Results screen plays the winning ant's own dance once.
- **Reason:** Preview equals result, and it is accessible.
- **Rejected:** (1) no preview; (3) extra taps.
- **Revisit if:** testers confuse select with preview.
- **Builds on:** DR-071, DR-161, J18, DR-003
- **Judge:** Amended (J35). Uses the Settings reduced-motion switch.

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- DR-071 says "sticker page 1/2/3" at L2, L7, L10 (all Jungle Home) but the rhythm says one page per biome; resolved as three Jungle pages plus a Level 0 Porch page (13 total).
- DR-071 does not list the 12 names; DR-163 proposes them.
- DR-012 Settings list has no reduced-motion setting; DR-164 uses the OS media query only.
- DR-071 table still says "Coconut Hat"; J26 renames it Coconut Charm.
- DR-003 says touch targets of at least 48; foundation tokens set 64 min, used here.

---

# Checkpoint C · Settings, pause, modals, saves (DR-170 to DR-175)

## DR-170 · Settings dialog (HTML)
- **Question:** Which controls and styling does the HTML Settings dialog have, and how is it opened?
- **Options:** (1) one scrolling HTML dialog with 5 sections · (2) tabbed dialog · (3) canvas Settings with custom sliders
- **Debate (compact):** GD: few, clear toggles; Assist and Relaxed turns must be findable by a stuck player. / AD: butter card, plum outline, jelly pills, so it feels like the canvas screens. / TL: real `<input type=range|checkbox>`, `role=dialog aria-modal`, free a11y (DR-012).
- **Winner:** (1). `#settings` is a fixed-position dialog over the canvas, max-width 600 CSS px, max-height 100dvh minus 2x safe-area, inner scroll, padding 24, radius 24, 4 px plum border, `0 8px 0` plum shadow, bg `panel`. Tokens come from `theme.css` vars. HTML text is in CSS px: Lilita One 28 headings, Nunito 18 body (never below 16), all controls at least 44x44 CSS px, 8 px gaps. Sections:
  - **Sound:** Music and SFX sliders 0-100 (defaults 70/80), live preview blip on release.
  - **Play:** Assist aim preview (1.0 s, DR-033), Relaxed turns 60 s (DR-043, single-player), Show tips + "Reset tips" button, Left-handed HUD (mirrors the bottom clusters, never the top readouts).
  - **Display:** Reduced motion (Auto follows `prefers-reduced-motion` / On / Off), Performance mode with note "Reloads the game. Uses a lighter picture. Use it if the game feels slow.", Fullscreen button, Install button (only if installable), Language select (English only, disabled, "More languages soon").
  - **About:** Credits (DR-174), build id.
  - **Reset progress:** danger zone, opens an HTML confirm "Erase all progress?" with Cancel (default) and Erase.
  - Controls: toggles are 72x44 pills (on = `action` fill + check mark, off = `disabled`), sliders have a 44 px thumb with value text. States: default, pressed (+2 px down), focus (DR-086 ring), disabled (`disabled`, 60% text), selected. Opened from Title (gear) and Pause (Settings button). Esc, Close (top-right 48x48 CSS) or backdrop tap closes. Opening turns off Phaser keyboard and pointer capture and traps focus. Closing returns focus to the opener. Performance toggle writes the setting and shows "Reload now" (in a match it reloads from the last TurnEnd, DR-173) or "Later".
- **Reason:** Sliders and focus handling come free in HTML, and one scroll avoids hidden settings.
- **Rejected:** tabs (hide Assist); canvas Settings (DR-012 cost).
- **Revisit if:** more than about 12 controls, then split into tabs.
- **Builds on:** DR-003, DR-012, DR-013, DR-033, DR-043, DR-018
- **Judge:** Amended (J31, J34). Adds Text size Normal/Large to Display. Focus ring per DR-086.

## DR-171 · Pause overlay scene
- **Question:** What does Pause look like, what freezes, when does it auto-trigger, and how does play resume?
- **Options:** (1) butter panel over a dimmed frozen battle · (2) full-screen menu · (3) side drawer
- **Debate (compact):** GD: Resume must be the biggest, easiest target; a surprise resume loses turns. / AD: four jelly buttons on a butter card (DR-047), battle visible under a scrim. / TL: the `Pause` scene pauses `Battle` and `Hud` sim and timer; auto-pause must also cover blur and portrait.
- **Winner:** (1). Scrim full 0,0,960,540. Panel 400 wide, x=280. Height = 88 + n*72 + (n-1)*12 + 32. n=4: h=444, y=48. n=3: h=360, y=90. Title "Paused" 40 at panel y+30, caption 18 "Level N · Round R" at y+66. Buttons 320x72 at x=320, first y = panel y+88, gap 12, order Resume (action, default focus), Restart (secondary), Settings, Quit to map. Level 0 Preview replaces Restart (DR-153). Part 1 keeps it. Footer caption "Match saved" or "Saving is off" (DR-173).
  - States: default, pressed, focus ring, disabled (none used).
  - **Confirms:** Restart opens a destructive confirm. Quit opens a neutral confirm and keeps the match slot.
  - **Freezes:** sim ticks, turn timer, camera follow, wind chevrons and ambient animation. Music ducks to 25% in 150 ms and SFX stop.
  - **Triggers:** `visibilitychange` hidden, window `blur`, portrait (rotate overlay flag), audio interruption, Esc or P, Android back (popstate guard).
  - **Resume:** scrim fades 150 ms, then a 600 ms ready-delay in real time. Input is ignored, buffers are cleared (DR-015), and a held touch must be released before it aims. Reduced motion uses 300 ms, no fade. Returning from portrait or blur lands on Pause, never silently running.
  - Esc: closes a modal, then Settings, then Pause.
- **Reason:** A ready-delay stops lost turns after a tap-resume.
- **Rejected:** instant resume (accidental shots); drawer (hidden Quit).
- **Revisit if:** playtesters resent the 600 ms.
- **Builds on:** DR-012, DR-015, DR-043, DR-047, DR-070
- **Judge:** Amended (J30, J40). Scrim 70%. The Preview keeps n=4 with the caption row.

## DR-172 · Modal and confirm dialog (canvas)
- **Question:** One confirm pattern for Restart, Quit, smooth-mode, resume and replace-match?
- **Options:** (1) one `ConfirmModal` component owned by the calling scene · (2) a new scene · (3) per-screen custom cards
- **Debate (compact):** GD: the safe choice must always be the default, and the destructive one never the biggest. / AD: same butter card family, destructive gets its own colour plus an icon, not colour alone. / TL: a component, not a scene (keeps DR-012 list), disables the owner's input while open.
- **Winner:** (1). Scrim tap = Cancel (non-destructive only). Card: x=220, w=520, padding 32, radius 24, 4 px outline, 8 px shadow, vertically centred, h = 32 + title 40 + 16 + body (22, max 3 lines, 456 wide, line 29) + 24 + 72 + 32. Buttons 216x72, gap 24, one row. Order: Cancel/safe left, confirm right. Styles: primary = `action`; secondary = `secondary`; **destructive** = `danger` fill, white text, 28 px bin icon. Focus default: primary, but for destructive the Cancel button. Keys: Esc, Android back and B = Cancel. Enter or Space activates focus; arrows or Tab move it. Max one modal. Open: scrim fade 120 ms plus card pop 0.9 to 1 in 160 ms. Reduced motion: 80 ms fade only. Button states: default, pressed, focus, disabled.
- **Reason:** Consistent order and a safe default prevent kid mis-taps.
- **Rejected:** a scene (list bloat); three buttons (too much to read).
- **Revisit if:** a 3-choice dialog is needed (stack as 3 rows).
- **Builds on:** DR-003, DR-003a, DR-012, DR-013, DR-047
- **Judge:** Amended (J30, J31). Scrim 70%. DR-086 ring.

## DR-173 · Save status UI
- **Question:** How does the player know saves work, fail, or can be resumed?
- **Options:** (1) quiet indicator, banner only on failure, resume modal · (2) always-visible save icon · (3) silent
- **Debate (compact):** GD: a saved match is a promise, a failure must be loud once. / AD: no HUD clutter, so nothing in Battle. / TL: writes are TurnEnd (`ants.match.v1`) and level end (`ants.save.v1`, J18); a boot probe write detects blocked storage.
- **Winner:** (1).
  - **Indicator:** 40x40 plum-700 disc with butter acorn-check at x=16,y=484 (plus safe margin) on Results, LevelSelect and Title only. It shows 1200 ms after a write. None in Battle. Pause footer says "Match saved".
  - **Banner:** if the probe or a write throws, a 560x64 `secondary-shade` pill at x=200,y=16 reads "Saving is off on this device." / "Progress is lost when you close the game." Text 22 over two lines. Persistent on Title and LevelSelect with a 64x64 close (returns next session). In Battle it shows 3 s once. Pause footer: "Saving is off".
  - **Resume prompt:** tapping a level whose id equals the slot's opens a DR-172 modal "Pick up where you left off?", body "Round 5 · Blue's turn", [New match] [Resume] (default Resume). A different level in the same mode: "Start a new match? Your saved match on Level 12 will be replaced." [Cancel (default)] [Start new (destructive)]. Resume shows "The ants are remembering…" on a 480x120 card; after 5 s it adds "Start over". Build mismatch or failure: "That match is from an older version." [Back] [Restart level].
  - No save is written on blur or fatal error.
- **Reason:** Silent when fine, loud once when broken.
- **Rejected:** a permanent HUD icon; auto-resume with no prompt.
- **Revisit if:** players say they did not know they had a saved match.
- **Builds on:** DR-018, DR-047, DR-070, DR-172, J18
- **Judge:** Accepted.

## DR-174 · Credits and licences
- **Question:** What must Credits show and where do licence texts ship?
- **Options:** (1) a Credits view inside the Settings dialog plus shipped licence files · (2) a canvas scroll · (3) a link to GitHub only
- **Debate (compact):** GD: a short thanks line, kids will not read legalese. / AD: calm list, 16 CSS px minimum. / TL: OFL needs the notice and licence with redistributed fonts, so files ship same-origin and offline.
- **Winner:** (1). Opens from Settings > Credits as a view swap with a Back button. Content, in order: title and build id; "Made by" line (name supplied by the owner); third-party table (name, version, licence, [View licence] expands inline): Phaser 3.90.0 (MIT), Lilita One (SIL OFL 1.1), Nunito (SIL OFL 1.1); each runtime library the bundler includes, auto-listed; "Art and code are original. Sound is made in code."; "No ads. Saves stay on this device." Licence texts ship at `/Ants/licenses/`: `OFL-LilitaOne.txt`, `OFL-Nunito.txt`, `MIT-Phaser.txt`, `THIRD_PARTY.txt` (generated at build). Precached by the service worker. Fonts are self-hosted woff2 subsets with `OFL.txt` beside them; no Reserved Font Name is claimed for a subset.
- **Reason:** Legal compliance and offline use at no UI cost.
- **Rejected:** Google Fonts hotlink (offline and privacy); a link-only credit.
- **Revisit if:** any asset with attribution is added (music, icons).
- **Builds on:** DR-003, DR-012, DR-018, DR-170
- **Judge:** Accepted (J27).

## DR-175 · Error and crash fallback (HTML)
- **Question:** What does the player see if the game fails to start or crashes?
- **Options:** (1) a static `#fatal` card in `index.html`, inline CSS, shown by error handlers · (2) reload silently · (3) a Phaser error scene
- **Debate (compact):** GD: kind copy, one obvious button. / AD: butter card on plum, no external font needed. / TL: it must work without the bundle (DR-012), so no module imports, and a crash loop must be breakable.
- **Winner:** (1). z-index above rotate and Settings, `role=alert`. Card max 520 CSS px, radius 24, 4 px plum border, plum page, butter card. Fonts `Lilita One` if loaded else `ui-rounded, system-ui`. Copy:
  - Crash: "Oh no, the ants tripped!" / "Something went wrong and the game stopped." plus "Your saved progress should be safe." only if the save probe passed.
  - Canvas and WebGL both fail: "Your browser can't draw the game. Try a newer browser."
  - No JS (`<noscript>`): "This game needs JavaScript. Please turn it on and reload."
  - Load over 15 s: "Still loading… check your connection."
  - Buttons: **Reload game** (56 CSS px high, default focus), plus a collapsed "Details" with copyable error text. If 2 fatals happen within 60 s (sessionStorage counter), add "Clear saved match and reload", which removes `ants.match.v1` only.
  - Triggers: `window.onerror`, `unhandledrejection`, boot failure. A WebGL context loss tries to restore for 3 s, then goes fatal.
- **Reason:** Works with no bundle, and the loop breaker protects a corrupt match save.
- **Rejected:** a silent reload loop; a canvas error scene (dies with the canvas).
- **Revisit if:** error telemetry is ever added.
- **Builds on:** DR-012, DR-013, DR-018, DR-047
- **Judge:** Accepted.

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- DR-012 lists a "text size" setting; omitted here because the canvas bitmap text cannot scale.
- DR-003 says fonts "from Google Fonts"; offline play (DR-018) and DR-174 need self-hosted fonts.
- DR-047 does not say whether Quit keeps the match slot; DR-173 keeps it for all levels.
- Left-handed HUD is a new setting; the HUD DR must provide mirrored layouts.
- Esc priority (modal, Settings, Pause) is new; Phaser keyboard is disabled while HTML Settings is open.

---

# Checkpoint C · Two-player setup (DR-180 to DR-183)

## DR-180 · Two-player setup layout
- **Question:** What is on the Two-Player Setup screen, where, and what do names, ants, timer, wind and kit controls look like?
- **Options:** (1) one screen, two team cards flanking a map column, options bar below · (2) wizard of 3 steps (names, map, rules) · (3) minimal screen (map + Start), rules in Settings
- **Debate (compact):** GD: A friend on a shared phone wants Start in 3 taps, but kids love naming their ants. One screen shows everything and Start is always valid. Wind on/off is rejected: wind is the skill (pillar 4) and each biome's field is its identity (DR-032). / AD: Blue left and Amber right, fixed, with badge, band and ant portrait on each card, so "who is who" is clear before play (DR-003). Amber band uses plum text because white on #E69F00 fails contrast. / TL: One scene `TwoPlayerSetup`, one `TwoPlayerSetup` object handed to Battle. Typed names need a native keyboard, so the name editor is an HTML input overlay (like Settings, DR-012).
- **Winner:** (1). Frame = 928x508 safe rect, margin M = max(16, inset+8); rects below assume M = 16 at 960x540. Hit rects are 64+ high, 8+ apart.
  - Header y16..80: Back (16,12,72,64); title "Two Players" Lilita 40 centred; Resume pill (724,16,220,64), shown only if `ants.match.v1` 2P slot exists.
  - Blue card (16,88,264,288), Amber card (680,88,264,288). Butter panel, r24, plum 4. Band (0,0,264,48) team fill, badge 36 with white ring, text "Player 1/2" Lilita 28 (white on Blue, plum on Amber). Portrait (84,60,96,96). Ant-count icons row (56,164,152,32), 4 slots of 32, filled up to N, rest stone 30%. Name pill (16,208,232,64): name Lilita 28, pencil icon 24. Default names "Blue Colony" / "Amber Colony" (DR-045).
  - Map column x296..664 (DR-181), weapon tray (297,296,366,64): 6 cells of 56 (icon 40 + ammo numeral 22): Seed ∞, Dew 3, Pollen 1, Grub 1, Roller 2, Plop 2 (DR-034, J24). Display only.
  - Row A y388..452: Ants group plate (16,388,320,64): label "Ants each" 22, minus (136,388,64,64), numeral 40 at x200..256, plus (256,388,64,64); range 2..4, default 3. Turn group plate (352,388,336,64): label "Turn", chips "30 s" (424,388,124,64), "60 s" (556,388,124,64); "60 s" is Relaxed turns (DR-043). No "off" chip.
  - Row B y460..524: toggle plates "Starter kit only" (16,460,328,64) and "Pickups" (360,460,328,64); whole plate is the hit rect, switch visual 64x36 at right. Pickups = Honey Drop + Seed Bundle every 3rd round (DR-048, J11).
  - START (704,428,240,96), raspberry, Lilita 40, bottom-right like FIRE.
  - Names: tap pill opens a picker sheet (60,48,840,444): 12 presets in 4x3 tiles (196x64): Crumb, Pip, Waffle, Biscuit, Noodle, Pickle, Sprout, Button, Mochi, Pebble, Doodle, Zippy; plus "Write my own" (HTML input, max 12 chars, letters, digits, space, - ' !; small normalised blocklist; on a hit show "Nice try! Pick another."). The other player's name tile is disabled. Equal names get " 2".
  - Starter kit ON: tray cells 4-6 go stone with a small x; ammo unchanged.
  - States: pill/chips/buttons default, pressed (down 4, shadow shrinks), focus (ring token, 4 px offset 2), chip selected (raspberry fill) vs unselected (butter-gold); stepper minus/plus disabled (stone) at 2 and 4; toggle off (stone track, knob left) / on (teal track, knob right, check shape); Start never disabled.
  - Keys: Tab order Back, Resume, P1 name, P2 name, map prev, map next, minus, plus, 30 s, 60 s, Starter, Pickups, Start. Enter on Start starts, Esc = Back.
- **Reason:** Everything is visible at once, thumb-friendly (Start bottom-right), and Blue/Amber never swap (DR-003).
- **Rejected:** (2) too many taps for a visitor. (3) hides rules. Wind on/off (kills pillar 4). Colour swap (see Conflicts). Free-typing on canvas (no keyboard support).
- **Revisit if:** testers miss the Starter toggle, or the keyboard covers the screen on 667x375 (then presets only on touch).
- **Builds on:** DR-003, DR-012, DR-034, DR-041 (J10), DR-043, DR-045, DR-048, DR-057, DR-072 (J12, J24), DR-032
- **Judge:** Amended (J44, J45). No "Write my own". Defaults "Blue Caps" / "Amber Caps". "Pip" becomes "Peanut".

## DR-181 · Map picker component
- **Question:** How do two players choose among the 10 arenas plus Random, and is anything locked?
- **Options:** (1) one big thumbnail with prev/next arrows and swipe, wrapping · (2) 4x3 grid sheet · (3) dropdown list
- **Debate (compact):** GD: Eleven choices is few, and 2-3 taps reach any map from the middle. Nothing is locked: a guest on a fresh save must not be shut out (DR-057). / AD: One large thumbnail reads like a poster of the biome. A wind hint line with a teal arrow shape keeps wind visible before play. / TL: Thumbnails are baked at build time from each arena's mask and biome colours into one sheet, 4x3 frames of 448x252 (5.4 MB), loaded on entering Setup and destroyed on leaving (DR-014 pattern). No biome atlas is loaded.
- **Winner:** (1).
  - Column x296..664. Prev arrow (296,127,64,64), next arrow (600,127,64,64), jelly butter-gold, chevron stroke 6 round. Thumbnail frame (368,96,224,126), plum 4, r16, hard shadow 4; image at 224x126 (448x252 at S=2) with spawn markers (Blue circle left, Amber triangle right).
  - Name (296,228,368,32) Lilita 28 centred. Hint line (296,262,368,28) body 22: teal arrow + text. Hints: Gentle wind, Shifty wind, Updraft, Steady gusts, Swirling wind, Kite gusts, Door gusts, Swaying wind, Vent bursts, Hood and fridge, Surprise wind.
  - Order: Jungle Home, The Clearing, The Camp, The Trail, Village Garden, Picnic Park, The Porch, Living Room, The Pantry, The Kitchen, Random arena. Wraps both ways.
  - Random: thumbnail is a butter-gold tile with a die icon (96). The thumb is a button: tap rolls a new seed (die tumble 300 ms); hint line shows "Seed 4821 · tap die" (0..9999). Seed picks biome and layout; it stays secret until the first TurnStart pan.
  - Change animation: slide 180 ms ease-out, name crossfade 120 ms. Swipe over the thumb (48 px) or Left/Right keys when focused. Reduced motion: 0 ms.
  - Policy: all 11 entries always unlocked, no lock icons, no campaign gating, no comics triggered.
  - States: arrow default/pressed/focus (never disabled); thumb default/focus/(Random) pressed.
- **Reason:** Simple, big, and one control for touch, mouse and keyboard.
- **Rejected:** (2) grid costs a second overlay; (3) no picture. Locks (DR-057).
- **Revisit if:** testers swipe past a favourite repeatedly. Then add a grid on tap.
- **Builds on:** DR-014, DR-032, DR-045, DR-057, DR-003
- **Judge:** Accepted.

## DR-182 · Defaults, memory and Rematch
- **Question:** What does Setup start with, what is remembered, and how does Rematch work?
- **Options:** (1) remember last setup in the save, Rematch reuses it · (2) always reset to defaults · (3) remember only names
- **Debate (compact):** GD: A family plays several matches in a row, so memory saves taps. First launch must be fair and gentle. Rematch keeps the same arena but must roll new wind and a new coin flip. / AD: Names and arena on screen at once so the second match feels familiar. / TL: Add `settings.twoPlayer` inside `ants.save.v1`; read with clamping and defaults, so no version bump (J18, `migrate()` tolerant).
- **Winner:** (1).
  - `settings.twoPlayer = { names:[s,s], ants:2..4, arena:0..10, timer:30|60, starter:bool, pickups:bool }`. Written on Start (not on every tap). Bad or missing values fall back to defaults.
  - First-launch defaults: names "Blue Colony" / "Amber Colony", ants 3 (J10), arena Jungle Home (gentlest wind), timer 30 s, Starter kit only off (all 6 weapons, DR-072), Pickups off (DR-048). Ammo is not editable: Seed ∞, Dew 3, Pollen 1, Grub 1, Roller 2, Plop 2.
  - Random remembers "Random" but rolls a fresh terrain seed each time Setup opens. The match seed (coin flip, wind rolls) is separate and fresh on every Start.
  - Rematch (from Results, also after a Draw, DR-044): same `TwoPlayerSetup` object with the same arena and terrain seed, new match seed (so a new coin flip and new wind). Results also has "Change setup", which opens Setup prefilled. Nothing is written for Rematch.
  - Resume pill (DR-047): visible only if a 2P match slot exists. Start does not warn; the first TurnEnd overwrites the slot.
  - Corrupt or blocked storage: defaults, no error shown (try/catch, DR-018).
- **Reason:** Fewer taps for repeat play, same fairness, and the save stays small.
- **Rejected:** (2) annoying for families; (3) halfway. Reusing the match seed on Rematch (same coin flip every time).
- **Revisit if:** testers want "loser goes first" or "swap who starts".
- **Builds on:** DR-018 (J18), DR-041, DR-044, DR-045, DR-047, DR-048, DR-057, DR-072
- **Judge:** Amended (J45). The default names are "Blue Caps" / "Amber Caps".

## DR-183 · Who is up across a hot-seat match
- **Question:** How does everyone always know whose turn it is, consistent with the DR-045 tap gate?
- **Options:** (1) team-colour screen frame + banner + persistent turn chip + gate button · (2) banner only · (3) full-screen team colour wash at handover
- **Debate (compact):** GD: The gate stops the timer burning while the phone moves, so it must say whose turn it is, loudly, from arm's length. / AD: Colour alone fails colourblind kids, so every cue pairs colour with the badge shape (circle vs rounded triangle). A frame is calm and never hides the field. / TL: Frame, chip and gate are Hud-scene objects driven by one `activeTeam` value; the gate is one input-wait state after the TurnStart pan (DR-042, DR-045).
- **Winner:** (1). Two-player only.
  - **Frame:** 8 px team-colour stroke around the safe rect, inner r24, drawn above the world, below HUD. Blue #0072B2, Amber #E69F00. Crossfades 150 ms at TurnStart (instant if reduced motion). Stays through Resolve, retreat and Pause.
  - **Banner (TurnStart):** pill (300,16,360,56) top-centre, badge 40 + "{name}'s turn" Lilita 28, slides in 180 ms, holds through the gate, then shrinks into the chip (200 ms). The next ant carries the bobbing arrow tinted to team with a badge ring (DR-041).
  - **Turn chip (persistent):** (16,16,264,56) top-left: badge 36 + name (body 22). The HUD record must reserve it (check against the pause button corner).
  - **Gate:** after the 500 ms pan, a jelly button (300,404,360,96): team-colour fill (white text on Blue, plum text on Amber), badge 48 left, "Tap to start" Lilita 40. Pops in 180 ms. Tap, Space or Enter starts. Hit area is the button only, with a 400 ms lockout from first show so a stray handover touch does nothing. Other HUD controls are visible but inactive, no dimming (nothing hidden, DR-045). The timer starts on tap (DR-043).
  - **First turn:** a 1000 ms coin-flip pop ("{name} goes first!"), tap to skip, then the normal TurnStart.
  - **States (gate):** default (idle bob 4 px, 1.2 s), pressed (down 4), focus, locked (first 400 ms, 60% opacity). Reduced motion: no bob.
- **Reason:** One-glance rule (pillar 2): edge colour, badge shape and name all say the same thing and never depend on colour alone.
- **Rejected:** (2) too easy to miss when passing; (3) hides the map and fights DR-045's "nothing hidden". Full-screen tap gate (accidental starts while passing the phone).
- **Revisit if:** the frame hides edge-adjacent ants, or "Quick handover" is requested (DR-045).
- **Builds on:** DR-003, DR-041, DR-042, DR-043, DR-045, DR-047, DR-003a
- **Judge:** Amended (J46). No turn chip. Gate at 300,212,360,96. The DR-127 plate is the banner.

### Conflicts found (raised by the debate; resolved in the J27–J56 table)
- DR-045 setup lists "map pick from unlocked biomes" and a "swap-colours" button. DR-057 and DR-072 open every arena from the start (they win). The brief fixes Blue and Amber and never swaps them, so the swap button is dropped. Patch PLAN.md line 100 ("colour swap") and DR-045.
- DR-045 says Setup is a canvas scene, but typed names need an HTML input overlay. This extends DR-012's HTML list (rotate, loading, Settings).
- DR-072(c) gives W4/W5/W6 ammo 1 each, but the DR-009 judge ruling (J24) sets Grub 1, Roller 2, Plop 2. J24 is used here.
- DR-057 says Random arena uses a fresh seed but not whether the seed picks the biome. This record assumes it does (needs confirming in the level schema).
- DR-057 still says ammo 4/3 and crates every 4 rounds. J12 and J11 already amend this (3/1, every 3rd round).
- DR-180 "Pickups" label covers both Honey Drop and Seed Bundle (J11); DR-045 only names honey drops.
- The turn chip at top-left and gate button at bottom-centre must be checked against the HUD and pause-button rects from the parallel records.
