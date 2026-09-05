import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import ApiSettingsForm from "@/components/ApiSettingsForm";
import { buildAlternates } from "@/lib/seo";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale, "/settings") };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");

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

      <section
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-hair)",
          borderRadius: 8,
          boxShadow: "var(--shadow-sm)",
          padding: "32px 40px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 20,
            letterSpacing: "0.04em",
            color: "var(--ink-900)",
            margin: "0 0 8px",
          }}
        >
          {t("apiSectionHeading")}
        </h2>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--text-muted)",
            margin: "0 0 8px",
          }}
        >
          {t("apiSectionLead")}
        </p>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text-subtle)",
            margin: "0 0 28px",
          }}
        >
          {t.rich("apiKeyFreeHint", {
            link: (chunks) => (
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--gold-500)", textDecoration: "underline" }}
              >
                {chunks}
              </a>
            ),
          })}
        </p>

        <ApiSettingsForm />
      </section>
    </main>
  );
}
