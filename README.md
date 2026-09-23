This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Free reading tier (Cloudflare Workers AI)

Visitors without their own API key get a small number of free AI readings per
day, served by Cloudflare Workers AI and metered in D1. Defaults: **2 per
visitor/day**, 8 per IP/day, 200 site-wide/day (tune the `vars` in
`wrangler.jsonc`). A Cloudflare Turnstile check gates each free reading.

One-time setup:

1. **Create the D1 database** and paste the returned id into `wrangler.jsonc`
   (`d1_databases[0].database_id`):

   ```bash
   npx wrangler d1 create lenormand-free
   ```

2. **Apply the schema** (local for `next dev`, remote for production):

   ```bash
   npx wrangler d1 migrations apply lenormand-free --local
   npx wrangler d1 migrations apply lenormand-free --remote
   ```

3. **Create a Turnstile widget** in the Cloudflare dashboard (Turnstile → Add
   site). Put the **site key** in the build environment as
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (e.g. in `.env.local` for dev and in the
   deploy build env), and set the **secret key** and a random hash salt as
   Worker secrets:

   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put ANON_HASH_SALT
   ```

   For local dev, add the same two to a `.dev.vars` file so
   `getCloudflareContext()` can read them.

Privacy: the free tier stores only opaque counters — an anonymous visitor
UUID (HttpOnly cookie), a salted hash of the IP, and daily counts. Prompts,
replies, and raw IPs are never persisted, matching the bring-your-own-key
relay. Note: free readings run during `next dev` hit the real Workers AI
service and consume real quota.
