# PLAN — Project Ants (checkpoint B)

This is the build plan for the game's systems. Every rule cites a Decision Record in `docs/DECISIONS.md`. Where two records disagreed, the planner's ruling (J1–J22 in DECISIONS, "Checkpoint B · Planner's judging summary") wins, and the record carries a **Judge's ruling** line.
Look, story and UI live elsewhere: `CREATIVE.md`, `STORY.md` and `UI.md` (checkpoint C). Ant art is still placeholder (DR-007a). Nothing here depends on the final art.

**Status labels:** *Verified* means checked by the planner on 2026-11-16. *Calibrated* means checked by the planner's Monte-Carlo model, not by the game itself. Everything else is a design value to be confirmed by the tests in §10.

---

## 1. Architecture

- **Split:** game rules live in plain TypeScript under `src/sim` and `src/ai`, with no Phaser import, and run under node. Scenes only draw state and send commands (DR-010).
- **Loop:** fixed step `SIM_DT = 1/60` with an accumulator. Delta is clamped to 250 ms, at most 5 steps run per frame, and leftover time is dropped. Render interpolates positions, and the sim pauses while the tab is hidden (DR-010).
- **No engine physics:** the sim does its own gravity, wind and mask collision; there is no Arcade or Matter (DR-010).
- **Determinism (DR-011, J9):**
  - RNG is sfc32 seeded by cyrb128(`matchSeed:levelId:purpose`), with five streams: `terrain`, `wind`, `spread`, `ai`, `cosmetic`. Sim code never reads `cosmetic`.
  - Numbers are float64 with a fixed operation order, using `+ - * /` and `Math.sqrt` only.
  - Angles are integer tenths of a degree and power is integer per-mille. Sin and cos come from a committed 0.1° quarter-wave literal table.
  - Banned in `src/sim` and `src/ai`: `Math.random`, `Date`, `performance.now`, `Math.sin/cos/tan/atan2/pow/exp/log`, `**`, comparator-less `sort`, and timing-dependent `Set`/`Map` order. A ban-scan test plus Biome rules enforce this.
- **Replays:** a match is `(seed, levelId, [(tick, command)])`, so it can be re-simulated exactly (DR-011, DR-015, DR-047).
- **Scenes (DR-012):** `Boot` → `Preload` → `Title` → `LevelSelect` → `Comic` (first visit to a biome) → `Battle` with a parallel `Hud` → `Pause` overlay → `Results`. The scene keys are lowercase, in one `SceneKey` enum.
- **HTML, not canvas:** the rotate-device overlay (works before Phaser loads), the loading/no-JS/WebGL-failure message, and the Settings dialog (DR-012).
- **Phaser config (DR-004, DR-013):**
  - Phaser **3.90.0**, `Phaser.AUTO`, logical 960x540, `Scale.FIT`, `CENTER_BOTH`.
  - `antialias: true`, `pixelArt: false`, `roundPixels: false`, `activePointers: 3`, no physics block.
  - Crisp text: the canvas is 960·S × 540·S with root camera zoom S. S = 2 when DPR ≥ 1.5, else 1, and Performance mode forces 1.
  - If the median frame time stays over 20 ms for 3 s, offer "smooth mode" (S = 1).
  - **The S = 2 spike is build stage 0.** The fallback is S = 1.
- **Texture memory (DR-014):**
  - 96 MB soft cap and 128 MB hard cap, counting `w·h·4`. Atlas pages are at most 2048².
  - Always resident: the shared atlas (2 pages).
  - Per biome: 1 atlas page, 2 parallax strips and the comic panels, freed when the biome is left.
  - Estimated peak is about 75 MB. CI fails if more than 3 pages are resident.
- **Input (DR-015, DR-033, J8):**
  - Events become `Command`s, stamped with the sim tick, in a 4-slot ring.
  - Buffers: fire 12 ticks, jump 9 ticks, weapon switch immediate. Buffers are cleared on turn change.
  - Keyboard: A/D or ←/→ walk, W/S or ↑/↓ aim, PgUp/PgDn or +/− power (assumed key choice; final map in UI.md), Space fire, Shift or Z jump, Q/E/Tab or 1–3 weapon, Esc or P pause, F fullscreen.
  - Mouse: drag from the ant sets angle and power, and release does not fire. Touch: aim pad bottom-left, FIRE bottom-right. Exact layout goes in UI.md.
- **Platform (DR-018):**
  - Manifest: `fullscreen` with a `standalone` override, `orientation: landscape`, plum `#2E1A47` theme.
  - A hand-written service worker (production only): cache-first for hashed assets, network-first for `index.html`.
  - First-tap audio unlock in `Boot`.
  - No zoom, scroll or pull-to-refresh: viewport meta, `touch-action: none`, `overscroll-behavior: none`, non-passive `touchmove`. Safe-area insets apply to the HUD.
- **Saves (DR-018, DR-047, J18):** `ants.save.v1 = {v, progress{levelId: {done, acorns, skipped}}, comicsSeen, unlocks, settings}` plus `ants.match.v1 = {levelId|setup, seed, buildId, inputLog}`. Both are try/catch guarded, with a `migrate()` chain. A corrupt save moves to `ants.save.bak`.

**Proposed source layout (DR-010, DR-011, DR-012, DR-025):**
```
src/sim/      rng, trig table, terrain grid, physics, wind fields, weapons, damage, turn FSM, match
src/ai/       solver, error model, botParams(level)
src/levels/   level JSON (100 + 10 two-player arenas), biome kits
src/scenes/   Phaser scenes (Boot … Results), Hud
src/render/   terrain chunks and outline, sprites, camera, juice
src/ui/       theme.json (checkpoint C), HTML overlays
tools/        mask compiler (recipe → .mask), art rasteriser, trig-table generator
tests/        unit + headless suites (§10)
public/levels/  compiled .mask files
```

## 2. Toolchain and versions (DR-016, verified on npm 2026-11-16)

