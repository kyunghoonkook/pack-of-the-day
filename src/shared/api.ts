import type { LaneResult, Outcome, Pet } from './engine';

export type RivalView = { power: number; name: string; fromPlayer: boolean };

export type TryRecord = {
  lineup: number[]; // pet ids, lane 1..3
  lanes: LaneResult[];
  wins: number;
  margin: number;
  outcome: Outcome;
};

export type Distribution = {
  lose: number;
  win: number;
  sweep: number;
  perfect: number;
  total: number;
};

export type PlayView = {
  tries: TryRecord[];
  bestIndex: number; // -1 when no tries yet
  shared: boolean;
};

export type StreakView = { current: number; best: number };

export type TodayResponse = {
  type: 'today';
  date: string;
  no: number;
  weekday: string;
  isToday: boolean;
  hand: Pet[];
  rivals: RivalView[];
  username: string | null;
  play: PlayView;
  streak: StreakView;
  dist: Distribution;
  topToday: string[];
  myRank: number | null;
  nextPackAt: number;
  maxTries: number;
  subredditName: string;
};

export type FightRequest = { lineup: number[]; tryNo: number };

export type FightResponse = {
  type: 'fight';
  result: TryRecord;
  play: PlayView;
  streak: StreakView;
  dist: Distribution;
  topToday: string[];
  myRank: number | null;
  saved: boolean;
};

export type ShareResponse = { type: 'share'; ok: boolean; message: string };

export type ErrorResponse = { status: 'error'; message: string };
