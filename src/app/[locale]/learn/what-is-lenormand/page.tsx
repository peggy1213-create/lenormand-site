import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { WHAT_IS_LENORMAND as EN_CONTENT } from "@/content/learn/what-is-lenormand.en";
import { WHAT_IS_LENORMAND as ZH_TW_CONTENT } from "@/content/learn/what-is-lenormand.zh-TW";
import type { WhatIsLenormandContent } from "@/content/learn/what-is-lenormand.en";
import styles from "./page.module.css";

function getContent(locale: Locale): WhatIsLenormandContent {
  return locale === "zh-TW" ? ZH_TW_CONTENT : EN_CONTENT;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "learn" });
  return { title: t("title") };
}

export default async function WhatIsLenormandPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const tLearning = await getTranslations("learning");
  const content = getContent(locale as Locale);
  const hasContent = content.intro.length > 0 || content.sections.length > 0;

  return (
    <main className={styles.main} style={{ maxWidth: 720, margin: "0 auto" }}>
      <Link href="/learning" className={styles.backToLearning}>
        ← {tLearning("backToLearning")}
      </Link>
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
        }}
      >
        {hasContent ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {content.intro.map((paragraph, i) => (
              <p key={i} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
            {content.sections.map((section, i) => (
              <section key={i} style={{ marginTop: 8 }}>
                <h2 className={styles.sectionHeading}>{section.heading}</h2>
                {section.body.map((paragraph, j) => (
                  <p key={j} className={styles.paragraph}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <p className={styles.pending}>{t("contentPending")}</p>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 36 }}>
        <Link href="/deck" className={styles.deckLink}>
          {t("exploreDeckCta")} →
        </Link>
      </div>
    </main>
  );
}
