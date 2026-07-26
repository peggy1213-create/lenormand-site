# Spreads Specification

Defines the three spreads the site supports at launch. If this file disagrees with `PRD.md`, the PRD wins.

## Shared draw rules

- Deck is shuffled with Fisher–Yates using `crypto.getRandomValues`.
- No card repeats within a single spread.
- Reversed cards: **not used** (Lenormand tradition). Set globally in config.
- After a draw, the user can save a note, copy an AI-reading prompt (see `ai-prompts.md`), delete, or draw again.

## Spread definitions

Spread configuration lives in `src/data/spreads.ts`:

```ts
export type Spread = {
  id: 'daily' | 'line-3' | 'line-5';
  cardCount: 2 | 3 | 5;
  positionKeys: string[];   // i18n keys for position names, in order
};

export const SPREADS: Spread[] = [
  {
    id: 'daily',
    cardCount: 2,
    positionKeys: ['spread.daily.pos1', 'spread.daily.pos2']
  },
  {
    id: 'line-3',
    cardCount: 3,
    positionKeys: ['spread.line3.pos1', 'spread.line3.pos2', 'spread.line3.pos3']
  },
  {
    id: 'line-5',
    cardCount: 5,
    positionKeys: ['spread.line5.pos1', 'spread.line5.pos2', 'spread.line5.pos3', 'spread.line5.pos4', 'spread.line5.pos5']
  }
];
```

Position names live in the message files so they translate cleanly.

---

### 1. Daily (2 cards)

**Use:** Quick daily guidance. The two-card pair is how Lenormand reads naturally — the first card names the subject, the second modifies it.

**Layout:** Two cards side by side, drawn left to right.

**Positions:**

| # | Name | Meaning |
|---|---|---|
| 1 | Subject | What today is about. |
| 2 | Modifier | How it plays out — colours the subject. |

**Reading rule:** Show each card's individual meaning, then a short "how they read together" note prompting the user to read the pair as a sentence (e.g. Heart + Letter = "a love letter / affectionate message"). The AI-prompt button is especially useful here.

---

### 2. Line of 3 (3 cards)

**Use:** Past / Present / Future, or Situation / Action / Outcome.

**Layout:** Three cards in a horizontal row, drawn left to right.

**Positions:**

| # | Name | Meaning |
|---|---|---|
| 1 | Past / Situation | The context or what came before. |
| 2 | Present / Action | The current moment or what to do. |
| 3 | Future / Outcome | Where this is heading. |

**Reading rule:** Read each card in position, then read pairs 1+2 and 2+3 for narrative flow.

**User choice:** Toggle between the two interpretive frames (Past/Present/Future vs. Situation/Action/Outcome) before drawing. Store the chosen frame with the reading so it renders the same way in history.

---

### 3. Line of 5 (5 cards)

**Use:** Deeper exploration of a question with a clear core issue.

**Layout:** Five cards in a horizontal row. On narrow mobile viewports, allow horizontal scroll rather than shrinking cards below a legible size.

**Positions:**

| # | Name | Meaning |
|---|---|---|
| 1 | Distant past | Root of the situation. |
| 2 | Recent past | What led directly here. |
| 3 | Core / Present | The heart of the matter. |
| 4 | Near future | What comes next. |
| 5 | Outcome | Where this settles. |

**Reading rule:** Card 3 is the anchor. Read outward from it. Mirror pairs (1↔5, 2↔4) may amplify or contradict.

---

## UI / interaction rules per spread

- **Before draw:** show empty position placeholders with labels, so the user understands the shape of the question.
- **Draw animation:** cards flip in sequence, ~400ms each, staggered by 150ms. User can also tap "reveal all" to skip staggering.
- **After draw:** tap a card to expand its meaning in a panel; tap again to collapse.
- **Save:** readings auto-save. Note field can be edited from the current-reading view or the history view.
- **Copy AI prompt:** button below the spread. See `ai-prompts.md`.
- **Draw again:** clears the current spread and returns to the pre-draw state for the same spread type.

## Mobile layout notes

All three spreads are horizontal lines, so the base layout is a flex row. The 5-card spread will not fit five legible cards across a phone; use horizontal scroll with subtle scroll cues (fade at the right edge) rather than shrinking cards.
