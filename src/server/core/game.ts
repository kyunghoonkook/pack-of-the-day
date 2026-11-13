import { context, reddit, redis } from '@devvit/web/server';
import {
  OUTCOME_RANK,
  outcomeOf,
  PET_INFO,
  resolve,
  type Outcome,
  type Pet,
} from '../../shared/engine';
import {
  DEFAULT_RIVAL_NAMES,
  generatePuzzle,
  shiftDate,
  utcDate,
  weekdayName,
  type Puzzle,
} from '../../shared/puzzle';
import type {
  Distribution,
  PlayView,
  RivalView,
  StreakView,
  TryRecord,
} from '../../shared/api';

export const MAX_TRIES = 3;

type StoredPuzzle = Puzzle & { fromPlayer: boolean[] };

const k = {
  puzzle: (d: string) => `puzzle:${d}`,
  play: (d: string, u: string) => `play:${d}:${u}`,
  dist: (d: string) => `dist:${d}`,
  rank: (d: string) => `rank:${d}`,
  streak: (u: string) => `streak:${u}`,
  posted: (d: string) => `posted:${d}`,
  sticky: (postId: string) => `sticky:${postId}`,
  postDate: (postId: string) => `postdate:${postId}`,
};

export const getPuzzle = async (date: string): Promise<StoredPuzzle> => {
  const raw = await redis.get(k.puzzle(date));
  if (raw) return JSON.parse(raw) as StoredPuzzle;
  // Yesterday's fastest perfect players name today's rival pets.
  const top = await redis.zRange(k.rank(shiftDate(date, -1)), 0, 2, {
    by: 'rank',
  });
  const names = DEFAULT_RIVAL_NAMES.map((d, i) => top[i]?.member ?? d);
  const p = generatePuzzle(date, names);
  const stored: StoredPuzzle = {
    ...p,
    fromPlayer: names.map((_, i) => Boolean(top[i])),
  };
  await redis.set(k.puzzle(date), JSON.stringify(stored));
  return stored;
};

export const rivalViews = (p: StoredPuzzle): RivalView[] =>
  p.rivals.map((r, i) => ({
    power: r.power,
    name: r.name,
    fromPlayer: p.fromPlayer[i] ?? false,
  }));

type StoredPlay = { tries: TryRecord[]; shared: boolean };

const emptyPlay = (): StoredPlay => ({ tries: [], shared: false });

export const bestIndex = (tries: TryRecord[]): number => {
  let best = -1;
  tries.forEach((t, i) => {
    const b = best >= 0 ? tries[best]! : null;
    if (
      !b ||
      OUTCOME_RANK[t.outcome] > OUTCOME_RANK[b.outcome] ||
      (OUTCOME_RANK[t.outcome] === OUTCOME_RANK[b.outcome] &&
        t.margin > b.margin)
    )
      best = i;
  });
  return best;
};

export const playView = (p: StoredPlay): PlayView => ({
  tries: p.tries,
  bestIndex: bestIndex(p.tries),
  shared: p.shared,
});

export const getPlay = async (date: string, userId?: string) => {
  if (!userId) return emptyPlay();
  const raw = await redis.get(k.play(date, userId));
  return raw ? (JSON.parse(raw) as StoredPlay) : emptyPlay();
};

export const getDist = async (date: string): Promise<Distribution> => {
  const h = await redis.hGetAll(k.dist(date));
  const n = (f: string) => Math.max(0, parseInt(h[f] ?? '0') || 0);
  const d = {
    lose: n('lose'),
    win: n('win'),
    sweep: n('sweep'),
    perfect: n('perfect'),
  };
  return { ...d, total: d.lose + d.win + d.sweep + d.perfect };
};

export const getTop = async (date: string, username: string | null) => {
  const top = await redis.zRange(k.rank(date), 0, 2, { by: 'rank' });
  let myRank: number | null = null;
  if (username) {
    const r = await redis.zRank(k.rank(date), username);
    myRank = r === undefined ? null : r + 1;
  }
  return { topToday: top.map((t) => t.member), myRank };
};

type StoredStreak = {
  current: number;
  best: number;
  lastDate: string;
  tier: number;
};

export const getStreak = async (userId?: string): Promise<StoredStreak> => {
  const empty = { current: 0, best: 0, lastDate: '', tier: 0 };
  if (!userId) return empty;
  const raw = await redis.get(k.streak(userId));
  return raw ? (JSON.parse(raw) as StoredStreak) : empty;
};

export const streakView = (s: StoredStreak, today = utcDate()): StreakView => {
  const alive = s.lastDate === today || s.lastDate === shiftDate(today, -1);
  return { current: alive ? s.current : 0, best: s.best };
};

const TIERS: [number, string][] = [
  [30, '30-day pack'],
  [7, '7-day pack'],
  [3, '3-day pack'],
];

const bumpStreak = async (
  userId: string,
  username: string | null,
  date: string
) => {
  const s = await getStreak(userId);
  if (s.lastDate === date) return s;
  s.current = s.lastDate === shiftDate(date, -1) ? s.current + 1 : 1;
  s.best = Math.max(s.best, s.current);
  s.lastDate = date;
  const tierIndex = TIERS.findIndex(([n]) => s.current >= n);
  const tier = tierIndex === -1 ? 0 : TIERS[tierIndex]![0];
  if (tier !== s.tier && tier > 0 && username && context.subredditName) {
    try {
      await reddit.setUserFlair({
        subredditName: context.subredditName,
        username,
        text: TIERS[tierIndex]![1],
      });
    } catch (e) {
      console.error('flair failed', e);
    }
  }
  s.tier = tier;
  await redis.set(k.streak(userId), JSON.stringify(s));
  return s;
};

