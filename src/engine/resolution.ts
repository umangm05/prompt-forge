import {
  BACKFIRE_RESOLVE_MULTIPLIER,
  BASE_BODY_HIT,
  BASE_RESOLVE_HIT,
  CONSISTENCY_BONUS,
  INITIATIVE_PENALTY,
  SETUP_RESOLVE_PRESSURE,
} from '../config/gameConfig';
import type {
  ArbiterJudgment,
  GameState,
  ParsedIntent,
  ResolvedVerdict,
  ResolutionOutcome,
} from '../types';
import { explainDamage } from './damageWhy';
import { isAnchoredOnFacts } from './ledgers';
import { traitExploitBonus } from './hiddenTraits';
import { nextInitiative, shouldGainInitiative } from './initiative';
import { positionPlausibilityHint } from './positioning';
import { playerAddressesThreat } from './threats';
import { realityDistortionMultiplier } from './vitality';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function outcomeScale(outcome: ResolutionOutcome): number {
  switch (outcome) {
    case 'success':
      return 1;
    case 'partial':
      return 0.55;
    case 'failure':
      return 0.1;
    case 'backfire':
      return 0;
  }
}

function adjustPlausibility(
  base: number,
  state: GameState,
  parsed: ParsedIntent,
  side: 'player' | 'boss',
): number {
  let p = base;
  const entity = side === 'player' ? state.player : state.boss;
  const opponent = side === 'player' ? state.boss : state.player;

  if (state.world.initiative !== side) p -= INITIATIVE_PENALTY;
  if (isAnchoredOnFacts(parsed.intent.raw, state.ledgers.facts)) {
    p += CONSISTENCY_BONUS;
  }
  p += positionPlausibilityHint(entity.position, parsed.intent.category);
  p += traitExploitBonus(
    parsed.intent.raw,
    opponent.hiddenTrait,
    opponent.hiddenTraitRevealed,
  );
  p -= parsed.fatiguePenalty;
  p *= realityDistortionMultiplier(entity.resolve);

  if (parsed.complexity.overBudget) p -= 0.25;
  if (parsed.complexity.largeArea) p -= 0.1;
  if (opponent.awareness === 'FALSE_INFO' && side === 'player') p += 0.15;
  if (entity.awareness === 'FALSE_INFO') p -= 0.35;

  return clamp01(p);
}

function damageFrom(
  outcome: ResolutionOutcome,
  plausibility: number,
  category: string,
  backfire: boolean,
  against: 'body' | 'resolve',
): number {
  if (backfire) {
    const hit =
      against === 'body' ? BASE_BODY_HIT * 0.4 : BASE_RESOLVE_HIT * BACKFIRE_RESOLVE_MULTIPLIER;
    return -hit;
  }
  const scale = outcomeScale(outcome) * plausibility;
  if (scale <= 0.05) return 0;
  if (category === 'SETUP' || category === 'MANIPULATION') {
    return against === 'resolve' ? -SETUP_RESOLVE_PRESSURE * scale * 1.4 : -BASE_BODY_HIT * 0.2 * scale;
  }
  if (category === 'DEFENSE' || category === 'UTILITY') {
    return against === 'resolve' ? -SETUP_RESOLVE_PRESSURE * 0.3 * scale : 0;
  }
  return against === 'body'
    ? -BASE_BODY_HIT * scale
    : -BASE_RESOLVE_HIT * 0.6 * scale;
}

