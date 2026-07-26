import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";

export default async function Header() {
  const t = await getTranslations("nav");
  const site = await getTranslations("site");

  return (
    <header className="border-b border-muted/30 bg-cream">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-ink">
          {site("title")}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-rust">
            {t("home")}
          </Link>
          <Link href="/history" className="hover:text-rust">
            {t("history")}
          </Link>
          <Link href="/about" className="hover:text-rust">
            {t("about")}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
