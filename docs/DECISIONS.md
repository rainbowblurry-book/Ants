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