export function resolveJudgment(
  state: GameState,
  judgment: ArbiterJudgment,
  playerParsed: ParsedIntent,
  bossParsed: ParsedIntent,
): ResolvedVerdict {
  const playerP = adjustPlausibility(
    judgment.playerPlausibility,
    state,
    playerParsed,
    'player',
  );
  const bossP = adjustPlausibility(
    judgment.bossPlausibility,
    state,
    bossParsed,
    'boss',
  );

  let playerOutcome = judgment.playerOutcome;
  let bossOutcome = judgment.bossOutcome;

  // Contested yellow assumptions -> backfire weight on initiator
  const contested = new Set(judgment.contestedAssumptions);
  const playerUsesAssumption = state.ledgers.assumptions.some(
    (a) =>
      contested.has(a) ||
      playerParsed.intent.raw.toLowerCase().includes(a.toLowerCase().slice(0, 12)),
  );
  if (playerUsesAssumption && contested.size > 0 && playerOutcome !== 'failure') {
    playerOutcome = 'backfire';
  }

  const playerBackfire = playerOutcome === 'backfire';
  const bossBackfire = bossOutcome === 'backfire';

  let playerBodyDelta = 0;
  let playerResolveDelta = 0;
  let bossBodyDelta = 0;
  let bossResolveDelta = 0;

  // Simultaneous: each successful attack hits the other; backfire hits initiator
  if (playerBackfire) {
    playerBodyDelta += damageFrom(playerOutcome, playerP, playerParsed.intent.category, true, 'body');
    playerResolveDelta += damageFrom(
      playerOutcome,
      playerP,
      playerParsed.intent.category,
      true,
      'resolve',
    );
  } else {
    bossBodyDelta += damageFrom(
      playerOutcome,
      playerP,
      playerParsed.intent.category,
      false,
      'body',
    );
    bossResolveDelta += damageFrom(
      playerOutcome,
      playerP,
      playerParsed.intent.category,
      false,
      'resolve',
    );
  }

  if (bossBackfire) {
    bossBodyDelta += damageFrom(bossOutcome, bossP, bossParsed.intent.category, true, 'body');
    bossResolveDelta += damageFrom(
      bossOutcome,
      bossP,
      bossParsed.intent.category,
      true,
      'resolve',
    );
  } else {
    playerBodyDelta += damageFrom(
      bossOutcome,
      bossP,
      bossParsed.intent.category,
      false,
      'body',
    );
    playerResolveDelta += damageFrom(
      bossOutcome,
      bossP,
      bossParsed.intent.category,
      false,
      'resolve',
    );
  }

  // Dilemma pressure: unanswered threats hurt Resolve harder; answering them softens.
  const addressed = playerAddressesThreat(
    playerParsed.intent.raw,
    state.activeThreat ?? null,
  );
  let threatNote: string | undefined;
  if (state.activeThreat && !addressed && bossOutcome !== 'failure') {
    playerResolveDelta -= 4;
    if (state.activeThreat.tension === 'crisis') {
      playerBodyDelta -= 3;
      playerResolveDelta -= 4;
    }
    threatNote = `Active threat unanswered: ${state.activeThreat.label}.`;
  } else if (state.activeThreat && addressed) {
    threatNote = `You answered the threat: ${state.activeThreat.label}.`;
  }

  // Uncontested yellow assumptions that were acted on may harden
  const hardenAssumptions = state.ledgers.assumptions.filter(
    (a) =>
      !contested.has(a) &&
      (playerOutcome === 'success' || bossOutcome === 'success') &&
      (playerParsed.intent.raw.toLowerCase().includes(a.toLowerCase().slice(0, 10)) ||
        bossParsed.intent.raw.toLowerCase().includes(a.toLowerCase().slice(0, 10))),
  );

  const playerGains = shouldGainInitiative(
    playerOutcome,
    judgment.targetAwarenessShift === 'hijack' ||
      judgment.targetAwarenessShift === 'degrade'
      ? 'LOST'
      : state.boss.awareness,
  );
  const bossGains = shouldGainInitiative(bossOutcome, state.player.awareness);
  const initiativeWinner = nextInitiative(
    state.world.initiative,
    playerGains && playerOutcome === 'success',
    bossGains && bossOutcome === 'success',
  );

  const pBody = Math.round(playerBodyDelta * 10) / 10;
  const pRes = Math.round(playerResolveDelta * 10) / 10;
  const bBody = Math.round(bossBodyDelta * 10) / 10;
  const bRes = Math.round(bossResolveDelta * 10) / 10;
  const why = explainDamage({
    playerParsed,
    bossParsed,
    playerOutcome,
    bossOutcome,
    playerBodyDelta: pBody,
    playerResolveDelta: pRes,
    bossBodyDelta: bBody,
    bossResolveDelta: bRes,
    threatNote,
  });

  return {
    calculatedComplexity: {
      player: playerParsed.complexity.total,
      boss: bossParsed.complexity.total,
    },
    playerBodyDelta: pBody,
    playerResolveDelta: pRes,
    bossBodyDelta: bBody,
    bossResolveDelta: bRes,
    targetAwarenessShift: judgment.targetAwarenessShift,
    positionShift: judgment.positionShift,
    initiativeWinner,
    hiddenTraitRevealed: judgment.hiddenTraitHint,
    ledgerMutations: {
      addFacts: judgment.suggestedFacts,
      addAssumptions: judgment.suggestedAssumptions,
      hardenAssumptions,
      removeAssumptions: [...contested],
    },
    battlefieldMutations: {
      add: judgment.battlefieldAdd,
      remove: judgment.battlefieldRemove,
    },
    playerOutcome,
    bossOutcome,
    damageWhyPlayer: judgment.damageWhy?.trim() || why.player,
    damageWhyBoss: why.boss,
  };
}

