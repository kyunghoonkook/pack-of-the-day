import './index.css';

import { showToast } from '@devvit/web/client';
import {
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import type { Distribution, TodayResponse, TryRecord } from '../shared/api';
import { PET_INFO, resolve, type Outcome, type Pet } from '../shared/engine';
import { getToday, postAction, postFight, rivalLabel } from './api';
import { PetArt, RivalArt } from './ui/PetArt';

type Phase = 'play' | 'fight' | 'result';

const OUTCOME_WORD: Record<Outcome, string> = {
  lose: 'Beaten',
  win: 'Won',
  sweep: 'Sweep',
  perfect: 'Perfect',
};

const fmtMargin = (m: number) => (m >= 0 ? `+${m}` : `${m}`);

const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

const Countdown = ({ to }: { to: number }) => {
  const now = useNow(20000);
  const left = Math.max(0, to - now);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return (
    <span className="countdown">
      Next pack in {h}h {m}m
    </span>
  );
};

const DistPanel = ({
  dist,
  mine,
}: {
  dist: Distribution;
  mine: Outcome | null;
}) => {
  if (dist.total < 5) {
    return (
      <div className="panel">
        <h3>Players so far</h3>
        <div style={{ fontSize: 13 }}>
          {dist.total} so far. Be one of the first five today; the community
          chart opens at five.
        </div>
      </div>
    );
  }
  const rows: [Outcome, string][] = [
    ['lose', 'Beaten'],
    ['win', 'Won'],
    ['sweep', 'Sweep'],
    ['perfect', 'Perfect'],
  ];
  return (
    <div className="panel">
      <h3>How {dist.total} players did</h3>
      <div className="bars">
        {rows.map(([k, label]) => {
          const pct = Math.round((dist[k] / dist.total) * 100);
          return (
            <FragmentRow key={k} label={label} pct={pct} me={mine === k} />
          );
        })}
      </div>
    </div>
  );
};

const FragmentRow = ({
  label,
  pct,
  me,
}: {
  label: string;
  pct: number;
  me: boolean;
}) => (
  <>
    <span className={me ? 'me-label' : ''}>
      {me ? `${label} (you)` : label}
    </span>
    <span className={`bar${me ? ' me' : ''}`}>
      <i style={{ width: `${pct}%` }} />
    </span>
    <span>{pct}%</span>
  </>
);

export const App = () => {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [lanes, setLanes] = useState<(number | null)[]>([null, null, null]);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [shown, setShown] = useState<TryRecord | null>(null);
  const [shownIdx, setShownIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    getToday()
      .then((t) => {
        setData(t);
        const last = t.play.tries[t.play.tries.length - 1];
        if (last) {
          setShown(last);
          setShownIdx(t.play.tries.length - 1);
          setPhase('result');
        }
      })
      .catch(() => setFailed(true));
    const ts = timers.current;
    return () => ts.forEach((id) => clearTimeout(id));
  }, []);

  const pet = useCallback(
    (id: number | null): Pet | null =>
      id === null || !data
        ? null
        : (data.hand.find((h) => h.id === id) ?? null),
    [data]
  );

  const preview = useMemo(() => {
    if (!data) return null;
    return resolve(
      lanes.map((id) => pet(id)),
      data.rivals
    );
  }, [data, lanes, pet]);

  if (failed)
    return (
      <div className="game">
        <div className="center-msg">
          The pack ran off. Close and open the post again.
        </div>
      </div>
    );
  if (!data || !preview)
    return (
      <div className="game">
        <div className="center-msg display" style={{ fontSize: 22 }}>
          Calling the pack…
        </div>
      </div>
    );

  const tries = data.play.tries;
  const done =
    tries.length >= data.maxTries || tries.some((t) => t.outcome === 'perfect');
  const triesLeft = Math.max(0, data.maxTries - tries.length);
  const filled = lanes.every((l) => l !== null);
  const fightLanes = phase === 'fight' && shown ? shown.lanes : null;

  const tapCard = (id: number) => {
    if (phase !== 'play') return;
    setSelected((s) => (s === id ? null : id));
  };

  const tapLane = (i: number) => {
    if (phase !== 'play') return;
    if (selected === null) {
      if (lanes[i] !== null) {
        const next = [...lanes];
        next[i] = null;
        setLanes(next);
      }
      return;
    }
    const next = lanes.map((l) => (l === selected ? null : l));
    next[i] = selected;
    setLanes(next);
    setSelected(null);
  };

  const doFight = async () => {
    if (!filled || busy) return;
    setBusy(true);
    try {
      const res = await postFight(
        lanes.filter((l): l is number => l !== null),
        tries.length + 1
      );
      let play = res.play;
      if (!res.saved && play.tries.length === tries.length) {
        // Logged out: keep this run on the screen only.
        const local = [...tries, res.result];
        play = { ...play, tries: local, bestIndex: local.length - 1 };
        setUnsaved(true);
      }
      setData({
        ...data,
        play,
        streak: res.streak,
        dist: res.dist,
        topToday: res.topToday,
        myRank: res.myRank,
      });
      setShown(res.result);
      setShownIdx(play.tries.length - 1);
      setPhase('fight');
      setStep(0);
      [1, 2, 3].forEach((n) =>
        timers.current.push(window.setTimeout(() => setStep(n), 650 * n))
      );
      timers.current.push(
        window.setTimeout(() => setPhase('result'), 650 * 3 + 900)
      );
    } catch {
      showToast('That fight did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const tryAgain = () => {
    setPhase('play');
    setSelected(null);
    if (shown) setLanes(shown.lineup);
  };

  const share = async () => {
    setBusy(true);
    const r = await postAction('share').catch(() => null);
    setBusy(false);
    showToast(r?.message ?? 'Could not post the comment');
    if (r?.ok) setData({ ...data, play: { ...data.play, shared: true } });
  };

  const join = async () => {
    const r = await postAction('subscribe').catch(() => null);
    showToast(
      r?.ok
        ? `Joined r/${data.subredditName}. New pack every day at 00:00 UTC.`
        : 'Could not join right now'
    );
  };

  const sel = pet(selected);
  const showHint =
    tries.length === 0 && phase === 'play' && lanes.every((l) => l === null);

  const header = (
    <div className="topbar">
      <div>
        <div className="title display">Pack of the Day</div>
        <div className="sub">
          #{data.no} · {data.weekday}
          {data.streak.current > 0
            ? ` · ${data.streak.current}-day streak`
            : ''}
        </div>
      </div>
      <div className="dots" aria-label={`${triesLeft} tries left`}>
        {Array.from({ length: data.maxTries }, (_, i) => (
          <span key={i} className={`dot${i < tries.length ? ' used' : ''}`} />
        ))}
      </div>
    </div>
  );

  if (phase === 'result' && shown) {
    const bestIdx = data.play.bestIndex >= 0 ? data.play.bestIndex : shownIdx;
    const best = tries[bestIdx] ?? shown;
    const shownIndex = shownIdx;
    return (
      <div className="game">
        {header}
        <div className="result">
          <div className="result-head">
            <div
              className={`big-stamp${shown.outcome === 'lose' ? ' dim' : ''}`}
            >
              {OUTCOME_WORD[shown.outcome]}
            </div>
            <div className="facts">
              <b>{fmtMargin(shown.margin)}</b> margin
              <br />
              try {shownIndex + 1} of {data.maxTries}
              {shownIndex === 0 && shown.wins === 3 ? ', first try' : ''}
              <div className="lanes-mini" style={{ marginTop: 4 }}>
                {shown.lanes.map((l, i) => (
                  <span key={i} className={l.won ? 'w' : 'l'}>
                    {l.won ? 'W' : 'L'}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="recap">
            {shown.lanes.map((l, i) => {
              const p = pet(shown.lineup[i] ?? null);
              return (
                <div key={i} className={l.won ? 'w' : 'l'}>
                  {p && <PetArt type={p.type} size={34} />}
                  <span>
                    {l.mine}:{l.rival}
                  </span>
                  <RivalArt size={26} variant={i} />
                </div>
              );
            })}
          </div>
          {shown.outcome === 'sweep' && (
            <div style={{ fontSize: 13 }}>
              All three lanes. One lineup today beats this margin.
            </div>
          )}
          {shown.outcome === 'perfect' && (
            <div style={{ fontSize: 13 }}>
              The best lineup this pack has. There is only one.
            </div>
          )}
          {bestIdx !== shownIdx && (
            <div style={{ fontSize: 13 }}>
              Your best today still counts: {OUTCOME_WORD[best.outcome]}{' '}
              {fmtMargin(best.margin)}.
            </div>
          )}
          {!data.isToday && (
            <div className="past-note">
              An old pack. Plays here do not count toward streaks.
            </div>
          )}
          {unsaved && (
            <div className="past-note">Log in to keep results and streaks.</div>
          )}
          <DistPanel dist={data.dist} mine={best.outcome} />
          <div className="row2">
            <div className="panel">
              <div className="num">{data.streak.current}</div>
              day streak
              {data.streak.best > data.streak.current
                ? `, best ${data.streak.best}`
                : ''}
              . Beat the pack daily for flair at 3, 7 and 30.
            </div>
            <div className="panel">
              <b>First perfect sweeps</b>
              <div>
                {data.topToday.length ? (
                  data.topToday.map((n, i) => (
                    <div key={n}>
                      {i + 1}. u/{n}
                    </div>
                  ))
                ) : (
                  <div>Nobody yet.</div>
                )}
              </div>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                They name tomorrow&apos;s rival pack.
              </div>
            </div>
          </div>
          <div className="result-actions">
            <button
              className="plain-btn"
              onClick={share}
              disabled={busy || data.play.shared || unsaved}
            >
              {data.play.shared ? 'Shared' : 'Share result in comments'}
            </button>
            {!done ? (
              <button className="stamp-btn" onClick={tryAgain}>
                Try again ({triesLeft} left)
              </button>
            ) : data.isToday ? (
              <Countdown to={data.nextPackAt} />
            ) : (
              <span className="countdown">
                {best.outcome === 'perfect' ? 'Solved' : 'All tries used'}
              </span>
            )}
          </div>
          <div className="fine">
            Sharing posts a reply from your account under the pinned comment.
          </div>
          <button
            className="link-btn"
            onClick={join}
            style={{ alignSelf: 'flex-start' }}
          >
            Join r/{data.subredditName} to get tomorrow&apos;s pack in your feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      {header}
      {!data.isToday && (
        <div className="past-note">
          Pack #{data.no} from {data.date}. Plays here do not count toward
          streaks.
        </div>
      )}
      <div className="board">
        {[0, 1, 2].map((i) => (
          <div key={`l${i}`} className="lane-label">
            LANE {i + 1}
          </div>
        ))}
        {data.rivals.map((r, i) => {
          const lane = fightLanes?.[i];
          const st = lane && step > i ? (lane.won ? 'lost' : 'won') : '';
          const shownRival = fightLanes
            ? step > i
              ? lane!.rival
              : r.power
            : preview.lanes[i]!.rival;
          return (
            <div key={`r${i}`} className={`rival ${st}`}>
              <RivalArt size={46} variant={i} />
              <div className="pw">
                {shownRival !== r.power && <s>{r.power}</s>}
                {shownRival}
              </div>
              <div className="nm" title={r.name}>
                {rivalLabel(r.name, r.fromPlayer)}
              </div>
            </div>
          );
        })}
        <div className="vs-row">
          {[0, 1, 2].map((i) => {
            if (fightLanes) {
              const l = fightLanes[i]!;
              if (step <= i)
                return (
                  <div key={i} className="vs">
                    ·
                  </div>
                );
              return (
                <div key={i} className={`vs ${l.won ? 'win' : 'lose'}`}>
                  {l.mine} : {l.rival}
                  <span className="tag">{l.won ? 'WIN' : 'LOSS'}</span>
                </div>
              );
            }
            const l = preview.lanes[i]!;
            if (lanes[i] === null)
              return (
                <div key={i} className="vs">
                  vs
                </div>
              );
            return (
              <div key={i} className={`vs ${l.won ? 'win' : 'lose'}`}>
                {l.mine} : {l.rival}
              </div>
            );
          })}
        </div>
        {[0, 1, 2].map((i) => {
          const p = pet(lanes[i] ?? null);
          const lane = fightLanes?.[i];
          const st = lane && step > i ? (lane.won ? 'won' : 'lost') : '';
          const pl = preview.lanes[i]!;
          return (
            <button
              key={`s${i}`}
              className={`slot${p ? ' filled' : ''}${selected !== null && phase === 'play' ? ' ready' : ''} ${st}`}
              onClick={() => tapLane(i)}
              aria-label={
                p
                  ? `Lane ${i + 1}: ${PET_INFO[p.type].name}`
                  : `Lane ${i + 1}: empty`
              }
            >
              {p ? (
                <>
                  <PetArt type={p.type} size={52} />
                  <div className="pw">
                    {fightLanes && step > i ? lane!.mine : pl.mine}
                  </div>
                  <div className="nm">{PET_INFO[p.type].name}</div>
                  <div className="note">
                    {(fightLanes && step > i ? lane!.notes : pl.notes)
                      .filter((n) => !n.startsWith('Goose: rival'))
                      .join(' · ')}
                  </div>
                </>
              ) : (
                <span className="empty-hint">
                  {selected !== null ? 'Put it here' : 'Empty'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="info">
        {sel ? (
          <>
            <PetArt type={sel.type} size={30} />
            <span>
              <b>
                {PET_INFO[sel.type].name} {sel.power}.
              </b>{' '}
              {PET_INFO[sel.type].ability}
            </span>
          </>
        ) : showHint ? (
          <span className="hint">
            Tap a pet, then tap a lane. Fill all three, then Fight.
          </span>
        ) : phase === 'fight' ? (
          <span>
            Lanes fight left to right. Higher number takes the lane. Ties go to
            the pack.
          </span>
        ) : (
          <span>
            Win 2 of 3 lanes to beat the pack. Lanes fight left to right; ties
            go to the pack.
          </span>
        )}
      </div>
      <div className="hand">
        {data.hand.map((h) => {
          const placed = lanes.includes(h.id);
          return (
            <button
              key={h.id}
              className={`card${selected === h.id ? ' sel' : ''}${placed && selected !== h.id ? ' placed' : ''}`}
              onClick={() => tapCard(h.id)}
              aria-label={`${PET_INFO[h.type].name} ${h.power}: ${PET_INFO[h.type].ability}`}
            >
              <span className="pw">{h.power}</span>
              <PetArt type={h.type} size={52} />
              <span className="nm">{PET_INFO[h.type].name}</span>
            </button>
          );
        })}
      </div>
      <div className="actions">
        <div className="left">
          {triesLeft} of {data.maxTries} tries left.
          <br />
          Same five pets for everyone.
        </div>
        <button
          className="stamp-btn"
          disabled={!filled || busy || phase !== 'play' || done}
          onClick={doFight}
        >
          Fight
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
