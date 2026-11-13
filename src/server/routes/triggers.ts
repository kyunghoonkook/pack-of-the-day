import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import type { TaskResponse } from '@devvit/web/server';
import { postPack } from '../core/game';
import { utcDate } from '../../shared/puzzle';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const { id } = await postPack(utcDate());
    return c.json<TriggerResponse>({
      status: 'success',
      message: `Posted ${id}`,
    });
  } catch (e) {
    console.error(`install post failed: ${e}`);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to post' },
      400
    );
  }
});

export const cron = new Hono();

cron.post('/daily-pack', async (c) => {
  try {
    const { id, created } = await postPack(utcDate());
    console.log(`daily pack ${utcDate()} ${id} created=${created}`);
  } catch (e) {
    console.error(`daily pack failed: ${e}`);
  }
  return c.json<TaskResponse>({ status: 'ok' });
});
