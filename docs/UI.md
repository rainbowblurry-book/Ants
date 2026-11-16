# UI Spec — ANTS! (checkpoint C)

This file is the single source for building or restyling the UI. With `src/ui/theme.json` it is enough to rebuild every screen. Every item cites its Decision ID. The records live in `docs/DECISIONS.md` (DR-080 to DR-183), and the judge's rulings J27 to J56 win over the record text. Gameplay rules come from `docs/PLAN.md`, and look rules from `docs/CREATIVE.md`.

**Units and conventions**
- All sizes are logical px on the fixed 960x540 canvas (DR-013). FIT scaling. On the smallest target phone (667x375) 1 logical px is 0.69 CSS px.
- Rects are written `x,y,w,h` with the screen margin M = 16. When M is larger (DR-085), edge-anchored rects move inward by M − 16.
- "Hit" is the invisible touch rect. "Visual" is the drawn shape inside it (DR-082).
- Token names (`action`, `panel`, `ink` …) are the semantic tokens in `theme.json`. **Code never contains a colour literal** (DR-088).
- HTML parts (splash, rotate, Settings, fatal error) use CSS px. Everything else is drawn in Phaser.

---

## 1. Design language

### 1.1 Identity (DR-001, DR-003, DR-003a, CREATIVE §1, §3)
- **Look:** a Flash-era vector world with jelly candy UI on top. Thick plum outlines, flat fills, one flat shade band along the bottom edge, and a hard plum drop shadow with no blur.
- **No** gradients on UI, **no** white glints, **no** sharp corners. White appears only where it means something: wind chevrons, aim dots, badge rings, eye whites, speech bubbles, damage numbers and the focus ring.
- **Teams are colour plus shape, always:** Blue `team-a` with a **circle** badge, Amber `team-b` with a **rounded triangle** badge. They never swap (DR-003, J46).

### 1.2 Palette and text pairs (DR-080, J29, J30)
Text colour is fixed per fill, and CI recomputes every ratio (DR-088). All ratios were verified on 2026-11-16.

| Semantic token | Fill | Shade band | Text on it | Ratio | Used for |
|---|---|---|---|---|---|
| `panel` | `#FFF1D0` | none | `ink` `#2E1A47` | 13.83 | cards, panels, tags |
| `action` | `#EE6083` | `#C03055` | `ink` | 4.90 | primary buttons, FIRE, "next" node, NEW pills |
| `info` | `#1FA38A` | `#137463` | `ink` | 4.92 | wind gauge, info buttons (always with an arrow shape) |
| `secondary` | `#FFD978` | `#F7B932` | `ink` | 11.40 | secondary buttons, selected weapon slot |
| `team-a` | `#0072B2` | `#00527F` | white | 5.19 | Blue team (circle) |
| `team-b` | `#E69F00` | `#A66F00` | `ink` | 6.88 | Amber team (rounded triangle) |
| `disabled` | `#B7AFC4` | `#8E869C` | `ink-soft` `#4A2F6B` | 5.21 | locked, disabled, unearned |
| `danger` | `#B52A4C` | `ink-soft` | white | 6.18 | destructive buttons, low-HP numeral |
| `success` | `#22662C` | none | white | 6.99 | cleared level node, checks |
| `ink` (as a fill) | `#2E1A47` | none | `butter-100` | 13.83 | toasts, letterbox, splash |
| `scrim` | ink at **70%** | none | `butter-100` | ≥ 5.22 | behind every modal and the pause screen |

- The letterbox is `ink`, which also serves as the page background, `theme_color` and the Phaser `backgroundColor` (DR-085, DR-096).
- **Never** use: white text on `action` or `team-b`, `plum-300` as text, or `leaf-600` behind text (J29).

### 1.3 Type (DR-081, DR-087, J34)

| Role | Font | Size | Line height | Where | Bake |
|---|---|---|---|---|---|
| display | Lilita One | 64 | 1.0 | screen titles, "Victory!" | F128 (fill + stroke) |
| title | Lilita One | 40 | 1.05 | panel titles, banners | F80 |
| label | Lilita One | 28 | 1.1 | buttons, names | F56 |
| numeral | Lilita One | 32 | 1.0 | HUD numbers, timer, wind | F64 (fill + stroke) |
| body | Nunito 700 | 22 | 1.3 | sentences, tips | runtime `Text`, resolution S |
| caption | Nunito 800 | 18 | 1.25 | the **floor**: nothing smaller, ever | runtime |

- **Fit rule (DR-087):** first shrink in 1 px steps to the floor (display 48, title 32, label 22, body 20; caption never shrinks), then wrap to the component's max lines, then add an ellipsis. Ellipsis is allowed only on names and level titles, never on verbs, numbers or wind.
- **Budgets (English):** button labels ≤ 9 chars at 192 wide, panel body ≤ 38 chars per line at 432. Boxes are sized for English × 1.3.
- **Text size setting:** Normal 1.0 or Large 1.2. It scales body, caption and HTML text only, never the bitmap bakes (J34).
- **Fonts (J27):** self-hosted woff2 subsets, with OFL texts shipped (DR-174).

