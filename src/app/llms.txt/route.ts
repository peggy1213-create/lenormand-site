import { BASE_URL } from "@/lib/seo";

// Serve /llms.txt — a plain-text map of the site for AI answer engines and
// LLM crawlers (the emerging llmstxt.org convention). Kept static to avoid
// Worker cold-start latency, mirroring sitemap.xml.
export const dynamic = "force-static";

const BODY = `# In-Betweens — Lenormand Card Readings

> In-Betweens is a free, account-free Lenormand card reading site. Draw a spread, get a free AI-powered interpretation (no signup and no API key required), and keep a private reading history stored in your own browser. Available in English and Traditional Chinese (zh-TW).

## Readings
- [Draw a spread](${BASE_URL}/spreads): Pick a Lenormand spread, draw your cards, and get a free AI reading of the story they tell — one question at a time.
- [Free AI reading](${BASE_URL}/aireading): How the free daily AI readings work, plus the option to bring your own Anthropic, OpenAI, or Gemini API key. Questions stay private in the browser.
- [Your readings](${BASE_URL}/history): A private, browser-stored history of past spreads, with space for reflections on how things unfolded.

## Learn Lenormand
- [What is Lenormand?](${BASE_URL}/learn/what-is-lenormand): An introduction to the Lenormand deck, where it comes from, and how it differs from tarot.
- [Learning Lenormand](${BASE_URL}/learning): An overview of how to read the cards and how they combine.
- [Deck reference — all 36 cards](${BASE_URL}/deck): Meanings and combinations for every one of the 36 Lenormand cards.

## About
- [About In-Betweens](${BASE_URL}/about): What the site is, and the ideas behind a calm, account-free reading space.
`;

export function GET(): Response {
  return new Response(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
