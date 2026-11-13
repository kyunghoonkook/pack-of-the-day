import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { postPack } from '../core/game';
import { utcDate } from '../../shared/puzzle';

export const menu = new Hono();

menu.post('/post-today', async (c) => {
  try {
    const { id, created } = await postPack(utcDate());
    return c.json<UiResponse>({
      ...(created ? {} : { showToast: "Today's pack is already posted" }),
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${id}`,
    });
  } catch (e) {
    console.error(`post-today failed: ${e}`);
    return c.json<UiResponse>({ showToast: 'Failed to post the pack' }, 400);
  }
});

menu.post('/post-date', async (c) => {
  return c.json<UiResponse>({
    showForm: {
      name: 'postDateForm',
      form: {
        title: 'Post the pack for a date',
        fields: [
          {
            name: 'date',
            label: 'Date (UTC, YYYY-MM-DD)',
            type: 'string',
            defaultValue: utcDate(),
          },
        ],
      },
    },
  });
});
