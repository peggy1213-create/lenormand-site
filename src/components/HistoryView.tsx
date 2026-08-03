"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import HistoryList, { pillStyle } from "./HistoryList";
import HistoryCalendar from "./HistoryCalendar";

export default function HistoryView() {
  const h = useTranslations("history");
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 32 }}>
        <button type="button" style={pillStyle(view === "list" ? "gilt" : "ghost")} onClick={() => setView("list")}>
          {h("viewList")}
        </button>
        <button type="button" style={pillStyle(view === "calendar" ? "gilt" : "ghost")} onClick={() => setView("calendar")}>
          {h("viewCalendar")}
        </button>
      </div>

      {view === "list" ? <HistoryList /> : <HistoryCalendar />}
    </div>
  );
}
