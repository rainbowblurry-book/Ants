# Design Pillars — Project Ants

Every feature, screen and asset must serve at least one pillar and break none.
If a proposal conflicts with a pillar, the pillar wins unless an Override record says why.

## 1. Every shot tells a joke
Artillery is slapstick. Shots should be funny to watch even when they miss: wobbly
flight, squash-and-stretch ants, comic "boing" sounds, crumbs flying. Family-friendly,
no gore. Defeated ants get knocked "dizzy" and carried off by a leaf-stretcher, never hurt.
*Test:* would a 9-year-old and their parent both laugh at a miss?

## 2. Read it in one glance
Aim angle, power, wind and whose turn it is must be readable in under one second on a
phone at arm's length. Teams differ by shape AND color (colorblind-safe). Minimum text
sizes, no information hidden in color alone, no tiny icons.
*Test:* a screenshot at 667x375 tells you who is up, the wind, and your aim.

## 3. The ground is the toy
Destructible terrain is the core verb. Every biome's terrain (soft soil, hard rock,
bouncy sponge, slick tiles) should change how you think about a shot, and every crater
should matter on the next turn.
*Test:* does this level's terrain create a decision the last one did not?

## 4. Fair, deterministic, learnable
Fixed-timestep physics, seeded RNG, the same input always gives the same flight. Bots
miss the way people miss (slightly off power, misjudged wind), not randomly. Bosses
telegraph their tricks a turn ahead. Difficulty rises as teach, test, twist, with a
rest level before every boss.
*Test:* after losing, can the player say what they should have done?

## 5. Rounded, handmade, 2000s-charming
Every outline and shape is curved: rounded corners, soft blobs, no jagged or angular
edges. The look should feel like a lovingly made 2000s web game, not a generic AI
render or a stock template. Runs smoothly on a mid-range phone in landscape.
*Test:* could this frame pass as a hand-built Flash-era game with a personality?
