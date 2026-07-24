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
  CausalEvent,
  GameState,
  ParsedIntent,
  PlanRelation,
  ResolvedVerdict,
  ResolutionOutcome,
} from '../types';
import { explainDamage } from './damageWhy';
import { isInvestigative } from './discoveries';
import { extractObservableSignals } from './beliefs';
import { isAnchoredOnFacts } from './ledgers';
import { traitExploitBonus } from './hiddenTraits';
import { nextInitiative, shouldGainInitiative } from './initiative';
import { positionPlausibilityHint } from './positioning';
import { playerAimsAtThread } from './threats';
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
      against === 'body'
        ? BASE_BODY_HIT * 0.4
        : BASE_RESOLVE_HIT * BACKFIRE_RESOLVE_MULTIPLIER;
    return -hit;
  }
  const scale = outcomeScale(outcome) * plausibility;
  if (scale <= 0.05) return 0;
  if (category === 'SETUP' || category === 'MANIPULATION') {
    return against === 'resolve'
      ? -SETUP_RESOLVE_PRESSURE * scale * 1.4
      : -BASE_BODY_HIT * 0.2 * scale;
  }
  if (category === 'DEFENSE' || category === 'UTILITY') {
    return against === 'resolve' ? -SETUP_RESOLVE_PRESSURE * 0.3 * scale : 0;
  }
  return against === 'body'
    ? -BASE_BODY_HIT * scale
    : -BASE_RESOLVE_HIT * 0.6 * scale;
}

function inferRelation(
  outcome: ResolutionOutcome,
  judgmentRelation: PlanRelation | undefined,
  aimedAtThread: boolean,
  transfer?: boolean,
): PlanRelation {
  if (judgmentRelation && judgmentRelation !== 'none') return judgmentRelation;
  if (transfer) return 'transfer';
  if (outcome === 'success' && aimedAtThread) return 'break';
  if (outcome === 'success') return 'advance';
  if (outcome === 'partial') return 'stall';
  if (outcome === 'backfire') return 'break';
  return 'none';
}

