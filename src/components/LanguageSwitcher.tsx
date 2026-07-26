"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  en: "EN",
  "zh-TW": "中文",
};

// The routing/middleware persist the choice via the NEXT_LOCALE cookie
// (works during SSR, avoids a hydration flash). We also mirror it to
// localStorage per PRD §3.6, for any client code that wants to read it.
const LOCALE_STORAGE_KEY = "lenormand.locale";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");

  function handleSelect(next: string) {
    if (next === locale) return;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode); cookie-based routing still works.
    }
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("language")}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => handleSelect(l)}
          aria-pressed={l === locale}
          className={`rounded px-2 py-1 text-sm ${
            l === locale ? "bg-gold/40 font-medium text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {LOCALE_LABELS[l] ?? l}
        </button>
      ))}
    </div>
  );
}
