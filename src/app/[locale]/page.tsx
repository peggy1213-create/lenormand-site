import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SPREADS, type SpreadId } from "@/data/spreads";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const s = await getTranslations("spread");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-ink">{t("heading")}</h1>
      <p className="mt-2 text-muted">{t("subheading")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {SPREADS.map((spread) => (
          <SpreadCard
            key={spread.id}
            id={spread.id}
            name={s(`${spreadNamespace(spread.id)}.name`)}
            description={s(`${spreadNamespace(spread.id)}.description`)}
            cta={t("chooseSpreadCta")}
          />
        ))}
      </div>
    </div>
  );
}

function spreadNamespace(id: SpreadId): "daily" | "line3" | "line5" {
  if (id === "daily") return "daily";
  if (id === "line-3") return "line3";
  return "line5";
}

function SpreadCard({
  id,
  name,
  description,
  cta,
}: {
  id: SpreadId;
  name: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={`/draw/${id}`}
      className="flex flex-col rounded-lg border border-muted/40 bg-white/40 p-4 transition hover:border-gold hover:shadow-sm"
    >
      <h2 className="font-medium text-ink">{name}</h2>
      <p className="mt-1 flex-1 text-sm text-muted">{description}</p>
      <span className="mt-3 text-sm font-medium text-rust">{cta} →</span>
    </Link>
  );
}
