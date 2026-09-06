// Language-specific deck content: card meanings and directed card-pair
// examples. Long-form prose lives here rather than in messages/{locale}.json
// — these files hold paragraphs of authored content, not short UI strings.

export type CardMeaning = {
  id: number; // 1-36, matches src/data/cards.ts
  meaning: string; // the card's core sense and tone
  beside: string; // how it behaves in combination
};

export type CardPair = {
  first: number; // the subject card
  second: number; // the card that modifies it
  text: string; // ≤60 words
};
