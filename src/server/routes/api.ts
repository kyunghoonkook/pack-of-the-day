import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  ErrorResponse,
  FightRequest,
  FightResponse,
  ShareResponse,
  TodayResponse,
} from '../../shared/api';
import {
  dayNumber,
  shiftDate,
  utcDate,
  weekdayName,
} from '../../shared/puzzle';
import {
  currentDate,
  fight,
  getDist,
  getPlay,
  getPuzzle,
  getStreak,
  getTop,
  MAX_TRIES,
  playView,
  rivalViews,
  share,
  streakView,
} from '../core/game';

export const api = new Hono();

api.get('/today', async (c) => {
  try {
    const date = await currentDate();
    const username = (await reddit.getCurrentUsername()) ?? null;
    const [puzzle, play, dist, top, streak] = await Promise.all([
      getPuzzle(date),
      getPlay(date, context.userId),
      getDist(date),
      getTop(date, username),
      getStreak(context.userId),
    ]);
    return c.json<TodayResponse>({
      type: 'today',
      date,
      no: dayNumber(date),
      weekday: weekdayName(date),
      isToday: date === utcDate(),
      hand: puzzle.hand,
      rivals: rivalViews(puzzle),
      username,
      play: playView(play),
      streak: streakView(streak),
      dist,
      ...top,
      nextPackAt: Date.parse(`${shiftDate(utcDate(), 1)}T00:00:00Z`),
      maxTries: MAX_TRIES,
      subredditName: context.subredditName ?? '',
    });
  } catch (e) {
    console.error('today failed', e);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not load the pack' },
      500
    );
  }
});

api.post('/fight', async (c) => {
  try {
    const body = await c.req.json<FightRequest>();
    const date = await currentDate();
    const username = (await reddit.getCurrentUsername()) ?? null;
    const out = await fight(
      date,
      body.lineup,
      body.tryNo,
      context.userId,
      username
    );
    return c.json<FightResponse>({ type: 'fight', ...out });
  } catch (e) {
    console.error('fight failed', e);
    return c.json<ErrorResponse>({ status: 'error', message: String(e) }, 400);
  }
});

api.post('/share', async (c) => {
  if (!context.userId || !context.postId) {
    return c.json<ShareResponse>(
      { type: 'share', ok: false, message: 'Log in to share' },
      401
    );
  }
  try {
    await share(await currentDate(), context.postId, context.userId);
    return c.json<ShareResponse>({
      type: 'share',
      ok: true,
      message: 'Posted under the pinned comment',
    });
  } catch (e) {
    console.error('share failed', e);
    return c.json<ShareResponse>(
      { type: 'share', ok: false, message: 'Could not post the comment' },
      500
    );
  }
});

api.post('/subscribe', async (c) => {
  try {
    await reddit.subscribeToCurrentSubreddit();
    return c.json<ShareResponse>({
      type: 'share',
      ok: true,
      message: 'Joined',
    });
  } catch (e) {
    console.error('subscribe failed', e);
    return c.json<ShareResponse>(
      { type: 'share', ok: false, message: 'Could not join' },
      500
    );
  }
});