### 1.4 Spacing, shape, touch (DR-082, DR-083, J28)
- **Spacing:** 4, 8, 12, 16, 24, 32, 48.
- **Radius:** 8 (tags), 16 (chips, inner cards), 24 (buttons, panels), pill.
- **Outline:** 4 (2 under 40 px visual). The comic frame is the one exception at 6 (J51).
- **Shadow:** hard plum, offset y 4 (chips, icon buttons), 6 (buttons, panels) or 8 (dialogs, toasts).
- **Shade band:** 8 px (6 on small controls).
- **Pressed:** the face moves down 4 (2 when small), the shadow shrinks to 2, and the shape squashes to 1.03 x 0.95.
- **Touch:** minimum hit **64x64** (44 CSS px on the smallest phone), preferred **72x72**.
  - FIRE is hit 120 with a 104 visual.
  - Other visuals are 48 inside a 64 hit, or 56 inside a 72 hit.
  - Leave a gap of at least 8 between hit rects. Hit rects never overlap and never leave the safe rect.
- **When controls act:** menu buttons act on pointer-up inside the rect, and a pointer that moves more than 16 px out cancels. FIRE and the steppers act on pointer-down (DR-033).

### 1.5 Motion (DR-084, J35)

| Token | Value |
|---|---|
| press | 60 ms Quad.easeOut |
| release | 140 ms Back.easeOut (the action fires on pointer-up, never at the end of the tween) |
| panel open / close | 220 ms Back.easeOut from scale 0.9, then 140 ms Quad.easeIn |
| scrim fade | 160 ms |
| screen transition | 220 ms out + 260 ms in, through `ink` |
| toast | 180 ms in, 2000 ms hold (+40 ms per char over 40), 160 ms out |
| reward pop | 360 ms Back.easeOut, 120 ms stagger |
| deny nudge | ±4 px, 160 ms |

**Reduced motion** (Settings Auto/On/Off, where Auto follows `prefers-reduced-motion`):
- Every tween is capped at 120 ms, with no overshoot, scale, shake or zoom.
- Translates are at most 8 px.
- A reward is a 160 ms fade.

Input never waits for an animation.

### 1.6 Safe area (DR-085, J32)
- `viewport-fit=cover`. The canvas fills the viewport, with no padding.
- Per side: `margin = max(16, max(0, inset − letterbox) / fitScale + 8)`.
- A `Layout` service exposes `safeRect`, nine anchors (TL TC TR ML C MR BL BC BR) and a `resize` event.
- At S=2, positions snap to 0.5 logical px.

### 1.7 Focus and keyboard (DR-086, DR-121, J31, J53)
- **Focus ring:** 4 px white, then a 2 px gap, then 2 px ink, following the shape's radius. It has no pulse. It shows only after keyboard input and hides on pointer-down.
- **Menus:**
  - Arrows move to the nearest item in that direction.
  - Tab and Shift+Tab follow reading order.
  - Enter and Space activate.
  - Esc goes back or closes.
  - Dialogs trap focus.
- **Battle keys (DR-121):**

| Action | Keys |
|---|---|
| walk | A/D or ←/→ |
| angle | W/S or ↑/↓ |
| power up | `=`, `+`, NumPad+, PgUp |
| power down | `-`, NumPad−, PgDn |
| fire (key repeat ignored) | Space or Enter |
| hop | Shift or Z |
| back-flip | X |
| turn | T |
| cycle weapons | Q/E or Tab |
| pick weapon | 1–6 |
| recentre camera | C |
| pause | Esc or P |
| fullscreen | F |

- A DOM live region `#sr` announces scene changes. The canvas has an `aria-label`.

---

## 2. Components

Every component lists its states. The shared state names are: default, hover (desktop only), pressed, focus, disabled, selected, queued, hidden.

