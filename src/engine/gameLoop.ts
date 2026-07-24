import type {
  ArbiterJudgment,
  BossArchetype,
  CompactGameSnapshot,
  GameState,
  MatchLogEntry,
  ParsedIntent,
  ResolvedVerdict,
} from '../types';
import { applyAwarenessShift } from './awareness';
import { createBossAgenda, generateBossIntent, updateBossAgenda } from './bossArchetypes';
import { getBossPersonality } from './bossPersonalities';
import {
  clearStaleEvent,
  maybeInjectEnvironmentalEvent,
} from './environmentalEvents';
import { pickHiddenTrait, revealTrait } from './hiddenTraits';
import { parseIntent } from './inputParser';
import { applyLedgerMutations, createEmptyLedgers } from './ledgers';
import { isNearDuplicateLabel } from './labelDedupe';
import { applyPositionShift } from './positioning';
import { mockJudgment, resolveJudgment } from './resolution';
import { rollStartingLayout } from './startingWorld';
import {
  crisisPayoff,
  playerAddressesThreat,
  tensionPhase,
  threatFromJudgment,
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
  return {
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
    activeThreat: undefined,
    log: [],
    matchLog: [],
  };
}

export function beginRound(state: GameState): GameState {
  let world = clearStaleEvent(state.world, state.round);
  world = maybeInjectEnvironmentalEvent(world);
  return { ...state, world };
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

/** Parse boss Argument returned by the Arbiter; fall back to offline generator. */
export function resolveBossParsed(
  state: GameState,
  bossIntentRaw: string | undefined,
): ParsedIntent {
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
  const generate = opts?.generateBossIntent ?? !opts?.bossParsed;
  const bossParsed = opts?.bossParsed;
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
      },
    },
    playerIntent: playerParsed.intent,
    bossIntent: generate ? undefined : bossParsed?.intent,
    playerFatiguePenalty: playerParsed.fatiguePenalty,
    bossFatiguePenalty: bossParsed?.fatiguePenalty ?? 0,
    generateBossIntent: generate,
    activeThreat: state.activeThreat,
    tension: tensionPhase(state.round, state.activeThreat),
    recentBossIntents,
  };
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

  // Pay off expired threats that were never answered
  let workingThreat = state.activeThreat;
  if (judgment) {
    const addressed = playerAddressesThreat(
      playerParsed.intent.raw,
      state.activeThreat ?? null,
    );
    if (judgment.clearThreat || addressed) {
      workingThreat = undefined;
    } else {
      workingThreat = threatFromJudgment(state, judgment) ?? undefined;
    }
  }
  const payoff = crisisPayoff(
    workingThreat && workingThreat.timer <= 0 ? workingThreat : null,
  );
  if (payoff) {
    playerBodyDelta += payoff.playerBody;
    playerResolveDelta += payoff.playerResolve;
    workingThreat = undefined;
  }

  let player = applyDeltas(state.player, playerBodyDelta, playerResolveDelta);
  let boss = applyDeltas(
    state.boss,
    verdict.bossBodyDelta,
    verdict.bossResolveDelta,
  );

  boss = applyAwarenessShift(boss, verdict.targetAwarenessShift);
  const pos = applyPositionShift(player.position, verdict.positionShift);
  player = { ...player, position: pos };
  boss = { ...boss, position: pos };

  const traitReveal = revealTrait(boss, verdict.hiddenTraitRevealed);
  boss = traitReveal.entity;

  player = recordConcepts(player, playerParsed.concepts);
  boss = recordConcepts(boss, bossParsed.concepts);

  const ledgers = applyLedgerMutations(state.ledgers, verdict.ledgerMutations);

  let battlefield = [...state.world.battlefield];
  for (const r of verdict.battlefieldMutations.remove) {
    battlefield = battlefield.filter((x) => x !== r);
  }
  for (const a of verdict.battlefieldMutations.add) {
    if (battlefield.includes(a)) continue;
    if (isNearDuplicateLabel(a, battlefield)) continue;
    battlefield.push(a);
  }

  let world = {
    ...state.world,
    battlefield,
    initiative:
      verdict.initiativeWinner === 'none'
        ? state.world.initiative
        : verdict.initiativeWinner,
  };
  world = {
    ...world,
    realityPressure: recalculateRealityPressure(world, player, boss),
  };

  const bossAgenda = updateBossAgenda(
    state.bossAgenda,
    { ...state, player, boss, ledgers, world },
    verdict.bossOutcome,
  );

  const winner = checkWinner(player, boss);
  const logLine = `R${state.round}: You [${verdict.playerOutcome}] vs Boss [${verdict.bossOutcome}] | ΔBody P${verdict.playerBodyDelta}/B${verdict.bossBodyDelta} ΔResolve P${verdict.playerResolveDelta}/B${verdict.bossResolveDelta}`;

  return {
    ...state,
    round: state.round + 1,
    player,
    boss,
    ledgers,
    world,
    bossAgenda,
    activeThreat: workingThreat,
    winner,
    log: [...state.log, logLine].slice(-20),
    matchLog: state.matchLog,
  };
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
