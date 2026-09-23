import en from "../../messages/en.json";
import zhTW from "../../messages/zh-TW.json";
import { getCardById } from "@/data/cards";
import type { SpreadId } from "@/data/spreads";
import type { Locale } from "@/i18n/routing";

type Messages = typeof en;

const MESSAGES: Record<Locale, Messages> = { en, "zh-TW": zhTW };

type CardKey = keyof Messages["cards"];

function cardText(messages: Messages, cardId: number) {
  const slug = getCardById(cardId).slug as CardKey;
  const entry = messages.cards[slug];
  return { name: entry.name, keywords: entry.keywords.join(", ") };
}

function langLabel(locale: Locale): string {
  return locale === "zh-TW" ? "Traditional Chinese / 繁體中文" : "English";
}

// The three templates below are AI-facing instructional text, not UI copy —
// they stay in English (matching the source design), with only the trailing
// "Language: Respond in ..." line varying by locale.

function dailyPromptText(messages: Messages, cards: Array<{ cardId: number }>, locale: Locale): string {
  const c = cards.map((card) => cardText(messages, card.cardId));
  const nm = (i: number) => (c[i] ? c[i].name : "");
  const lang = langLabel(locale);

  return `You are reading Lenormand cards. Lenormand is practical and descriptive — it names situations as they are. It is not fortune-telling: do not label the day as lucky, unlucky, positive, or negative. Do not predict fixed outcomes. Do not invoke fate or spirits. Every card is neutral information. Your job is to describe what the cards point to so the querent has clearer information to work with today.

Spread: Daily Draw — 3 cards read left to right as one continuous line about the day. Lenormand is chain reading — meaning emerges from how the cards connect, not from fixed positions.

Cards drawn (left to right):
1. ${nm(0)}
2. ${nm(1)}
3. ${nm(2)}

Language: Respond in ${lang}.

How to read
1. Read the three cards as one continuous chain about the day, not three separate readings.
2. Read the adjacent pairs — 1+2 and 2+3 — as well as the whole line. Meaning emerges from how the cards connect.
3. Stay grounded and specific. Lenormand speaks about ordinary life: work, relationships, health, money, decisions, communication, movement, timing. Avoid mystical or vague language.`;
}

function threePromptText(
  messages: Messages,
  cards: Array<{ cardId: number }>,
  question: string | undefined,
  locale: Locale,
): string {
  const c = cards.map((card) => cardText(messages, card.cardId));
  const nm = (i: number) => (c[i] ? c[i].name : "");
  const q = (question ?? "").trim();
  const lang = langLabel(locale);

  return `You are reading Lenormand cards. Lenormand is practical and descriptive — it names situations as they are. It is not fortune-telling: do not label the reading as lucky, unlucky, positive, or negative. Do not predict fixed outcomes. Do not invoke fate or spirits. Every card is neutral information. Your job is to describe what the cards point to so the querent has clearer information about their question.

Spread: Three Cards — 3 cards read left to right as a continuous chain that tells the story of the querent's question. Lenormand is chain reading — meaning emerges from how the cards connect, not from fixed positions.

Querent's question: ${q || "none given"}

Cards drawn (left to right):
1. ${nm(0)}
2. ${nm(1)}
3. ${nm(2)}

Language: Respond in ${lang}.

How to read
1. Read the three cards as one continuous chain that tells the story of the situation the querent is asking about — not three separate readings.
2. Read the adjacent pairs — 1+2 and 2+3 — as well as the whole line. Meaning emerges from how the cards connect.
3. Anchor the reading to the querent's question. If the question is about work, don't drift into relationships. Stay in the domain the querent named.
4. Stay grounded and specific. Lenormand speaks about ordinary life: work, relationships, health, money, decisions, communication, movement, timing. Avoid mystical or vague language.`;
}