/** Deterministic mock judgment for offline testing without an API key. */
export function mockJudgment(
  playerParsed: ParsedIntent,
  bossParsed: ParsedIntent,
  state?: GameState,
): ArbiterJudgment {
  const playerP = playerParsed.rejected
    ? 0.1
    : Math.max(0.35, 0.85 - playerParsed.complexity.total * 0.05 - playerParsed.fatiguePenalty);
  const bossP = Math.max(0.4, 0.8 - bossParsed.complexity.total * 0.04);

  const playerOutcome: ResolutionOutcome =
    playerP > 0.7 ? 'success' : playerP > 0.45 ? 'partial' : playerP > 0.25 ? 'failure' : 'backfire';
  const bossOutcome: ResolutionOutcome =
    bossP > 0.7 ? 'success' : bossP > 0.45 ? 'partial' : 'failure';

  const suggestedFacts: string[] = [];
  const battlefieldAdd: string[] = [];
  if (playerParsed.intent.category === 'SETUP' && playerOutcome !== 'failure') {
    suggestedFacts.push(`✔ ${playerParsed.intent.raw.slice(0, 48)}`);
  }

  const objects = state?.world.battlefield[2] ?? 'Railing';
  const threatLabel =
    bossOutcome === 'failure'
      ? null
      : {
          label: `Damaged ${objects}`,
          foreshadow:
            'The metal groans. Rust flakes fall as the span begins to bend.',
          timer: 3,
        };

  const addressed = state
    ? playerAddressesThreat(playerParsed.intent.raw, state.activeThreat ?? null)
    : false;

  return {
    playerPlausibility: playerP,
    bossPlausibility: bossP,
    playerOutcome,
    bossOutcome,
    contestedAssumptions: [],
    targetAwarenessShift:
      playerParsed.intent.category === 'MANIPULATION' && playerOutcome === 'success'
        ? 'degrade'
        : 'none',
    positionShift:
      playerParsed.intent.category === 'UTILITY'
        ? 'closer'
        : bossParsed.intent.category === 'UTILITY'
          ? 'farther'
          : 'none',
    hiddenTraitHint: '',
    suggestedFacts,
    suggestedAssumptions:
      playerParsed.intent.category === 'MANIPULATION'
        ? [`? Opponent is unsettled by the maneuver`]
        : [],
    battlefieldAdd,
    battlefieldRemove: [],
    judgmentNarrative: [
      `• Boss commits: ${bossParsed.intent.raw.slice(0, 90)}`,
      `• Your attempt ${playerOutcome}; theirs ${bossOutcome}`,
      threatLabel
        ? `• New pressure: ${threatLabel.label}`
        : '• Boss pressure stalls this beat',
    ].join('\n'),
    bossReaction: bossParsed.intent.raw.slice(0, 120),
    bossIntent: bossParsed.intent.raw,
    damageWhy: '',
    fieldSigns: threatLabel
      ? [
          `⚠ ${threatLabel.label} (${threatLabel.timer})`,
          threatLabel.foreshadow,
        ]
      : ['The arena holds still — for now.'],
    activeThreat: threatLabel,
    clearThreat: addressed,
  };
}
