import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import DrawFlow from "@/components/DrawFlow";
import { buildAlternates } from "@/lib/seo";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale, "/spreads") };
}

export default async function DrawPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("draw");

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 520,
          background: "radial-gradient(120% 90% at 50% 0%, rgba(231,199,137,.30), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <main className={styles.main} style={{ position: "relative", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 52px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 52,
              lineHeight: 1.12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-900)",
              margin: 0,
            }}
          >
            {t("pageHeading")}
          </h1>
          <OrnamentRule motif="✦" style={{ margin: "20px 0 18px" }} />
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 19,
              lineHeight: 1.5,
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            {t("pageLead")}
          </p>
        </div>

        <DrawFlow />
      </main>
    </div>
  );
}
