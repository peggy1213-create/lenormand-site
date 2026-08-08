// Spread definitions. Position display names live in messages/{locale}.json
// under the keys listed in positionKeys.

export type SpreadId = "daily" | "three" | "five" | "nine";

export type Spread = {
  id: SpreadId;
  cardCount: 3 | 5 | 9;
  positionKeys: string[];
};

export const SPREADS: Spread[] = [
  {
    id: "daily",
    cardCount: 3,
    positionKeys: ["spread.daily.pos1", "spread.daily.pos2", "spread.daily.pos3"],
  },
  {
    id: "three",
    cardCount: 3,
    positionKeys: ["spread.three.pos1", "spread.three.pos2", "spread.three.pos3"],
  },
  {
    id: "five",
    cardCount: 5,
    positionKeys: [
      "spread.five.pos1",
      "spread.five.pos2",
      "spread.five.pos3",
      "spread.five.pos4",
      "spread.five.pos5",
    ],
  },
  {
    id: "nine",
    cardCount: 9,
    positionKeys: [
      "spread.nine.pos1",
      "spread.nine.pos2",
      "spread.nine.pos3",
      "spread.nine.pos4",
      "spread.nine.pos5",
      "spread.nine.pos6",
      "spread.nine.pos7",
      "spread.nine.pos8",
      "spread.nine.pos9",
    ],
  },
];

export function getSpread(id: SpreadId): Spread {
  const found = SPREADS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown spread id: ${id}`);
  return found;
}