function fivePromptText(
  messages: Messages,
  cards: Array<{ cardId: number }>,
  question: string | undefined,
  locale: Locale,
): string {
  const c = cards.map((card) => cardText(messages, card.cardId));
  const nm = (i: number) => (c[i] ? c[i].name : "");
  const q = (question ?? "").trim();
  const lang = langLabel(locale);

  return `You are reading Lenormand cards. Lenormand is practical and descriptive — it names situations as they are. It is not fortune-telling: do not label the reading as lucky, unlucky, positive, or negative. Do not predict fixed outcomes. Do not invoke fate or spirits. Every card is neutral information. Your job is to describe what the cards point to so the querent has clearer information about their question.

Spread: Five Cards — 5 cards read left to right as a continuous chain, with card 3 (centre) as the anchor of the reading. Lenormand is chain reading — the centre card names the heart of the situation, and the cards on either side describe what flows in and out of it.

Querent's question: ${q || "none given"}

Cards drawn (left to right):
1. ${nm(0)}
2. ${nm(1)}
3. ${nm(2)}
4. ${nm(3)}
5. ${nm(4)}

Language: Respond in ${lang}.

How to read
1. Card 3 is the anchor — the heart of the situation the querent is asking about. Start there. Name what the reading is actually about, in the context of the question.
2. Read the adjacent pairs — 1+2, 2+3, 3+4, 4+5 — as well as the whole line. Meaning emerges from how the cards connect.
3. Anchor the reading to the querent's question. If the question is about work, don't drift into relationships. Stay in the domain the querent named.
4. Stay grounded and specific. Lenormand speaks about ordinary life: work, relationships, health, money, decisions, communication, movement, timing. Avoid mystical or vague language.`;
}

function ninePromptText(
  messages: Messages,
  cards: Array<{ cardId: number }>,
  question: string | undefined,
  locale: Locale,
): string {
  const c = cards.map((card) => cardText(messages, card.cardId));
  const nm = (i: number) => (c[i] ? c[i].name : "");
  const q = (question ?? "").trim();
  const lang = langLabel(locale);

  return `You are reading a 3×3 Box spread of nine Lenormand cards for a querent.

The querent's question: ${q || "none given"}

The nine cards, in position order (left to right, top to bottom):
Row 1 (top): ${nm(0)}, ${nm(1)}, ${nm(2)}
Row 2 (middle): ${nm(3)}, ${nm(4)}, ${nm(5)}
Row 3 (bottom): ${nm(6)}, ${nm(7)}, ${nm(8)}

Read this spread as a Lenormand box, not as isolated positions. The centre card (${nm(4)}) is the heart of the reading — the core of the question, its essence. Every other card is read in relation to it.

Work through the box in this order:

1. **The centre** (${nm(4)}). Begin here. What is the core of the situation the querent is asking about?

2. **The frame** — the four corners (${nm(0)}, ${nm(2)}, ${nm(6)}, ${nm(8)}). Read these as the context surrounding the centre. You may read them clockwise from the top-left, or as pairs across the diagonals (1↔9, 3↔7). Choose whichever reading the cards themselves suggest.

3. **The three horizontal rows.** The top row (${nm(0)}, ${nm(1)}, ${nm(2)}) speaks to what is held in mind — ideas, hopes, what the querent is reaching toward. The middle row (${nm(3)}, ${nm(4)}, ${nm(5)}) speaks to lived reality — the day-to-day of the situation. The bottom row (${nm(6)}, ${nm(7)}, ${nm(8)}) speaks to what runs underneath — the undercurrent, what is carried in from before, what shapes the situation without being named.

4. **The three vertical columns.** The left column (${nm(0)}, ${nm(3)}, ${nm(6)}) speaks to what has come before. The middle column (${nm(1)}, ${nm(4)}, ${nm(7)}) speaks to what is present now. The right column (${nm(2)}, ${nm(5)}, ${nm(8)}) speaks to what lies ahead.

5. **The two diagonals** (${nm(0)}–${nm(4)}–${nm(8)} and ${nm(2)}–${nm(4)}–${nm(6)}). Read these as currents of influence or directions in which the situation is moving. They cross at the centre, so both diagonals pass through and are coloured by ${nm(4)}.

Draw on your knowledge of Lenormand card meanings and traditional combinations. Read the cards as a chain — each card modifies its neighbours, and meaning emerges from how they join, not from any fixed label attached to a position.

Do not use the language of fortune-telling. Do not speak of luck, fate, destiny, or good and bad outcomes. Do not tell the querent what will happen or what they should do. Offer the reading as a mirror for reflection: what the cards illuminate about the situation, and what the querent might sit with.

Write in flowing prose, not bullet points. Let the reading feel like one continuous unfolding, not a checklist of positions.

Language: Respond in ${lang}.`;
}