function buildCausalEvents(
  judgment: ArbiterJudgment,
  playerParsed: ParsedIntent,
  bossParsed: ParsedIntent,
  playerRelation: PlanRelation,
  bossRelation: PlanRelation,
): CausalEvent[] {
  if (judgment.causalEvents?.length) {
    return judgment.causalEvents.map((e, i) => ({
      id: `ce-${i}`,
      actor: e.actor,
      method: e.method,
      target: e.target,
      fromState: e.fromState ?? 'prior',
      toState: e.toState ?? 'changed',
      relation: e.relation ?? 'none',
      narrative: e.narrative,
    }));
  }

  const events: CausalEvent[] = [];
  if (judgment.playerOutcome !== 'failure') {
    events.push({
      id: 'ce-player',
      actor: 'player',
      method: playerParsed.intent.raw.slice(0, 80),
      target: playerParsed.intent.target.toLowerCase(),
      fromState: 'attempt',
      toState: judgment.playerOutcome,
      relation: playerRelation,
      narrative: `Your ${playerParsed.intent.category.toLowerCase()} ${judgment.playerOutcome}.`,
    });
  }
  if (judgment.bossOutcome !== 'failure') {
    events.push({
      id: 'ce-boss',
      actor: 'boss',
      method: bossParsed.intent.raw.slice(0, 80),
      target: bossParsed.intent.target.toLowerCase(),
      fromState: 'commitment',
      toState: judgment.bossOutcome,
      relation: bossRelation,
      narrative: `Boss ${judgment.bossOutcome}: ${bossParsed.intent.raw.slice(0, 90)}`,
    });
  }
  return events;
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

  const contested = new Set(judgment.contestedAssumptions);
  const playerUsesAssumption = state.ledgers.assumptions.some(
    (a) =>
      contested.has(a) ||
      playerParsed.intent.raw.toLowerCase().includes(a.toLowerCase().slice(0, 12)),
  );
  if (playerUsesAssumption && contested.size > 0 && playerOutcome !== 'failure') {
    playerOutcome = 'backfire';
  }

  const aimed = playerAimsAtThread(
    playerParsed.intent.raw,
    state.tacticalThread ?? null,
  );
  // Mention alone never clears — need success/partial + break/reverse/transfer.
  const causalClear =
    judgment.clearThreat === true &&
    (playerOutcome === 'success' || playerOutcome === 'partial') &&
    aimed;

  const playerRelation = inferRelation(
    playerOutcome,
    judgment.playerRelation,
    aimed && causalClear,
    !!judgment.threadTransferTo && judgment.threadTransferTo === 'player',
  );
  const bossRelation = inferRelation(
    bossOutcome,
    judgment.bossRelation,
    false,
    false,
  );

  const playerBackfire = playerOutcome === 'backfire';
  const bossBackfire = bossOutcome === 'backfire';

  let playerBodyDelta = 0;
  let playerResolveDelta = 0;
  let bossBodyDelta = 0;
  let bossResolveDelta = 0;

  if (playerBackfire) {
    playerBodyDelta += damageFrom(
      playerOutcome,
      playerP,
      playerParsed.intent.category,
      true,
      'body',
    );
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
    bossBodyDelta += damageFrom(
      bossOutcome,
      bossP,
      bossParsed.intent.category,
      true,
      'body',
    );
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

  // Dilemma pressure: unanswered armed threads hurt; aiming without causal success does not clear.
  let threatNote: string | undefined;
  const thread = state.tacticalThread;
  if (
    thread &&
    thread.status !== 'broken' &&
    thread.status !== 'reversed' &&
    !causalClear &&
    bossOutcome !== 'failure'
  ) {
    playerResolveDelta -= 4;
    if (thread.tension === 'crisis' || thread.timer <= 1) {
      playerBodyDelta -= 3;
      playerResolveDelta -= 4;
    }
    threatNote = `Active thread unanswered: ${thread.label} — ${thread.payoff}`;
  } else if (causalClear && thread) {
    threatNote = `You broke the prepared line: ${thread.label}.`;
    bossResolveDelta -= 5;
  }

  // Expectation-break Resolve pressure applied later in gameLoop when detected.

  const hardenAssumptions = state.ledgers.assumptions.filter(
    (a) =>
      !contested.has(a) &&
      (playerOutcome === 'success' || bossOutcome === 'success') &&
      (playerParsed.intent.raw.toLowerCase().includes(a.toLowerCase().slice(0, 10)) ||
        bossParsed.intent.raw.toLowerCase().includes(a.toLowerCase().slice(0, 10))),
  );

  const awarenessTarget =
    judgment.awarenessTarget ??
    (playerParsed.intent.category === 'MANIPULATION' ? 'boss' : 'boss');

  const controlChange =
    playerRelation === 'transfer' ||
    playerRelation === 'reverse' ||
    causalClear ||
    judgment.signatureMomentId;

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
    (playerGains && playerOutcome === 'success') || !!controlChange,
    bossGains && bossOutcome === 'success' && !controlChange,
  );

  const causalEvents = buildCausalEvents(
    judgment,
    playerParsed,
    bossParsed,
    playerRelation,
    bossRelation,
  );

  // Zero-damage unless a causal event exists that can justify it.
  if (!causalEvents.length) {
    playerBodyDelta = 0;
    playerResolveDelta = 0;
    bossBodyDelta = 0;
    bossResolveDelta = 0;
  }

  const signals =
    judgment.observableSignals?.length
      ? judgment.observableSignals
      : extractObservableSignals(playerParsed, playerOutcome);

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
    causalEvents,
    fieldNames: state.world.fieldElements.map((e) => e.name),
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
    awarenessTarget,
    positionShift: judgment.positionShift,
    bossPositionShift: judgment.bossPositionShift ?? 'none',
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
    playerRelation,
    bossRelation,
    causalEvents,
    discoveries: judgment.discoveries ?? [],
    observableSignals: signals,
    damageWhyPlayer: judgment.damageWhy?.trim() || why.player,
    damageWhyBoss: why.boss,
    threadCleared: causalClear,
    threadTransferredTo: judgment.threadTransferTo ?? undefined,
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
    : Math.max(
        0.35,
        0.85 - playerParsed.complexity.total * 0.05 - playerParsed.fatiguePenalty,
      );
  const bossP = Math.max(0.4, 0.8 - bossParsed.complexity.total * 0.04);

  // Avoid defaulting everything to partial — use clearer bands.
  const playerOutcome: ResolutionOutcome =
    playerP > 0.72
      ? 'success'
      : playerP > 0.5
        ? 'partial'
        : playerP > 0.28
          ? 'failure'
          : 'backfire';
  const bossOutcome: ResolutionOutcome =
    bossP > 0.72 ? 'success' : bossP > 0.48 ? 'partial' : 'failure';

  const suggestedFacts: string[] = [];
  const battlefieldAdd: string[] = [];
  if (playerParsed.intent.category === 'SETUP' && playerOutcome !== 'failure') {
    suggestedFacts.push(`✔ ${playerParsed.intent.raw.slice(0, 48)}`);
    const snippet = playerParsed.intent.raw.match(
      /\b(smoke|water|chain|wire|mirror|oil|ember|barricade)\b/i,
    );
    if (snippet) battlefieldAdd.push(snippet[0]!);
  }

  const objects =
    state?.world.fieldElements.find((e) =>
      e.knownProperties.includes('objects'),
    )?.name ??
    state?.world.battlefield[2] ??
    'Railing';

  const threatLabel =
    bossOutcome === 'failure'
      ? null
      : {
          label: state?.tacticalThread?.label ?? `Damaged ${objects}`,
          foreshadow:
            state?.tacticalThread?.foreshadow ??
            'The metal groans. Rust flakes fall as the span begins to bend.',
          timer: state?.tacticalThread
            ? Math.max(1, state.tacticalThread.timer - (bossOutcome === 'success' ? 1 : 0))
            : 3,
          purpose: state?.tacticalThread?.purpose ?? 'Collapse a support',
          payoff: state?.tacticalThread?.payoff ?? 'Support fails into your lane',
        };

  const aimed = state
    ? playerAimsAtThread(playerParsed.intent.raw, state.tacticalThread ?? null)
    : false;
  const investigative =
    playerParsed.investigative ||
    isInvestigative(playerParsed.intent.raw, playerParsed.intent.category);

  const discoveries = investigative
    ? [
        {
          stimulus: playerParsed.intent.raw.slice(0, 80),
          finding:
            playerOutcome === 'failure'
              ? `${objects} does not react to that stimulus.`
              : `${objects} answers under the probe — a limit becomes visible.`,
          property:
            playerOutcome === 'failure'
              ? `inert to probe`
              : 'fails under sustained load',
        },
      ]
    : [];

  // Investigation never clears by itself.
  const clearThreat =
    aimed &&
    !investigative &&
    (playerOutcome === 'success' || playerOutcome === 'partial') &&
    /\b(cut|break|stop|disarm|sever|smash|collapse|interrupt)\b/i.test(
      playerParsed.intent.raw,
    );

  const signals = extractObservableSignals(playerParsed, playerOutcome);

  return {
    playerPlausibility: playerP,
    bossPlausibility: bossP,
    playerOutcome,
    bossOutcome,
    playerRelation: clearThreat
      ? 'break'
      : playerOutcome === 'success'
        ? 'advance'
        : playerOutcome === 'partial'
          ? 'stall'
          : 'none',
    bossRelation: bossOutcome === 'success' ? 'advance' : 'stall',
    contestedAssumptions: [],
    targetAwarenessShift:
      playerParsed.intent.category === 'MANIPULATION' && playerOutcome === 'success'
        ? 'degrade'
        : 'none',
    awarenessTarget: 'boss',
    positionShift:
      playerParsed.intent.category === 'UTILITY'
        ? /\b(retreat|back|away)\b/i.test(playerParsed.intent.raw)
          ? 'farther'
          : 'closer'
        : 'none',
    bossPositionShift: bossParsed.intent.category === 'UTILITY' ? 'closer' : 'none',
    hiddenTraitHint: '',
    suggestedFacts,
    suggestedAssumptions:
      playerParsed.intent.category === 'MANIPULATION'
        ? [`? Opponent is unsettled by the maneuver`]
        : [],
    battlefieldAdd,
    battlefieldRemove: clearThreat ? [] : [],
    causalEvents: [
      {
        actor: 'boss',
        method: bossParsed.intent.raw.slice(0, 80),
        target: objects,
        narrative: `Boss commits with tool: ${bossParsed.intent.raw.slice(0, 90)}`,
        relation: bossOutcome === 'success' ? 'advance' : 'stall',
      },
      {
        actor: 'player',
        method: playerParsed.intent.raw.slice(0, 80),
        target: 'field',
        narrative: `Player attempt ${playerOutcome}.`,
        relation: clearThreat ? 'break' : 'advance',
      },
    ],
    discoveries,
    observableSignals: signals,
    judgmentNarrative: [
      `• Boss commits: ${bossParsed.intent.raw.slice(0, 90)}`,
      `• Your attempt ${playerOutcome}; theirs ${bossOutcome}`,
      threatLabel
        ? `• Field pressure: ${threatLabel.label}`
        : '• Boss pressure stalls this beat',
      discoveries[0] ? `• Discovery: ${discoveries[0].finding}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
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
    clearThreat,
  };
}
