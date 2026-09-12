import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import { Link } from "@/i18n/navigation";
import { buildAlternates } from "@/lib/seo";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "learning" });
  return { title: t("title"), alternates: buildAlternates(locale, "/learning") };
}

export default async function LearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learning");

  const sections = [
    {
      href: "/learn/what-is-lenormand",
      title: t("whatIsLenormandTitle"),
      description: t("whatIsLenormandDescription"),
    },
    {
      href: "/deck",
      title: t("exploreDeckTitle"),
      description: t("exploreDeckDescription"),
    },
  ] as const;

  return (
    <main className={styles.main} style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 44px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 40,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-900)",
            margin: 0,
          }}
        >
          {t("title")}
        </h1>
        <OrnamentRule motif="✦" style={{ margin: "20px 0 0" }} />
      </div>

      <div className={styles.grid}>
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className={styles.card}>
            <div className={styles.glowFrame} />
            <h2 className={styles.cardTitle}>{section.title}</h2>
            <p className={styles.cardDescription}>{section.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
