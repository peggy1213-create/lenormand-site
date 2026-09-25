import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/learning", destination: "/cards", permanent: true },
      {
        source: "/:locale/learning",
        destination: "/:locale/cards",
        permanent: true,
      },
    ];
  },
};

// Makes the Cloudflare bindings (AI, D1, vars, secrets) available to
// getCloudflareContext() during `next dev`. Note: free-tier readings run in
// dev hit the real Workers AI service and consume real quota.
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
