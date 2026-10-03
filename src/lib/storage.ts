import type { SpreadId } from "@/data/spreads";
import type { Locale } from "@/i18n/routing";

export type ApiFollowUp = { question: string; answer: string };

export type Reading = {
  id: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO — bumped on every edit; drives cross-device sync
  spread: SpreadId;
  question?: string;
  cards: { cardId: number; position: number }[];
  notes?: string;
  tags?: string[];
  lang: Locale;
  apiReadingText?: string; // Markdown reading generated via "Read with your API"
  apiFollowUps?: ApiFollowUp[]; // Follow-up Q&A on the "Read with your API" reading
};

// A deleted reading id, kept so the deletion propagates to other devices.
export type Tombstone = { id: string; deletedAt: string };

const STORAGE_KEY = "lenormand.history";
const TOMBSTONE_KEY = "lenormand.history.tombstones";
const MAX_READINGS = 500;
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // prune tombstones after 90 days
export const MAX_TAGS_PER_READING = 3;
export const MAX_DISTINCT_TAGS = 3;

// A local edit the user made → the sync layer listens for this to push up.
export const HISTORY_CHANGED_EVENT = "lenormand:history-changed";
// The sync layer applied server state → the UI listens for this to refresh.
// (Kept distinct from HISTORY_CHANGED_EVENT so applying server state can't
// re-trigger a push and loop.)
export const HISTORY_SYNCED_EVENT = "lenormand:history-synced";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function emit(name: string): void {
  if (hasWindow()) window.dispatchEvent(new Event(name));
}

function nowIso(): string {
  return new Date().toISOString();
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

export function getTombstones(): Tombstone[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(TOMBSTONE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pruneTombstones(tombs: Tombstone[]): Tombstone[] {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  return tombs.filter((t) => Date.parse(t.deletedAt) >= cutoff);
}

function writeTombstones(tombs: Tombstone[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(pruneTombstones(tombs)));
  } catch {
    // ignore quota errors on the tombstone ledger
  }
}

function addTombstones(ids: string[]): void {
  if (ids.length === 0) return;
  const deletedAt = nowIso();
  const map = new Map(getTombstones().map((t) => [t.id, t]));
  ids.forEach((id) => map.set(id, { id, deletedAt }));
  writeTombstones(Array.from(map.values()));
}

export function addReading(input: Omit<Reading, "id" | "createdAt" | "updatedAt">): Reading {
  const createdAt = nowIso();
  const reading: Reading = {
    ...input,
    id: crypto.randomUUID(),
    createdAt,
    updatedAt: createdAt,
  };

  let next = [reading, ...getHistory()];
  if (next.length > MAX_READINGS) next = next.slice(0, MAX_READINGS);

  if (!writeHistory(next)) {
    // Quota exceeded: drop older readings and retry once.
    const trimmed = next.slice(0, Math.max(1, Math.floor(next.length / 2)));
    writeHistory(trimmed);
  }

  emit(HISTORY_CHANGED_EVENT);
  return reading;
}

function mutate(id: string, patch: (r: Reading) => Reading): void {
  const next = getHistory().map((r) =>
    r.id === id ? { ...patch(r), updatedAt: nowIso() } : r,
  );
  writeHistory(next);
  emit(HISTORY_CHANGED_EVENT);
}

export function updateReadingNote(id: string, notes: string): void {
  mutate(id, (r) => ({ ...r, notes }));
}

export function updateReadingApiText(id: string, apiReadingText: string): void {
  mutate(id, (r) => ({ ...r, apiReadingText }));
}

export function updateReadingApiFollowUps(id: string, apiFollowUps: ApiFollowUp[]): void {
  mutate(id, (r) => ({ ...r, apiFollowUps }));
}

export function updateReadingTags(id: string, tags: string[]): void {
  const capped = tags.slice(0, MAX_TAGS_PER_READING);
  mutate(id, (r) => ({ ...r, tags: capped }));
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  getHistory().forEach((r) => (r.tags ?? []).forEach((tag) => set.add(tag)));
  return Array.from(set);
}

export function deleteReading(id: string): void {
  writeHistory(getHistory().filter((r) => r.id !== id));
  addTombstones([id]);
  emit(HISTORY_CHANGED_EVENT);
}

export function deleteReadings(ids: string[]): void {
  const idSet = new Set(ids);
  writeHistory(getHistory().filter((r) => !idSet.has(r.id)));
  addTombstones(ids);
  emit(HISTORY_CHANGED_EVENT);
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
  const ids = getHistory().map((r) => r.id);
  writeHistory([]);
  addTombstones(ids);
  emit(HISTORY_CHANGED_EVENT);
}

// Used by the sync layer to persist the merged local+server state. Emits the
// SYNCED event (UI refresh) but NOT the CHANGED event, so it can't loop back
// into another push.
export function applyMergedHistory(readings: Reading[], tombstones: Tombstone[]): void {
  const capped = readings
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_READINGS);
  writeHistory(capped);
  writeTombstones(tombstones);
  emit(HISTORY_SYNCED_EVENT);
}
