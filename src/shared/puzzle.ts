import {
  allLineups,
  PET_TYPES,
  resolve,
  type Pet,
  type PetType,
  type Rival,
} from './engine.ts';

export type Puzzle = {
  date: string; // YYYY-MM-DD (UTC)
  no: number;
  hand: Pet[];
  rivals: Rival[];
  bestMargin: number;
  sweepCount: number;
  winCount: number;
};

export const FIRST_DAY = '2026-11-10';

export const dayNumber = (date: string): number =>
  Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`)) /
      86400000
  ) + 1;

export const utcDate = (d: Date = new Date()): string =>
  d.toISOString().slice(0, 10);

export const shiftDate = (date: string, days: number): string =>
  utcDate(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000));

export const weekdayName = (date: string): string =>
  [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][new Date(`${date}T00:00:00Z`).getUTCDay()]!;

/** Allowed number of sweeping lineups, by weekday: easier on Monday. */
export const sweepRange = (date: string): [number, number] => {
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (wd === 1) return [6, 10];
  if (wd >= 2 && wd <= 4) return [3, 5];
  return [1, 2];
};

const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rng = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const DEFAULT_RIVAL_NAMES = ['Biscuit', 'Mango', 'Pickle'];

export type Analysis = {
  sweepCount: number;
  winCount: number;
  bestMargin: number;
  bestCount: number;
};

export const analyze = (hand: Pet[], rivals: Rival[]): Analysis => {
  let sweepCount = 0;
  let winCount = 0;
  let bestMargin = -Infinity;
  let bestCount = 0;
  for (const [a, b, c] of allLineups()) {
    const r = resolve([hand[a]!, hand[b]!, hand[c]!], rivals);
    if (r.wins >= 2) winCount++;
    if (r.wins === 3) {
      sweepCount++;
      if (r.margin > bestMargin) {
        bestMargin = r.margin;
        bestCount = 1;
      } else if (r.margin === bestMargin) bestCount++;
    }
  }
  return { sweepCount, winCount, bestMargin, bestCount };
};

/**
 * Build the puzzle for a date. Deterministic: same date, same puzzle.
 * Every puzzle has at least one sweep and exactly one lineup with the best margin.
 */
export const generatePuzzle = (
  date: string,
  rivalNames: string[] = DEFAULT_RIVAL_NAMES
): Puzzle => {
  const [lo, hi] = sweepRange(date);
  const monday = new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const rand = rng(hashString(`${date}#${attempt}`));
    const pick = (n: number) => Math.floor(rand() * n);
    const pool = [...PET_TYPES];
    const types: PetType[] = [];
    while (types.length < 5) {
      const t = pool.splice(pick(pool.length), 1)[0]!;
      types.push(t);
    }
    if (monday && types.filter((t) => t !== 'mutt').length > 2) {
      // Mondays: at most two pets with an ability, the rest are mutts.
      let tricks = 0;
      for (let i = 0; i < 5; i++) {
        if (types[i] !== 'mutt') {
          tricks++;
          if (tricks > 2) types[i] = 'mutt';
        }
      }
    }
    const hand: Pet[] = types.map((type, id) => ({
      id,
      type,
      power: 2 + pick(8),
    }));
    const rivals: Rival[] = [0, 1, 2].map((i) => ({
      power: 3 + pick(9),
      name: rivalNames[i] ?? DEFAULT_RIVAL_NAMES[i]!,
    }));
    const a = analyze(hand, rivals);
    if (a.sweepCount < lo || a.sweepCount > hi) continue;
    if (a.bestCount !== 1) continue;
    return {
      date,
      no: dayNumber(date),
      hand,
      rivals,
      bestMargin: a.bestMargin,
      sweepCount: a.sweepCount,
      winCount: a.winCount,
    };
  }
  throw new Error(`No puzzle found for ${date}`);
};
