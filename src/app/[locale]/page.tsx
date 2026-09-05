import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ds/Button";
import OrnamentRule from "@/components/ds/OrnamentRule";
import HomeDeckTeaser from "@/components/HomeDeckTeaser";
import PresentMoment from "@/components/PresentMoment";
import { buildAlternates } from "@/lib/seo";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale) };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 620,
          background: "radial-gradient(120% 90% at 50% 0%, rgba(231,199,137,.34), transparent 72%)",
          pointerEvents: "none",
        }}
      />

      <main className={styles.heroMain}>
        <div>
          <p
            style={{
              fontFamily: "var(--font-smallcaps)",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              fontSize: 12,
              color: "var(--gold-500)",
              margin: 0,
            }}
          >
            Petit Lenormand
          </p>

          <h1
            style={{
              fontFamily: "\"Cinzel\", \"Cormorant Garamond\", Georgia, serif",
              fontWeight: 600,
              fontSize: "clamp(38px, 4.6vw, 62px)",
              lineHeight: 1.12,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--ink-900)",
              margin: "16px 0 0",
              textWrap: "balance",
            }}
          >
            {t("heading")}
          </h1>

          <PresentMoment />

          <div className={styles.ornamentWrap}>
            <OrnamentRule motif="✦" />
          </div>

          <Link href="/spreads" style={{ display: "inline-block", marginTop: 8, textDecoration: "none" }}>
            <Button size="lg">{t("chooseSpreadCta")}</Button>
          </Link>
        </div>

        <HomeDeckTeaser />
      </main>
    </div>
  );
}
