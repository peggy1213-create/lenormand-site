# Deck Data Specification

Defines how the 36-card Lenormand deck is stored in the codebase. If this file disagrees with `PRD.md`, the PRD wins.

## Split: metadata vs. text

To keep i18n clean, card data is split across two places:

- **Language-neutral metadata** → `src/data/cards.ts`
- **All human-readable text** → `messages/en.json` and `messages/zh-TW.json`, keyed by card slug.

This way, adding a new language means adding one message file, not touching card data.

## `src/data/cards.ts`

TypeScript array, 36 entries, ordered by traditional Lenormand number (1–36).

```ts
export type Card = {
  id: number;           // 1–36, matches traditional Lenormand number
  slug: string;         // stable key, used for i18n lookup and filename
  image: string;        // e.g. "/cards/01-rider.webp"
  person: boolean;      // true if card can represent a person (Rider, Child, Bear, Dog, Man, Woman)
  tone: 'positive' | 'negative' | 'neutral';
};

export const CARDS: Card[] = [
  { id: 1,  slug: 'rider',      image: '/cards/01-rider.webp',      person: true,  tone: 'positive' },
  { id: 2,  slug: 'clover',     image: '/cards/02-clover.webp',     person: false, tone: 'positive' },
  // ...
];
```

Nothing translatable lives here. `person` and `tone` are structural (used by reading logic, not shown as strings).

## Message file shape

Each locale file (`messages/en.json`, `messages/zh-TW.json`) contains a `cards` object keyed by slug:

```json
{
  "cards": {
    "rider": {
      "name": "Rider",
      "keywords": ["news", "message", "arrival", "movement"],
      "meaning_short": "News and messages arriving. Something is on its way.",
      "meaning_long": "The Rider brings information from outside. In a reading it points to news, a visitor, or the arrival of something significant. Speed and movement are its hallmarks — matters resolve quickly."
    },
    "clover": {
      "name": "Clover",
      "keywords": ["luck", "small joy", "opportunity"],
      "meaning_short": "…",
      "meaning_long": "…"
    }
  }
}
```

### Field notes

- `name` — display name, shown under the card.
- `keywords` — 3–6 short tags. Used in the card panel and inside the AI-reading prompt.
- `meaning_short` — 1–2 sentences, shown by default when a card is tapped.
- `meaning_long` — 3–5 sentences, shown when the user taps "read more."

No `meaning_reversed` — reversals are out of scope for MVP.

## The 36 cards

Fill in `meaning_short` and `meaning_long` in your own voice — this is what makes the deck feel like *your* reading style rather than a generic reference.

| # | Name | Slug | Keywords (starter) | Person? | Tone |
|---|---|---|---|---|---|
| 1 | Rider | rider | news, message, arrival | Y | positive |
| 2 | Clover | clover | luck, small joy, opportunity | | positive |
| 3 | Ship | ship | travel, journey, longing | | positive |
| 4 | House | house | home, family, stability | | positive |
| 5 | Tree | tree | health, roots, slow growth | | positive |
| 6 | Clouds | clouds | confusion, doubt, uncertainty | | negative |
| 7 | Snake | snake | betrayal, complication, rival | | negative |
| 8 | Coffin | coffin | ending, illness, transformation | | negative |
| 9 | Bouquet | bouquet | gift, kindness, invitation | | positive |
| 10 | Scythe | scythe | sudden cut, decision, danger | | negative |
| 11 | Whip | whip | conflict, repetition, arguments | | negative |
| 12 | Birds | birds | gossip, chatter, anxiety | | neutral |
| 13 | Child | child | new beginning, innocence, small | Y | positive |
| 14 | Fox | fox | cunning, deception, self-interest | | negative |
| 15 | Bear | bear | strength, authority, wealth | Y | positive |
| 16 | Stars | stars | hope, guidance, clarity | | positive |
| 17 | Stork | stork | change, transition, moving | | positive |
| 18 | Dog | dog | friendship, loyalty, ally | Y | positive |
| 19 | Tower | tower | institutions, isolation, authority | | neutral |
| 20 | Garden | garden | public, social gathering, network | | positive |
| 21 | Mountain | mountain | obstacle, delay, block | | negative |
| 22 | Crossroads | crossroads | choice, decision, options | | neutral |
| 23 | Mice | mice | loss, worry, erosion | | negative |
| 24 | Heart | heart | love, affection, romance | | positive |
| 25 | Ring | ring | commitment, contract, cycle | | positive |
| 26 | Book | book | secret, knowledge, hidden | | neutral |
| 27 | Letter | letter | written message, document | | neutral |
| 28 | Man | man | male querent or partner | Y | neutral |
| 29 | Woman | woman | female querent or partner | Y | neutral |
| 30 | Lily | lily | peace, maturity, family elder | | positive |
| 31 | Sun | sun | success, joy, energy | | positive |
| 32 | Moon | moon | emotions, recognition, fame | | positive |
| 33 | Key | key | breakthrough, certainty, opening | | positive |
| 34 | Fish | fish | wealth, business, abundance | | positive |
| 35 | Anchor | anchor | stability, long-term, work | | positive |
| 36 | Cross | cross | burden, fate, unavoidable | | negative |

## Card images

- Source format: PNG (provided).
- **Ship as WebP** in `/public/cards/`. Keep PNG source of truth outside the repo or in a `/source-images/` folder ignored by the build.
- Longest edge ~800px.
- Naming: `{NN}-{slug}.webp`, zero-padded.
- Card back: `/public/cards/back.webp`, same dimensions as face cards, shown in the deck stack before a draw and during the flip animation.
