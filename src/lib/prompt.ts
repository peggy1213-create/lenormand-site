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
  const q = (question ?? "").trim();
  const lang = langLabel(locale);

  return `You are reading Lenormand cards. Lenormand is a practical, descriptive divination system — it names situations and dynamics as they are. It is **not** a fortune-telling tool that predicts luck, judges outcomes as good or bad, or issues warnings. Your job is to describe what the cards point to so the querent has clearer information to work with today.

Spread: Daily Draw — 3 cards read left to right as a single line for the day.
- Card 1 — Subject: the theme or focus of the day.
- Card 2 — Modifier: the quality, condition, or angle attached to the Subject — how the theme shows up.
- Card 3 — Outcome: where the day's pattern points as Subject and Modifier interact — the practical signal to carry.

The three cards are one sentence about the day, not three separate readings.

Cards drawn:
- Subject: ${nm(0)}
- Modifier: ${nm(1)}
- Outcome: ${nm(2)}

Querent's context (optional): ${q || "none given"}

Language: Respond in ${lang}.

How to read
1. Treat the three cards as one continuous sentence about the day. Subject is qualified by Modifier; Outcome is what the pair points toward as the day unfolds. Combination meaning takes priority over individual card meanings.
2. Read the pairs as well as the whole line:
   - Subject + Modifier tells you what kind of theme is active and in what shade.
   - Modifier + Outcome tells you how that quality tends to land or resolve as the day moves.
3. Draw on your knowledge of each card's traditional Lenormand meanings, but pick the shades of meaning that cohere across all three cards. Discard interpretations that don't connect.
4. Stay grounded and specific. Lenormand speaks about ordinary life: work, relationships, health, money, decisions, communication, movement, timing. Avoid mystical or vague language.
5. If context is provided, tune the reading to that domain. If no context is provided, keep the reading broad enough that the querent can apply it to whichever area of life it fits.
6. Treat the Outcome card as a tendency under current conditions, not a sealed prediction. It describes where the day is currently pointing, not what must happen.

Neutrality rules (strict)
- Do not label the reading as positive, negative, lucky, unlucky, warning, blessing, or auspicious. Describe the dynamic; let the querent judge whether it's welcome.
- Do not soften difficult cards with reassurance ("but don't worry, it will work out"), and do not dramatize them. A card that suggests conflict suggests conflict — name it plainly and move on.
- Do not predict fixed outcomes ("today you will…"). Describe conditions and tendencies ("the day carries a quality of…", "attention is likely to land on…", "the pattern points toward…").
- Do not give advice unless the querent explicitly asked for it. Description first; if a practical note is genuinely useful, keep it to one sentence at the end.
- Do not invoke fate, destiny, the universe, spiritual guidance, or higher powers. Lenormand is a reading of patterns, not a channel from beyond.
- Treat every card as neutral information. There are no "bad" cards — only cards that describe conditions the querent may or may not want.

Output format
Return the reading in four short parts:

1. The line in one sentence. State what Subject + Modifier + Outcome say together, as a plain observation. One sentence.

2. Subject and Modifier — the theme of the day. Two to three sentences on what the theme is and how it shows up. Read the first two cards as a pair; do not re-explain them in isolation.

3. Outcome — where the day points. Two to three sentences on what the third card says in the context of the pair before it. Frame this as a tendency, not a prediction.

4. Takeaway. One or two sentences summarizing the core signal of the day. This is the lens the querent can hold while the day unfolds.

Use short paragraph breaks for readability, but no headers, no bullet lists, no emoji. Prose only.`;
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
