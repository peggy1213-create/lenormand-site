# Build & Deploy Guide

Zero-cost path from a fresh repo to a live URL. If this file disagrees with `PRD.md`, the PRD wins.

## Prerequisites

- Node.js 20+ installed locally.
- A GitHub account.
- A Vercel account (free, sign in with GitHub).
- The 36 card PNGs + card back, ready to convert.

## Steps

### 1. Scaffold

```bash
npx create-next-app@latest lenormand \
  --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
cd lenormand
npm install next-intl framer-motion
```

### 2. Convert card images to WebP

Install `cwebp` (part of `libwebp`; on macOS: `brew install webp`), then from the folder containing your source PNGs:

```bash
mkdir -p webp
for f in *.png; do
  cwebp -q 85 -resize 0 800 "$f" -o "webp/${f%.png}.webp"
done
```

`-resize 0 800` resizes to 800px on the longer edge preserving aspect ratio. Copy the resulting `.webp` files into `public/cards/` using the `{NN}-{slug}.webp` naming convention.

### 3. Build the app

Hand `PRD.md`, `deck-data.md`, `spreads.md`, and `ai-prompts.md` to Claude Code and let it scaffold from those. Suggested prompt to start:

> Read PRD.md, deck-data.md, spreads.md, and ai-prompts.md in this folder. Build the MVP described. Start with the file structure in PRD §5.2, then implement the shuffle, the three spreads, the copy-AI-prompt feature, and the history page. Use placeholder card text for now — I'll fill in the final English and Chinese text into the message files myself.

### 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial scaffold"
gh repo create lenormand --public --source=. --push
```

(If you don't have the `gh` CLI, create the repo in the GitHub UI and follow the push instructions there.)

### 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import the GitHub repo.
3. Framework preset: Next.js (auto-detected).
4. No environment variables needed.
5. Deploy.

Vercel builds and gives you a `*.vercel.app` URL within about a minute. Every push to `main` auto-deploys.

## Custom domain (optional, not free)

The `*.vercel.app` URL is free forever. If you want your own domain later, buy one (~$10–15/year) and point it at Vercel — the DNS setup is a two-minute job. Skip this for MVP.

## What stays free

- Vercel Hobby plan: free for personal, non-commercial use. Bandwidth cap is 100 GB/month, which is fine for a card-draw site.
- No database, no serverless functions running on a schedule, no analytics that meter events — you stay firmly inside the free tier.

## What would break the "free" promise later

Just so you know what to avoid:

- Server-side AI calls (LLM API bills money per request).
- Vercel Web Analytics past its free-tier event cap.
- Turning on Vercel's image optimization for very high traffic (has its own cap on the free tier). For this site the images are already optimized WebPs, so skip Next's `<Image>` optimization pipeline and use plain `<img>` or `<Image unoptimized>` to sidestep the cap entirely.

## Post-launch checklist

- [ ] Test on iOS Safari and Android Chrome (real devices, not just DevTools).
- [ ] Confirm private/incognito warning appears.
- [ ] Confirm language switch mid-reading works and history renders correctly across languages.
- [ ] Confirm the AI-prompt button copies the expected string in both languages.
- [ ] Verify the "For entertainment purposes" disclaimer appears in the footer and About page.