| Component | Spec | States | DR |
|---|---|---|---|
| **Button** | Pill or rounded rect, outline 4, shade band 8, shadow 6. Heights: md 64, lg 72, xl 96. Variants: primary (`action`), secondary, info, destructive (`danger` + bin icon + white text), disabled | default, hover, pressed, focus, disabled | DR-003, DR-082, DR-172 |
| **IconButton** | Visual 56, hit 64, `secondary` fill, 32 icon. Used for back, pause, sound, fullscreen, find-my-ant and pager arrows | default, pressed, focus, disabled, hidden | DR-090, J36 |
| **Panel / Card** | `panel` fill, radius 24, outline 4, shadow 6, padding 16 | — | DR-003 |
| **ConfirmModal** | Scrim 70%. Card x 220, w 520, padding 32, shadow 8. Title 40, body 22 (max 3 lines). Buttons 216x72 with gap 24: safe on the left, confirm on the right. Default focus is the primary, or Cancel when destructive. Esc and back cancel. Tapping the scrim cancels non-destructive modals only | open, closing; buttons as Button | DR-172, J30 |
| **Toggle (HTML)** | 72x44 CSS pill. On = `action` + check, off = `disabled` | on, off, focus, disabled | DR-170 |
| **Slider (HTML)** | Native range, 44 CSS thumb, value text | default, focus, disabled | DR-170 |
| **Chip** | h 40, radius 16, body 22, optional icon. Dashed outline means "next / not yet" | default, active, dashed | DR-125, DR-126 |
| **NEW pill** | 44x24 `action`, caption 18, ink text, −8° tilt, wobble | shown, cleared on first select | DR-124 |
| **LevelNode** | 64 (hit 72); boss 88 (hit 96). Status sets the fill: locked `disabled` + lock, next `action` + panel ring + pulse, cleared `success` + white number + acorn row, skipped `secondary` + sticky note. Type sets the shape: rest has a hammock badge, boss is larger with a crown | locked, next, cleared, skipped, selected, focus, pressed | DR-101, J29 |
| **Acorn** | Sizes 28 / 32 / 40 / 64. Filled = `acorn` body, shade crescent and cap. Empty = `disabled` body. **Gold** = `gold` body plus 2 `secondary` twinkle dots popping for 1 s every 3 s. No sweeps or sparkles | filled, empty, gold, popping | DR-105, J42 |
| **WeaponSlot** | 64x64, icon 40, ammo badge 28 with numeral 22 (∞ for Seed) | default, selected (lift 6, `secondary`), empty (stone, crossed badge), locked (stone + padlock), sneak-idle, sneak-armed (dashed, badge 1), sneak-tried (✓), new, pressed, focus | DR-124, DR-152, J39 |
| **WindGauge** | `info` pill 360x48: 5 slots, a 64 hub, 5 slots. White lit chevrons, `info-shade` unlit. Hub shows "+3", "−3" or "Calm". Ghost chevrons are dashed and hollow | calm, level ±1..5, gust (shake), telegraph (ghost) | DR-125, DR-126 |
| **AntTag** | 76x32 `panel`, outline 3, team badge 24, HP 22. Active: 96x40 with `action` outline, nickname and a bobbing arrow | default, active, low-HP (`danger` + wobble), KO (stone + dizzy star) | DR-128 |
| **TeamPill** | 232x48: badge 32, 100x16 team bar with shade band, numeral 32. The active team rises 4 and shows a ▸ notch. Boss plate is 232x72 with a segmented HP bar | default, active, draining | DR-128, DR-126 |
| **DotBubble** | 392x112 `panel`, Dot avatar 64, body 22, max 3 lines, tail, and a dashed `action` pulse ring on the target control. Collapses to a 64 Dot chip | open, collapsed, hidden | DR-131, DR-151, J38 |
| **Notice** | Slot 240,184,480,72. Banner (title 28), toast (body 22, 1600 ms) or prompt (480x120+, buttons 200x64). Priority: phase > telegraph > sudden death > pickup > info. Queue of 3 | queued, showing, preempted | DR-131 |
| **RewardRow** | 632x72 `secondary`: icon slot 56, title 28 + body 22, action chip 160x56 | queued, playing, settled, skipped | DR-141 |
| **WeaponCard** | Sheet 560x468. Ribbon "NEW WEAPON!", art plate 160, name 40, one line of copy, Later / Try it | open, collapsed into reward row | DR-142 |
| **Trinket** | 24 in game, 48 source. Hero size = 24 × hero/side head ratio (24..64). Anchored per frame beside the cap stem, drawn below the cap, never over the cap or badge | default, equipped, locked, new, gold, focus, pressed | DR-162, J26 |
| **TeamFrame** | 8 px team-colour stroke around the safe rect, radius 24, two-player only | blue, amber, crossfade 150 ms | DR-183, J46 |
| **Aim preview** | 8 white dots (r 6, 2 px ink outline) at 0.06 s spacing, then a ring (r 16, stroke 5) at 0.48 s. Assist mode: 16 dots, with those after the 8th at 50%. The bot's version replaces the ring with a crosshair | player, assist, bot | DR-033, DR-129 |

---

## 3. Screen map (DR-012, DR-090, J47, J55)

```
HTML splash: Boot (owns the audio gate) + Preload (feeds the bar) → "Tap to play"
  → Title
     ├─ Play / Continue → LevelSelect ──┬─ Level card → [Comic, first visit] → Battle + Hud ─→ Results
     │                                  │                                     └─ Pause (overlay)
     │                                  ├─ Level 0 panel → Battle (Part 1) | Preview intro → Battle (Part 2)
     │                                  ├─ Wardrobe   ├─ Sticker Album   └─ Story (comic replay)
     ├─ 2 Players → TwoPlayerSetup → Battle (gate each turn) → Results (versus)
     └─ Settings (HTML dialog, also from Pause)
Results → LevelSelect | next Battle | next biome Comic | (L100) Epilogue comic → The End → LevelSelect
HTML overlays on top of everything: #rotate (portrait), #fatal (crash)
```

- **Back (DR-090):** one `Nav.goBack()` serves the UI back button, browser or Android back, and Esc.
  - It closes the topmost layer first.
  - Then, by screen:

