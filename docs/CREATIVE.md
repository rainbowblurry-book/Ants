# Creative Direction — Project Ants

Source of truth for look, character, sound mood and tone. Each rule cites its Decision ID.
Reference files: `art/reference/` (approved preview, screenshots, `ant-concept.webp`).

## 1. World style (DR-001, DR-003a)
- **Flash-era vector:** flat bright fills, thick plum outline `#2E1A47`, at most one flat shade tone per shape. **No gradients on characters or UI, no white glint streaks.** The only gradients allowed are on the sky and on the soil body fill.
- **Everything is curved:** rounded joins and caps on every stroke, no sharp corners. Stars and crowns use round line joins and ball tips.
- **Outline weight at 960x540:** world objects 4–5 px, characters 3.5–4 px, distant background 3 px at 35–45% opacity.
- **Depth:** 3 parallax layers (far hills, mid foliage or props, play layer). Layers further back get lighter and lower contrast. The play layer always has the strongest contrast.
- **Terrain (pillar 3):** soil body plus a grass or surface band along the top edge (biome-specific), with a lighter rim line on top. The outline is generated from the destructible mask (blur, threshold, stroke), so every crater gets the same rounded inked edge.
- **Humans:** shown only as giant environment props (shoes, tents, furniture, hands in comics) or off-screen presences. They are never targets, never menacing, and their faces are never shown close up.

## 2. Ant character (DR-007, from the user-supplied concept)
**Body plan:**
- **Head:** a big round head, about 40% of hero height, carrying the face.
- **Helmet:** an acorn-cap helmet in team colour, tilted about 8–12°, with a darker brim band, a few flat shade "scale" dots and a curly stem.
- **Antennae:** elbowed, coming out of the cap, with round tips.
- **Body:** a small thorax, a pinched waist knot, and a large striped gaster (2 darker bands).
- **Limbs:** 6 thin outlined limbs.

**Colours:**

| Use | Hex |
|---|---|
| Body | `#B4532A` |
| Stripes, far limbs, feet | `#7A3418` |
| Mouth | `#5A1E2A` |
| Tongue | `#E8456B` |
| Eyes | white |
| Pupils and outline | `#2E1A47` |

**Teams (DR-003, DR-007):**
- **Blue `#0072B2` / shade `#00527F` + circle badge:** the player's colony in the campaign, player 1 in two-player.
- **Amber `#E69F00` / shade `#A66F00` + rounded triangle badge:** rivals in the campaign, player 2 in two-player.
- The badge sits on the gaster, with a white ring and a plum keyline. Colour is never the only cue.

**Poses (one rig each):**
- **Hero 3/4** (art frame 120x150): one hand on hip, the other a raised fist, wide stance. Used for posters, the landing screen, comics, victory and defeat.
- **Side gameplay** (art frame 140x100): facing right, all 6 legs down, head with one visible eye; mirrored for left. In-game it is drawn about 96 px wide at 960x540, never below 48 px.

**Expressions** (face swaps on the same head):

| Face | Features | Used when |
|---|---|---|
| cocky | V-brows, wide toothy grin, tongue | idle, win |
| aim | one eye squinted, tongue tip out | aiming |
| oops | round eyes, O-mouth, sweat drop | missed shot, near-miss nearby |
| dizzy | X-eyes, wobbly mouth, tongue out, orbiting stars | hit, knocked out |

**Knock-outs:** a knocked-out ant gets dizzy stars and is carried off on a leaf stretcher by two tiny medic ants. There are no injuries, ever.

**Rival colonies** (STORY.md): amber team colours plus a signature accessory (leaf cape, bottle-cap hard hat, and so on). The silhouette stays the same, so they still read as ants. Bosses are 1.6× scale with a unique headpiece.

## 3. UI style (DR-003, DR-003a)
- **Jelly candy controls:** plum 4 px outline, pill or rounded-rect shapes, a flat darker shade band along the bottom edge, and a solid plum drop shadow (5 px). Pressed state: shift down 4 px and shrink the shadow.
- **Panels:** butter `#FFF1D0` with plum outline, corner radius 24, 6 px drop shadow.
- **Semantic colours:** primary action raspberry `#E8456B`; info and wind teal `#1FA38A` (always paired with arrow shapes); secondary butter-gold `#FFD978`; disabled stone `#B7AFC4`.
- **Fonts:** **Lilita One** for display and **Nunito** 700–900 for body, both SIL Open Font License 1.1 (Google Fonts). In-canvas display text is baked to a bitmap font. Minimum text size is 16 px logical; body is 20 px.
- **Icons:** stroke-built with round caps and joins and filled with `currentColor`. Ratings use acorns, never pointy stars.
- **Exact layout, sizes and touch targets:** to be decided in UI.md (checkpoint C). The preview's 56–64 px buttons are provisional.

## 4. Motion and juice (pillar 1)
- **Squash and stretch:** on ants (jump, land, fire recoil), projectiles (Dewdrop wobble) and UI presses.
- **Shot moments:** a short camera follow on the projectile, a 60–90 ms hit-stop on impact, and a small screen shake scaled to blast radius. Blasts throw dirt chunks and crumbs (flat rounded pieces).
- **Comic text pops:** "BOING", "PTOO!", "SPLOSH" in Lilita One with a plum outline. Never gore words.
- **Rhythm:** one orchestrated moment per event instead of constant idle noise. Idle is a slow breathing bob, with antenna wiggles every few seconds.
- **Reduced motion:** honour `prefers-reduced-motion` (no shake, shorter tweens).

## 5. Sound mood (synthesized in code)
- **Palette:** cartoon foley built from simple oscillators plus noise. Seed "ptoo" (short pitched-down pop), Dewdrop "boing" (sine pitch bend) and "splosh" (filtered noise), Pollen "puff" plus a tiny sneeze "achoo" (formant blip).
- **Ant voices:** chipmunk-like gibberish blips (square wave, random pitch from the match seed), with cocky "hah!" and oops "eep!" variants.
- **Music:** short looping chiptune-meets-marimba themes, one motif per biome built on a shared main theme. A boss variant is faster with extra percussion.
- **First tap:** unlocks audio (brief requirement), and a first-tap "pop" confirms it.

## 6. Tone and writing
- **Tone:** family-friendly, cheeky, slapstick. The ants are rowdy but kind, and rivals are rivals, not villains.
- **Copy:** short and punchy, written from the player's side. No buzzwords, no em-dash habit.
- **Localisation:** all strings come from locale files (i18n-ready, English first). Leave about 30% room for longer translations in buttons.

## 7. Don'ts
- No Worms names, weapons or gimmicks. No copyrighted characters.
- No gradients or glints on characters or UI. No angular shapes. No purple-blue "AI glow".
- No humans as targets. No harm shown to anyone. No real brands on props.
- AI-generated images are reference only and are never shipped or traced.
