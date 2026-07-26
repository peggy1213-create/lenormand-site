// Language-neutral card metadata. All display text (name, keywords,
// meanings) lives in messages/{locale}.json, keyed by slug.
// See docs/deck-data.md.

export type Card = {
  id: number; // 1-36, matches traditional Lenormand number
  slug: string; // stable key, used for i18n lookup and filename
  image: string; // e.g. "/cards/01-rider.webp"
  person: boolean; // true if the card can represent a person
  tone: "positive" | "negative" | "neutral";
};

function card(
  id: number,
  slug: string,
  person: boolean,
  tone: Card["tone"],
): Card {
  return {
    id,
    slug,
    image: `/cards/${String(id).padStart(2, "0")}-${slug}.webp`,
    person,
    tone,
  };
}

export const CARDS: Card[] = [
  card(1, "rider", true, "positive"),
  card(2, "clover", false, "positive"),
  card(3, "ship", false, "positive"),
  card(4, "house", false, "positive"),
  card(5, "tree", false, "positive"),
  card(6, "clouds", false, "negative"),
  card(7, "snake", false, "negative"),
  card(8, "coffin", false, "negative"),
  card(9, "bouquet", false, "positive"),
  card(10, "scythe", false, "negative"),
  card(11, "whip", false, "negative"),
  card(12, "birds", false, "neutral"),
  card(13, "child", true, "positive"),
  card(14, "fox", false, "negative"),
  card(15, "bear", true, "positive"),
  card(16, "stars", false, "positive"),
  card(17, "stork", false, "positive"),
  card(18, "dog", true, "positive"),
  card(19, "tower", false, "neutral"),
  card(20, "garden", false, "positive"),
  card(21, "mountain", false, "negative"),
  card(22, "crossroads", false, "neutral"),
  card(23, "mice", false, "negative"),
  card(24, "heart", false, "positive"),
  card(25, "ring", false, "positive"),
  card(26, "book", false, "neutral"),
  card(27, "letter", false, "neutral"),
  card(28, "man", true, "neutral"),
  card(29, "woman", true, "neutral"),
  card(30, "lily", false, "positive"),
  card(31, "sun", false, "positive"),
  card(32, "moon", false, "positive"),
  card(33, "key", false, "positive"),
  card(34, "fish", false, "positive"),
  card(35, "anchor", false, "positive"),
  card(36, "cross", false, "negative"),
];

export const CARD_BACK_IMAGE = "/cards/back.webp";

export function getCardById(id: number): Card {
  const found = CARDS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown card id: ${id}`);
  return found;
}
