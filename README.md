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

## Free AI reading tier

Visitors get free AI readings (served by Cloudflare Workers AI, metered in D1),
with two tiers:

- **Anonymous** — up to `FREE_USER_DAILY_CAP` (2) per day, gated by Cloudflare
  Turnstile, tracked by an anonymous cookie with an IP backstop.
- **Signed in** — up to `FREE_AUTH_DAILY_CAP` (3) per day, keyed by user id,
  Turnstile skipped (the account is the gate).

Sign-in (Google via Supabase) is **dev-only**: it appears only when
`NEXT_PUBLIC_ENABLE_AUTH=true` at build time. Production leaves it unset, so
`www.in-betweens.cc` shows the anonymous tier only. `dev.in-betweens.cc`
(built from `master`) sets it to `true`.

### Environments

| | Production (`production` branch → www) | Dev (`master` branch → dev) |
|---|---|---|
| Sign-in | off | on (`NEXT_PUBLIC_ENABLE_AUTH=true`) |
| D1 database | `lenormand-free` | `lenormand-free-dev` |
| Turnstile | real widget | same widget (add the dev hostname) |

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is public and committed in `.env.production`.
The secret key and hash salt are Worker secrets, per environment.

### One-time setup (per environment)

1. Create the D1 database and paste its id into `wrangler.jsonc`
   (`d1_databases[0].database_id`):

   ```bash
   npx wrangler d1 create lenormand-free-dev   # or lenormand-free for prod
   ```

2. Apply the schema (local for `next dev`, remote for the deployed Worker):

   ```bash
   npx wrangler d1 migrations apply <db-name> --local
   npx wrangler d1 migrations apply <db-name> --remote
   ```

3. Set the Worker secrets:

   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put ANON_HASH_SALT
   ```

   For local dev, put the same two in a `.dev.vars` file (gitignored).

4. Add the environment's hostname to the Turnstile widget's allowed hostnames
   in the Cloudflare dashboard.

### Privacy

The free tier stores only opaque counters — an anonymous visitor UUID
(HttpOnly cookie), a salted hash of the IP, per-user counts (signed in), and
daily totals. Prompts, replies, and raw IPs are never persisted. Note: free
readings run during `next dev` hit the real Workers AI service and use real
quota.
