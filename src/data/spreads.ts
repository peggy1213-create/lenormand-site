// Spread definitions. Position display names live in messages/{locale}.json
// under the keys listed in positionKeys.

export type SpreadId = "daily" | "three" | "five" | "nine" | "grand";

export type Spread = {
  id: SpreadId;
  cardCount: 3 | 5 | 9 | 36;
  // Laid-out grid shape; a single row when omitted.
  columns?: number;
  // Listed on the spreads page but not yet drawable.
  comingSoon?: boolean;
  positionKeys: string[];
};

function positionKeys(id: SpreadId, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `spread.${id}.pos${i + 1}`);
}

export const SPREADS: Spread[] = [
  { id: "daily", cardCount: 3, positionKeys: positionKeys("daily", 3) },
  { id: "three", cardCount: 3, positionKeys: positionKeys("three", 3) },
  { id: "five", cardCount: 5, positionKeys: positionKeys("five", 5) },
  { id: "nine", cardCount: 9, columns: 3, positionKeys: positionKeys("nine", 9) },
  // Grand Tableau: the whole deck laid in four rows of nine. Position n is
  // the "house" of card n.
  { id: "grand", cardCount: 36, columns: 9, comingSoon: true, positionKeys: positionKeys("grand", 36) },
];

export function getSpread(id: SpreadId): Spread {
  const found = SPREADS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown spread id: ${id}`);
  return found;
}
