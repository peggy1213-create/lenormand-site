Please create a new file at `specs/shuffle-interaction.md` (create the 
`specs/` folder if it doesn't exist). Use this exact content:

# Shuffle Interaction Spec

> This is the most important interaction in the app. Confirm the approach before building surrounding features.

## Principle

The user shuffles by clicking. No auto-play animation. Every click produces a visible, physical shuffle motion — like handling a real deck.

## Starting state

- 36 face-down cards stacked in the centre of the screen
- Subtle fanned / slightly messy pile look (not a perfect stack)
- "Draw" button is disabled until at least one shuffle has occurred

## Click behaviour

Each mouse click or tap triggers **one** shuffle gesture. Randomly pick one of four motions per click:

- **Cut** — top half lifts, arcs to the side, drops back on the bottom half
- **Riffle** — deck splits in two, cards interleave with a quick cascade
- **Overhand** — small packets peel from the top and drop onto a new pile
- **Table spread** — cards fan into an arc, then gather back

Each motion runs 150–400ms with short easing. Implementation via CSS transforms (translate, rotate, z-index) + vanilla JS. Framer Motion or GSAP acceptable if it materially helps.

## Drag behaviour

Click-and-drag across the pile scatters or gathers cards proportional to drag distance.

## Feedback

Small counter/hint below the pile: *"Shuffled 3 times — click again or draw when ready."*

## Draw handoff

After ≥1 shuffle, the "Draw" button activates. Clicking it deals cards face-down into the chosen spread. User clicks each card individually to flip it.

## Randomness

Use `crypto.getRandomValues` for the underlying deck order. The visual shuffle motion and the actual randomisation are separate — motions are cosmetic, randomness is cryptographic.

## Related specs

- **Spreads** — the layouts cards are dealt into after shuffling are defined in [`/specs/spreads.md`](./spreads.md).
- **Deck data** — the 36-card definitions used by both shuffle and spread logic are in [`/specs/deck-data.md`](./deck-data.md).

After creating it, confirm the file exists and show me its full path.