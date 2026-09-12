import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CARDS, getCardById } from "@/data/cards";
import type { CardMeaning } from "@/content/deck/types";
import { CARD_MEANINGS as EN_MEANINGS } from "@/content/deck/card-meanings.en";
import { CARD_MEANINGS as ZH_TW_MEANINGS } from "@/content/deck/card-meanings.zh-TW";
import { BASE_URL, buildAlternates, localizedUrl } from "@/lib/seo";
import styles from "./page.module.css";

function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function getMeanings(locale: Locale): CardMeaning[] {
  return locale === "zh-TW" ? ZH_TW_MEANINGS : EN_MEANINGS;
}

export function generateStaticParams() {
  return CARDS.map((card) => ({ id: String(card.id) }));
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className={styles.paragraph}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

function parseCardId(id: string): number | null {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1 || numericId > CARDS.length) {
    return null;
  }
  return numericId;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const numericId = parseCardId(id);
  if (numericId === null) return {};

  const card = getCardById(numericId);
  const cardsT = await getTranslations({ locale, namespace: "cards" });
  const deckT = await getTranslations({ locale, namespace: "deck" });
  const name = cardsT(`${card.slug}.name`);
  const number = String(card.id).padStart(2, "0");
  const meaning = getMeanings(locale as Locale).find((m) => m.id === card.id);
  const description = meaning?.meaning
    ? truncate(meaning.meaning)
    : deckT("seoDescriptionFallback", { name, number });
  const title = deckT("seoTitle", { name, number });
  const canonical = localizedUrl(locale, `/deck/${card.id}`);
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/deck/${card.id}`),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      locale,
      images: [{ url: `${BASE_URL}${card.image}`, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}${card.image}`],
    },
  };
}

export default async function DeckCardPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const numericId = parseCardId(id);
  if (numericId === null) {
    notFound();
  }

  const card = getCardById(numericId);
  const t = await getTranslations("deck");
  const cardsT = await getTranslations("cards");
  const tLearning = await getTranslations("learning");

  const meaning = getMeanings(locale as Locale).find((m) => m.id === card.id);

  const prevId = card.id === 1 ? CARDS.length : card.id - 1;
  const nextId = card.id === CARDS.length ? 1 : card.id + 1;

  const name = cardsT(`${card.slug}.name`);
  const number = String(card.id).padStart(2, "0");
  const canonical = localizedUrl(locale, `/deck/${card.id}`);
  const description = meaning?.meaning
    ? truncate(meaning.meaning)
    : t("seoDescriptionFallback", { name, number });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: t("seoTitle", { name, number }),
      description,
      image: `${BASE_URL}${card.image}`,
      inLanguage: locale,
      mainEntityOfPage: canonical,
      url: canonical,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: t("breadcrumbHome"),
          item: localizedUrl(locale, ""),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("breadcrumbDeck"),
          item: localizedUrl(locale, "/deck"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name,
          item: canonical,
        },
      ],
    },
  ];

  return (
    <main className={styles.main} style={{ maxWidth: 720, margin: "0 auto" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/learning" className={styles.backToLearning}>
        ← {tLearning("backToLearning")}
      </Link>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span className={styles.num}>{number}</span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 36,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-900)",
            margin: "6px 0 0",
          }}
        >
          {name}
        </h1>
        <OrnamentRule style={{ margin: "18px 0 0" }} />
      </div>

      <img
        className={styles.image}
        src={card.image}
        alt={t("imageAlt", { name })}
        width={160}
        height={253}
        loading="eager"
      />

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("meaningHeading")}</h2>
        {meaning?.meaning ? (
          <Paragraphs text={meaning.meaning} />
        ) : (
          <p className={styles.pending}>{t("notWrittenYet")}</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("besideHeading")}</h2>
        {meaning?.beside ? (
          <Paragraphs text={meaning.beside} />
        ) : (
          <p className={styles.pending}>{t("notWrittenYet")}</p>
        )}
      </section>

      <nav className={styles.prevNext} aria-label="Card navigation">
        <Link href={`/deck/${prevId}`} className={styles.navLink}>
          ← {t("prevCard")}
        </Link>
        <Link href="/deck" className={styles.backLink}>
          {t("backToDeck")}
        </Link>
        <Link href={`/deck/${nextId}`} className={styles.navLink}>
          {t("nextCard")} →
        </Link>
      </nav>
    </main>
  );
}
