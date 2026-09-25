import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = await import(
    "@opennextjs/cloudflare"
  );
  initOpenNextCloudflareForDev();
}

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

export default withNextIntl(nextConfig);