export const fight = async (
  date: string,
  lineupIds: number[],
  tryNo: number,
  userId: string | undefined,
  username: string | null
) => {
  const puzzle = await getPuzzle(date);
  const ids = lineupIds.slice(0, 3);
  if (ids.length !== 3 || new Set(ids).size !== 3)
    throw new Error('Pick three different pets');
  const pets: Pet[] = ids.map((id) => {
    const pet = puzzle.hand.find((h) => h.id === id);
    if (!pet) throw new Error('Unknown pet');
    return pet;
  });
  const r = resolve(pets, puzzle.rivals);
  const result: TryRecord = {
    lineup: ids,
    lanes: r.lanes,
    wins: r.wins,
    margin: r.margin,
    outcome: outcomeOf(r, puzzle.bestMargin),
  };
  const play = await getPlay(date, userId);
  let saved = false;
  if (userId) {
    const done =
      play.tries.length >= MAX_TRIES ||
      play.tries.some((t) => t.outcome === 'perfect');
    // tryNo makes a retried request idempotent.
    if (!done && tryNo === play.tries.length + 1) {
      const before = bestIndex(play.tries);
      const beforeOutcome: Outcome | null =
        before >= 0 ? play.tries[before]!.outcome : null;
      play.tries.push(result);
      await redis.set(k.play(date, userId), JSON.stringify(play));
      saved = true;
      const after = play.tries[bestIndex(play.tries)]!.outcome;
      if (beforeOutcome !== after) {
        if (beforeOutcome) await redis.hIncrBy(k.dist(date), beforeOutcome, -1);
        await redis.hIncrBy(k.dist(date), after, 1);
      }
      if (result.outcome === 'perfect' && username) {
        await redis.zAdd(k.rank(date), { member: username, score: Date.now() });
      }
      if (
        date === utcDate() &&
        OUTCOME_RANK[result.outcome] >= OUTCOME_RANK.win
      ) {
        await bumpStreak(userId, username, date);
      }
    }
  }
  const [dist, top, streak] = await Promise.all([
    getDist(date),
    getTop(date, username),
    getStreak(userId),
  ]);
  return {
    result,
    play: playView(play),
    dist,
    ...top,
    streak: streakView(streak),
    saved,
  };
};

export const shareText = (puzzle: Puzzle, t: TryRecord, tryIndex: number) => {
  const label: Record<Outcome, string> = {
    lose: 'Lost to the pack',
    win: `Won ${t.wins} of 3`,
    sweep: 'Sweep',
    perfect: 'Perfect sweep',
  };
  const margin = t.margin >= 0 ? `+${t.margin}` : `${t.margin}`;
  const lanes = t.lanes.map((l) => (l.won ? 'W' : 'L')).join(' ');
  const names = t.lineup
    .map((id) => PET_INFO[puzzle.hand.find((h) => h.id === id)!.type].name)
    .join(', ');
  return [
    `Pack of the Day #${puzzle.no}: ${label[t.outcome]}, ${margin}, try ${tryIndex + 1} of ${MAX_TRIES}${tryIndex === 0 && t.wins === 3 ? ' (first try)' : ''}`,
    '',
    `Lanes: ${lanes}`,
    '',
    `Lineup: >!${names}!<`,
  ].join('\n');
};

export const ensureSticky = async (postId: `t3_${string}`) => {
  const existing = await redis.get(k.sticky(postId));
  if (existing) return existing as `t1_${string}`;
  const c = await reddit.submitComment({
    id: postId,
    text: 'Results go here. Lineups stay behind spoiler tags, so open them only after you play.',
    runAs: 'APP',
  });
  try {
    await c.distinguish(true);
  } catch (e) {
    console.error('sticky failed', e);
  }
  await redis.set(k.sticky(postId), c.id);
  return c.id;
};

export const share = async (
  date: string,
  postId: `t3_${string}`,
  userId: string
) => {
  const play = await getPlay(date, userId);
  const bi = bestIndex(play.tries);
  if (bi < 0) throw new Error('Play first');
  const puzzle = await getPuzzle(date);
  const stickyId = await ensureSticky(postId);
  await reddit.submitComment({
    id: stickyId,
    text: shareText(puzzle, play.tries[bi]!, bi),
    runAs: 'USER',
  });
  play.shared = true;
  await redis.set(k.play(date, userId), JSON.stringify(play));
};

export const postPack = async (date: string, subredditName?: string) => {
  const already = await redis.get(k.posted(date));
  if (already) return { id: already, created: false };
  const puzzle = await getPuzzle(date);
  const post = await reddit.submitCustomPost({
    ...(subredditName ? { subredditName } : {}),
    title: `Pack of the Day #${puzzle.no}, ${weekdayName(date)}`,
    entry: 'default',
    postData: { date },
    textFallback: {
      text: `Pack of the Day #${puzzle.no}. Line up three pets and beat today's pack. Open this post on new Reddit or the app to play.`,
    },
  });
  await redis.set(k.posted(date), post.id);
  await redis.set(k.postDate(post.id), date);
  await ensureSticky(post.id);
  if (date === utcDate()) {
    try {
      await post.sticky(1);
    } catch (e) {
      console.error('pin failed', e);
    }
  }
  return { id: post.id, created: true };
};

/** Date of the pack shown in the current post. Falls back to today. */
export const currentDate = async (): Promise<string> => {
  const fromData = context.postData?.date;
  if (typeof fromData === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fromData))
    return fromData;
  if (context.postId) {
    const d = await redis.get(k.postDate(context.postId));
    if (d) return d;
  }
  return utcDate();
};
