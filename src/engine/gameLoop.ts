import type {
  ArbiterJudgment,
  BossArchetype,
  CompactGameSnapshot,
  EmotionalTrigger,
  GameState,
  MatchLogEntry,
  ParsedIntent,
  ResolvedVerdict,
} from '../types';
import { applyAwarenessShift } from './awareness';
import {
  buildBossObservation,
  reviseBeliefsOnContradiction,
  updateBeliefsFromSignals,
} from './beliefs';
import {
  commitBossForRound,
  createBossAgenda,
  generateBossIntent,
  updateBossAgenda,
  buildCommitmentFromObservation,
} from './bossArchetypes';
import { getBossPersonality } from './bossPersonalities';
import { resolveExperiment } from './discoveries';
import {
  clearStaleEvent,
  evaluateWorldThresholds,
  maybeInjectEnvironmentalEvent,
  currentOmen,
} from './environmentalEvents';
import { applyFieldMutations, syncBattlefieldLabels } from './fieldElements';
import { pickHiddenTrait, revealTrait } from './hiddenTraits';
import { parseIntent } from './inputParser';
import { applyLedgerMutations, createEmptyLedgers } from './ledgers';
import { applyPositionShift } from './positioning';
import { mockJudgment, resolveJudgment } from './resolution';
import { rollStartingLayout } from './startingWorld';
import { createTempoState, shapeTempo } from './tempo';
import { detectTemptation, tickTemptation } from './temptations';
import {
  crisisPayoff,
  tensionPhase,
  threadFromJudgment,
  threadToThreat,
} from './threats';
import {
  applyDeltas,
  checkWinner,
  recalculateRealityPressure,
} from './vitality';
import { recordConcepts } from './wordFatigue';

export function createInitialState(
  bossArchetype: BossArchetype = 'lawyer',
): GameState {
  const start = rollStartingLayout();
  const personality = getBossPersonality(bossArchetype);
  let state: GameState = {
    round: 1,
    player: {
      id: 'player',
      name: 'Player',
      body: 100,
      resolve: 100,
      awareness: 'FULL',
      position: start.playerPosition,
      hiddenTrait: pickHiddenTrait(Date.now()),
      hiddenTraitRevealed: false,
      conceptUsage: {},
    },
    boss: {
      id: 'boss',
      name: 'Boss',
      body: 100,
      resolve: 100,
      awareness: 'FULL',
      position: start.bossPosition,
      hiddenTrait: pickHiddenTrait(Date.now() + 7),
      hiddenTraitRevealed: false,
      conceptUsage: {},
    },
    ledgers: createEmptyLedgers(),
    world: start.world,
    bossAgenda: createBossAgenda(bossArchetype),
    tacticalThread: undefined,
    activeThreat: undefined,
    tempo: createTempoState(),
    temptation: undefined,
    discoveries: [],
    lastCausalEvents: [],
    log: [],
    matchLog: [],
  };

  // Pre-commit the opening boss Argument before any player input.
  const { state: committed } = commitBossForRound(state);
  state = committed;
  state.boss.name = personality.name;
  return state;
}

export function beginRound(state: GameState): GameState {
  let world = clearStaleEvent(state.world, state.round);
  world = maybeInjectEnvironmentalEvent(world);

  // Ensure a visible commitment exists before the player types.
  let next = { ...state, world };
  if (!next.bossAgenda.commitment) {
    const { state: committed } = commitBossForRound(next);
    next = committed;
  }
  return next;
}

export function parsePlayerIntent(
  state: GameState,
  raw: string,
): ParsedIntent {
  return parseIntent(raw, state.player);
}

export function buildBossParsed(state: GameState): ParsedIntent {
  const intent = generateBossIntent(state);
  return parseIntent(intent.raw, state.boss);
}

/** Prefer the precommitted Argument; never invent from current player text. */
export function resolveBossParsed(
  state: GameState,
  bossIntentRaw: string | undefined,
): ParsedIntent {
  const committed = state.bossAgenda.commitment?.raw?.trim();
  if (committed) {
    const parsed = parseIntent(committed, state.boss);
    if (!parsed.rejected) return parsed;
  }
  const raw = bossIntentRaw?.trim();
  if (raw) {
    const parsed = parseIntent(raw, state.boss);
    if (!parsed.rejected) return parsed;
  }
  return buildBossParsed(state);
}