function grandPromptText(
  messages: Messages,
  cards: Array<{ cardId: number }>,
  question: string | undefined,
  locale: Locale,
): string {
  const c = cards.map((card) => cardText(messages, card.cardId));
  const nm = (i: number) => (c[i] ? c[i].name : "");
  const q = (question ?? "").trim();
  const lang = langLabel(locale);
  const houseName = (i: number) => cardText(messages, i + 1).name;

  const rows = [0, 1, 2, 3]
    .map((r) => {
      const cells = Array.from({ length: 9 }, (_, col) => {
        const i = r * 9 + col;
        return `${nm(i)} (House ${i + 1}: ${houseName(i)})`;
      });
      return `Row ${r + 1}: ${cells.join(" · ")}`;
    })
    .join("\n");

  const locate = (cardId: number) => {
    const i = cards.findIndex((card) => card.cardId === cardId);
    if (i < 0) return "not in the tableau";
    return `row ${Math.floor(i / 9) + 1}, column ${(i % 9) + 1} (House ${i + 1}: ${houseName(i)})`;
  };

  return `You are reading a Grand Tableau — all 36 Lenormand cards laid in four rows of nine — for a querent.

The querent's question: ${q || "none given — give a broad overview of the querent's current situation"}

The tableau, left to right, top to bottom. Each position is also a house, named after the card whose number matches it:
${rows}

Significators:
- ${cardText(messages, 28).name} (28) sits at ${locate(28)}
- ${cardText(messages, 29).name} (29) sits at ${locate(29)}

The querent's gender is not given. If the question makes it clear which significator stands for the querent, use it; otherwise read from the ${cardText(messages, 29).name} and the ${cardText(messages, 28).name} both, and say which one you are reading from.

Work through the tableau in this order:

1. **The significator.** Find the querent's card. Read the cards immediately around it (above, below, left, right, and the diagonals) as what is closest to the querent right now. Cards to the left speak to what is passing; cards to the right to what is approaching; cards above to what is on the querent's mind; cards below to what is under their control or underfoot.

2. **The lines through the significator.** Read the full row and the full column that cross the significator as the main threads of the situation.

3. **Topic cards.** Pick the cards that belong to the querent's question — for example the Heart and Rings for love, the Fox and Anchor for work, the Fish for money, the Tree for health — and note how near to or far from the significator they fall. Near means present and immediate; far means distant or less pressing.

4. **Houses.** For the cards that matter most, read the card together with the house it lands in: the card describes what is happening, the house names the area of life where it happens.

5. **The corners and the final line.** The four corners frame the whole situation. The last cards of the bottom row suggest where the matter is heading.

Draw on your knowledge of Lenormand card meanings and traditional combinations. Read cards as they join — each card modifies its neighbours. You do not need to comment on all 36 cards; follow what is relevant to the question and let the rest be background.

Do not use the language of fortune-telling. Do not speak of luck, fate, destiny, or good and bad outcomes. Do not tell the querent what will happen or what they should do. Offer the reading as a mirror for reflection: what the cards illuminate about the situation, and what the querent might sit with.

Write in flowing prose with short headed sections, not a card-by-card checklist.

Language: Respond in ${lang}.`;
}

export function buildAIPrompt(input: {
  spread: SpreadId;
  cards: Array<{ cardId: number }>; // in position order
  question?: string;
  locale: Locale;
}): string {
  const messages = MESSAGES[input.locale];
  if (input.spread === "daily") {
    return dailyPromptText(messages, input.cards, input.locale);
  }
  if (input.spread === "three") {
    return threePromptText(messages, input.cards, input.question, input.locale);
  }
  if (input.spread === "nine") {
    return ninePromptText(messages, input.cards, input.question, input.locale);
  }
  if (input.spread === "grand") {
    return grandPromptText(messages, input.cards, input.question, input.locale);
  }
  return fivePromptText(messages, input.cards, input.question, input.locale);
}
