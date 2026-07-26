# Lenormand Card Draw Site — PRD

This document is the single source of truth. `deck-data.md`, `spreads.md`, and `ai-prompts.md` expand on specific sections; if any of them disagrees with this PRD, this PRD wins.

## 1. Overview

A lightweight, mobile-first web app for drawing Lenormand cards, reading interpretations, and keeping a personal history of readings — no account, no backend. Bilingual: English and Traditional Chinese.

### 1.1 Goals

- Elegant, low-friction Lenormand reading for beginners and practising readers.
- Functional MVP in ~1 week using AI-assisted development.
- Zero hosting cost.

### 1.2 Non-goals (MVP)

- User accounts, cloud sync, cross-device history.
- Payments or premium tiers.
- Server-side AI interpretations. (The site instead generates a **prompt** the user can copy into their own AI service — see `ai-prompts.md`.)
- Social features.
- Reversed cards.
- Card combination pair library (deferred; the AI-prompt feature covers this need for now).
- PNG export / share-as-image.

## 2. Target users

- Curious beginners exploring Lenormand.
- Practising readers wanting a quick daily draw or distraction-free spread tool.
- Bilingual users in Taiwan and internationally.

## 3. MVP feature scope

### 3.1 Deck

Full 36-card Lenormand deck. Card metadata (language-neutral) lives in code; all human-readable text lives in i18n message files. See `deck-data.md`.

### 3.2 Spreads

Three spreads at launch, all line-based (horizontal rows) for simple mobile layout:

| Spread | Cards | Purpose |
|---|---|---|
| Daily | 2 | Subject + Modifier — quick daily guidance |
| Line of 3 | 3 | Past / Present / Future |
| Line of 5 | 5 | Deeper narrative around a core issue |

See `spreads.md` for position meanings and reading rules.

### 3.3 Interaction flow

1. User picks a spread.
2. (Optional) User types a question.
3. Shuffle animation → user taps to reveal cards one by one, or reveals all.
4. Interpretation panel: position meaning + card meaning per position.
5. Reading auto-saves to history.
6. User can: add a personal note, copy an AI-reading prompt, delete the reading, or draw again.

### 3.4 Copy AI-reading prompt

After a reading, a button copies a formatted prompt to the clipboard that the user can paste into ChatGPT, Claude, Gemini, etc. Prompt text is translatable and per-spread. See `ai-prompts.md`.

### 3.5 Reading history (localStorage)

- Stored under a single key: `lenormand.history`.
- Store `cardId` only (not full card object) so meaning updates propagate to old readings.
- Store `lang` per reading so history stays readable if the user switches language later.
- Cap at 500 readings; trim oldest automatically.
- History page: list newest-first with date, spread, and question preview. Tap to replay the layout and interpretation. Actions: delete one, clear all, export JSON.
- First-visit notice: "Readings are saved only on this device/browser."
- Detect private/incognito mode and warn that history will not persist.

**Reading shape:**

```ts
type Reading = {
  id: string;
  createdAt: string;        // ISO
  spread: 'daily' | 'line-3' | 'line-5';
  question?: string;
  cards: { cardId: number; position: number }[];
  notes?: string;
  lang: 'en' | 'zh-TW';
};
```

### 3.6 Multi-language (i18n)

- Languages at launch: English (`en`), Traditional Chinese (`zh-TW`).
- Library: `next-intl`.
- URL strategy: locale-prefixed routes (`/en/...`, `/zh-TW/...`).
- Language switcher: persistent in header; choice saved to localStorage; defaults to browser language on first visit; falls back to English.
- Switching language mid-reading re-renders the current reading in the new language (safe because we store only `cardId`).
- **Translated:** UI chrome, spread names, position labels, all 36 card names/keywords/meanings, AI-prompt templates, disclaimer, About, history copy.

### 3.7 Other MVP requirements

- Mobile-first responsive layout. Works on iOS Safari, Android Chrome, and desktop evergreen browsers.
- Shuffle + card-flip animation (Framer Motion or CSS transforms).
- Accessibility: keyboard navigation, semantic HTML, alt text, sufficient contrast.
- "For entertainment purposes" disclaimer in the footer and About page.

## 4. Out of scope (v2+)

- Reversed cards.
- Server-side AI narrative interpretations.
- Save reading as image / shareable link.
- Multiple deck skins.
- Additional languages (Simplified Chinese, Japanese, etc.).
- User accounts, cloud sync, PWA install prompt.
- Card combination pair library.
- Grand Tableau (full 36-card spread).

## 5. Technical design

### 5.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | AI-friendly, good DX, free deploy |
| Styling | Tailwind CSS | Fast iteration, well-supported by AI tools |
| Animation | Framer Motion | Smooth card flips/shuffle |
| i18n | next-intl | Clean App Router integration |
| Storage | localStorage (typed wrapper) | Zero-cost, no backend |
| Hosting | Vercel free tier | $0, GitHub auto-deploy |
| Analytics | None at launch | Keep it strictly free; revisit later if needed |

### 5.2 Project structure

```
src/
  app/
    [locale]/
      layout.tsx
      page.tsx              # home
      draw/[spread]/page.tsx
      history/page.tsx
      about/page.tsx
  data/
    cards.ts                # language-neutral card metadata
    spreads.ts              # spread definitions and position keys
  lib/
    storage.ts              # typed localStorage wrapper with quota handling
    shuffle.ts              # Fisher-Yates using crypto.getRandomValues
    prompt.ts               # builds the copy-to-AI prompt string
  components/               # UI components
public/
  cards/
    01-rider.webp
    02-clover.webp
    ...
    36-cross.webp
    back.webp
messages/
  en.json                   # UI + card content in English
  zh-TW.json                # UI + card content in Traditional Chinese
```

### 5.3 Card images

- Source: PNGs provided by the deck owner.
- **Convert to WebP before shipping** (aim for ~30% of the original PNG size at visually lossless quality). Keep PNG originals as source of truth outside `/public/`.
- Longest edge ~800px (retina-friendly on mobile, small total payload).
- Aspect ratio: whatever the source deck uses; keep it consistent across all 36 + back.
- File naming: `/public/cards/{NN}-{slug}.webp` where `NN` is zero-padded 01–36. Card back: `/public/cards/back.webp`.

### 5.4 Shuffle

- Fisher–Yates using `crypto.getRandomValues` for the RNG.
- No card repeats within a spread.
- No reversals (global config).

### 5.5 Colour palette

| Hex | RGB | Suggested role |
|---|---|---|
| `#f7f1e5` | 247,241,229 | Background / cream base |
| `#a38d78` | 163,141,120 | Muted text / borders |
| `#d5b56a` | 213,181,106 | Accent / highlight (drawn card frame) |
| `#7a8b68` | 122,139,104 | Secondary accent |
| `#c96a2d` | 201,106,45 | Primary action / CTA |

Wire these into Tailwind's theme extension so the AI coder uses tokens, not raw hex values scattered through components.

## 6. Content readiness checklist

Before hand-off to Claude Code, the deck owner needs:

- [ ] 36 card images (PNG source) + 1 card back, consistently sized.
- [ ] English text for all 36 cards: name, 3–6 keywords, short meaning (1–2 sentences), long meaning (3–5 sentences).
- [ ] Traditional Chinese text for the same.
- [ ] English + Chinese versions of the "For entertainment purposes" disclaimer and About page copy.

The AI coder can scaffold the app without the final text (use placeholders), but shipping requires the above.