| Screen | Back does |
|---|---|
| Title | not handled |
| LevelSelect, 2P Setup | go to Title |
| Comic | skip |
| Battle | open Pause |
| Pause | resume |
| Results | go to LevelSelect (campaign) or 2P Setup (versus) |

- Finished matches use `replaceState`, so they never stay in browser history.
- The back IconButton sits at (M, M), with hit 64 (J36).

---

## 4. Screens

### 4.1 Splash, audio gate, rotate, fatal (HTML; DR-091, DR-092, DR-094, DR-175)
- **Splash:** an `ink` page.
  - Wordmark "ANTS!" in `secondary` with an ink stroke, centred at y 150.
  - Progress bar track 240,320,480,32: `ink-soft` fill and outline 4. The fill is `secondary` with a 28 px ant head riding its end.
  - Label "Gathering the colony…".
  - Progress is weighted by bytes and never goes backward. Minimum display is 600 ms.
- **Load error:**
  - Retry automatically twice. If there's no progress for 20 s, show a panel: "Couldn't load the ants." and "Try again".
- **Gate:** the bar fades out and a primary button 300,310,360,80 reads "Tap to play" and pulses. A tap resumes the AudioContext, plays a silent buffer (iOS), plays the "pop", and fades to Title in 250 ms.
- **Rotate:**
  - Shown on `(orientation: portrait) and (pointer: coarse)`: an `ink` page with a 96 CSS phone icon turning −90°.
  - Copy: "Turn your phone sideways" / "ANTS! plays in landscape."
  - It freezes the sim, timer and audio. It hides after landscape holds for 250 ms, with a 400 ms input grace.
- **Fatal:** "Oh no, the ants tripped!" with a **Reload game** button and "Details". After 2 crashes in 60 s it adds "Clear saved match and reload". There are variants for no JS, no WebGL, and slow loads.

### 4.2 Title (DR-093, DR-095)
- **Logo** "ANTS!" at 48,24,460,180, tilted −4°, `secondary` with an 8 px ink outline.
- **Tagline** "Small ants. Big shots." label 28 at (56,232).
- **Buttons:** 320x72 at x 608, y 168 / 252 / 336.
  - Play or Continue (primary). Continue carries a "Lv N" pill.
  - 2 Players (info, people icon).
  - Settings (secondary, gear icon).
