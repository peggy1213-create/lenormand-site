import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const BASE_URL = "https://www.in-betweens.cc";

function ogLocaleFor(locale: string): string {
  return locale === "zh-TW" ? "zh_TW" : "en_US";
}

export function localizedUrl(locale: string, path: string = ""): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${BASE_URL}${prefix}${path}`;
}

/**
 * Self-referencing canonical + hreflang alternates for a localized page.
 * `path` is locale-agnostic, e.g. "" for home, "/spreads", "/deck/12".
 */
export function buildAlternates(locale: string, path: string = "") {
  return {
    canonical: localizedUrl(locale, path),
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [l, localizedUrl(l, path)]),
      ),
      "x-default": localizedUrl(routing.defaultLocale, path),
    },
  };
}

/**
 * Full per-page metadata (unique title + description + OpenGraph) driven by the
 * `seo` messages namespace. `seoKey` selects `seo.<seoKey>.title` and
 * `seo.<seoKey>.description`. Pass `absoluteTitle` for the home page so the
 * `%s · In-Betweens` title template is not applied on top of a title that
 * already carries the brand.
 */
export async function buildPageMetadata(
  locale: string,
  path: string,
  seoKey: string,
  options: { absoluteTitle?: boolean } = {},
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "seo" });
  const tSite = await getTranslations({ locale, namespace: "site" });
  const title = t(`${seoKey}.title`);
  const description = t(`${seoKey}.description`);
  const alternateLocales = routing.locales
    .filter((l) => l !== locale)
    .map(ogLocaleFor);

  return {
    title: options.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: localizedUrl(locale, path),
      siteName: tSite("title"),
      locale: ogLocaleFor(locale),
      alternateLocale: alternateLocales,
      type: "website",
    },
  };
}
