import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-muted/30 bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-4 text-center text-xs text-muted">
        {t("disclaimer")}
      </div>
    </footer>
  );
}
