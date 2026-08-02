import type { Reading } from "./storage";

// Local-time day key ("YYYY-MM-DD"), matching the local-day convention
// storage.ts already uses for the daily-draw lock (see isSameLocalDay).
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function groupReadingsByLocalDay(readings: Reading[]): Map<string, Reading[]> {
  const map = new Map<string, Reading[]>();
  for (const reading of readings) {
    const key = localDayKey(new Date(reading.createdAt));
    const list = map.get(key);
    if (list) list.push(reading);
    else map.set(key, [reading]);
  }
  return map;
}