| Package | Pin | Note |
|---|---|---|
| phaser | 3.90.0 | last 3.x (DR-004) |
| vite | 8.3.5 | newest ≥ 14 days old (8.3.6+ too new) |
| typescript | 5.9.3 | typecheck only (`tsc --noEmit`); TS 7.0.2 deferred to a later spike |
| vitest | 5.0.5 | node environment; peers accept vite ^8 |
| @biomejs/biome | 2.6.4 | lint and format (judge-verified) |
| Node (CI) | 24 | assumed LTS line |

- Install with `save-exact` and commit the lockfile.
- Scripts: `dev`, `build` (rasterise art, then `vite build`), `typecheck`, `lint`, `test`, `ci`.
- `tsconfig` is `strict` with `noUncheckedIndexedAccess`.

## 3. Game loop and turn flow

**Meta loop (DR-040, DR-055):** Title → Level select → Comic (first level of a biome, skippable, replayable) → Battle → Results → Next level or Map.
- Acorns: 1 for a win, +1 if no own ant is knocked out, +1 if the win is within par. Acorns gate nothing.
- Loss: "Dizzy! Try again?" offers Retry on the same seed, or Map.
- After 2 losses in a row Dot gives a tip. After 3 (5 on bosses), a "Skip for now" offer appears. Skipped levels stay replayable.
- Default par is 2 × rival ants + 2 own turns, and 14 on bosses.

**Teams (DR-041, DR-050, J10):**
- Ant HP is 100. Teams alternate, and within a team ants rotate in a fixed order, skipping knocked-out ants.
- The player goes first in the campaign. In two-player a seeded coin flip decides.
- At most 4 ants per side. Campaign sizes are in §6, and two-player defaults to 3v3 (2–4 selectable).

**Turn state machine (DR-042, DR-038, DR-043, J5, J6):**
```
TurnStart ──► Move/Aim ──► Fire ──► Resolve ──────────────────────► TurnEnd ──► TurnStart | MatchEnd
 900 ms       30 s timer    300 ms   flight + 3 s retreat window      700–1800 ms
 banner,      walk, hop,    input    (leftover move budget usable),   knock-outs 1200, dew rise 800,
 wind reveal, aim, pick     locked;  ends when all bodies < 8 px/s    pickup drop 700, boss card 1200,
 camera pan   weapon        shot     for 30 ticks; hard cap 12 s      win check, wind roll (seeded)
 [2P: tap-to-start gate]    spawns at 18 ticks
```
- **Timer (DR-043):** the timer is 30 s and counts sim ticks during Move/Aim only. Aiming does not pause it. At 0 the turn is skipped and nothing fires. "Relaxed turns" gives 60 s, and teach levels always use 60 s.
- **Match end (DR-044):** a team wins when the other has no active ants. If both teams are wiped at once, it is a draw: a loss in the campaign, Rematch in two-player.
- **Sudden death (DR-044):** a warning shows at round 18. From round 21 (round 30 on bosses) the teal "dew" rises 24 px per round, and ants under it are bubbled home (knocked out). At the round-40 cap, more total HP wins.
- **Two-player (DR-045):** a "Tap to start" gate ends every TurnStart. Nothing is hidden. Controls are identical for both players.
  - Setup: arena, seed shuffle, 2–4 ants, relaxed timer, pickups toggle and colour swap. Player 1 is Blue circle and player 2 is Amber triangle (DR-003).
- **Camera (DR-046, DR-038, DR-020, J7):**
  - TurnStart: 500 ms pan at zoom 1.15.
  - A drag pans during Move/Aim. On Fire the camera follows the shot with 180 ms smoothing and a 40 px look-ahead, at zoom 1.2.
  - On impact: 75 ms hit-stop, shake of 0.15 × blast radius (≤ 6 px), a 400 ms hold, a follow on the largest knockback, then return.
  - Zoom never exceeds 1.25. Reduced motion means no shake, zoom or hit-stop, and 150 ms cuts.
- **Pause and saves (DR-047):** pause freezes the sim and the timer, and the game auto-pauses when the tab is hidden. The menu has Resume, Restart, Settings and Quit (with confirm).
  - The match slot is written at every TurnEnd. Resume re-simulates headless (target ≤ 3 s), and a build mismatch offers Restart instead.
- **Pickups (DR-048, J11):**
  - Honey Drop: +25 HP, capped at 100.
  - Seed Bundle: +2 Dewdrop and +1 Pollen.
  - The campaign places pickups in level data (rest levels get 3). Two-player has them behind a toggle, off by default, dropping every 3rd round.

## 4. Terrain

- **World (DR-020):** one 960x540 screen per level. The mask is 1 cell per logical px, so 518,400 bytes. The camera never shows beyond the world.
- **Grid (DR-021):** `TerrainGrid{w, h, cells: Uint8Array}` holds material IDs and is owned by the sim, with no canvas readback.
  - `erase(cx, cy, r)` works per pixel and pushes dirty rects. `solidAt(x, y)` reads the grid.
  - Detached fragments under 60 px are deleted inside the dirty rect.
- **Materials (DR-022, J2):**

| ID | Material | Crater × | Restitution | Use |
|---|---|---|---|---|
| 0 | EMPTY | – | – | air |
| 1 | SOIL | 1.0 | 0.35 | default ground |
| 2 | SOFT | 1.5 | 0.10 | sawdust, marshmallow, beds, bread, mat, rug, sugar |
| 3 | HARD | 0.5 | 0.30 | roots, stumps, crust, pots, blocks, cereal box, board |
| 4 | ROCK | 0 | 0.35 | pebbles, pegs, shelves, sink rim |
| 5 | BOUNCY | 0.6 | 0.85 | tent canvas, jelly, cushions |
| 6 | SLICK | 1.0 | 0.40 | kitchen tiles (ants slide, per DR-036) |
| 7 | WATER | non-solid | – | puddles, sink, water bottoms |

- **Projectile collision (DR-023, J4):** projectiles move in steps of 2 px or less, at speeds up to 1500 px/s. Each step tests the centre plus 4 ring points (radius 4, or 8 for Dewdrop), and the ant capsule.
  - The surface normal comes from a 9x9 solid-gradient window.
  - Bounce: `v' = v − (1+e)(v·n)n`, then the tangential part × (1 − 0.2·mu).
