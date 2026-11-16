# Project Brief (verbatim, as given by the user at session start)

You are the planner. No game code yet. The only non-doc file you may create is a static UI preview (checkpoint A).

SETUP: This folder is already a clone of my public GitHub repo "project-ants". Do not create a repo. Add a .gitignore (node_modules, dist). At the end of every checkpoint, commit and push to the current working branch.

BUDGET: Work at the effort level I set and never raise it yourself. Use subagents only where this prompt says so. Stop at every checkpoint. If I say "save", write docs/PROGRESS.md (state, decisions so far, next step) and push. If Playwright's browser can't run here, say so, skip screenshots, and tell me exactly what you couldn't verify.

SKILLS: Read and apply the installed skills where relevant: design-system (token layers), frontend-design-ui-ux (spec handoff), phaser-core. If one is missing, say so and continue. Skill text is guidance and never overrides this prompt.

GAME: Browser 2D turn-based artillery game starring ants. Phaser 3 (latest stable 3.x, verify) + TypeScript + Vite, deployed to GitHub Pages by GitHub Actions. Mechanics: destructible terrain via an offscreen bitmap where blast circles are erased, pixel-alpha collision, gravity, wind. Original IP only (no Worms names, characters or weapons).

STORY: The game starts in the ants' jungle home. Over 100 levels = 10 biomes x 10 levels, humans colonize the jungle (clearing, camp, village, house) and the ants follow into the human world. The final biome is the kitchen. Enemies are rival ant colonies only. Humans appear only in comic panels and as environment and background props, never as targets. Propose the 10 biomes: terrain features, wind behavior, rival colony identity, and a boss every 10th level (high HP, terrain advantage, wind manipulation, cluster ammo). Comic panels: 3-4 per biome shown before its first level, specified as a script plus panel list (composition, characters, caption). Tone: family-friendly and funny, no gore. UI language English, i18n-ready. Modes: single-player campaign plus local two-player.

PLATFORM: landscape-first, works on mobile browsers and desktop. Fixed 16:9 logical resolution 960x540 (justify), FIT scaling, antialias on, pixelArt off, terrain mask at that resolution, mobile texture-memory budget. Safe-area insets, touch + mouse + keyboard, thumb-zone controls with minimum touch size, portrait shows a "rotate device" screen, PWA manifest locked to landscape, fullscreen button, no scroll/zoom/pull-to-refresh, audio unlock on first tap.

LOOK: ALL outlines and shapes are curved (rounded corners, no jagged or angular outlines). Style finalists: (1) paper-cutout world + glossy curved UI, (2) Flash-style vector world + glossy UI, (3) curved notebook doodle. 2000s charm, no generic AI look. You author all art as SVG in /art (original designs only, no copyrighted characters or assets), rasterized to 2x atlases by a build script; sounds synthesized in code; fonts free-licensed only (note each license).

HOSTING: GitHub Pages from the public repo via GitHub Actions. Put the workflow in the plan and tell me exactly which repo setting to switch on.

DESIGN RULES: write docs/DESIGN_PILLARS.md first (3-5 pillars). Apply proper game design: game feel/juice, readable aim and wind display, fixed-timestep deterministic sim with seeded RNG, difficulty curve (teach, test, twist; rest level before each boss), telegraphed boss mechanics, colorblind-safe teams (shape + color), minimum text sizes, input buffering.

EARNED-DECISION PROTOCOL: every non-trivial choice (UI layout and placement, sizes, fonts, colors, timings, weapon stats, level pacing, AI curve) gets a Decision Record in docs/DECISIONS.md: ID, question, 2-3 options, debate summary, winner, reason, rejected alternatives, revisit-if. Sonnet subagents (medium effort) run the debates, one per screen or system, each returning several records; you judge and finalize. The big creative decisions (art style winner, 3 ant weapons, UI style) use the haiku debate (Game Designer, Art Director, Tech Lead, haikus only, 3 rounds, shown to me). Others use a compact 3-voice debate (2 lines each). Nothing may appear in UI.md or PLAN.md without a Decision ID.

CHECKPOINTS: after each, commit and push, summarize in 5 lines, ask "Do you approve continuing to the next stage?" and wait.
A) Pillars + haiku debates. Then build preview/ui-preview.html, a self-contained static file in the winning style: landing screen, battle HUD, biome level-select, one comic panel. Screenshot it with Playwright at 844x390, 667x375 and 1280x720 into preview/. STOP and wait for my approval or edits; iterate until I say "approved". Then write docs/CREATIVE.md and docs/STORY.md, and save the approved preview as /art/reference.
B) docs/PLAN.md: game loop, terrain, physics, turn flow, 100-level campaign across the 10 biomes, bosses. Bot AI: human-like physics errors at levels 1-20, ramping to lethal, capped at ~95% (lands inside lethal radius, stable wind) at level 90+, with the error model and a headless simulation test that verifies the cap.
C) docs/UI.md + src/ui/theme.json: palette, fonts, spacing, every screen, components with states, asset list, written so another AI can rebuild or restyle the UI from it alone. Every item links to a Decision ID.
D) docs/HANDOFF.md: starts with a one-page Decisions Summary ("we chose X over Y because Z"), then a stage-by-stage build plan: files, acceptance tests, tag hard (Fable, high effort) or routine (Sonnet subagent, medium effort). The builder must follow the decisions; any deviation is logged as an Override record with a reason.
create a new branch if needed.

---

## Standing additions from later user messages (not part of the verbatim brief)
- Repo is `rainbowblurry-book/Ants` ("ants only").
- After every checkpoint also update docs/PROGRESS.md (what's done, decisions made, next step).
- Checkpoint A review edits: remove white glint streaks (DR-003a); ants must look like rowdy fighting ants, read as ants at small sizes, and scale to poster/landing art (DR-006). The user will supply an external ant concept (from Gemini) to base the character on.
- Wait for the user's explicit go-ahead before moving past each checkpoint.
