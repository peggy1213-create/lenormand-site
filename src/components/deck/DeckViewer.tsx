"use client";

import { useTranslations } from "next-intl";
import type { Card } from "@/data/cards";
import SpreadMode from "./SpreadMode";
import ShuffleMode from "./ShuffleMode";
import DeckModesTooltip from "./DeckModesTooltip";
import { useDeckMode } from "./useDeckState";
import styles from "./DeckViewer.module.css";

export default function DeckViewer({ cards }: { cards: Card[] }) {
  const t = useTranslations("deckViewer");
  const { mode, setMode } = useDeckMode("spread");

  return (
    <>
      <div className={styles.toggleWrap}>
        <div className={styles.toggleRow}>
          <div className={styles.toggle} role="tablist" aria-label={t("modeToggleAria")}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "spread"}
              className={`${styles.toggleButton} ${mode === "spread" ? styles.toggleButtonActive : ""}`}
              onClick={() => setMode("spread")}
            >
              {t("spreadMode")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "shuffle"}
              className={`${styles.toggleButton} ${mode === "shuffle" ? styles.toggleButtonActive : ""}`}
              onClick={() => setMode("shuffle")}
            >
              {t("shuffleMode")}
            </button>
          </div>
          <DeckModesTooltip />
        </div>
      </div>

      {mode === "spread" ? <SpreadMode cards={cards} /> : <ShuffleMode cards={cards} />}
    </>
  );
}
