import type { SpreadId } from "@/data/spreads";
import type { Locale } from "@/i18n/routing";

export type Reading = {
  id: string;
  createdAt: string; // ISO
  spread: SpreadId;
  question?: string;
  cards: { cardId: number; position: number }[];
  notes?: string;
  tags?: string[];
  lang: Locale;
  apiReadingText?: string; // Markdown reading generated via "Read with your API"
};

const STORAGE_KEY = "lenormand.history";
const MAX_READINGS = 500;
export const MAX_TAGS_PER_READING = 3;
export const MAX_DISTINCT_TAGS = 3;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

// There's no reliable cross-browser "am I in private mode" flag anymore;
// attempting a real write is the only dependable signal. Old Safari private
// mode throws on the very first write because its quota is ~0.
export function isStoragePersistable(): boolean {
  if (!hasWindow()) return false;
  try {
    const testKey = "__lenormand_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getHistory(): Reading[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(readings: Reading[]): boolean {
  if (!hasWindow()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
    return true;
  } catch {
    return false;
  }
}

export function addReading(input: Omit<Reading, "id" | "createdAt">): Reading {
  const reading: Reading = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  let next = [reading, ...getHistory()];
  if (next.length > MAX_READINGS) next = next.slice(0, MAX_READINGS);

  if (!writeHistory(next)) {
    // Quota exceeded: drop older readings and retry once.
    const trimmed = next.slice(0, Math.max(1, Math.floor(next.length / 2)));
    writeHistory(trimmed);
  }

  return reading;
}

export function updateReadingNote(id: string, notes: string): void {
  const next = getHistory().map((r) => (r.id === id ? { ...r, notes } : r));
  writeHistory(next);
}

export function updateReadingApiText(id: string, apiReadingText: string): void {
  const next = getHistory().map((r) => (r.id === id ? { ...r, apiReadingText } : r));
  writeHistory(next);
}

export function updateReadingTags(id: string, tags: string[]): void {
  const capped = tags.slice(0, MAX_TAGS_PER_READING);
  const next = getHistory().map((r) => (r.id === id ? { ...r, tags: capped } : r));
  writeHistory(next);
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  getHistory().forEach((r) => (r.tags ?? []).forEach((tag) => set.add(tag)));
  return Array.from(set);
}

export function deleteReading(id: string): void {
  writeHistory(getHistory().filter((r) => r.id !== id));
}

export function deleteReadings(ids: string[]): void {
  const idSet = new Set(ids);
  writeHistory(getHistory().filter((r) => !idSet.has(r.id)));
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// "Today" is evaluated in the browser's local timezone (Date's getters are
// local by default), so the daily draw resets at midnight wherever the user is.
export function hasDrawnDailyToday(): boolean {
  const now = new Date();
  return getHistory().some(
    (r) => r.spread === "daily" && isSameLocalDay(new Date(r.createdAt), now),
  );
}

export function clearHistory(): void {
  writeHistory([]);
}
