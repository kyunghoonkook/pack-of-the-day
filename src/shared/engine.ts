export type PetType =
  | 'mutt'
  | 'cat'
  | 'barker'
  | 'rabbit'
  | 'turtle'
  | 'hamster'
  | 'olddog'
  | 'goose';

export type Pet = { id: number; type: PetType; power: number };
export type Rival = { power: number; name: string };

export type LaneResult = {
  mine: number;
  rival: number;
  won: boolean;
  notes: string[];
};

export type FightResult = {
  lanes: LaneResult[];
  wins: number;
  margin: number;
};

export const PET_INFO: Record<PetType, { name: string; ability: string }> = {
  mutt: { name: 'Mutt', ability: 'No tricks. Just heart.' },
  cat: { name: 'Cat', ability: 'Wins ties.' },
  barker: { name: 'Barker', ability: 'Rival in this lane -2.' },
  rabbit: { name: 'Rabbit', ability: '+2 in lane 1.' },
  turtle: { name: 'Turtle', ability: 'Doubles in lane 3.' },
  hamster: { name: 'Hamster', ability: '+3 if the lane to its left was lost.' },
  olddog: { name: 'Old Dog', ability: 'Copies the pet to its left.' },
  goose: { name: 'Goose', ability: 'If it loses, next rival -3.' },
};

export const PET_TYPES: PetType[] = [
  'mutt',
  'cat',
  'barker',
  'rabbit',
  'turtle',
  'hamster',
  'olddog',
  'goose',
];

/**
 * Resolve a lineup lane by lane, left to right.
 * `lineup[i]` is the pet standing in lane i, or null for an empty lane
 * (an empty lane always loses; used only for live previews).
 */
export const resolve = (
  lineup: (Pet | null)[],
  rivals: Rival[]
): FightResult => {
  const lanes: LaneResult[] = [];
  let rivalDebuff = 0;
  let prevMine = 0;
  let prevLost = false;
  for (let i = 0; i < 3; i++) {
    const pet = lineup[i] ?? null;
    const notes: string[] = [];
    let rival = rivals[i]!.power;
    if (rivalDebuff > 0) {
      rival -= rivalDebuff;
      notes.push(`Goose: rival -${rivalDebuff}`);
    }
    rivalDebuff = 0;
    let mine = 0;
    let won = false;
    if (pet) {
      mine = pet.power;
      if (pet.type === 'olddog' && i > 0) {
        mine = prevMine;
        notes.push(`Old Dog copies ${prevMine}`);
      }
      if (pet.type === 'barker') {
        rival -= 2;
        notes.push('Barker: rival -2');
      }
      if (pet.type === 'rabbit' && i === 0) {
        mine += 2;
        notes.push('Rabbit +2');
      }
      if (pet.type === 'hamster' && i > 0 && prevLost) {
        mine += 3;
        notes.push('Hamster +3');
      }
      if (pet.type === 'turtle' && i === 2) {
        mine *= 2;
        notes.push('Turtle x2');
      }
      if (rival < 0) rival = 0;
      won = mine > rival || (mine === rival && pet.type === 'cat');
      if (mine === rival && pet.type === 'cat') notes.push('Cat wins the tie');
      if (!won && pet.type === 'goose') rivalDebuff = 3;
    } else if (rival < 0) {
      rival = 0;
    }
    lanes.push({ mine, rival, won, notes });
    prevMine = mine;
    prevLost = !won;
  }
  const wins = lanes.filter((l) => l.won).length;
  const margin = lanes.reduce((s, l) => s + l.mine - l.rival, 0);
  return { lanes, wins, margin };
};

export type Outcome = 'lose' | 'win' | 'sweep' | 'perfect';

export const outcomeOf = (r: FightResult, bestMargin: number): Outcome => {
  if (r.wins === 3 && r.margin >= bestMargin) return 'perfect';
  if (r.wins === 3) return 'sweep';
  if (r.wins === 2) return 'win';
  return 'lose';
};

export const OUTCOME_RANK: Record<Outcome, number> = {
  lose: 0,
  win: 1,
  sweep: 2,
  perfect: 3,
};

/** All 60 ordered lineups of 3 pets out of 5 (indexes into the hand). */
export const allLineups = (): [number, number, number][] => {
  const out: [number, number, number][] = [];
  for (let a = 0; a < 5; a++)
    for (let b = 0; b < 5; b++)
      for (let c = 0; c < 5; c++)
        if (a !== b && a !== c && b !== c) out.push([a, b, c]);
  return out;
};
