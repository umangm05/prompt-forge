import type {
  CausalEvent,
  ParsedIntent,
  ResolutionOutcome,
} from '../types';

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
  causalEvents?: CausalEvent[];
  fieldNames?: string[];
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
    causalEvents,
    fieldNames,
  } = opts;

  const bossEvent = causalEvents?.find((e) => e.actor === 'boss');
  const playerEvent = causalEvents?.find((e) => e.actor === 'player');
  const prop = fieldNames?.[2] ?? fieldNames?.[0] ?? 'the field';

  const playerLines: string[] = [];
  const bossLines: string[] = [];

  if (playerBodyDelta < -0.5 || playerResolveDelta < -0.5) {
    if (bossOutcome === 'backfire') {
      playerLines.push(
        `Fallout from their failed ${bossParsed.intent.category.toLowerCase()} clips you near ${prop}.`,
      );
    } else if (bossEvent) {
      playerLines.push(
        bossEvent.narrative.length > 20
          ? bossEvent.narrative
          : `Their ${bossEvent.method} catches you — ${prop} makes the hit real.`,
      );
    } else if (bossOutcome === 'failure') {
      playerLines.push(
        `Pressure still bites through ${prop} — positioning cost, not a clean boss hit.`,
      );
    } else {
      playerLines.push(
        `The boss's ${bossParsed.intent.category.toLowerCase()} lands through ${prop} while you commit to ${playerParsed.intent.category.toLowerCase()}.`,
      );
    }
    if (threatNote) playerLines.push(threatNote);
  } else {
    playerLines.push('You avoided meaningful damage this beat.');
  }

  if (bossBodyDelta < -0.5 || bossResolveDelta < -0.5) {
    if (playerOutcome === 'backfire') {
      bossLines.push('Your own attempt snapped back — they were not the one hurt.');
    } else if (playerEvent) {
      bossLines.push(
        playerEvent.narrative.length > 20
          ? playerEvent.narrative
          : `Your move forces a cost through ${prop}.`,
      );
    } else if (playerOutcome === 'failure') {
      bossLines.push('Little contact — your attempt did not seize the beat.');
    } else {
      bossLines.push(
        `Your ${playerParsed.intent.category.toLowerCase()} lands against their ${bossParsed.intent.category.toLowerCase()}.`,
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