export function buildSnapshot(
  state: GameState,
  playerParsed: ParsedIntent,
  opts?: { bossParsed?: ParsedIntent; generateBossIntent?: boolean },
): CompactGameSnapshot {
  const personality = getBossPersonality(state.bossAgenda.archetype);
  const bossParsed = opts?.bossParsed ?? buildBossParsed(state);
  const recentBossIntents = state.matchLog
    .slice(-4)
    .map((m) => m.bossPrompt)
    .filter(Boolean);

  return {
    round: state.round,
    initiative: state.world.initiative,
    realityPressure: state.world.realityPressure,
    environmentalEvent: state.world.environmentalEvent,
    battlefield: state.world.battlefield,
    fieldElements: state.world.fieldElements.map((e) => ({
      name: e.name,
      condition: e.condition,
      knownProperties: e.knownProperties,
      scars: e.scars,
    })),
    facts: state.ledgers.facts,
    assumptions: state.ledgers.assumptions,
    player: {
      body: state.player.body,
      resolve: state.player.resolve,
      awareness: state.player.awareness,
      position: state.player.position,
      hiddenTraitRevealed: state.player.hiddenTraitRevealed,
      hiddenTrait: state.player.hiddenTraitRevealed
        ? state.player.hiddenTrait
        : undefined,
    },
    boss: {
      body: state.boss.body,
      resolve: state.boss.resolve,
      awareness: state.boss.awareness,
      position: state.boss.position,
      archetype: state.bossAgenda.archetype,
      agendaProgress: state.bossAgenda.progress,
      posture: state.bossAgenda.posture,
      definingFlaw: state.bossAgenda.definingFlaw,
      personality: {
        name: personality.name,
        trait: personality.trait,
        goal: personality.goal,
        motive: personality.motive,
        voice: personality.voice,
        toolkit: personality.toolkit,
        tactics: personality.tactics,
        taboos: personality.taboos,
        sampleMoves: personality.sampleMoves,
        biases: personality.biases,
        obsessions: personality.obsessions,
        prideRule: personality.prideRule,
        fear: personality.fear,
        habit: personality.habit,
        blindSpots: personality.blindSpots,
        breakingPoint: personality.breakingPoint,
        signatureMoments: personality.signatureMoments,
      },
    },
    committedBossIntent: bossParsed.intent,
    playerIntent: playerParsed.intent,
    bossIntent: bossParsed.intent,
    playerFatiguePenalty: playerParsed.fatiguePenalty,
    bossFatiguePenalty: bossParsed.fatiguePenalty,
    // Commitment loop: Arbiter must NOT invent a new boss Argument after reading the player.
    generateBossIntent: false,
    activeThreat: state.activeThreat,
    tacticalThread: state.tacticalThread,
    tempo: state.tempo,
    temptationForeshadow: state.temptation?.foreshadow,
    tension: tensionPhase(state.round, state.tacticalThread),
    recentBossIntents,
    discoveries: state.discoveries.slice(-4),
    omen: currentOmen(state.world),
    lastTransformation: state.world.lastTransformation,
  };
}

function collectEmotionalTriggers(
  state: GameState,
  verdict: ResolvedVerdict,
  judgment: ArbiterJudgment | undefined,
): EmotionalTrigger[] {
  const triggers = [...state.bossAgenda.emotionalTriggers];
  const p = getBossPersonality(state.bossAgenda.archetype);
  const removed = verdict.battlefieldMutations.remove.join(' ').toLowerCase();
  const added = verdict.battlefieldMutations.add.join(' ').toLowerCase();
  const blob = `${removed} ${added} ${judgment?.judgmentNarrative ?? ''}`.toLowerCase();

  if (
    /mirror|shard|banner|seal|ledger|tablet/.test(blob) &&
    (verdict.playerRelation === 'break' ||
      verdict.battlefieldMutations.remove.length > 0)
  ) {
    triggers.push({
      id: `emo-${state.round}-cherish`,
      kind: 'cherished_destroyed',
      description: `A cherished prop was damaged: ${blob.slice(0, 60)}`,
      round: state.round,
      spent: false,
    });
  }
  if (verdict.bossOutcome === 'backfire' || verdict.bossOutcome === 'failure') {
    triggers.push({
      id: `emo-${state.round}-fail`,
      kind: 'failed_method',
      description: `Method failed: ${state.bossAgenda.commitment?.method ?? 'tool'}`,
      round: state.round,
      spent: false,
    });
  }
  if (
    verdict.playerOutcome === 'success' &&
    /humiliat|laugh|ignore|break|shatter/i.test(judgment?.bossReaction ?? '')
  ) {
    triggers.push({
      id: `emo-${state.round}-pride`,
      kind: 'pride_challenged',
      description: p.breakingPoint,
      round: state.round,
      spent: false,
    });
  }
  return triggers.slice(-6);
}

