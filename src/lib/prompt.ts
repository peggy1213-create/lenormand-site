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

function dailyPromptText(
  messages: Messages,
  cards: Array<{ cardId: number }>,
  question: string | undefined,
  locale: Locale,
): string {
  const c = cards.map((card) => cardText(messages, card.cardId));
  const nm = (i: number) => (c[i] ? c[i].name : "");
  const lang = langLabel(locale);

  return `You are reading Lenormand cards. Lenormand is a practical, descriptive divination system — it names situations and dynamics as they are. It is **not** a fortune-telling tool that predicts luck, judges outcomes as good or bad, or issues warnings. Your job is to describe what the cards point to so the querent has clearer information to work with today.

Spread: 3 cards read left to right as one continuous line about the day. Lenormand is chain reading — meaning emerges from how the cards connect, not from fixed positions.


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

export function buildAIPrompt(input: {
  spread: SpreadId;
  cards: Array<{ cardId: number }>; // in position order
  question?: string;
  locale: Locale;
}): string {
  const messages = MESSAGES[input.locale];
  if (input.spread === "daily") {
    return dailyPromptText(messages, input.cards, input.question, input.locale);
  }
  if (input.spread === "three") {
    return threePromptText(messages, input.cards, input.question, input.locale);
  }
  return fivePromptText(messages, input.cards, input.question, input.locale);
}
