import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import OrnamentRule from "@/components/ds/OrnamentRule";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CARDS, getCardById } from "@/data/cards";
import type { CardMeaning, CardPair } from "@/content/deck/types";
import { CARD_MEANINGS as EN_MEANINGS } from "@/content/deck/card-meanings.en";
import { CARD_MEANINGS as ZH_TW_MEANINGS } from "@/content/deck/card-meanings.zh-TW";
import { CARD_PAIRS as EN_PAIRS } from "@/content/deck/card-pairs.en";
import { CARD_PAIRS as ZH_TW_PAIRS } from "@/content/deck/card-pairs.zh-TW";
import styles from "./page.module.css";

function getMeanings(locale: Locale): CardMeaning[] {
  return locale === "zh-TW" ? ZH_TW_MEANINGS : EN_MEANINGS;
}

function getPairs(locale: Locale): CardPair[] {
  return locale === "zh-TW" ? ZH_TW_PAIRS : EN_PAIRS;
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
  const t = await getTranslations({ locale, namespace: "cards" });
  const name = t(`${card.slug}.name`);
  return {
    title: `${name} · ${String(card.id).padStart(2, "0")}`,
    description: name,
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

  const meaning = getMeanings(locale as Locale).find((m) => m.id === card.id);
  const pairs = getPairs(locale as Locale)
    .filter((p) => p.first === card.id)
    .slice(0, 5);

  const prevId = card.id === 1 ? CARDS.length : card.id - 1;
  const nextId = card.id === CARDS.length ? 1 : card.id + 1;

  return (
    <main className={styles.main} style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span className={styles.num}>{String(card.id).padStart(2, "0")}</span>
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
          {cardsT(`${card.slug}.name`)}
        </h1>
        <OrnamentRule style={{ margin: "18px 0 0" }} />
      </div>

      <span
        className={styles.image}
        role="img"
        aria-label={cardsT(`${card.slug}.name`)}
        style={{ backgroundImage: `url('${card.image}')` }}
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

      <section className={styles.section}>
        <h2 className={styles.heading}>{t("pairsHeading")}</h2>
        {pairs.length > 0 ? (
          <ul className={styles.pairList}>
            {pairs.map((pair) => {
              const secondCard = getCardById(pair.second);
              return (
                <li key={`${pair.first}-${pair.second}`} className={styles.pairItem}>
                  <div className={styles.pairNames}>
                    <span className={styles.pairSubject}>{cardsT(`${card.slug}.name`)}</span>
                    <span className={styles.pairArrow} aria-hidden="true">
                      →
                    </span>
                    <Link href={`/deck/${secondCard.id}`} className={styles.pairModifier}>
                      {cardsT(`${secondCard.slug}.name`)}
                    </Link>
                  </div>
                  <p className={styles.paragraph}>{pair.text}</p>
                </li>
              );
            })}
          </ul>
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
