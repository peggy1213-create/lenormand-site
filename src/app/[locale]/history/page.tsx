import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import HistoryView from "@/components/HistoryView";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("history");

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "64px 48px 80px" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 48px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 48,
            lineHeight: 1.12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-900)",
            margin: "14px 0 0",
          }}
        >
          {t("title")}
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
          {t("lead")}
        </p>
        <p
          style={{
            fontFamily: "var(--font-smallcaps)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            fontSize: 11,
            color: "var(--text-subtle)",
            margin: "14px 0 0",
          }}
        >
          {t("savedNotice")}
        </p>
      </div>

      <HistoryView />
    </main>
  );
}
