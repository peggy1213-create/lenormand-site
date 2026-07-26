// Spread definitions. Position display names live in messages/{locale}.json
// under the keys listed in positionKeys. See docs/spreads.md.

export type SpreadId = "daily" | "line-3" | "line-5";

export type Spread = {
  id: SpreadId;
  cardCount: 2 | 3 | 5;
  positionKeys: string[];
};

export const SPREADS: Spread[] = [
  {
    id: "daily",
    cardCount: 2,
    positionKeys: ["spread.daily.pos1", "spread.daily.pos2"],
  },
  {
    id: "line-3",
    cardCount: 3,
    // Placeholder keys; line-3 position labels actually depend on the
    // chosen frame — see getLine3PositionKeys below.
    positionKeys: [
      "spread.line3.pastPresentFuture.pos1",
      "spread.line3.pastPresentFuture.pos2",
      "spread.line3.pastPresentFuture.pos3",
    ],
  },
  {
    id: "line-5",
    cardCount: 5,
    positionKeys: [
      "spread.line5.pos1",
      "spread.line5.pos2",
      "spread.line5.pos3",
      "spread.line5.pos4",
      "spread.line5.pos5",
    ],
  },
];

export function getSpread(id: SpreadId): Spread {
  const found = SPREADS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown spread id: ${id}`);
  return found;
}

// Line of 3 supports two interpretive frames, chosen before drawing and
// stored with the reading so history replays the same way. See spreads.md.
export type Line3Frame = "past-present-future" | "situation-action-outcome";

export function getLine3PositionKeys(frame: Line3Frame): string[] {
  const frameKey =
    frame === "past-present-future"
      ? "pastPresentFuture"
      : "situationActionOutcome";
  return [1, 2, 3].map((n) => `spread.line3.${frameKey}.pos${n}`);
}
