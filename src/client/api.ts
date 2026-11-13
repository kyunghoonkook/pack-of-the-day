import type { FightResponse, ShareResponse, TodayResponse } from '../shared/api';

export const getToday = async (): Promise<TodayResponse> => {
  const r = await fetch('/api/today');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as TodayResponse;
};

export const postFight = async (lineup: number[], tryNo: number): Promise<FightResponse> => {
  const r = await fetch('/api/fight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineup, tryNo }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as FightResponse;
};

export const postAction = async (path: 'share' | 'subscribe'): Promise<ShareResponse> => {
  const r = await fetch(`/api/${path}`, { method: 'POST' });
  return (await r.json()) as ShareResponse;
};

export const rivalLabel = (name: string, fromPlayer: boolean) =>
  fromPlayer ? `u/${name}'s stray` : name;
