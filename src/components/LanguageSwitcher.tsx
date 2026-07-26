"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./LanguageSwitcher.module.css";

const LOCALE_LABELS: Record<string, string> = {
  en: "EN",
  "zh-TW": "繁中",
};

// The routing/middleware persist the choice via the NEXT_LOCALE cookie
// (works during SSR, avoids a hydration flash). We also mirror it to
// localStorage for any client code that wants to read it.
const LOCALE_STORAGE_KEY = "lenormand.locale";

// Floating single-button toggle: shows the *other* locale's label, so
// clicking it switches to that locale (matches the source mockup's FAB).
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");

  const otherLocale = routing.locales.find((l) => l !== locale) ?? locale;

  function handleClick() {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, otherLocale);
    } catch {
      // localStorage unavailable (private mode); cookie-based routing still works.
    }
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <button type="button" onClick={handleClick} className={styles.fab} aria-label={t("language")}>
      {LOCALE_LABELS[otherLocale] ?? otherLocale}
    </button>
  );
}
