# Lenormand Site — Spec Bundle

Hand these files to Claude Code (or any AI coding tool) as the source of truth for building the site.

## Files

- **`PRD.md`** — Product requirements. Single source of truth; overrides everything else if there's a conflict.
- **`deck-data.md`** — How the 36-card deck is structured in the codebase.
- **`spreads.md`** — The three spreads: Daily (2), Line of 3, Line of 5.
- **`ai-prompts.md`** — The "copy prompt for AI" feature and its templates in English and Traditional Chinese.
- **`build-and-deploy.md`** — Scaffolding, image conversion, and zero-cost deployment on Vercel.

## Suggested handoff prompt

> Read all five markdown files in this folder. `PRD.md` is the source of truth. Scaffold the Next.js 14 app described in PRD §5.2, then implement: the shuffle in `lib/shuffle.ts`, the three spreads from `spreads.md`, the copy-AI-prompt feature from `ai-prompts.md`, the history page with localStorage from PRD §3.5, and the i18n setup from PRD §3.6. Use placeholder card text in `messages/en.json` and `messages/zh-TW.json` — I'll fill in the final copy myself.

## What you still need to prepare yourself

- 36 card PNGs + card back, consistently sized, ready to convert to WebP.
- English text for all 36 cards (name, keywords, short meaning, long meaning).
- Traditional Chinese text for the same.
- "For entertainment purposes" disclaimer and About-page copy in both languages.
