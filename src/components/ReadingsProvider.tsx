"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  fetchReadings,
  upsertReading,
  updateReadingField,
  deleteReadingsFromDb,
} from "@/lib/supabase/readings";
import {
  getHistory,
  addReading as addLocalReading,
  updateReadingNote as updateLocalNote,
  updateReadingApiText as updateLocalApiText,
  updateReadingApiFollowUps as updateLocalApiFollowUps,
  updateReadingTags as updateLocalTags,
  deleteReadings as deleteLocalReadings,
  hasDrawnDailyToday as checkLocalDailyToday,
  type Reading,
  type ApiFollowUp,
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

function mergeReadings(local: Reading[], remote: Reading[]): Reading[] {
  const map = new Map<string, Reading>();
  for (const r of remote) map.set(r.id, r);
  for (const r of local) {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
    } else {
      map.set(r.id, {
        ...existing,
        notes: r.notes ?? existing.notes,
        tags: (r.tags?.length ? r.tags : existing.tags),
        apiReadingText: r.apiReadingText ?? existing.apiReadingText,
        apiFollowUps: (r.apiFollowUps?.length ? r.apiFollowUps : existing.apiFollowUps),
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export default function ReadingsProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(user);
  userRef.current = user;

  const loadReadings = useCallback(() => {
    const local = getHistory();
    setReadings(
      [...local].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
    setLoading(false);

    if (user) {
      const supabase = createClient();
      fetchReadings(supabase).then((remote) => {
        const merged = mergeReadings(local, remote);
        setReadings(merged);

        // Upload any local-only readings to Supabase
        const remoteIds = new Set(remote.map((r) => r.id));
        const localOnly = local.filter((r) => !remoteIds.has(r.id));
        for (const r of localOnly) {
          upsertReading(supabase, user.id, r);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const addReading = useCallback(
    (input: Omit<Reading, "id" | "createdAt">): Reading => {
      const reading = addLocalReading(input);
      setReadings((prev) => [reading, ...prev]);

      if (userRef.current) {
        const supabase = createClient();
        upsertReading(supabase, userRef.current.id, reading);
      }

      return reading;
    },
    [],
  );

  const updateNote = useCallback((id: string, notes: string) => {
    updateLocalNote(id, notes);
    setReadings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, notes } : r)),
    );

    if (userRef.current) {
      const supabase = createClient();
      updateReadingField(supabase, id, { notes: notes || null });
    }
  }, []);

  const updateApiText = useCallback((id: string, apiReadingText: string) => {
    updateLocalApiText(id, apiReadingText);
    setReadings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, apiReadingText } : r)),
    );

    if (userRef.current) {
      const supabase = createClient();
      updateReadingField(supabase, id, { api_reading_text: apiReadingText || null });
    }
  }, []);

  const updateApiFollowUps = useCallback(
    (id: string, apiFollowUps: ApiFollowUp[]) => {
      updateLocalApiFollowUps(id, apiFollowUps);
      setReadings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, apiFollowUps } : r)),
      );

      if (userRef.current) {
        const supabase = createClient();
        updateReadingField(supabase, id, {
          api_follow_ups: apiFollowUps.length ? apiFollowUps : null,
        });
      }
    },
    [],
  );

  const updateTags = useCallback((id: string, tags: string[]) => {
    updateLocalTags(id, tags);
    setReadings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, tags } : r)),
    );

    if (userRef.current) {
      const supabase = createClient();
      updateReadingField(supabase, id, { tags });
    }
  }, []);

  const removeReadings = useCallback((ids: string[]) => {
    deleteLocalReadings(ids);
    const idSet = new Set(ids);
    setReadings((prev) => prev.filter((r) => !idSet.has(r.id)));

    if (userRef.current) {
      const supabase = createClient();
      deleteReadingsFromDb(supabase, ids);
    }
  }, []);

  const hasDrawnDailyToday = useCallback(() => {
    return checkLocalDailyToday();
  }, []);

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
        refresh: loadReadings,
      }}
    >
      {children}
    </ReadingsContext.Provider>
  );
}
