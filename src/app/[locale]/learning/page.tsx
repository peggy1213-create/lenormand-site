import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import styles from "./page.module.css";

export default async function LearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learning");

  return (
    <main className={styles.main} style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
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
        <OrnamentRule style={{ margin: "20px 0 0" }} />
      </div>

      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-hair)",
          borderRadius: 8,
          boxShadow: "var(--shadow-sm)",
          padding: "56px 40px",
          textAlign: "center",
        }}
      >
        <p className={styles.comingSoon}>
          {t("comingSoon")}
          <span className={styles.dots} aria-hidden="true" />
        </p>
      </div>
    </main>
  );
}
