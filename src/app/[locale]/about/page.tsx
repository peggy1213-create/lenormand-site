import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const footer = await getTranslations("footer");
  const body = t.raw("body") as string[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-ink">{t("title")}</h1>
      <div className="mt-4 space-y-4 text-ink">
        {body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-8 border-t border-muted/30 pt-4 text-sm text-muted">
        {footer("disclaimer")}
      </p>
    </div>
  );
}
