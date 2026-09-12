"use client";

import { useCallback, useEffect, useState } from "react";

export type DeckMode = "spread" | "shuffle";

const MODE_KEY = "lenormand:deck-mode";
const DRAWN_KEY = "lenormand:drawn-cards";
const LEGACY_STUDIED_KEY = "lenormand:studied-cards";

function readMode(): DeckMode | null {
  try {
    const v = window.localStorage.getItem(MODE_KEY);
    return v === "spread" || v === "shuffle" ? v : null;
  } catch {
    return null;
  }
}

function readDrawn(): number[] {
  try {
    const raw =
      window.localStorage.getItem(DRAWN_KEY) ??
      window.localStorage.getItem(LEGACY_STUDIED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number" && Number.isInteger(n));
  } catch {
    return [];
  }
}

export function useDeckMode(initial: DeckMode = "spread") {
  const [mode, setModeState] = useState<DeckMode>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readMode();
    if (stored) setModeState(stored);
    setHydrated(true);
  }, []);

  const setMode = useCallback((next: DeckMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // ignore quota / disabled storage
    }
  }, []);

  return { mode, setMode, hydrated };
}

function writeDrawn(ids: Set<number>) {
  try {
    if (ids.size === 0) {
      window.localStorage.removeItem(DRAWN_KEY);
    } else {
      window.localStorage.setItem(DRAWN_KEY, JSON.stringify(Array.from(ids)));
    }
    window.localStorage.removeItem(LEGACY_STUDIED_KEY);
  } catch {
    // ignore
  }
}

export function useDrawnCards() {
  const [drawn, setDrawn] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDrawn(new Set(readDrawn()));
    setHydrated(true);
  }, []);

  const addDrawn = useCallback((id: number) => {
    setDrawn((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      writeDrawn(next);
      return next;
    });
  }, []);

  const resetDrawn = useCallback(() => {
    setDrawn(new Set());
    writeDrawn(new Set());
  }, []);

  return { drawn, addDrawn, resetDrawn, hydrated };
}
