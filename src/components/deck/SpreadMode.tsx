"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Card } from "@/data/cards";
import { useDrawnCards } from "./useDeckState";
import styles from "./DeckViewer.module.css";

export default function SpreadMode({ cards }: { cards: Card[] }) {
  const t = useTranslations("deckViewer");
  const cardsT = useTranslations("cards");
  const { drawn, hydrated } = useDrawnCards();

  return (
    <>
      {hydrated && drawn.size > 0 && (
        <div className={styles.spreadLegendWrap}>
          <p className={styles.spreadLegend} aria-live="polite">
            <span className={styles.spreadLegendMark} aria-hidden="true">
              ✓
            </span>
            {t("spreadLegend", { count: drawn.size, total: cards.length })}
          </p>
        </div>
      )}
      <div className={styles.grid}>
        {cards.map((card) => {
          const isDrawn = hydrated && drawn.has(card.id);
          const name = cardsT(`${card.slug}.name`);
          const ariaLabel = isDrawn ? t("cellDrawnAria", { name }) : name;
          return (
            <Link
              key={card.id}
              href={`/deck/${card.id}`}
              className={styles.cell}
              data-drawn={isDrawn ? "true" : undefined}
              aria-label={ariaLabel}
            >
              <span
                className={styles.cellImage}
                role="img"
                aria-hidden="true"
                style={{ backgroundImage: `url('${card.image}')` }}
              >
                {isDrawn && (
                  <span className={styles.cellDrawnBadge} aria-hidden="true">
                    ✓
                  </span>
                )}
              </span>
              <span className={styles.cellName}>{name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
