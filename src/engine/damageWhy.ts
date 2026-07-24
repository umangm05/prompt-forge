import type { ParsedIntent, ResolutionOutcome } from '../types';

function outcomeVerb(o: ResolutionOutcome): string {
  switch (o) {
    case 'success':
      return 'fully landed';
    case 'partial':
      return 'partly landed';
    case 'failure':
      return 'missed';
    case 'backfire':
      return 'backfired';
  }
}

/** Plain-English causal lines so number changes teach the player. */
export function explainDamage(opts: {
  playerParsed: ParsedIntent;
  bossParsed: ParsedIntent;
  playerOutcome: ResolutionOutcome;
  bossOutcome: ResolutionOutcome;
  playerBodyDelta: number;
  playerResolveDelta: number;
  bossBodyDelta: number;
  bossResolveDelta: number;
  threatNote?: string;
}): { player: string; boss: string } {
  const {
    playerParsed,
    bossParsed,
    playerOutcome,
    bossOutcome,
    playerBodyDelta,
    playerResolveDelta,
    bossBodyDelta,
    bossResolveDelta,
    threatNote,
  } = opts;

  const playerLines: string[] = [];
  const bossLines: string[] = [];

  if (playerBodyDelta < -0.5 || playerResolveDelta < -0.5) {
    if (bossOutcome === 'backfire') {
      playerLines.push('You got clipped by fallout from their failed setup.');
    } else if (bossOutcome === 'failure') {
      playerLines.push(
        'Pressure still bit — positioning / field cost, not a clean boss hit.',
      );
    } else {
      playerLines.push(
        `Boss move ${outcomeVerb(bossOutcome)} (${bossParsed.intent.category}) while you were on ${playerParsed.intent.category}.`,
      );
    }
    if (threatNote) playerLines.push(threatNote);
  } else {
    playerLines.push('You avoided meaningful damage this beat.');
  }

  if (bossBodyDelta < -0.5 || bossResolveDelta < -0.5) {
    if (playerOutcome === 'backfire') {
      bossLines.push('Your own attempt snapped back — they were not the one hurt.');
    } else if (playerOutcome === 'failure') {
      bossLines.push('Little contact — your attempt did not seize the beat.');
    } else {
      bossLines.push(
        `Your ${playerParsed.intent.category} ${outcomeVerb(playerOutcome)} against their ${bossParsed.intent.category}.`,
      );
    }
  } else {
    bossLines.push('Boss shrugged off meaningful damage this beat.');
  }

  return {
    player: playerLines.join(' '),
    boss: bossLines.join(' '),
  };
}