- **Ant collision (DR-023, DR-027, DR-036):**
  - Probes: feet at −16, 0 and +16; walls at ±26 (heights 10 and 28); head at 44.
  - Step-up is 8 px and the walkable slope is 45°. An ant stands without sliding up to 60° and slides when steeper (over 10° on SLICK).
  - Embedded ants are pushed up by at most 24 px.
- **Rendering (DR-024, DR-001):**
  - Terrain draws as 12 chunk canvases (4x3, each 240x180), and only touched chunks refresh.
  - The outline comes from a 2-pass radius-2 box blur plus an ink LUT, about 4.5 px wide.
  - Budget per blast frame: median 3 ms, p95 6 ms (assumed mid-range phone). Over budget, the fallback ladder is: 1-bit edge, then spread over 2 frames, then smaller visual-only craters.
- **Edges and hazards (DR-026, J3):**
  - Bottom `void`: an ant whose feet pass y > 580 is knocked out with a comic fall. Bottom `water`: the ant swims back after 6 ticks, takes no damage and loses its next turn. `floor` is for tutorials.
  - Ants meet invisible walls at x = 24 and 936. Projectiles are removed beyond x −150 or 1110, or above y −2000.
  - Projectiles that hit water fizzle, except Dewdrop, which skips.
  - Fall damage: 0 up to 90 px, then `min(20, ceil((h − 90)/9))`. It is halved on SOFT and 0 on BOUNCY or WATER, and it never takes an ant below 1 HP.
- **Ant size (DR-027):** drawn 88x63 (at least 48 px wide), about 61x44 on a 667x375 screen. The hurtbox is a capsule (segment ±12, radius 16, centre 22 px above the feet). Bosses are 1.6×.

## 5. Physics, wind, weapons, damage, movement

- **Integrator (DR-030):** semi-implicit Euler at 1/60 s, with g = 600 px/s². Launch speed is `v = wMul·(100 + 620·p)`, where p is 0..1. A full-power 45° shot (wMul 1) goes 864 px in 1.70 s.
- **Wind (DR-031):** integer levels −5..+5, with acceleration = level × 25 px/s² × the weapon's wind factor.
  - Wind is rolled one turn ahead on the `wind` stream, so telegraphs are exact. It affects projectiles only.
  - Example: a 500 px Seed shot drifts 62 px at level 5 and 12 px at level 1.
- **Wind fields (DR-032, J21):** `WindField{onTurnStart(turn, rng), accel(x, y, tick), gauge()}`, composed from three types:
  - **Level:** a scheduled level.
  - **Column:** a vertical pull zone with smoothstep falloff.
  - **Oscillate:** A·sin(2π·t/P) on the global tick, through the trig table.

| Biome | Wind field |
|---|---|
| 1 Jungle Home | Level max 2, step 1, every turn |
| 2 The Clearing | Level max 4, step 3, every 2 turns |
| 3 The Camp | Level max 1 + updraft Column 500 px/s², half-width 70 (boss 700) |
| 4 The Trail | Level 3–4, fixed sign + bell gust +2 |
| 5 Village Garden | swirl: magnitude 3, rotates 45° per turn (small vertical part) |
| 6 Picnic Park | Level max 1 + 35% chance per turn of a ±3 kite gust |
| 7 The Porch | Level 0 + creak-telegraphed ±5 door gust |
| 8 Living Room | Oscillate A 4, P 6 s |
| 9 The Pantry | Level 0 + vent Column on 1 turn in 3 (telegraphed) |
| 10 The Kitchen | hood Column (upward) + fridge gust ±4 on alternating turns |

- **Aim (DR-033):** −20°..+90° relative to facing. Steps are 1°/5° and 1%/5%, and touch snaps to 1°. Each ant remembers its last angle and power per weapon, and the first shot defaults to 45° and 60%.
  - The preview draws 8 dots over 0.48 s and ignores wind. Assist mode extends it to 1.0 s.
- **Weapons (DR-002, DR-034):**

| Weapon | Damage | Blast r | Wind factor | wMul | 2P ammo | Behaviour |
|---|---|---|---|---|---|---|
| Seed Spitter | 30 | 28 | 0.6 | 1.15 | ∞ | explodes on first contact |
| Dewdrop Bounce | 45 | 48 | 0.3 | 0.95 | 3 | 180-tick fuse, restitution 0.55, ≤ 3 bounces, pops on fuse or ant contact |
| Pollen Pod | 12 × 5 | 18 | 0.8 | 1.0 | 1 | bursts at apex (if ≥ 30 px above terrain) or on impact; fan −36..+36° in 18° steps, ±4° and ±8% seeded jitter |

- **Damage (DR-035, J1):** `d = max(0, dist(blast, hurtbox segment) − 16)`. Damage is `round(base·lerp(1, 0.25, d/r))` when d < r, and at least 1.
  - A direct hit gives ×1.2. Damage is capped at 60 per ant per shot.
  - Friendly fire is on. Self-damage is ×0.5 and never lethal.
  - Knockback speed is `min(600, 8·dmg)` px/s, at least 25° upward.
- **Movement (DR-036, J6):**
  - Walk at 80 px/s with a budget of 160 px per turn.
  - Hop: velocity (150, −300), costs 50. Back-flip: velocity (−110, −420), costs 80.
  - No air steering. Leftover budget is usable in the 3 s retreat window.
  - SLICK: deceleration 90 px/s², and ants slide on slopes over 10° at 0.5·g·sinθ.
- **Flight limits (DR-038, J4):** the maximum flight is 8 s (480 ticks), after which the shot fizzles ("pffft"). Settle rule and hard cap are as in §3.

## 6. Campaign: 100 levels

