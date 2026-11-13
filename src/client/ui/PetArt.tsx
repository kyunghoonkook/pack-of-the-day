import type { ReactNode } from 'react';
import type { PetType } from '../../shared/engine';

const INK = 'var(--ink)';
const PAPER = 'var(--paper)';
const RED = 'var(--red)';
const S = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const Eyes = ({ y = 31, dx = 7, fill = INK }: { y?: number; dx?: number; fill?: string }) => (
  <>
    <circle cx={32 - dx} cy={y} r={2.6} fill={fill} />
    <circle cx={32 + dx} cy={y} r={2.6} fill={fill} />
  </>
);

const art: Record<PetType, ReactNode> = {
  mutt: (
    <>
      <path d="M15 19 C6 22 6 37 12 41 L20 30 Z" fill={INK} {...S} />
      <path d="M49 19 C58 22 58 37 52 41 L44 30 Z" fill={INK} {...S} />
      <ellipse cx="32" cy="35" rx="17" ry="17" fill={PAPER} {...S} />
      <circle cx="38" cy="27" r="4.5" fill={INK} />
      <Eyes />
      <ellipse cx="32" cy="43" rx="7.5" ry="5.5" fill={PAPER} {...S} />
      <ellipse cx="32" cy="40" rx="3.2" ry="2.2" fill={INK} />
    </>
  ),
  cat: (
    <>
      <path d="M15 30 L17 9 L30 21 Z" fill={PAPER} {...S} />
      <path d="M49 30 L47 9 L34 21 Z" fill={PAPER} {...S} />
      <ellipse cx="32" cy="37" rx="19" ry="16" fill={PAPER} {...S} />
      <ellipse cx="25" cy="34" rx="2.2" ry="3.4" fill={INK} />
      <ellipse cx="39" cy="34" rx="2.2" ry="3.4" fill={INK} />
      <path d="M29.5 40 L34.5 40 L32 43 Z" fill={RED} stroke={RED} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 40 L22 42 M10 46 L22 45 M54 40 L42 42 M54 46 L42 45" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  barker: (
    <>
      <path d="M17 24 L14 7 L28 17 Z" fill={INK} {...S} />
      <path d="M47 24 L50 7 L36 17 Z" fill={INK} {...S} />
      <ellipse cx="32" cy="33" rx="17" ry="16" fill={PAPER} {...S} />
      <Eyes y={28} />
      <path d="M24 28 L29 26 M40 28 L35 26" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 39 Q32 56 42 39 Z" fill={RED} {...S} />
      <ellipse cx="32" cy="36" rx="3.2" ry="2.2" fill={INK} />
      <path d="M55 22 L61 18 M56 30 L63 30 M55 38 L61 42" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  rabbit: (
    <>
      <ellipse cx="24" cy="15" rx="5.5" ry="13" fill={PAPER} {...S} />
      <ellipse cx="40" cy="15" rx="5.5" ry="13" fill={PAPER} {...S} />
      <path d="M24 8 L24 21 M40 8 L40 21" stroke={RED} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="40" r="16" fill={PAPER} {...S} />
      <Eyes y={37} dx={6.5} />
      <ellipse cx="32" cy="43" rx="2.6" ry="1.9" fill={RED} />
      <path d="M29.5 47 L29.5 52 L34.5 52 L34.5 47" fill={PAPER} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  turtle: (
    <>
      <ellipse cx="17" cy="48" rx="5" ry="4" fill={PAPER} {...S} />
      <ellipse cx="40" cy="48" rx="5" ry="4" fill={PAPER} {...S} />
      <circle cx="54" cy="37" r="6.5" fill={PAPER} {...S} />
      <circle cx="56" cy="35.5" r="1.8" fill={INK} />
      <path d="M6 46 C7 18 50 18 51 46 Z" fill={PAPER} {...S} />
      <path d="M17 44 L22 31 L35 31 L40 44 M22 31 L18 24 M35 31 L39 24 M28.5 31 L28.5 22" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" fill="none" />
    </>
  ),
  hamster: (
    <>
      <circle cx="18" cy="19" r="6" fill={PAPER} {...S} />
      <circle cx="46" cy="19" r="6" fill={PAPER} {...S} />
      <ellipse cx="32" cy="37" rx="21" ry="19" fill={PAPER} {...S} />
      <circle cx="19" cy="42" r="5" fill={RED} />
      <circle cx="45" cy="42" r="5" fill={RED} />
      <Eyes y={33} dx={8} />
      <ellipse cx="32" cy="39" rx="2.4" ry="1.7" fill={INK} />
      <path d="M28 44 Q32 47 36 44" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  olddog: (
    <>
      <path d="M16 21 C4 29 6 50 13 54 L21 31 Z" fill={INK} {...S} />
      <path d="M48 21 C60 29 58 50 51 54 L43 31 Z" fill={INK} {...S} />
      <ellipse cx="32" cy="35" rx="16" ry="18" fill={PAPER} {...S} />
      <path d="M21 27 Q25 23 29 27 M35 27 Q39 23 43 27" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M23 32 L28 32 M36 32 L41 32" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="32" cy="45" rx="8" ry="6" fill={PAPER} {...S} />
      <ellipse cx="32" cy="41.5" rx="3.2" ry="2.2" fill={INK} />
      <path d="M26 49 Q32 53 38 49" stroke={INK} strokeWidth="2" fill="none" />
    </>
  ),
  goose: (
    <>
      <ellipse cx="34" cy="49" rx="19" ry="9" fill={PAPER} {...S} />
      <path d="M41 46 Q48 44 51 40" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M22 47 C17 33 18 22 26 15" stroke={INK} strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M22 47 C17 33 18 22 26 15" stroke={PAPER} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="14" r="7.5" fill={PAPER} {...S} />
      <path d="M34 11 L46 14.5 L34 18 Z" fill={RED} {...S} strokeWidth="2.5" />
      <circle cx="29" cy="12.5" r="1.9" fill={INK} />
    </>
  ),
};

export const PetArt = ({ type, size = 48 }: { type: PetType; size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="pet-art">
    {art[type]}
  </svg>
);

/** The rival pack: solid ink strays with paper eyes. */
export const RivalArt = ({ size = 40, variant = 0 }: { size?: number; variant?: number }) => {
  const ears =
    variant === 1 ? (
      <>
        <path d="M16 28 L18 9 L30 20 Z" fill={INK} {...S} />
        <path d="M48 28 L46 9 L34 20 Z" fill={INK} {...S} />
      </>
    ) : variant === 2 ? (
      <>
        <path d="M17 24 L14 7 L28 17 Z" fill={INK} {...S} />
        <path d="M47 24 L50 7 L36 17 Z" fill={INK} {...S} />
      </>
    ) : (
      <>
        <path d="M15 19 C6 22 6 37 12 41 L20 30 Z" fill={INK} {...S} />
        <path d="M49 19 C58 22 58 37 52 41 L44 30 Z" fill={INK} {...S} />
      </>
    );
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="pet-art">
      {ears}
      <ellipse cx="32" cy="35" rx="17" ry="17" fill={INK} {...S} />
      <path d="M22 29 L29 32 M42 29 L35 32" stroke={PAPER} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="32" cy="42" rx="3.4" ry="2.4" fill={PAPER} />
    </svg>
  );
};
