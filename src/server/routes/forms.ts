import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { postPack } from '../core/game';
import { FIRST_DAY } from '../../shared/puzzle';

export const forms = new Hono();

forms.post('/post-date', async (c) => {
  const { date } = await c.req.json<{ date?: string }>();
  const d = (date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < FIRST_DAY) {
    return c.json<UiResponse>({ showToast: `Use a date from ${FIRST_DAY} on` });
  }
  const { id, created } = await postPack(d);
  return c.json<UiResponse>({
    ...(created ? {} : { showToast: 'That pack is already posted' }),
    navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${id}`,
  });
});
