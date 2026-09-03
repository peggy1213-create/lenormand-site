"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { currentSolarTerm } from "@/lib/solar-terms";
import styles from "./PresentMoment.module.css";

export default function PresentMoment() {
  const t = useTranslations("present");
  const [today, setToday] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  // Derive the date on the client so a statically generated page never shows
  // a stale build-time date, and re-derive just after the next local midnight
  // so a tab left open overnight rolls over on its own.
  useEffect(() => {
    setToday(new Date());
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      5,
    );
    const timer = window.setTimeout(
      () => setTick((n) => n + 1),
      nextMidnight.getTime() - now.getTime(),
    );
    return () => window.clearTimeout(timer);
  }, [tick]);

  if (!today) return null;

  const weekdays = t.raw("weekdays") as string[];
  const months = t.raw("months") as string[];
  const solarTerms = t.raw("solarTerms") as Record<string, string>;

  const dateText = t("dateFormat", {
    weekday: weekdays[today.getDay()],
    month: months[today.getMonth()],
    day: String(today.getDate()),
    year: String(today.getFullYear()),
  });

  const termKey = currentSolarTerm(today);
  const termText = termKey ? solarTerms[termKey] : null;

  return (
    <p className={styles.wrap}>
      <span className={styles.date}>{dateText}</span>
      {termText && (
        <>
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          <span className={styles.term}>{termText}</span>
        </>
      )}
    </p>
  );
}
