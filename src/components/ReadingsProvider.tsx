"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getHistory,
  getTombstones,
  applyMergedHistory,
  addReading as addLocalReading,
  updateReadingNote as updateLocalNote,
  updateReadingApiText as updateLocalApiText,
  updateReadingApiFollowUps as updateLocalApiFollowUps,
  updateReadingTags as updateLocalTags,
  deleteReadings as deleteLocalReadings,
  hasDrawnDailyToday as checkLocalDailyToday,
  type Reading,
  type ApiFollowUp,
  type Tombstone,
} from "@/lib/storage";

type ReadingsContextType = {
  readings: Reading[];
  loading: boolean;
  addReading: (input: Omit<Reading, "id" | "createdAt">) => Reading;
  updateNote: (id: string, notes: string) => void;
  updateApiText: (id: string, apiReadingText: string) => void;
  updateApiFollowUps: (id: string, apiFollowUps: ApiFollowUp[]) => void;
  updateTags: (id: string, tags: string[]) => void;
  removeReadings: (ids: string[]) => void;
  hasDrawnDailyToday: () => boolean;
  getAllTags: () => string[];
  refresh: () => void;
};

const ReadingsContext = createContext<ReadingsContextType | null>(null);

export function useReadings() {
  const ctx = useContext(ReadingsContext);
  if (!ctx) throw new Error("useReadings must be used within ReadingsProvider");
  return ctx;
}

type ServerReading = { id: string; data: Reading; updatedAt: string };
type ServerTombstone = { id: string; deletedAt: string };
const SYNC_DEBOUNCE_MS = 1200;

function sortDesc(list: Reading[]): Reading[] {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function tsOf(iso: string | undefined): number {
  return iso ? Date.parse(iso) || 0 : 0;
}

// Merge the server's authoritative state into local storage, last-write-wins by
// timestamp with tombstones. Persists via applyMergedHistory (localStorage).
function mergeServerState(
  serverReadings: ServerReading[],
  serverTombstones: ServerTombstone[],
): void {
  const live = new Map<string, Reading>(getHistory().map((r) => [r.id, r]));
  const tombs = new Map<string, Tombstone>(getTombstones().map((t) => [t.id, t]));

  for (const st of serverTombstones) {
    const stTs = tsOf(st.deletedAt);
    const l = live.get(st.id);
    if (l && tsOf(l.updatedAt ?? l.createdAt) > stTs) continue;
    live.delete(st.id);
    const ex = tombs.get(st.id);
    if (!ex || tsOf(ex.deletedAt) < stTs) tombs.set(st.id, st);
  }
  for (const sr of serverReadings) {
    const srTs = tsOf(sr.updatedAt);
    const tomb = tombs.get(sr.id);
    if (tomb && tsOf(tomb.deletedAt) >= srTs) continue;
    const l = live.get(sr.id);
    if (!l || srTs > tsOf(l.updatedAt ?? l.createdAt)) {
      live.set(sr.id, { ...sr.data, id: sr.id, updatedAt: sr.updatedAt });
      tombs.delete(sr.id);
    }
  }
  applyMergedHistory(Array.from(live.values()), Array.from(tombs.values()));
}

export default function ReadingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  const userIdRef = useRef<string | null>(user?.id ?? null);
  userIdRef.current = user?.id ?? null;
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshFromLocal = useCallback(() => {
    setReadings(sortDesc(getHistory()));
  }, []);

  // Push local readings + tombstones to D1 and merge the authoritative response
  // back. Full-state push (server de-dupes by last-write-wins); only runs for
  // signed-in users. Offline/transient failures are ignored and retried on the
  // next change.
  const syncNow = useCallback(async () => {
    if (!userIdRef.current) return;
    if (syncingRef.current) {
      pendingRef.current = true;
      return;
    }
    syncingRef.current = true;
    try {
      const body = {
        readings: getHistory().map((r) => ({
          id: r.id,
          data: r,
          updatedAt: r.updatedAt ?? r.createdAt,
        })),
        tombstones: getTombstones(),
      };
      const res = await fetch("/api/history/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        readings?: ServerReading[];
        tombstones?: ServerTombstone[];
      };
      mergeServerState(data.readings ?? [], data.tombstones ?? []);
      setReadings(sortDesc(getHistory()));
    } catch {
      // offline / transient — a later change retries
    } finally {
      syncingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void syncNow();
      }
    }
  }, []);

  const scheduleSync = useCallback(() => {
    if (!userIdRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void syncNow(), SYNC_DEBOUNCE_MS);
  }, [syncNow]);

  // Push immediately, cancelling any pending debounce. Used for important,
  // infrequent writes (a finished AI reading) and when the page is hidden, so a
  // short debounce window can't drop the write if the user navigates away.
  const flushSync = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void syncNow();
  }, [syncNow]);

  // Load local immediately; when signed in (or on sign-in), sync with D1. This
  // also merges any pre-login local readings into the account on first sign-in.
  useEffect(() => {
    refreshFromLocal();
    setLoading(false);
    if (user?.id) void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Flush a pending sync when the tab is backgrounded or the page is unloaded,
  // so a just-finished reading isn't lost if the user leaves before the
  // debounce fires.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushSync);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushSync);
    };
  }, [flushSync]);

  const addReading = useCallback(
    (input: Omit<Reading, "id" | "createdAt">): Reading => {
      const reading = addLocalReading(input);
      setReadings((prev) => sortDesc([reading, ...prev]));
      scheduleSync();
      return reading;
    },
    [scheduleSync],
  );

  const updateNote = useCallback(
    (id: string, notes: string) => {
      updateLocalNote(id, notes);
      setReadings((prev) => prev.map((r) => (r.id === id ? { ...r, notes } : r)));
      scheduleSync();
    },
    [scheduleSync],
  );

  const updateApiText = useCallback(
    (id: string, apiReadingText: string) => {
      updateLocalApiText(id, apiReadingText);
      setReadings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, apiReadingText } : r)),
      );
      flushSync();
    },
    [flushSync],
  );

  const updateApiFollowUps = useCallback(
    (id: string, apiFollowUps: ApiFollowUp[]) => {
      updateLocalApiFollowUps(id, apiFollowUps);
      setReadings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, apiFollowUps } : r)),
      );
      flushSync();
    },
    [flushSync],
  );

  const updateTags = useCallback(
    (id: string, tags: string[]) => {
      updateLocalTags(id, tags);
      setReadings((prev) => prev.map((r) => (r.id === id ? { ...r, tags } : r)));
      scheduleSync();
    },
    [scheduleSync],
  );

  const removeReadings = useCallback(
    (ids: string[]) => {
      deleteLocalReadings(ids);
      const idSet = new Set(ids);
      setReadings((prev) => prev.filter((r) => !idSet.has(r.id)));
      scheduleSync();
    },
    [scheduleSync],
  );

  const hasDrawnDailyToday = useCallback(() => checkLocalDailyToday(), []);

  const getAllTags = useCallback(() => {
    const set = new Set<string>();
    readings.forEach((r) => (r.tags ?? []).forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [readings]);

  return (
    <ReadingsContext.Provider
      value={{
        readings,
        loading,
        addReading,
        updateNote,
        updateApiText,
        updateApiFollowUps,
        updateTags,
        removeReadings,
        hasDrawnDailyToday,
        getAllTags,
        refresh: refreshFromLocal,
      }}
    >
      {children}
    </ReadingsContext.Provider>
  );
}
