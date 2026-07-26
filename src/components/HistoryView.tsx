"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  getHistory,
  clearHistory,
  exportHistoryJson,
  isStoragePersistable,
  type Reading,
} from "@/lib/storage";
import ReadingReplay from "./ReadingReplay";

const NOTICE_SEEN_KEY = "lenormand.historyNoticeSeen";

function spreadNamespace(id: Reading["spread"]): "daily" | "line3" | "line5" {
  if (id === "daily") return "daily";
  if (id === "line-3") return "line3";
  return "line5";
}

export default function HistoryView() {
  const locale = useLocale();
  const h = useTranslations("history");
  const s = useTranslations("spread");

  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [persistable, setPersistable] = useState(true);

  function refresh() {
    const list = [...getHistory()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setReadings(list);
  }

  useEffect(() => {
    refresh();
    setPersistable(isStoragePersistable());
    try {
      const seen = window.localStorage.getItem(NOTICE_SEEN_KEY);
      if (!seen) {
        setShowNotice(true);
        window.localStorage.setItem(NOTICE_SEEN_KEY, "1");
      }
    } catch {
      setShowNotice(true);
    }
  }, []);

  function handleClearAll() {
    if (!window.confirm(h("confirmClearAll"))) return;
    clearHistory();
    refresh();
    setExpandedId(null);
  }

  function handleExport() {
    const json = exportHistoryJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lenormand-history.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{h("title")}</h1>
        {readings && readings.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded border border-muted/40 px-3 py-1.5 text-sm text-ink hover:bg-white"
            >
              {h("exportJsonButton")}
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded border border-muted/40 px-3 py-1.5 text-sm text-muted hover:border-rust hover:text-rust"
            >
              {h("clearAllButton")}
            </button>
          </div>
        )}
      </div>

      {showNotice && (
        <p className="mt-3 rounded bg-sage/10 p-3 text-sm text-ink">{h("firstVisitNotice")}</p>
      )}
      {!persistable && (
        <p className="mt-3 rounded bg-rust/10 p-3 text-sm text-ink">{h("incognitoWarning")}</p>
      )}

      {readings && readings.length === 0 && (
        <p className="mt-6 text-sm text-muted">{h("empty")}</p>
      )}

      <ul className="mt-4 space-y-2">
        {readings?.map((reading) => (
          <li key={reading.id} className="rounded-lg border border-muted/30 bg-white/30">
            <button
              type="button"
              onClick={() =>
                setExpandedId((prev) => (prev === reading.id ? null : reading.id))
              }
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-ink">
                  {s(`${spreadNamespace(reading.spread)}.name`)}
                </span>
                <span className="text-xs text-muted">
                  {dateFormatter.format(new Date(reading.createdAt))} ·{" "}
                  {reading.question || h("questionPreviewNone")}
                </span>
              </span>
              <span className="text-sm text-rust">{h("replayButton")}</span>
            </button>
            {expandedId === reading.id && (
              <div className="px-4 pb-4">
                <ReadingReplay
                  reading={reading}
                  onChanged={refresh}
                  onDeleted={() => {
                    refresh();
                    setExpandedId(null);
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
