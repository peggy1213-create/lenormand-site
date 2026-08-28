"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./Changelog.module.css";

type Entry = { date: string; text: string };

// Bump is implicit: whenever the newest entry's date changes, returning
// visitors see the panel once. Stored per browser; private mode just
// means it opens again next session.
const SEEN_STORAGE_KEY = "lenormand.changelogSeen";

export default function Changelog() {
  const t = useTranslations("changelog");
  const [open, setOpen] = useState(false);
  const entries = t.raw("entries") as Entry[];
  const latestDate = entries[0]?.date ?? "";

  // Auto-open once when the newest update is newer than what this browser
  // has already acknowledged. Skipped on the very first visit ever (no
  // stored value) so we don't greet brand-new users with a changelog.
  useEffect(() => {
    if (!latestDate) return;
    try {
      const seen = window.localStorage.getItem(SEEN_STORAGE_KEY);
      if (seen && seen !== latestDate) setOpen(true);
      if (!seen) window.localStorage.setItem(SEEN_STORAGE_KEY, latestDate);
    } catch {
      // localStorage unavailable (private mode) — nothing to persist.
    }
  }, [latestDate]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(SEEN_STORAGE_KEY, latestDate);
    } catch {
      // localStorage unavailable (private mode).
    }
  }

  return (
    <div className={styles.trigger}>
      <button type="button" className={styles.triggerButton} onClick={() => setOpen(true)}>
        {t("buttonLabel")}
        {latestDate && <span className={styles.triggerDate}>{latestDate}</span>}
      </button>

      {open && (
        <div className={styles.overlay} onClick={close} role="presentation">
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.close} onClick={close} aria-label={t("close")}>
              {t("close")}
            </button>
            <h2 className={styles.title}>{t("title")}</h2>
            <hr className={styles.rule} />
            <ul className={styles.list}>
              {entries.map((entry) => (
                <li key={entry.date + entry.text} className={styles.entry}>
                  <span className={styles.date}>{entry.date}</span>
                  <p className={styles.text}>{entry.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
