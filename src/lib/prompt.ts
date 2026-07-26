import en from "../../messages/en.json";
import zhTW from "../../messages/zh-TW.json";
import { getCardById } from "@/data/cards";
import type { SpreadId, Line3Frame } from "@/data/spreads";
import type { Locale } from "@/i18n/routing";

type Messages = typeof en;

const MESSAGES: Record<Locale, Messages> = { en, "zh-TW": zhTW };

type CardKey = keyof Messages["cards"];

function cardText(messages: Messages, cardId: number) {
  const slug = getCardById(cardId).slug as CardKey;
  const entry = messages.cards[slug];
  return { name: entry.name, keywords: entry.keywords.join(", ") };
}

function buildQuestionLine(messages: Messages, question?: string): string {
  const trimmed = question?.trim();
  if (!trimmed) return "";
  return messages.prompt.questionLine.replace("{question}", trimmed);
}

// Fills {token} placeholders, then drops any blank-line-separated block that
// ends up empty (this is how the optional question line disappears cleanly
// instead of leaving a stray blank line — see docs/ai-prompts.md).
function fillTemplate(template: string, tokens: Record<string, string>): string {
  const filled = template.replace(/\{(\w+)\}/g, (_, key: string) => tokens[key] ?? "");
  return filled
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .join("\n\n");
}

export function buildAIPrompt(input: {
  spread: SpreadId;
  cards: Array<{ cardId: number }>; // in position order
  question?: string;
  frame?: Line3Frame; // line-3 only
  locale: Locale;
}): string {
  const messages = MESSAGES[input.locale];
  const questionLine = buildQuestionLine(messages, input.question);

  if (input.spread === "daily") {
    const [c1, c2] = input.cards.map((c) => cardText(messages, c.cardId));
    return fillTemplate(messages.prompt.daily.template, {
      questionLine,
      card1Name: c1.name,
      card1Keywords: c1.keywords,
      card2Name: c2.name,
      card2Keywords: c2.keywords,
    });
  }

  if (input.spread === "line-3") {
    const frame: Line3Frame = input.frame ?? "past-present-future";
    const frameKey = frame === "past-present-future" ? "pastPresentFuture" : "situationActionOutcome";
    const frameLabel = messages.spread.line3.frames[frameKey];
    const posLabels = messages.spread.line3[frameKey];
    const [c1, c2, c3] = input.cards.map((c) => cardText(messages, c.cardId));
    return fillTemplate(messages.prompt.line3.template, {
      questionLine,
      frameLabel,
      pos1Label: posLabels.pos1,
      pos2Label: posLabels.pos2,
      pos3Label: posLabels.pos3,
      card1Name: c1.name,
      card1Keywords: c1.keywords,
      card2Name: c2.name,
      card2Keywords: c2.keywords,
      card3Name: c3.name,
      card3Keywords: c3.keywords,
    });
  }

  // line-5
  const pos = messages.spread.line5;
  const [c1, c2, c3, c4, c5] = input.cards.map((c) => cardText(messages, c.cardId));
  return fillTemplate(messages.prompt.line5.template, {
    questionLine,
    pos1Label: pos.pos1,
    pos2Label: pos.pos2,
    pos3Label: pos.pos3,
    pos4Label: pos.pos4,
    pos5Label: pos.pos5,
    card1Name: c1.name,
    card1Keywords: c1.keywords,
    card2Name: c2.name,
    card2Keywords: c2.keywords,
    card3Name: c3.name,
    card3Keywords: c3.keywords,
    card4Name: c4.name,
    card4Keywords: c4.keywords,
    card5Name: c5.name,
    card5Keywords: c5.keywords,
  });
}