export function applyResolvedVerdict(
  state: GameState,
  verdict: ResolvedVerdict,
  playerParsed: ParsedIntent,
  bossParsed: ParsedIntent,
  judgment?: ArbiterJudgment,
): GameState {
  let playerBodyDelta = verdict.playerBodyDelta;
  let playerResolveDelta = verdict.playerResolveDelta;

  // Thread lifecycle — causal clear only.
  let workingThread = state.tacticalThread;
  if (judgment) {
    workingThread = threadFromJudgment(
      { ...state, tacticalThread: workingThread },
      {
        ...judgment,
        clearThreat: verdict.threadCleared,
        threadTransferTo: verdict.threadTransferredTo,
        playerRelation: verdict.playerRelation,
      },
      verdict.bossRelation,
    );
  }

  const payoff = crisisPayoff(
    workingThread && workingThread.timer <= 0 ? workingThread : null,
  );
  if (payoff) {
    playerBodyDelta += payoff.playerBody;
    playerResolveDelta += payoff.playerResolve;
    workingThread = workingThread
      ? { ...workingThread, status: 'spent', foreshadow: payoff.note }
      : undefined;
  }

  // Experiments always teach — apply discovery mutations.
  const experiment = resolveExperiment(state, playerParsed, verdict.playerOutcome);
  let world = {
    ...state.world,
    fieldElements: experiment.elements,
  };
  world = syncBattlefieldLabels(world);
  world = applyFieldMutations(
    world,
    verdict.battlefieldMutations.add,
    verdict.battlefieldMutations.remove,
    verdict.playerRelation === 'break' || verdict.playerRelation === 'transfer'
      ? 'player'
      : 'boss',
  );

  let player = applyDeltas(state.player, playerBodyDelta, playerResolveDelta);
  let boss = applyDeltas(
    state.boss,
    verdict.bossBodyDelta,
    verdict.bossResolveDelta,
  );

  // Independent awareness + position tracks.
  if (verdict.awarenessTarget === 'player') {
    player = applyAwarenessShift(player, verdict.targetAwarenessShift);
  } else {
    boss = applyAwarenessShift(boss, verdict.targetAwarenessShift);
  }
  player = {
    ...player,
    position: applyPositionShift(player.position, verdict.positionShift),
  };
  boss = {
    ...boss,
    position: applyPositionShift(boss.position, verdict.bossPositionShift),
  };

  const traitReveal = revealTrait(boss, verdict.hiddenTraitRevealed);
  boss = traitReveal.entity;

  player = recordConcepts(player, playerParsed.concepts);
  boss = recordConcepts(boss, bossParsed.concepts);

  const ledgers = applyLedgerMutations(state.ledgers, verdict.ledgerMutations);

  // Beliefs from observables only — then check expectation breaks.
  let beliefs = updateBeliefsFromSignals(
    {
      ...state,
      player,
      boss,
      ledgers,
      world,
    },
    verdict.observableSignals,
    playerParsed,
  );
  const revised = reviseBeliefsOnContradiction(
    beliefs,
    playerParsed,
    state.bossAgenda.commitment?.purpose,
  );
  beliefs = revised.beliefs;
  let expectationBreak = revised.expectationBreak ?? verdict.expectationBreak;
  if (expectationBreak) {
    boss = applyDeltas(boss, 0, -8);
    player = {
      ...player,
    };
  }

  // World thresholds from accumulated causal state.
  world = evaluateWorldThresholds(
    world,
    verdict.causalEvents.map((e) => e.narrative),
  );

  const tempo = shapeTempo(state.tempo, {
    playerOutcome: verdict.playerOutcome,
    bossOutcome: verdict.bossOutcome,
    playerRelation: verdict.playerRelation,
    bossRelation: verdict.bossRelation,
    threadTimer: workingThread?.timer,
    thresholdProgress: world.thresholds.find((t) => !t.triggered)?.progress,
    signatureUsed: !!judgment?.signatureMomentId ||
      state.bossAgenda.commitment?.posture === 'signature',
    transformation: !!world.lastTransformation &&
      world.lastTransformation !== state.world.lastTransformation,
    expectationBreak: !!expectationBreak,
  });

  world = {
    ...world,
    initiative:
      verdict.initiativeWinner === 'none'
        ? state.world.initiative
        : verdict.initiativeWinner,
  };
  world = {
    ...world,
    realityPressure: recalculateRealityPressure(world, player, boss),
  };

  const emotionalTriggers = collectEmotionalTriggers(
    state,
    verdict,
    judgment,
  ).map((t) =>
    judgment?.signatureMomentId && !t.spent
      ? { ...t, spent: true }
      : t,
  );

  let bossAgenda = updateBossAgenda(
    {
      ...state.bossAgenda,
      beliefs,
      emotionalTriggers,
    },
    { ...state, player, boss, ledgers, world, tacticalThread: workingThread },
    verdict.bossOutcome,
    {
      posture: state.bossAgenda.commitment?.posture,
      signatureId:
        judgment?.signatureMomentId ??
        state.bossAgenda.commitment?.signatureId,
      failedMethod:
        verdict.bossOutcome === 'failure' || verdict.bossOutcome === 'backfire'
          ? state.bossAgenda.commitment?.method
          : undefined,
      unavailable:
        verdict.bossRelation === 'break'
          ? [state.bossAgenda.commitment?.method ?? ''].filter(Boolean)
          : undefined,
    },
  );

  const discoveries = [
    ...state.discoveries,
    ...verdict.discoveries,
    ...(experiment.discovery ? [experiment.discovery] : []),
  ].slice(-12);

  let nextState: GameState = {
    ...state,
    round: state.round + 1,
    player,
    boss,
    ledgers,
    world,
    bossAgenda,
    tacticalThread:
      workingThread &&
      (workingThread.status === 'spent' || workingThread.status === 'broken')
        ? undefined
        : workingThread,
    activeThreat: threadToThreat(
      workingThread &&
        workingThread.status !== 'spent' &&
        workingThread.status !== 'broken'
        ? workingThread
        : undefined,
    ),
    tempo,
    temptation: undefined,
    discoveries,
    lastCausalEvents: verdict.causalEvents,
    lastExpectationBreak: expectationBreak,
    winner: checkWinner(player, boss),
    log: [
      ...state.log,
      `R${state.round}: You [${verdict.playerOutcome}/${verdict.playerRelation}] vs Boss [${verdict.bossOutcome}/${verdict.bossRelation}] · tempo=${tempo.beat}`,
    ].slice(-20),
    matchLog: state.matchLog,
  };

  nextState.temptation = detectTemptation(nextState) ?? tickTemptation(state.temptation);

  // Recommit for the next round from sanitized observation — no private player aim.
  const observation = buildBossObservation(
    nextState,
    verdict.observableSignals,
  );
  const nextCommitment = buildCommitmentFromObservation(nextState, observation);
  nextState = {
    ...nextState,
    bossAgenda: {
      ...nextState.bossAgenda,
      nextCommitment,
      commitment: nextCommitment,
      posture: nextCommitment.posture,
    },
  };

  return nextState;
}

