import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://www.in-betweens.cc";

type PageDef = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

// Public pages only. Excludes API routes and any reading-result view
// (results render client-side inside /spreads, they are not their own route).
const pages: PageDef[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/spreads", priority: 0.8, changeFrequency: "weekly" },
  { path: "/history", priority: 0.5, changeFrequency: "monthly" },
  { path: "/settings", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
];

const localeUrl = (locale: string, path: string) => `${BASE_URL}/${locale}${path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  // Single build-time timestamp; refreshes on each deploy.
  const lastModified = new Date();

  return pages.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: localeUrl(locale, page.path),
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, localeUrl(l, page.path)]),
        ),
      },
    })),
  );
}
