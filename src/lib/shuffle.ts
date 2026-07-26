// Unbiased-enough for a 36-card deck: rejection sampling avoids modulo bias.
function randomInt(maxExclusive: number): number {
  const range = 0x100000000; // 2^32
  const limit = range - (range % maxExclusive);
  const arr = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(arr);
    value = arr[0];
  } while (value >= limit);
  return value % maxExclusive;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
