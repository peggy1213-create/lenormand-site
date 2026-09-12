"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./DeckModesTooltip.module.css";

export default function DeckModesTooltip() {
  const t = useTranslations("deckViewer");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-label={t("modesHelpLabel")}
        title={t("modesHelpLabel")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        i
      </button>
      {open && (
        <div
          className={styles.popover}
          role="dialog"
          aria-label={t("modesHelpTitle")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className={styles.title}>{t("modesHelpTitle")}</div>
          <p className={styles.text}>
            <span className={styles.label}>{t("spreadMode")}</span>
            {t("modesHelpSpread")}
          </p>
          <p className={styles.text}>
            <span className={styles.label}>{t("shuffleMode")}</span>
            {t("modesHelpShuffle")}
          </p>
          <p className={styles.footer}>{t("modesHelpFooter")}</p>
        </div>
      )}
    </div>
  );
}