**Per-biome rhythm (DR-008, DR-051):** L1–3 teach, L4–6 test, L7–8 twist (the biome idea plus an earlier biome's idea), L9 rest, L10 boss.

| Slot | Rivals | Ammo Dew/Pollen | Specials |
|---|---|---|---|
| Teach ★ | low end of the biome range | 5 / 3 | Dot tip card on turn 1, gauge highlight, 60 s timer |
| Test | mid to high | 4 / 3 | no prompts |
| Twist | high | 3 / 2 | biome idea + earlier idea |
| Rest | 2, AI index L−8 | 9 / 6 + 3 pickups | silly gimmick, Seed Bundles restock |
| Boss | boss + escorts (≤ 4 total) | 4 / 3 + Seed Bundle every 3rd round | §7 |

- **Weapon unlocks (DR-052):** Seed Spitter is unlimited from L1. Dewdrop Bounce unlocks at L4, and Pollen Pod is the reward for Boss 1 (usable from L11).
- **What scales (DR-050):** rival count, wind field, terrain features (1 + biome tier, max 8) and AI index. HP 100 and weapon stats stay flat.
- **AI index (DR-050, DR-063):** the global level number. Rest levels use L − 8, and bosses use min(100, L + 5).
- **Unlocking (DR-055):** linear, a level opens when the previous one is cleared or skipped. Acorns never gate anything. Any cleared or skipped level is replayable.
- **Two-player (DR-057, J12):** 10 mirrored arenas (one per biome, using its wind field) plus a Random arena, all open from the start, with no boss tricks.

**All 100 levels** (generated from the rules above; ★ = teach; ammo "—" = weapon not unlocked yet):

| Lvl | Biome | Slot | Ants (you v rivals) | AI index | Ammo Dew/Pollen | Focus | Par |
|---|---|---|---|---|---|---|---|
| 1 | 1 Jungle Home | teach ★ | 2 v 1 | 1 | —/— | intro: wind gauge and Seed Spitter (tutorial) | 4 |
| 2 | 1 Jungle Home | teach ★ | 2 v 1 | 2 | —/— | practice: wind gauge, tearing leaf bridges | 4 |
| 3 | 1 Jungle Home | teach ★ | 2 v 2 | 3 | —/— | combine with basics: wind gauge, tearing leaf bridges | 6 |
| 4 | 1 Jungle Home | test | 2 v 2 | 4 | 4/— | test: wind gauge, tearing leaf bridges · **Dewdrop Bounce unlocks** | 6 |
| 5 | 1 Jungle Home | test | 2 v 2 | 5 | 4/— | test: wind gauge, tearing leaf bridges | 6 |
| 6 | 1 Jungle Home | test | 2 v 2 | 6 | 4/— | test: wind gauge, tearing leaf bridges | 6 |
| 7 | 1 Jungle Home | twist | 2 v 2 | 7 | 3/— | twist: wind gauge + one mid-level wind flip (preview of B2) | 6 |
| 8 | 1 Jungle Home | twist | 2 v 2 | 8 | 3/— | twist: wind gauge + one mid-level wind flip (preview of B2) | 6 |
| 9 | 1 Jungle Home | rest | 2 v 2 | 1 (L−8) | 9/— | rest: coconut crates fall from the sky | 6 |
| 10 | 1 Jungle Home | boss | 2 v boss + 1 | 15 (L+5) | 4/— | **Boss: Big Mama Leafy** (300 HP) | 14 |
| 11 | 2 The Clearing | teach ★ | 2 v 2 | 11 | 5/3 | intro: sawdust mega-craters, hollow-log tunnels · **Pollen Pod unlocks** | 6 |
| 12 | 2 The Clearing | teach ★ | 2 v 2 | 12 | 5/3 | practice: sawdust mega-craters, hollow-log tunnels | 6 |
| 13 | 2 The Clearing | teach ★ | 2 v 2 | 13 | 5/3 | combine with basics: sawdust mega-craters, hollow-log tunnels | 6 |
| 14 | 2 The Clearing | test | 2 v 3 | 14 | 4/3 | test: sawdust mega-craters, hollow-log tunnels | 8 |
| 15 | 2 The Clearing | test | 2 v 3 | 15 | 4/3 | test: sawdust mega-craters, hollow-log tunnels | 8 |
| 16 | 2 The Clearing | test | 2 v 3 | 16 | 4/3 | test: sawdust mega-craters, hollow-log tunnels | 8 |
| 17 | 2 The Clearing | twist | 2 v 3 | 17 | 3/2 | twist: sawdust mega-craters + tearing log bridge (B1) | 8 |
| 18 | 2 The Clearing | twist | 2 v 3 | 18 | 3/2 | twist: sawdust mega-craters + tearing log bridge (B1) | 8 |
| 19 | 2 The Clearing | rest | 2 v 2 | 11 (L−8) | 9/6 | rest: sawdust slide | 6 |
| 20 | 2 The Clearing | boss | 2 v boss + 1 | 25 (L+5) | 4/3 | **Boss: Foreman Chip** (330 HP) | 14 |
| 21 | 3 The Camp | teach ★ | 3 v 2 | 21 | 5/3 | intro: bouncy tent canvas, springy marshmallow, smoke updraft | 6 |
| 22 | 3 The Camp | teach ★ | 3 v 2 | 22 | 5/3 | practice: bouncy tent canvas, springy marshmallow, smoke updraft | 6 |
| 23 | 3 The Camp | teach ★ | 3 v 3 | 23 | 5/3 | combine with basics: bouncy tent canvas, springy marshmallow, smoke updraft | 8 |
| 24 | 3 The Camp | test | 3 v 3 | 24 | 4/3 | test: bouncy tent canvas, springy marshmallow, smoke updraft | 8 |
| 25 | 3 The Camp | test | 3 v 3 | 25 | 4/3 | test: bouncy tent canvas, springy marshmallow, smoke updraft | 8 |
| 26 | 3 The Camp | test | 3 v 3 | 26 | 4/3 | test: bouncy tent canvas, springy marshmallow, smoke updraft | 8 |
| 27 | 3 The Camp | twist | 3 v 3 | 27 | 3/2 | twist: bouncy tent canvas + soft sawdust piles (B2) | 8 |
| 28 | 3 The Camp | twist | 3 v 3 | 28 | 3/2 | twist: bouncy tent canvas + soft sawdust piles (B2) | 8 |
| 29 | 3 The Camp | rest | 3 v 2 | 21 (L−8) | 9/6 | rest: marshmallow trampoline park | 6 |
| 30 | 3 The Camp | boss | 3 v boss + 2 | 35 (L+5) | 4/3 | **Boss: Captain S'more** (360 HP) | 14 |
| 31 | 4 The Trail | teach ★ | 3 v 3 | 31 | 5/3 | intro: puddles (swim back, lose a turn), rock pebbles | 8 |
| 32 | 4 The Trail | teach ★ | 3 v 3 | 32 | 5/3 | practice: puddles (swim back, lose a turn), rock pebbles | 8 |
| 33 | 4 The Trail | teach ★ | 3 v 3 | 33 | 5/3 | combine with basics: puddles (swim back, lose a turn), rock pebbles | 8 |
| 34 | 4 The Trail | test | 3 v 3 | 34 | 4/3 | test: puddles (swim back, lose a turn), rock pebbles | 8 |
| 35 | 4 The Trail | test | 3 v 3 | 35 | 4/3 | test: puddles (swim back, lose a turn), rock pebbles | 8 |
| 36 | 4 The Trail | test | 3 v 3 | 36 | 4/3 | test: puddles (swim back, lose a turn), rock pebbles | 8 |
| 37 | 4 The Trail | twist | 3 v 3 | 37 | 3/2 | twist: puddles (swim back + bouncy ramps (B3) | 8 |
| 38 | 4 The Trail | twist | 3 v 3 | 38 | 3/2 | twist: puddles (swim back + bouncy ramps (B3) | 8 |
| 39 | 4 The Trail | rest | 3 v 2 | 31 (L−8) | 9/6 | rest: pebble bowling | 6 |
| 40 | 4 The Trail | boss | 3 v boss + 2 | 45 (L+5) | 4/3 | **Boss: Sergeant Gravel** (390 HP) | 14 |
| 41 | 5 Village Garden | teach ★ | 3 v 3 | 41 | 5/3 | intro: swirling wind with sunflower preview | 8 |
| 42 | 5 Village Garden | teach ★ | 3 v 3 | 42 | 5/3 | practice: swirling wind with sunflower preview | 8 |
| 43 | 5 Village Garden | teach ★ | 3 v 3 | 43 | 5/3 | combine with basics: swirling wind with sunflower preview | 8 |
| 44 | 5 Village Garden | test | 3 v 4 | 44 | 4/3 | test: swirling wind with sunflower preview | 10 |
| 45 | 5 Village Garden | test | 3 v 4 | 45 | 4/3 | test: swirling wind with sunflower preview | 10 |
| 46 | 5 Village Garden | test | 3 v 4 | 46 | 4/3 | test: swirling wind with sunflower preview | 10 |
| 47 | 5 Village Garden | twist | 3 v 4 | 47 | 3/2 | twist: swirling wind with sunflower preview + puddle rain (B4) | 10 |
| 48 | 5 Village Garden | twist | 3 v 4 | 48 | 3/2 | twist: swirling wind with sunflower preview + puddle rain (B4) | 10 |
| 49 | 5 Village Garden | rest | 3 v 2 | 41 (L−8) | 9/6 | rest: vegetable piñatas | 6 |
| 50 | 5 Village Garden | boss | 3 v boss + 2 | 55 (L+5) | 4/3 | **Boss: Rancher Rosa** (420 HP) | 14 |
| 51 | 6 Picnic Park | teach ★ | 4 v 3 | 51 | 5/3 | intro: kite gusts, bread and crust layers, jelly bounce | 8 |
| 52 | 6 Picnic Park | teach ★ | 4 v 3 | 52 | 5/3 | practice: kite gusts, bread and crust layers, jelly bounce | 8 |
| 53 | 6 Picnic Park | teach ★ | 4 v 4 | 53 | 5/3 | combine with basics: kite gusts, bread and crust layers, jelly bounce | 10 |
| 54 | 6 Picnic Park | test | 4 v 4 | 54 | 4/3 | test: kite gusts, bread and crust layers, jelly bounce | 10 |
| 55 | 6 Picnic Park | test | 4 v 4 | 55 | 4/3 | test: kite gusts, bread and crust layers, jelly bounce | 10 |
| 56 | 6 Picnic Park | test | 4 v 4 | 56 | 4/3 | test: kite gusts, bread and crust layers, jelly bounce | 10 |
| 57 | 6 Picnic Park | twist | 4 v 4 | 57 | 3/2 | twist: kite gusts + rotating wind (B5) | 10 |
| 58 | 6 Picnic Park | twist | 4 v 4 | 58 | 3/2 | twist: kite gusts + rotating wind (B5) | 10 |
| 59 | 6 Picnic Park | rest | 4 v 2 | 51 (L−8) | 9/6 | rest: jelly bounce arena | 6 |
| 60 | 6 Picnic Park | boss | 4 v boss + 2 | 65 (L+5) | 4/3 | **Boss: Duke of Crumbs** (450 HP) | 14 |
| 61 | 7 The Porch | teach ★ | 4 v 3 | 61 | 5/3 | intro: door-creak gust, plank gaps | 8 |
| 62 | 7 The Porch | teach ★ | 4 v 3 | 62 | 5/3 | practice: door-creak gust, plank gaps | 8 |
| 63 | 7 The Porch | teach ★ | 4 v 4 | 63 | 5/3 | combine with basics: door-creak gust, plank gaps | 10 |
| 64 | 7 The Porch | test | 4 v 4 | 64 | 4/3 | test: door-creak gust, plank gaps | 10 |
| 65 | 7 The Porch | test | 4 v 4 | 65 | 4/3 | test: door-creak gust, plank gaps | 10 |
| 66 | 7 The Porch | test | 4 v 4 | 66 | 4/3 | test: door-creak gust, plank gaps | 10 |
| 67 | 7 The Porch | twist | 4 v 4 | 67 | 3/2 | twist: door-creak gust + jelly bounce (B6) | 10 |
| 68 | 7 The Porch | twist | 4 v 4 | 68 | 3/2 | twist: door-creak gust + jelly bounce (B6) | 10 |
| 69 | 7 The Porch | rest | 4 v 2 | 61 (L−8) | 9/6 | rest: mat trampoline | 6 |
| 70 | 7 The Porch | boss | 4 v boss + 3 | 75 (L+5) | 4/3 | **Boss: Lady Latch** (480 HP) | 14 |
| 71 | 8 Living Room | teach ★ | 4 v 4 | 71 | 5/3 | intro: oscillating fan, cushions absorb blasts | 10 |
| 72 | 8 Living Room | teach ★ | 4 v 4 | 72 | 5/3 | practice: oscillating fan, cushions absorb blasts | 10 |
| 73 | 8 Living Room | teach ★ | 4 v 4 | 73 | 5/3 | combine with basics: oscillating fan, cushions absorb blasts | 10 |
| 74 | 8 Living Room | test | 4 v 4 | 74 | 4/3 | test: oscillating fan, cushions absorb blasts | 10 |
| 75 | 8 Living Room | test | 4 v 4 | 75 | 4/3 | test: oscillating fan, cushions absorb blasts | 10 |
| 76 | 8 Living Room | test | 4 v 4 | 76 | 4/3 | test: oscillating fan, cushions absorb blasts | 10 |
| 77 | 8 Living Room | twist | 4 v 4 | 77 | 3/2 | twist: oscillating fan + door gust (B7) | 10 |
| 78 | 8 Living Room | twist | 4 v 4 | 78 | 3/2 | twist: oscillating fan + door gust (B7) | 10 |
| 79 | 8 Living Room | rest | 4 v 2 | 71 (L−8) | 9/6 | rest: toy-block tower | 6 |
| 80 | 8 Living Room | boss | 4 v boss + 3 | 85 (L+5) | 4/3 | **Boss: The Sofa Sultan** (510 HP) | 14 |
| 81 | 9 The Pantry | teach ★ | 4 v 4 | 81 | 5/3 | intro: vent draft, flour clouds, sugar dunes | 10 |
| 82 | 9 The Pantry | teach ★ | 4 v 4 | 82 | 5/3 | practice: vent draft, flour clouds, sugar dunes | 10 |
| 83 | 9 The Pantry | teach ★ | 4 v 4 | 83 | 5/3 | combine with basics: vent draft, flour clouds, sugar dunes | 10 |
| 84 | 9 The Pantry | test | 4 v 4 | 84 | 4/3 | test: vent draft, flour clouds, sugar dunes | 10 |
| 85 | 9 The Pantry | test | 4 v 4 | 85 | 4/3 | test: vent draft, flour clouds, sugar dunes | 10 |
| 86 | 9 The Pantry | test | 4 v 4 | 86 | 4/3 | test: vent draft, flour clouds, sugar dunes | 10 |
| 87 | 9 The Pantry | twist | 4 v 4 | 87 | 3/2 | twist: vent draft + rotating vent (B5) | 10 |
| 88 | 9 The Pantry | twist | 4 v 4 | 88 | 3/2 | twist: vent draft + rotating vent (B5) | 10 |
| 89 | 9 The Pantry | rest | 4 v 2 | 81 (L−8) | 9/6 | rest: sugar rush | 6 |
| 90 | 9 The Pantry | boss | 4 v boss + 3 | 95 (L+5) | 4/3 | **Boss: The Sugar Baron** (540 HP) | 14 |
| 91 | 10 The Kitchen | teach ★ | 4 v 4 | 91 | 5/3 | intro: slick tiles, toaster pop-up, hood and fridge | 10 |
| 92 | 10 The Kitchen | teach ★ | 4 v 4 | 92 | 5/3 | practice: slick tiles, toaster pop-up, hood and fridge | 10 |
| 93 | 10 The Kitchen | teach ★ | 4 v 4 | 93 | 5/3 | combine with basics: slick tiles, toaster pop-up, hood and fridge | 10 |
| 94 | 10 The Kitchen | test | 4 v 4 | 94 | 4/3 | test: slick tiles, toaster pop-up, hood and fridge | 10 |
| 95 | 10 The Kitchen | test | 4 v 4 | 95 | 4/3 | test: slick tiles, toaster pop-up, hood and fridge | 10 |
| 96 | 10 The Kitchen | test | 4 v 4 | 96 | 4/3 | test: slick tiles, toaster pop-up, hood and fridge | 10 |
| 97 | 10 The Kitchen | twist | 4 v 4 | 97 | 3/2 | twist: slick tiles + fan sweeps (B8) | 10 |
| 98 | 10 The Kitchen | twist | 4 v 4 | 98 | 3/2 | twist: slick tiles + fan sweeps (B8) | 10 |
| 99 | 10 The Kitchen | rest | 4 v 2 | 91 (L−8) | 9/6 | rest: cake-slice buffet | 6 |
| 100 | 10 The Kitchen | boss | 4 v boss + 2 | 100 (L+5) | 4/3 | **Boss: Queen Gloria Glaze** (600 HP) | 14 |

## 7. Bosses

**Template (DR-053, DR-037, J13, J15):**
- The boss ant is 1.6× scale on a fortress: a HARD shell, a SOFT core and one weak seam facing the player.
- **Loop over the boss's own turns (4 rounds):**
  - R1: a plain aimed shot.
  - R2: **telegraph.** A visual and sound cue, a "next round" icon and a ghost arrow on the wind gauge, plus a plain shot.
  - R3: **the trick fires**, and the boss shoots using that wind.
  - R4: **cluster**, then the wind decays back.
- The player always gets a full turn between the cue and the trick.
- **Phase 2 (biome 3 and up, at 50% HP):** it gets its own cue (roar plus banner). The loop shortens to 3 rounds (telegraph, trick, cluster), trick strength rises by +1, and escorts refill.
- **Boss AI:** effective level min(100, L + 5). It perceives the true wind, including its own trick, and gets no other accuracy bonus.
- **Cluster:** count 5 + ⌊(b−1)/3⌋ and sub-damage 8 + ⌊(b−1)/2⌋, with sub-radius 20, wind factor 0.8 and speed ×0.7. The burst is at the apex, plus flavour modifiers. Damage is capped at 60 per ant, so no full-HP ant can be one-shot.

| # | Boss | HP | Phases | Trick (wind, ≤ ±5) | Telegraph cue (visual + sound) | Cluster (count × dmg, flavour) | Escorts |
|---|---|---|---|---|---|---|---|
| 1 | Big Mama Leafy | 300 | 1 | leaf gust +3 away from the boss, 1 round | giant leaf lifts + rustle-whoosh | 5 × 8 seed | 1 |
| 2 | Foreman Chip | 330 | 1 | sawdust storm flips the wind, 2 rounds | dust swirls + hammer clatter | 5 × 8 wood-chip (wind ×1.2) | 1 |
| 3 | Captain S'more | 360 | 2 | updraft ×2, 2 rounds | dark smoke puffs + crackle swell | 5 × 9 puff (gravity 0.6) | 2 |
| 4 | Sergeant Gravel | 390 | 2 | bike gust 5, 1 round | bell rings + whoosh | 6 × 9 gravel (gravity 1.2) | 2 |
| 5 | Rancher Rosa | 420 | 2 | vane sets wind 4, 2 rounds | vane spins + creak | 6 × 10 pea (1 bounce) | 2 |
| 6 | Duke of Crumbs | 450 | 2 | napkin gusts +4 then −3 | flag stiffens + flap | 8 × 8 sesame (r 14) | 2 |
| 7 | Lady Latch | 480 | 2 | door propped, sustained 3, 3 rounds | door swings + long creak | 7 × 11 button (1 bounce) | 3 |
| 8 | The Sofa Sultan | 510 | 2 | fan to high, peak ±5, 3 rounds | dial clicks + rising whine | 7 × 9 lint (gravity 0.5, r 24) | 3 |
| 9 | The Sugar Baron | 540 | 2 | vent updraft ×2, 2 rounds | grille rattles + sugar dust shivers | 7 × 12 sugar cube (r 22) | 3 |
| 10 | Queen Gloria Glaze | 600 | 3 | see below | see below | 12 × 10 sprinkle storm (from the sky) | 2, then 0 |

**Final boss (DR-054):** 600 HP in three segments, with thresholds at 400 and 200.
- **P1 The Hood:** updraft ×2.5. Cue: the hood light blinks, then a hum.
- **P2 The Fridge:** the fridge's cold side-gust 5 (1 round) alternates with the hood. Cue: a seal "thunk" plus a frost puff. The cake slumps and the seam shows.
- **P3 The Duel:** escorts leave. The toaster pops terrain up every 3rd round (cue: "ding" plus a glow). Hood and fridge run together on a 3-round loop, each with its own HUD arrow.
- **Defeat:** Gloria goes dizzy, is carried off on a leaf stretcher, and the epilogue plays (STORY).

## 8. Level data and production

**Pipeline (DR-025, DR-056, J19):**
- 10 biome kits, each with a heightfield preset, about 6 SVG stamps in material colours, and a background set.
- 90 seeded levels and 10 hand-authored boss masks.
- `tools/` compiles each recipe at **build time** into an RLE `.mask` (5–15 KB) and records a checksum. A contact sheet per biome supports review.
- **Authoring rules:** solid features ≥ 6 px, tunnels ≥ 48 px high, no spawn embedded in terrain, and every rival reachable by some shot.
- **Validator (CI):** loads every level and fails on any rule break, a checksum mismatch, or a rival that the bot solver cannot reach.

**Merged level schema (DR-025, DR-056, DR-050, DR-052, DR-055):**
```json
{
  "id": 37, "biome": 4, "slot": "test", "name": "Rut Rumble",
  "seed": 90417, "size": [960, 540],
  "mask": "levels/037.mask", "checksum": "…",
  "terrain": { "kit": "trail", "base": { "preset": "valleys", "baseY": 380, "amp": 60, "rough": 0.4 },
               "stamps": [ { "id": "pebble", "x": 410, "y": 360, "flip": false } ] },
  "bottom": "water", "waterY": 520,
  "spawns": [ { "team": 0, "x": 120 }, { "team": 1, "x": 820 } ],
  "rival": { "colony": "pebble-punchers", "ai": 37 },
  "wind": { "fields": [ { "type": "level", "fixedSign": 1, "min": 3, "max": 4 } ] },
  "zones": [],
  "ammo": { "dewdrop": 4, "pollen": 3 },
  "pickups": [],
  "objectives": [ { "type": "eliminate" } ],
  "par": 8, "timer": 30, "comic": null,
  "boss": null
}
```
- **Boss levels** add `"boss": {hp, phases, loop, trick, cue, cluster, escorts}`.
- `size` is asserted to be `[960, 540]` in v1 (DR-020).

## 9. Bot AI

- **Same physics:** bots use the same deterministic `simulateShot` as the player (DR-060).
- **Solver (DR-060, J9):**
  - For each weapon: 15 angles (15°–85° in 5° steps), with power bisected at each (about 10 sims). Keep the top 3 and refine 3x3 at 0.25° and 0.25%.
  - Caps: at most 250 sims per weapon and 1,200 per turn, in 4 ms per-frame slices, finishing within 25 frames.
  - Score = enemy damage + 20 per knock-out + an HP tie-break − 1.5 × self-damage − 1.0 × ally damage.
  - Tie-break: among candidates within 2 points of the best score, prefer 40°–65° launch angles.
  - Move first (≤ 3 strides of 40 px) only if the best score is < 12 or self-damage would be > 5.
- **Error model per shot (DR-061).** Draws come from the `ai` stream, in this fixed order:
  1. Perceived wind `W_p = W·(1+k) + b·s_w + σ_w·z3`, where s_w = ±1. The solver re-solves power on W_p.
  2. First-shot bias at a target: `E_n = B·s·0.5ⁿ`, where n is the number of earlier shots at that target. A 0.5 × last-miss correction mimics a person bracketing in.
  3. `power = p*·(1 + σ_p·z1 + E_n)` and `angle = θ* + σ_a·z2`.
  4. Brain-fart for L ≤ 30: with probability p_bf, pick the 2nd or 3rd best candidate.
- **Hit metric, the "lethal radius" (DR-062):** hit ⇔ `d ≤ 0.5·r_blast`, where d is the distance to the target's hurtbox surface. For Seed that is 14 px, meaning at least 19 damage.
  - "Stable wind" means a constant level from {−3, 0, +3, +5} with no Column or Oscillate fields.
- **Curve (DR-063, calibrated):** σ's are log-interpolated between anchors, and k, b, B and p_bf are linear.

| Level | σ_p % | σ_a ° | σ_w | k | b | B % | p_bf | Benchmark hit % |
|---|---|---|---|---|---|---|---|---|
| 1 | 15 | 9 | 1.2 | −0.5 | 1.5 | 12 | 0.12 | 25 |
| 10 | 11.5 | 6.2 | 1.0 | −0.3 | 1.0 | 9.5 | 0.08 | 32 |
| 20 | 9 | 5 | 0.8 | −0.2 | 0.6 | 7 | 0.04 | 39 |
| 40 | 6 | 3.6 | 0.48 | −0.1 | 0.3 | 3.6 | 0 | 55 |
| 60 | 3.6 | 2.1 | 0.25 | −0.05 | 0.1 | 1.7 | 0 | 72 |
| 80 | 2.05 | 1.25 | 0.12 | 0 | 0 | 0.6 | 0 | 87 |
| 90–100 | **1.35** | **0.8** | **0.05** | 0 | 0 | 0 | 0 | **95** |

- Levels 1–20 miss like people do: they under-read the wind, pull too hard or too soft, then bracket in. Between anchors the model measured L30 46%, L50 63%, L70 80% and L85 91%, a monotonic curve.
- **Cap (DR-064):** the floor applies at L ≥ 90 and is never reduced. There are no scripted misses.
  - Band: suite average 0.93–0.97. The 700 px bucket must be ≥ 0.80 (calibrated 0.89).
  - The cap depends on angle: flat 30° shots land about 90%. That is why the solver tie-break exists.
- **Readability (DR-066):** think time is 1.8 s at L1, falling to 0.8 s at L100. The aim wobble has amplitude 3·σ_a (≤ 12°) and settles exactly on the fired values. It is cosmetic only.
- **Anti-frustration (DR-067), L1–20 only:** after a bot shot that did ≥ 50 damage, or a hit when the player has ≤ 1 ant left, the next turn's σ_p, σ_a and B are multiplied by 1.5 ("rattled").
- **How the calibration was done:** the planner ran a Python Monte-Carlo (g 600, K 25, Seed wMul 1.15, 60 Hz with 2 px steps, the DR-027 capsule, flat ground with ±60 px plateaus). Stage 2 of the build refits the constants against the real sim, logged as `DR-063 tuning` lines.

## 10. Tests (headless, Vitest in node; DR-016)

| Test | Checks | Decision |
|---|---|---|
| `rng.test.ts` | sfc32 streams are independent, and the same seed gives the same sequence | DR-011 |
| `ban-scan.test.ts` | no banned APIs in `src/sim` or `src/ai` | DR-011 |
| `trig.test.ts` | the table matches `Math.sin` to 1e-12 (build-time check only) | DR-011, J9 |
| `terrain.test.ts` | erase per material, fragment cleanup, `solidAt`, RLE round-trip | DR-021, DR-022, DR-025 |
| `physics.test.ts` | the 864 px range, wind drift values, no tunnelling through 6 px walls at 1500 px/s, bounce rule | DR-030, DR-031, DR-023 |
| `damage.test.ts` | falloff, direct ×1.2, cap 60, self ×0.5 never lethal, fall damage | DR-035, DR-026 |
| `turn.test.ts` | FSM order, timer skip, settle rule, 12 s cap, sudden death, win/draw | DR-042, DR-043, DR-044, DR-038 |
| `replay.test.ts` | seed + input log re-simulates to an identical state hash | DR-011, DR-047 |
| `levels.test.ts` | all 110 levels pass the validator and checksums | DR-025, DR-056 |
| **`ai-cap.test.ts`** | **the bot cap; spec below** | **DR-065** |

**`tests/ai-cap.test.ts` (DR-065):**
- **Suite (144 scenarios):** distance {200…700 step 100} × target height {−60, 0, +60} × stable wind {−3, 0, +3, +5} × angle {45°, 60°}, using Seed Spitter and the DR-062 hit metric.
- **Trials:** 30 per scenario at L90 and L100 (4,320 each, SE 0.33%). 10 per scenario at L1, 10, …, 80.
- **Seeds:** hash(level, scenario, trial).
- **Asserts:**
  1. L90 and L100 within **[0.93, 0.97]**.
  2. |L90 − L100| ≤ 0.02.
  3. Boss-effective levels 95–100 ≤ 0.97.
  4. L1, L10 and L20 within [0.18, 0.48].
  5. Monotonic: hit(L+10) ≥ hit(L) − 0.02.
  6. 700 px bucket at L ≥ 90 ≥ 0.80.
  7. Determinism: identical counts and the first 100 impacts.
- **Runtime:** about 200k sims, roughly 10–20 s. If it goes over 30 s, halve the non-cap trials.

## 11. Hosting: GitHub Actions to GitHub Pages (DR-017, DR-016)

**The one repo setting to switch on:** in `rainbowblurry-book/Ants`, go to **Settings → Pages → Build and deployment → Source: "GitHub Actions"**. The repo must stay public on a free plan.
- Live URL: `https://rainbowblurry-book.github.io/Ants/`.
- Vite `base` is `/Ants/`, set through `BASE_PATH` in CI.
- Pull requests run the tests only. Pushes to `main` and manual runs test, build and deploy.

`.github/workflows/deploy.yml`:
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
The action majors were verified with `git ls-remote` on 2026-11-16. Deploys only run from `main`. Work happens on feature branches, so nothing publishes until a branch is merged.

## 12. Risks, assumptions and open items

| Item | Status | Where it gets settled |
|---|---|---|
| S = 2 camera-zoom render on Phaser 3.90 | unproven | build stage 0 spike, fallback S = 1 (DR-013) |
| Device memory and per-blast ms | estimates, no device tests | stage-1 device check (DR-014, DR-024) |
| Bot-cap constants | calibrated in a Python model, not the real sim | stage-2 refit; asserts fixed (DR-063 to DR-065) |
| Node 24 as CI LTS | assumed | CI run (DR-016) |
| Keyboard power keys, vertical wind chevron (Garden), touch target sizes at 667x375 | not decided | UI.md, checkpoint C (DR-015, DR-032) |
| Final ant art | **placeholder, not approved** | user's new images (DR-007a) |
| Content counts (60 stamps, 110 levels) | estimates | HANDOFF stage plan (DR-025, DR-056) |
