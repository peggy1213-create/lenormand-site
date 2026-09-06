import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { CARDS } from "@/data/cards";
import { localizedUrl } from "@/lib/seo";

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
  { path: "/learning", priority: 0.6, changeFrequency: "monthly" },
  { path: "/learn/what-is-lenormand", priority: 0.6, changeFrequency: "monthly" },
  { path: "/deck", priority: 0.7, changeFrequency: "monthly" },
  ...CARDS.map((card): PageDef => ({
    path: `/deck/${card.id}`,
    priority: 0.6,
    changeFrequency: "monthly",
  })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  // Single build-time timestamp; refreshes on each deploy.
  const lastModified = new Date();

  return pages.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, page.path),
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, localizedUrl(l, page.path)]),
        ),
      },
    })),
  );
}