- **Corners:** Sound IconButton at TL. Fullscreen at TR (on iPhone it becomes the Add-to-Home-Screen hint sheet; it's hidden when standalone). Version caption at (16,506).
- **Hero ants** are 112 tall with feet at y 430: Blue at x 150, Amber at x 470. A seed arc plays every 6 s, unless reduced motion is on.
- **New save:** Play → LevelSelect with the Level 0 panel open (DR-150).
- **Saved match:** a Dot card asks "Resume your match?" with Resume or Map.

### 4.3 Level select (DR-100–DR-105, J36, J37, J41)
- **Header (y 16):**
  - Back at (16,16).
  - Pager ◀ at 216,16,64,64.
  - Title pill 304,16,352,56 with "N · Biome" (title 40, shrinks to 28).
  - Pager ▶ at 680,16,64,64.
  - Acorn pill 792,16,152,56 showing "8 / 30" (acorn 32).
- **Path:** two rows.
  - Row A y 204: L1–L5 at x 184 / 288 / 392 / 496 / 600.
  - Row B y 376: L6–L10 at x 600 / 496 / 392 / 288 / 184, so the boss is bottom-left.
  - Path line: 12 px ink with butter dots. It is bright up to "next" and 50% after.
- **Left strip:** at x M, 96x72 each, at y 292 / 372 / 452: Wardrobe, Stickers, Story (comic replay, J54).
- **Level 0 sign** (biome 1 only): hit 40,160,80,88. A leaf board with "0" and the plate "Training".
  - States: new (wiggle + arrow), Part 1 done (check), Preview tried (reward badge), match saved (dot).
- **Info card:** 672,88,272,412, `panel`.
  - Mini node 44 + name 28 (2 lines). Tagline 22 (2 lines).
  - Kit row of chips 36 (up to 6). A new weapon gets an `action` ring and a NEW pill.
  - Goals: three rows, each an acorn 28 + text 22: "Won the level", "No ant knocked out", "Done in {par} turns or fewer" (lit per goal bit, J48).
  - Wind row: teal arrow + hint.
  - Play 688,420,240,64 (primary), "Play" or "Play again".
  - **Locked:** "Clear or skip Level N first" + "Go to Level N".
  - **Level 0 panel** (same rect): Practice (about 3 min), Level 70 Preview (one try, about 4 min), "Skip to Level 1" (secondary, new save only).
- **Pager:**
  - Swipe: flips at 48 px or 0.5 px/ms, settles in 280 ms, with 0.25 rubber-band at the ends.
  - Keys: Q/E or PgUp/PgDn.
  - Dots at y 497.
  - **Locked biomes** are viewable: flat hills under a 55% fog, stone nodes, and the boss shown as "?".
  - **Unlock:** the vine grows (600 ms) and a Dot card says "New place!".
- **Skip trace (J41):** a sticky note "thwaps" onto the skipped node. It peels off when the level is cleared.

### 4.4 Comic (DR-110–DR-113, J47, J51, J54)
- **Background:** `ink-soft` with three soft circles.
- **Frame:** 40,28,880,420, outline 6, radius 24, shadow 8. The art is clipped to 46,34,868,408.
- **One panel per screen.**
  - **Advance:** tap anywhere, Space, Enter, →, or Next.
  - **Go back:** ←, or swipe right.
  - **Skip:** the Skip button, Esc or S.
  - 250 ms cooldown between advances. The first tap completes the text reveal (caption 40 chars/s).
  - **Buttons:**
    - Skip: hit 40,460,128,64. In replay it reads "Close".
    - Next: hit 744,460,176,64, primary. It reads "Let's go!" on the last panel and "Done" in replay.
  - Dots at (480,492).
- **Caption:** `panel`, tilted −1.5°, max width 560 and 3 lines. Anchored bottom-right (or bottom-left), title 28. Panel 1 adds a kicker "Chapter N · Biome" in `danger` 22.
- **Bubble:** white, max width 280, Nunito 900 22, tail tip 12–20 px above the speaker's head, inside y 58..280.
- **Limits:** at most 2 bubbles and 3 pop words per panel. A lint check fails any overlap at +30% text.
- **Epilogue:** after L100 (won or skipped), one panel ("Finish"), then the "The End" card (DR-144). A skipped L100 gets the sticky note "Level 100 skipped. Rematch anytime!".

### 4.5 Battle HUD (DR-120–DR-131, J33, J38, J39, J46, J49)

| Element | Rect / spec | DR |
|---|---|---|
| Team A pill | 16,16,232,48 | DR-128 |
| Team B pill / boss plate | 16,68,232,48 / 16,68,232,72 | DR-128, DR-126 |
| Turn plate | 270,16,420,56: badge 40, name 28, timer disc 48 at 634,20 | DR-127 |
| Wind gauge | 300,80,360,48 | DR-125 |
| Effects row | y 132, h 40, centred, up to 4 chips (gust, updraft, Up/Down, "Vent next", boss Next chip, "Dew in N") | DR-125, DR-126, DR-127 |
| Level 0 "Next" | 800,16,72,64 (Level 0 Part 1 only) | DR-151, J33 |
| Pause | 880,16,64,64 (visual 56) | DR-171, J33 |
| Find-my-ant | 880,88,64,64 (conditional) | DR-130 |
| Notice slot | 240,184,480,72 | DR-131 |
| Dot bubble | 16,180,392,112, or 552,180 when the active ant is on the left | J38 |
| Angle dial | 16,380,144,144 | DR-121 |
| Angle ▲ / ▼ | 168,388,64,64 / 168,460,64,64 | DR-121 |
| Flip / Hop | 240,372,72,72 / 320,372,72,72 (cost 80 / 50 in a corner) | DR-122 |
| Walk ◀ / ▶ | 240,452,72,72 / 320,452,72,72 | DR-123 |
| Move bar | 240,344,152,24 | DR-123 |
| Weapon tray | 408,372,224,152 (4–6 weapons, 3x2) or an 88-tall row (1–3) centred at x 520 | DR-124 |
| Weapon name pill | 416,328,208,40 | DR-124 |
| Power slider | 648,332,72,192 (track 28x160, knob 56) | DR-121 |
| Power ▲ / ▼ | 728,388,64,64 / 728,460,64,64 | DR-121 |
| FIRE | 824,404,120,120 (visual 104), at least 32 from any other hit rect | DR-122 |
| 2P gate button | 300,212,360,96 | J46 |

- **Clear zone:** x 16..944, y 176..328 has no controls. A control that overlaps the active ant fades to 40% but stays live.
- **Left-handed:** every bottom rect is mirrored to `x' = 960 − x − w` and pairs are swapped so ◀ stays left. The top is never mirrored.
- **Aim (DR-121, DR-033, J8):**
  - Set-then-fire: nothing fires on release.
  - The dial snaps to 1°. Dragging across the dial's vertical flips facing.
  - Steppers: a tap moves 1 step; holding repeats at 15 steps/s for 0.3 s, then coarse 5° or 5% at 10/s.
  - Slingshot: a drag starting within 56 px of the ant sets aim; power = pull / 150. Any other drag pans the camera.
  - Switching weapon restores that weapon's remembered aim.
- **FIRE (DR-122):** ready (butter ring pulse), pressed (fires on press), queued (ring sweep, fires when legal within the 12-tick buffer), rejected (shake), disabled (stone).
- **Retreat (DR-123, J49):** after a shot, the aim controls dim to 55% and the plate reads "Run for cover!" with a 3-2-1 disc. The camera eases to zoom 1.0.
- **Wind (DR-125):**
  - Chevrons pop outward at 40 ms each.
  - Gust: a shake plus a "Gust" chip.
  - Garden swirl: an "Up"/"Down" chip with stacked chevrons.
  - Column fields: an "Updraft" chip, plus dashed teal zone edges in the world.
  - Oscillate: a wave strip with a phase dot.
- **Boss (DR-126):**
  - A dashed "Next" chip and ghost chevrons from the TurnEnd card until the trick fires.
  - A 480x72 telegraph banner for 1200 ms.
  - A 480x96 "PHASE 2!" banner for 1600 ms.
- **Timer (DR-127):**
  - Normal: butter disc.
  - ≤ 10 s: `action` ring.
  - ≤ 5 s: an `action` rounded square with an ink numeral, a pulse and a tick sound.
  - TurnStart: 900 ms, or 600 ms through L10.
- **Damage (DR-128):**
  - Lilita 40, white with an ink stroke, rising 56 px over 900 ms.
  - A direct hit is 56 with "!".
  - A heal is "+25" in leaf-200.
- **Bot turn (DR-129, DR-066):** a wobbling crosshair, a power bar behind the ant, and the HUD dial and slider mirroring at 55%.
- **Two-player (DR-183, J46):**
  - The team frame is always on.
  - Turn 1 gets a coin-flip pop.
  - At each TurnStart the gate button (team fill, badge 48, "Tap to start") has a 400 ms lockout. Other controls are visible but inactive.
  - The timer starts on the tap.
- **Edge indicators (DR-130):** 48 px circles clamped to x 24..936, y 188..350, showing the distance.

### 4.6 Pause (DR-171, J40)
- Scrim 70%.
- Panel 400 wide at x 280, title "Paused" 40, caption "Level N · Round R".
- Buttons 320x72, gap 12: **Resume** (primary, default focus), Restart (confirm), Settings, Quit to map (confirm; keeps the match slot).
- The footer reads "Match saved" or "Saving is off".
- **Level 70 Preview:** the Restart slot becomes a caption row "One try! No restarts here." The panel keeps its size.
- **Freezes:** the sim, timer, camera and ambient animation. Music ducks to 25%.
- **Auto-pause:** on blur, hidden tab, portrait, or Android back.
- **Resume** has a 600 ms ready delay and clears input buffers.

### 4.7 Results (DR-140–DR-145, J41–J43)
- **Victory card:** 140,40,680,448.
  - "Victory!" display 64.
  - Hero ant 160x160 at (164,124).
  - Three goal rows at x 340, y 124 / 180 / 236.
  - Reward row 164,296,632,72. With no reward it shows "Your best: …".
  - Buttons at y 392, h 72: Map 176 · Retry 176 · **Next 248 (primary)**.
  - **Reveal:** goal rows at 450, 800 and 1150 ms. Buttons go live at 1500 ms. Any earlier tap skips to the end and is consumed.
- **Defeat card:** 200,96,560,348, "Dizzy!".
  - Copy: "Same map, same wind. Take another go!"
  - Buttons: Map · **Retry (primary)**.
  - **After 2 losses:** a Dot tip row picked by cause.
  - **After 3 losses (5 on a boss):** the offer "Stuck? No worries! …" with **Retry with a hint** (primary), Map, and Skip for now.
  - Never use the words "failed", "lost" or "game over".
- **Rewards (DR-141):** at most 2 per clear.
  - Order: weapon, then trinket or dance, then sticker, then nickname.
  - Trinkets fly to the cap anchor.
  - The nickname reward shows a "Pick names" chip that opens the picker (J43).
  - Gold variant uses DR-105 dots.
- **Weapon card (DR-142):**
  - Dewdrop (L4), Grub (L14), Roller (L24) and Plop (L34) show at level start. Pollen shows on the L10 Results.
  - Buttons: Later / **Try it**.
- **Boss (DR-144):**
  - 3300 ms dizzy-and-stretcher beat, plus a banner "{Boss} is dizzy!".
  - Then Results "Boss dizzy!", with Next labelled "Next stop".
  - Then the biome-complete card: tally, Marigold postcard, and "Next stop: {Biome}", which opens that biome's comic.
- **Final:** "You did it!", then the Epilogue, then "The End".
- **Versus (DR-145, J45):**
  - A team-colour ribbon with badges at both ends: "Blue Caps win!" or "Draw!".
  - A stats row.
  - Buttons: Title · Setup · **Rematch**.

### 4.8 Level 0 (DR-150–DR-154, J37–J40)
- **Part 1:**
  - Dot cards in the bubble slot. They collapse at 8 s, or as soon as the player acts.
  - Card order: T1 move, aim, power and fire; T2 hop and Dewdrop; T3 wind and Pollen.
  - The target control gets an `info` pulse ring.
  - "Next" appears after turn 3.
- **Sneak Shot:**
  - Tray slots 4–6 become sneak chips: stone with a padlock and a ribbon "L14 / L24 / L34". Pressing one shows "Unlocks at Level N".
  - States: armed, then tried.
  - 3 shots per team. After each one, Seed is reselected.
- **Ready card:** 192,112,576,316, "Ready for a peek at Level 70?", Skip / **Go**.
- **Preview intro:** 160,70,640,400 with the ribbon "ONE TRY" and three rows (one try; 3 vs 2 at 60 HP; Level 70 aim, all 6 weapons, about 4 min). Buttons: Not now / **Let's go!** (or Resume).
- **In match:** a "One try" pill at 672,88,144,32 (non-interactive, clear of Find-my-ant).
- **Win card** 128,60,704,420: "You beat a Level 70 bot!" and the Brass Doorknob Pin.
- **Lose card:** "Dizzy!" and the Brave Scout sticker.
- **Both cards:** "Let's go!" goes to L1.
- **Replay:** "Already collected", with Back to map / Play again.

### 4.9 Sticker album, Wardrobe, nicknames (DR-160–DR-164, J43)
- **Album:**
  - 13 pages × 6 slots: Page 0 Porch bonus (Brave Scout), Jungle pages 1–3, then biomes 2–10.
  - Book 96,88,768,368. Slots 224x140 in a 3x2 grid.
  - Arrows 72 at the sides. A footer shows "Page 3 / 13" and a NEW pill.
  - Unearned slots show a stone silhouette plus a hint ("Level 7").
  - Page flip takes 320 ms.
- **Wardrobe:**
  - 4 ant tabs at 16,88 (168x96 each).
  - Preview 200,88,400,408: the hero at 1.5x, plus an "In battle" strip with the ant at 1:1 and a 24 trinket.
  - Options 616,88,328,408 with tabs Trinket / Dance / Name.
  - A tap equips at once. Locked items show their source as a toast.
- **Nickname picker:**
  - Modal 96,64,768,412 with 12 chips (176x72, 3x4) and Skip. No free text.
  - Names: Biscuit, Noodle, Sprout, Pickle, Waffles, **Peanut**, Bubbles, Zigzag, Mochi, Dumpling, Turbo, Squeak (locale keys `nick.01`–`nick.12`).
- **Dances:** 304x72 rows with a replay button. A tap selects and plays the dance once (≤ 1500 ms). Under reduced motion it's 2 key poses over 900 ms.

### 4.10 Settings (HTML), modals, saves, credits (DR-170, DR-172–DR-174, J34)
- **Settings dialog:**
  - Max 600 CSS wide, `panel`, radius 24, ink border 4, shadow `0 8px 0 ink`. Headings Lilita 28 CSS, body Nunito 18 CSS. Controls at least 44 CSS.
  - **Sound:** Music (default 70), SFX (default 80).
  - **Play:** Assist aim preview, Relaxed turns 60 s, Show tips + Reset tips, Left-handed HUD.
  - **Display:** Reduced motion (Auto / On / Off), **Text size (Normal / Large)**, Performance mode ("Reloads the game…"), Fullscreen, Install, and Language (English only).
  - **About:** Credits, build id.
  - **Danger zone:** Reset progress, behind a destructive confirm.
  - Opening it disables Phaser input and traps focus.
- **Save status:**
  - A 40 px acorn-check disc at (16,484) for 1200 ms after each write. Shown on Title, LevelSelect and Results only.
  - If storage fails, a banner reads "Saving is off on this device."
  - A resume prompt appears for a saved match.
- **Credits:** Phaser 3.90.0 (MIT), Lilita One (OFL 1.1), Nunito (OFL 1.1), plus auto-listed libraries. Licence files ship at `/Ants/licenses/`.

### 4.11 Two-player setup (DR-180–DR-183, J44–J46, J52)
- **Header:** Back, title "Two Players", and a Resume pill 724,16,220,64 (only if a 2P match is saved).
- **Team cards:** Blue 16,88,264,288 and Amber 680,88,264,288.
  - Each has a band with the badge and "Player 1/2" (white on Blue, ink on Amber) and a portrait.
  - Ant icons show the team size.
  - A name pill 232x64 opens a picker of 12 presets. Defaults are **Blue Caps / Amber Caps**. There's no free text.
- **Map picker:**
  - Arrows 296,127 and 600,127. Thumbnail 368,96,224,126. Name 28, plus a wind hint with a teal arrow.
  - 10 arenas plus Random (tap the die to re-roll). All of them are unlocked.
- **Kit strip:** display only, 297,296,366,64: Seed ∞, Dew 3, Pollen 1, Grub 1, Roller 2, Plop 2. "Starter kit only" greys out slots 4–6.
- **Row A (y 388):**
  - Ants stepper: 2–4, default 3.
  - Turn chips: 30 s / 60 s.
- **Row B (y 460):** toggles Starter kit only and Pickups.
- **START:** 704,428,240,96, primary.
- The setup is remembered in `settings.twoPlayer`. Rematch reuses it with a new match seed.

---

## 5. Asset list (DR-088, DR-014, DR-111, DR-096)

All UI art is original SVG in `/art/ui/`. Token colours are substituted at build from `theme.json` (only `#fff` may appear in SVG). Rasterised at 2x with resvg and packed into the shared atlas (UI budget ≤ 2 MP).

| Group | Frames | Notes |
|---|---|---|
| Nine-slices | `slice-r24`, `slice-r16`, `slice-r8`, each with outline/shadow, fill and band layers (tinted) | buttons, panels, chips |
| Icons (32 viewbox, `currentColor`) | back, pause, play, sound-on, sound-off, fullscreen-enter, fullscreen-exit, phone-plus, gear, people, book, wardrobe, sticker, lock, padlock-badge, check, cross, bin, clock, bolt, updraft, wave, die, hammock, crown, sticky-note, hand, target, runner, foot, chevron-l/r/u/d, star-round (dizzy), acorn-check | DR-086, DR-093 … DR-183 |
| Badges | circle-team-a, rtriangle-team-b (with white ring), boss segment | DR-003, DR-007 |
| Acorns | filled, empty, gold, twinkle-dot | DR-105 |
| Weapon icons (40 + 120 art) | seed, dewdrop, pollen, grub, roller, plop | DR-002, DR-009, DR-142 |
| Rewards | trinkets (48 source): leaf-feather, seed-pin, coconut-charm, brass-doorknob-pin, plus later biome items; 78 stickers (album, 96); dance key poses | DR-071, DR-160, DR-162 |
| Dot | avatar 64 and 96, the faces of Dot (from the hero rig) | DR-131, DR-151 |
| Wind | chevron (lit/unlit/ghost), hub | DR-125 |
| Bitmap fonts | F56, F64, F80, F128 (BMFont XML + PNG, generated by `tools/bake-fonts.ts`) | DR-081 |
| Comic panels | `art/source/comic/bNN_pN.svg`, viewBox 1024x576, → `assets/comic/bNN/pN.png` (one texture per panel, loaded per biome) | DR-111 |
| 2P thumbnails | one 4x3 sheet of 448x252 frames, baked from the arena masks | DR-181 |
| PWA | icons 192, 512 (any), 512 maskable (art inside the central 80%), apple-touch 180, `favicon.svg` + 32 PNG, 2 screenshots 1280x720 | DR-096 |
| Licences | `OFL-LilitaOne.txt`, `OFL-Nunito.txt`, `MIT-Phaser.txt`, `THIRD_PARTY.txt` | DR-174 |

**Ant sprites.** The final art is **not drawn and not approved** (DR-007a). These are the reference images, which are AI-generated (reference only, never shipped or traced):

| Sprite key (manifest) | Reference file | Size in game / UI |
|---|---|---|
| `ant.hero.{team}` (idle, cocky, win, lose) | `art/source/heropose.jpeg` | Title 112 tall; Results 160; Wardrobe 1.5x |
| `ant.side.{team}` (walk, idle, aim, hop, flip, KO) | `art/source/sidepose.jpeg` | 88x63 in Battle (DR-027), mirrored for left |
| `ant.face.cocky` | `art/source/cocky.jpeg` | face swap |
| `ant.face.aim` | `art/source/aim.jpeg` | face swap |
| `ant.face.oops` | `art/source/oops.jpeg` | face swap |
| `ant.face.dizzy` | `art/source/dizzy.jpeg` | face swap, round-tipped stars |

- Until the final art exists, the build uses the placeholders in `art/reference/placeholder/`, flagged `PLACEHOLDER` in the manifest.
- Every atlas frame carries a `trinketAnchor` (DR-162).
- A CI pixel test checks that the trinket box never overlaps the cap or the badge.

---

## 6. Acceptance checks (for the builder)
1. **Contrast:** a test recomputes every `onColor` pair in `theme.json` and fails under 4.5 (DR-080, DR-088).
2. **No colour literals:** a scan of `src/**`, CSS and HTML fails on `#hex`, `0x……` or `rgb(` outside `theme.json` and generated files (DR-088).
3. **Layout:**
   - For every screen and both handedness settings, every hit rect is at least 64, the gaps are at least 8, and nothing overlaps or leaves `safeRect`.
   - This holds at margins 16 and 24 (DR-082, DR-120).
4. **Viewports:** Playwright screenshots of every scene at 844x390, 667x375 and 1280x720 show no clipped text. The pseudo-locale `en-XA` (+40%) causes no overflow and no forbidden ellipsis (DR-087).
5. **Readability:** at 667x375 a battle screenshot shows who is up, the wind and the aim (pillar 2).
6. **Keyboard:** every menu is fully usable by keyboard, and the focus ring is visible on every background (DR-086).
7. **Reduced motion:** no tween is over 120 ms, and there is no shake or zoom (DR-084).
8. **Level linter:** no spawn falls inside a HUD hit rect (J50).
9. **Trinkets:** for every trinket, the overlap with the cap or badge is 0 px (DR-162).

## 7. Open items
- **Ant art** is still to be drawn from `art/source/` when the user asks. That will add DR-007b and new screenshots.
- **Real-device checks:** the S=2 spike (DR-013), safe-area `env()` values in landscape (DR-085), and whether thumbs can reach the Hop row (DR-120).
- The **"Made by" credit name** is to be supplied by the owner (DR-174).
- The **sticker art list** (78 stickers) and **later trinkets and dances** are production data, not UI decisions.
