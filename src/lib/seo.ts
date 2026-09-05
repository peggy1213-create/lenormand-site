import { routing } from "@/i18n/routing";

export const BASE_URL = "https://www.in-betweens.cc";

export function localizedUrl(locale: string, path: string = ""): string {
  return `${BASE_URL}/${locale}${path}`;
}

/**
 * Self-referencing canonical + hreflang alternates for a localized page.
 * `path` is locale-agnostic, e.g. "" for home, "/spreads", "/deck/12".
 */
export function buildAlternates(locale: string, path: string = "") {
  return {
    canonical: localizedUrl(locale, path),
    languages: Object.fromEntries(
      routing.locales.map((l) => [l, localizedUrl(l, path)]),
    ),
  };
}
