import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, type Pet } from '../src/shared/engine.ts';
import { analyze, generatePuzzle, shiftDate, sweepRange, dayNumber } from '../src/shared/puzzle.ts';

const p = (type: Pet['type'], power: number, id = 0): Pet => ({ id, type, power });
const rv = (a: number, b: number, c: number) =>
  [a, b, c].map((power) => ({ power, name: 'x' }));

test('higher power wins, ties go to the rival', () => {
  const r = resolve([p('mutt', 5), p('mutt', 4), p('mutt', 9)], rv(4, 4, 10));
  assert.deepEqual(r.lanes.map((l) => l.won), [true, false, false]);
  assert.equal(r.wins, 1);
  assert.equal(r.margin, 1 + 0 - 1);
});

test('cat wins ties', () => {
  const r = resolve([p('cat', 4), p('mutt', 1), p('mutt', 1)], rv(4, 9, 9));
  assert.equal(r.lanes[0]!.won, true);
});

test('barker lowers the rival by 2, not below zero', () => {
  const r = resolve([p('barker', 3), p('barker', 1), p('mutt', 1)], rv(4, 1, 9));
  assert.equal(r.lanes[0]!.rival, 2);
  assert.equal(r.lanes[0]!.won, true);
  assert.equal(r.lanes[1]!.rival, 0);
});

test('rabbit +2 only in lane 1', () => {
  const r = resolve([p('rabbit', 3), p('rabbit', 3), p('mutt', 1)], rv(4, 4, 9));
  assert.equal(r.lanes[0]!.mine, 5);
  assert.equal(r.lanes[1]!.mine, 3);
});

test('turtle doubles only in lane 3', () => {
  const r = resolve([p('turtle', 3), p('mutt', 1), p('turtle', 4)], rv(4, 4, 7));
  assert.equal(r.lanes[0]!.mine, 3);
  assert.equal(r.lanes[2]!.mine, 8);
  assert.equal(r.lanes[2]!.won, true);
});

test('hamster +3 after a lost lane', () => {
  const r = resolve([p('mutt', 1), p('hamster', 3), p('hamster', 3)], rv(5, 5, 2));
  assert.equal(r.lanes[1]!.mine, 6);
  assert.equal(r.lanes[1]!.won, true);
  assert.equal(r.lanes[2]!.mine, 3);
});

test('old dog copies the final power on its left', () => {
  const r = resolve([p('rabbit', 5), p('olddog', 2), p('olddog', 9)], rv(1, 1, 1));
  assert.equal(r.lanes[1]!.mine, 7);
  assert.equal(r.lanes[2]!.mine, 7);
  const first = resolve([p('olddog', 6), p('mutt', 1), p('mutt', 1)], rv(1, 1, 1));
  assert.equal(first.lanes[0]!.mine, 6);
});

test('goose that loses weakens the next rival by 3', () => {
  const r = resolve([p('goose', 2), p('mutt', 5), p('mutt', 1)], rv(6, 7, 9));
  assert.equal(r.lanes[0]!.won, false);
  assert.equal(r.lanes[1]!.rival, 4);
  assert.equal(r.lanes[1]!.won, true);
  const winning = resolve([p('goose', 9), p('mutt', 5), p('mutt', 1)], rv(6, 7, 9));
  assert.equal(winning.lanes[1]!.rival, 7);
});

test('generated puzzles are deterministic and fair for 120 days', () => {
  let date = '2026-11-10';
  for (let i = 0; i < 120; i++) {
    const a = generatePuzzle(date);
    const b = generatePuzzle(date);
    assert.deepEqual(a, b);
    const an = analyze(a.hand, a.rivals);
    const [lo, hi] = sweepRange(date);
    assert.ok(an.sweepCount >= lo && an.sweepCount <= hi, `${date} sweeps ${an.sweepCount}`);
    assert.equal(an.bestCount, 1, `${date} unique best`);
    assert.equal(a.no, dayNumber(date));
    date = shiftDate(date, 1);
  }
});
