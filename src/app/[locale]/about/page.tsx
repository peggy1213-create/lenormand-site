import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import styles from "./page.module.css";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const body = t.raw("body") as string[];

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
          padding: "32px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {body.map((paragraph, i) => (
          <p key={i} style={{ fontSize: 18, lineHeight: 1.6, color: "var(--text-body)", margin: 0 }}>
            {paragraph}
          </p>
        ))}
      </div>
    </main>
  );
}
