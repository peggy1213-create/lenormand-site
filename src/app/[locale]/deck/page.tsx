import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import { Link } from "@/i18n/navigation";
import { CARDS } from "@/data/cards";
import DeckViewer from "@/components/deck/DeckViewer";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "deck" });
  return { title: t("title") };
}

export default async function DeckIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("deck");
  const tLearning = await getTranslations("learning");

  return (
    <main className={styles.main} style={{ maxWidth: 980, margin: "0 auto" }}>
      <Link href="/learning" className={styles.backToLearning}>
        ← {tLearning("backToLearning")}
      </Link>
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

      <DeckViewer cards={CARDS} />
    </main>
  );
}
