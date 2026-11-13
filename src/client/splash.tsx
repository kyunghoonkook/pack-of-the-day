import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { TodayResponse } from '../shared/api';
import { getToday, rivalLabel } from './api';
import { RivalArt } from './ui/PetArt';

const outcomeLine = (t: TodayResponse): string | null => {
  const best = t.play.tries[t.play.bestIndex];
  if (!best) return null;
  const words = { lose: 'The pack beat you', win: `You won ${best.wins} of 3`, sweep: 'You swept', perfect: 'Perfect sweep' };
  return `${words[best.outcome]} on try ${t.play.bestIndex + 1}.`;
};

export const Splash = () => {
  const [t, setT] = useState<TodayResponse | null>(null);
  useEffect(() => {
    getToday().then(setT).catch(() => setT(null));
  }, []);
  const played = t ? outcomeLine(t) : null;
  return (
    <div className="splash">
      <div>
        <div className="splash-top">
          <span>{t ? `#${t.no} · ${t.weekday}` : ' '}</span>
          {t && t.streak.current > 0 ? <span>{t.streak.current}-day streak</span> : <span />}
        </div>
        <h1 className="display">
          Pack of <span>the Day</span>
        </h1>
        <p className="lede">Line up three pets. Beat today&apos;s pack.</p>
      </div>
      <div className="splash-rivals">
        {(t?.rivals ?? [0, 1, 2].map(() => null)).map((r, i) => (
          <div className="splash-rival" key={i}>
            <RivalArt size={44} variant={i} />
            <div className="num">{r ? r.power : '·'}</div>
            <div className="nm">{r ? rivalLabel(r.name, r.fromPlayer) : ' '}</div>
          </div>
        ))}
      </div>
      <div className="splash-bottom">
        <div className="meta">
          {played ?? (t && !t.isToday ? 'An old pack. Still playable.' : 'Same pets for everyone today.')}
          <br />
          {t ? `${t.dist.total} ${t.dist.total === 1 ? 'player' : 'players'} so far` : ' '}
        </div>
        <button className="stamp-btn" onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
          {played ? 'See result' : 'Play'}
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
