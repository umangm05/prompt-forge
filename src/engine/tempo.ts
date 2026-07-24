import type {
  PlanRelation,
  ResolutionOutcome,
  TempoBeat,
  TempoState,
} from '../types';

export function createTempoState(): TempoState {
  return {
    beat: 'lull',
    tension: 0.2,
    sources: ['opening silence'],
    spentLastRound: false,
    recoveryLeft: 0,
    sameBeatStreak: 0,
  };
}

export function shapeTempo(
  prev: TempoState,
  opts: {
    playerOutcome: ResolutionOutcome;
    bossOutcome: ResolutionOutcome;
    playerRelation: PlanRelation;
    bossRelation: PlanRelation;
    threadTimer?: number;
    thresholdProgress?: number;
    signatureUsed?: boolean;
    transformation?: boolean;
    expectationBreak?: boolean;
  },
): TempoState {
  let tension = prev.tension;
  const sources: string[] = [];

  if (opts.threadTimer != null && opts.threadTimer <= 2) {
    tension += 0.2;
    sources.push('armed thread');
  }
  if ((opts.thresholdProgress ?? 0) >= 2) {
    tension += 0.15;
    sources.push('world omen');
  }
  if (opts.bossRelation === 'advance' || opts.playerRelation === 'advance') {
    tension += 0.1;
    sources.push('plan advance');
  }
  if (opts.playerOutcome === 'partial' && opts.bossOutcome === 'partial') {
    tension += 0.05;
    sources.push('stalemate pressure');
  }

  let beat: TempoBeat = prev.beat;
  let spentLastRound = false;
  let recoveryLeft = Math.max(0, prev.recoveryLeft - 1);

  const rupture =
    opts.signatureUsed ||
    opts.transformation ||
    opts.expectationBreak ||
    opts.playerRelation === 'reverse' ||
    opts.bossRelation === 'reverse' ||
    opts.playerRelation === 'transfer' ||
    (opts.threadTimer === 0 && opts.bossRelation === 'advance');

  if (prev.recoveryLeft > 0 && !rupture) {
    beat = 'aftermath';
    tension = Math.max(0.15, tension - 0.25);
    sources.push('recovery');
  } else if (rupture && !prev.spentLastRound) {
    beat = 'rupture';
    spentLastRound = true;
    recoveryLeft = 1;
    tension = Math.max(0.2, tension - 0.35);
    sources.push('rupture release');
  } else if (tension >= 0.55) {
    beat = 'pressure';
    sources.push('tightening');
  } else {
    beat = 'lull';
    sources.push('quiet read');
    // Lulls still do work — keep a little tension so silence is charged.
    tension = Math.min(0.7, tension + 0.05);
  }

  // Resist consecutive ruptures.
  if (prev.beat === 'rupture' && beat === 'rupture' && !opts.transformation) {
    beat = 'aftermath';
    recoveryLeft = 1;
    spentLastRound = false;
    sources.push('forced aftermath');
  }

  const sameBeatStreak =
    beat === prev.beat ? prev.sameBeatStreak + 1 : 0;

  // Pacing drift: same weight three times → nudge.
  if (sameBeatStreak >= 2 && beat === 'pressure') {
    beat = 'lull';
    sources.push('pacing breath');
  }

  return {
    beat,
    tension: Math.max(0, Math.min(1, tension)),
    sources: sources.slice(0, 4),
    spentLastRound,
    recoveryLeft,
    sameBeatStreak: beat === prev.beat ? sameBeatStreak : 0,
  };
}
