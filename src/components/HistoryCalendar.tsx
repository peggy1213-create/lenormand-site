"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getHistory, type Reading } from "@/lib/storage";
import { groupReadingsByLocalDay, localDayKey } from "@/lib/readingCalendar";
import { Row, pillStyle, makeReadingDateFormatter } from "./HistoryList";
import styles from "./HistoryCalendar.module.css";

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type MonthCell = { date: Date; inMonth: boolean };

function buildMonthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: MonthCell[] = [];
  for (let i = startOffset; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }
  return cells;
}

function buildYearMonthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export default function HistoryCalendar() {
  const locale = useLocale();
  const h = useTranslations("history");

  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [mode, setMode] = useState<"month" | "year">("month");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function refresh() {
    setReadings([...getHistory()]);
  }

  useEffect(() => {
    refresh();
  }, []);

  const today = useMemo(() => new Date(), []);
  const grouped = useMemo(() => groupReadingsByLocalDay(readings ?? []), [readings]);
  const dateFormatter = useMemo(() => makeReadingDateFormatter(locale), [locale]);

  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);
  // Jan 1 2023 was a Sunday — used purely as a stable Sun-Sat reference week.
  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekdayFormatter.format(new Date(2023, 0, 1 + i))),
    [weekdayFormatter],
  );
  const monthLabelFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }), [locale]);
  const monthShortFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short" }), [locale]);
  const fullDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "long" }), [locale]);

  function goPrev() {
    setViewDate((d) =>
      mode === "year" ? new Date(d.getFullYear() - 1, d.getMonth(), 1) : new Date(d.getFullYear(), d.getMonth() - 1, 1),
    );
  }
  function goNext() {
    setViewDate((d) =>
      mode === "year" ? new Date(d.getFullYear() + 1, d.getMonth(), 1) : new Date(d.getFullYear(), d.getMonth() + 1, 1),
    );
  }

  const monthCells = useMemo(() => buildMonthCells(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const monthHasAnyReading = monthCells.some((c) => c.inMonth && grouped.has(localDayKey(c.date)));

  const selectedReadings = selectedDay
    ? [...(grouped.get(selectedDay) ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  if (readings && readings.length === 0) {
    return <p className={styles.emptyNote}>{h("calendar.emptyAll")}</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
        <div style={{ display: "inline-flex", gap: 10 }}>
          <button type="button" style={pillStyle(mode === "month" ? "gilt" : "ghost")} onClick={() => setMode("month")}>
            {h("calendar.monthView")}
          </button>
          <button type="button" style={pillStyle(mode === "year" ? "gilt" : "ghost")} onClick={() => setMode("year")}>
            {h("calendar.yearView")}
          </button>
        </div>
      </div>

      <div className={styles.head}>
        <button type="button" className={styles.navButton} onClick={goPrev} aria-label={h("calendar.prev")}>
          ‹
        </button>
        <h2 className={styles.monthLabel}>
          {mode === "year" ? viewDate.getFullYear() : monthLabelFormatter.format(viewDate)}
        </h2>
        <button type="button" className={styles.navButton} onClick={goNext} aria-label={h("calendar.next")}>
          ›
        </button>
      </div>

      {mode === "month" ? (
        <>
          <div className={styles.weekdayRow}>
            {weekdayLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          <div className={styles.monthGrid}>
            {monthCells.map((cell, i) => {
              const key = localDayKey(cell.date);
              const dayReadings = cell.inMonth ? grouped.get(key) : undefined;
              const hasReading = !!dayReadings && dayReadings.length > 0;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!hasReading}
                  className={cx(
                    styles.dayCell,
                    !cell.inMonth && styles.dayCellOut,
                    hasReading && styles.dayCellHasReading,
                    selectedDay === key && styles.dayCellSelected,
                    isSameLocalDay(cell.date, today) && styles.dayCellToday,
                  )}
                  aria-label={hasReading ? `${fullDateFormatter.format(cell.date)} — ${dayReadings!.length}` : undefined}
                  onClick={hasReading ? () => setSelectedDay(key) : undefined}
                >
                  <span className={styles.dayNum}>{cell.date.getDate()}</span>
                  {hasReading && <span className={styles.cornerFold} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {readings && !monthHasAnyReading && <p className={styles.emptyNote}>{h("calendar.emptyMonth")}</p>}
        </>
      ) : (
        <div className={styles.yearStrip}>
          {Array.from({ length: 12 }, (_, m) => m).map((m) => {
            const year = viewDate.getFullYear();
            const cells = buildYearMonthCells(year, m);
            return (
              <div key={m} className={styles.yearMonth}>
                <span className={styles.yearMonthLabel}>{monthShortFormatter.format(new Date(year, m, 1))}</span>
                <div className={styles.yearGrid}>
                  {cells.map((date, i) => {
                    if (!date) return <div key={i} className={cx(styles.yearCell, styles.yearCellBlank)} />;
                    const key = localDayKey(date);
                    const dayReadings = grouped.get(key);
                    const hasReading = !!dayReadings && dayReadings.length > 0;
                    if (!hasReading) {
                      return (
                        <div
                          key={i}
                          className={cx(styles.yearCell, isSameLocalDay(date, today) && styles.yearCellToday)}
                          title={fullDateFormatter.format(date)}
                        />
                      );
                    }
                    return (
                      <button
                        key={i}
                        type="button"
                        className={cx(
                          styles.yearCell,
                          styles.yearCellHasReading,
                          selectedDay === key && styles.yearCellSelected,
                          isSameLocalDay(date, today) && styles.yearCellToday,
                        )}
                        title={`${fullDateFormatter.format(date)} — ${dayReadings!.length}`}
                        onClick={() => setSelectedDay(key)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.detail}>
        {selectedDay && selectedReadings.length > 0 ? (
          <>
            <div className={styles.detailHead}>
              <h3>{fullDateFormatter.format(new Date(selectedDay + "T00:00:00"))}</h3>
              {selectedReadings.length > 1 && (
                <span className={styles.detailCount}>{h("calendar.readingsOnDay", { count: selectedReadings.length })}</span>
              )}
            </div>
            <div className={styles.stack}>
              {selectedReadings.map((reading, i) => (
                <div
                  key={reading.id}
                  style={
                    selectedReadings.length > 1
                      ? { transform: `rotate(${i % 2 === 0 ? "-0.5deg" : "0.4deg"})` }
                      : undefined
                  }
                >
                  <Row reading={reading} dateFormatter={dateFormatter} onChanged={refresh} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.emptyNote}>{h("calendar.selectDayHint")}</p>
        )}
      </div>
    </div>
  );
}
