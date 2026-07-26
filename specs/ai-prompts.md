# AI-Reading Prompt Specification

The site does not call any AI service. Instead, after a reading, the user can tap a button to copy a formatted prompt to their clipboard, which they can paste into ChatGPT, Claude, Gemini, or any other AI service to get a narrative interpretation.

## Where the button lives

Below the drawn spread, next to the "note" and "draw again" controls. Label:

- English: **Copy prompt for AI**
- Traditional Chinese: **複製 AI 解讀提示**

On successful copy, show a brief toast: "Copied" / "已複製".

## What goes into the prompt

Every prompt contains:

1. A framing sentence naming the tradition (Lenormand, not Tarot).
2. The spread name and structure.
3. The user's question, if entered. Otherwise omit that line.
4. Each drawn card with its position, name, and keywords.
5. A reading instruction tailored to the spread.

Keywords (not full meanings) are included so the prompt stays short and the AI has enough context to produce a coherent reading without the site giving away its interpretation.

## Templates

Templates live in the message files (`messages/en.json`, `messages/zh-TW.json`) under a `prompt` namespace, and are assembled by `src/lib/prompt.ts`. Templates use `{placeholder}` tokens.

### Daily (2 cards)

**English:**

```
I drew a 2-card Lenormand daily spread. Please read this as Lenormand, not Tarot — Lenormand cards are read as a pair, where the first card is the subject and the second card modifies it.

{questionLine}

Subject: {card1Name} — keywords: {card1Keywords}
Modifier: {card2Name} — keywords: {card2Keywords}

Give me a short daily reading (2–4 sentences) that reads the pair as one phrase, then briefly explains what to watch for today.
```

**Traditional Chinese:**

```
我抽了一組 Lenormand 每日雙牌。請以 Lenormand（非塔羅）方式解讀 —— Lenormand 牌是成對閱讀的，第一張是主題，第二張是修飾。

{questionLine}

主題：{card1Name} — 關鍵字：{card1Keywords}
修飾：{card2Name} — 關鍵字：{card2Keywords}

請給我一段簡短的每日解讀（2–4 句），先把兩張牌讀成一個短語，再說明今天要留意什麼。
```

### Line of 3

**English:**

```
I drew a 3-card Lenormand line. Please read this as Lenormand, not Tarot — read the cards left to right as a sentence, and connect the pairs (1+2, 2+3) into a narrative.

{questionLine}

Frame: {frameLabel}
Position 1 ({pos1Label}): {card1Name} — keywords: {card1Keywords}
Position 2 ({pos2Label}): {card2Name} — keywords: {card2Keywords}
Position 3 ({pos3Label}): {card3Name} — keywords: {card3Keywords}

Give me a narrative reading (4–6 sentences) that flows from position 1 through to position 3.
```

**Traditional Chinese:**

```
我抽了一組 Lenormand 三牌陣。請以 Lenormand（非塔羅）方式解讀 —— 從左到右把三張牌讀成一句話，並將相鄰的兩張牌（1+2、2+3）串連成敘事。

{questionLine}

框架：{frameLabel}
位置 1（{pos1Label}）：{card1Name} — 關鍵字：{card1Keywords}
位置 2（{pos2Label}）：{card2Name} — 關鍵字：{card2Keywords}
位置 3（{pos3Label}）：{card3Name} — 關鍵字：{card3Keywords}

請給我一段敘事式解讀（4–6 句），從位置 1 流暢串到位置 3。
```

### Line of 5

**English:**

```
I drew a 5-card Lenormand line. Please read this as Lenormand, not Tarot. Card 3 is the anchor — read outward from it. Mirror pairs (1↔5 and 2↔4) may amplify or contradict.

{questionLine}

Position 1 (Distant past): {card1Name} — keywords: {card1Keywords}
Position 2 (Recent past): {card2Name} — keywords: {card2Keywords}
Position 3 (Core / Present): {card3Name} — keywords: {card3Keywords}
Position 4 (Near future): {card4Name} — keywords: {card4Keywords}
Position 5 (Outcome): {card5Name} — keywords: {card5Keywords}

Give me a narrative reading (6–10 sentences): open with the anchor, work outward through the mirror pairs, and close with the outcome.
```

**Traditional Chinese:**

```
我抽了一組 Lenormand 五牌陣。請以 Lenormand（非塔羅）方式解讀。第 3 張是中心錨點 —— 由此向外閱讀。鏡像對（1↔5、2↔4）可能會強化或抵銷彼此。

{questionLine}

位置 1（遠因）：{card1Name} — 關鍵字：{card1Keywords}
位置 2（近因）：{card2Name} — 關鍵字：{card2Keywords}
位置 3（核心／當下）：{card3Name} — 關鍵字：{card3Keywords}
位置 4（近未來）：{card4Name} — 關鍵字：{card4Keywords}
位置 5（結果）：{card5Name} — 關鍵字：{card5Keywords}

請給我一段敘事式解讀（6–10 句）：從錨點開始，向外經過鏡像對，最後收束於結果。
```

## Placeholder handling

- `{questionLine}` — if the user entered a question, this becomes `My question: "…"` (EN) / `我的問題：「…」` (ZH). If no question, the whole line is omitted (no trailing blank line).
- `{frameLabel}`, `{posNLabel}` — pulled from the same message file, so they match the site's current locale.
- `{cardNName}` — localized card name.
- `{cardNKeywords}` — comma-separated keywords, localized.

## Assembly function contract

`src/lib/prompt.ts` exposes one function:

```ts
export function buildAIPrompt(input: {
  spread: 'daily' | 'line-3' | 'line-5';
  cards: Array<{ cardId: number }>;   // in position order
  question?: string;
  frame?: 'past-present-future' | 'situation-action-outcome'; // line-3 only
  locale: 'en' | 'zh-TW';
}): string;
```

Returns the fully assembled string, ready to be written to the clipboard via `navigator.clipboard.writeText`.

## Fallback

If the Clipboard API is unavailable (rare, but possible on old iOS Safari in some contexts), show the prompt in a modal with a "select all" affordance so the user can copy manually.