export function appendMatchLog(
  state: GameState,
  entry: Omit<MatchLogEntry, 'round'> & { round?: number },
): GameState {
  const row: MatchLogEntry = {
    round: entry.round ?? Math.max(1, state.round - 1),
    playerPrompt: entry.playerPrompt,
    bossPrompt: entry.bossPrompt,
    arbiterText: entry.arbiterText,
    playerOutcome: entry.playerOutcome,
    bossOutcome: entry.bossOutcome,
    judgmentMs: entry.judgmentMs,
  };
  return {
    ...state,
    matchLog: [...state.matchLog, row].slice(-40),
  };
}

export function resolveWithJudgment(
  state: GameState,
  judgment: ArbiterJudgment,
  playerParsed: ParsedIntent,
  bossParsed: ParsedIntent,
): { verdict: ResolvedVerdict; next: GameState } {
  const verdict = resolveJudgment(state, judgment, playerParsed, bossParsed);
  const next = applyResolvedVerdict(
    state,
    verdict,
    playerParsed,
    bossParsed,
    judgment,
  );
  return { verdict, next };
}

export function resolveWithMock(
  state: GameState,
  playerParsed: ParsedIntent,
  bossParsed: ParsedIntent,
): { judgment: ArbiterJudgment; verdict: ResolvedVerdict; next: GameState } {
  const judgment = mockJudgment(playerParsed, bossParsed, state);
  // Force judgment bossIntent to the precommitted text.
  judgment.bossIntent = bossParsed.intent.raw;
  const { verdict, next } = resolveWithJudgment(
    state,
    judgment,
    playerParsed,
    bossParsed,
  );
  return { judgment, verdict, next };
}

export {
  composeJudgmentDocument,
  defaultBossReaction,
  enrichMockStory,
} from './narrative';
