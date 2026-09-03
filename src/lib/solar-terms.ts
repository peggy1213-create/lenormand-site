// The 24 solar terms (節氣) — astronomically fixed points along the ecliptic.
// Dates here are for the UTC+8 time zone (Taiwan / China Standard Time), the
// frame In-Betweens' Traditional Chinese readers expect. Values come from
// published almanac data, cross-checked against Taiwan's Central Weather
// Administration for 2026.
//
// This is a lookup table for 2024–2030 rather than a solar-longitude
// calculation: the window is short, the values never change once observed,
// and a table is trivial to verify by eye. Add one row per year before 2031 —
// currentSolarTerm() returns null outside the covered range and the homepage
// simply omits the seasonal line when that happens.

export const SOLAR_TERM_KEYS = [
  "xiaohan", "dahan", "lichun", "yushui", "jingzhe", "chunfen",
  "qingming", "guyu", "lixia", "xiaoman", "mangzhong", "xiazhi",
  "xiaoshu", "dashu", "liqiu", "chushu", "bailu", "qiufen",
  "hanlu", "shuangjiang", "lidong", "xiaoxue", "daxue", "dongzhi",
] as const;

export type SolarTermKey = (typeof SOLAR_TERM_KEYS)[number];

// One row per year: 24 [month, day] pairs in calendar order — 小寒 in early
// January through 冬至 in late December.
const TERM_DATES: Record<number, ReadonlyArray<readonly [number, number]>> = {
  2024: [[1, 6], [1, 20], [2, 4], [2, 19], [3, 5], [3, 20], [4, 4], [4, 19], [5, 5], [5, 20], [6, 5], [6, 21], [7, 6], [7, 22], [8, 7], [8, 22], [9, 7], [9, 22], [10, 8], [10, 23], [11, 7], [11, 22], [12, 6], [12, 21]],
  2025: [[1, 5], [1, 20], [2, 3], [2, 18], [3, 5], [3, 20], [4, 4], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 22], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21]],
  2026: [[1, 5], [1, 20], [2, 4], [2, 18], [3, 5], [3, 20], [4, 5], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]],
  2027: [[1, 5], [1, 20], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 8], [8, 23], [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]],
  2028: [[1, 6], [1, 20], [2, 4], [2, 19], [3, 5], [3, 20], [4, 4], [4, 19], [5, 5], [5, 20], [6, 5], [6, 21], [7, 6], [7, 22], [8, 7], [8, 22], [9, 7], [9, 22], [10, 8], [10, 23], [11, 7], [11, 22], [12, 6], [12, 21]],
  2029: [[1, 5], [1, 20], [2, 3], [2, 18], [3, 5], [3, 20], [4, 4], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 22], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21]],
  2030: [[1, 5], [1, 20], [2, 4], [2, 18], [3, 5], [3, 20], [4, 5], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 23], [8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22]],
};

const MIN_YEAR = 2024;
const MAX_YEAR = 2030;

/**
 * The solar term currently in effect for `date` — the most recent term whose
 * start date falls on or before `date`. Reads the date's local calendar
 * fields, so the caller decides which time zone "today" means. Returns null
 * when `date` sits outside the covered 2024–2030 window.
 */
export function currentSolarTerm(date: Date): SolarTermKey | null {
  const year = date.getFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const row = TERM_DATES[year];

  let idx = -1;
  for (let i = 0; i < row.length; i++) {
    const [m, d] = row[i];
    if (m < month || (m === month && d <= day)) idx = i;
    else break;
  }

  if (idx >= 0) return SOLAR_TERM_KEYS[idx];
  // Date is Jan 1–4, before this year's 小寒: the term still in effect is
  // the previous year's 冬至.
  return year - 1 >= MIN_YEAR ? "dongzhi" : null;
}
