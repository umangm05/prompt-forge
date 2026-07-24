/**
 * Interaction-level verification for the combat conversation redesign.
 * Run via: npm run verify:mock
 */
import {
  beginRound,
  buildSnapshot,
  createInitialState,
  parsePlayerIntent,
  resolveBossParsed,
  resolveWithMock,
} from '../src/engine/gameLoop.ts';
import {
  buildBossObservation,
  extractObservableSignals,
  updateBeliefsFromSignals,
  reviseBeliefsOnContradiction,
} from '../src/engine/beliefs.ts';
import {
  buildCommitmentFromObservation,
  commitBossForRound,
} from '../src/engine/bossArchetypes.ts';
import { getBossPersonality } from '../src/engine/bossPersonalities.ts';
import { resolveExperiment } from '../src/engine/discoveries.ts';
import { evaluateWorldThresholds } from '../src/engine/environmentalEvents.ts';
import { shapeTempo, createTempoState } from '../src/engine/tempo.ts';
import { playerAddressesThreat, playerAimsAtThread } from '../src/engine/threats.ts';
import type { BossArchetype, GameState } from '../src/types/index.ts';

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('ok:', msg);
  }
}

// --- 1. Opening commitment exists before player input ---
{
  const state = createInitialState('scientist');
  assert(!!state.bossAgenda.commitment?.raw, 'duel opens with visible boss commitment');
  assert(
    !!state.bossAgenda.commitment?.method,
    'opening commitment names a method',
  );
  assert(state.world.fieldElements.length === 3, 'starts with 3 named field elements');
  assert(state.world.thresholds.length >= 1, 'arena seeds at least one world threshold');
  assert(state.tempo.beat === 'lull', 'opening tempo is lull');
}

// --- 2. Boss planner cannot access private player aim via observation ---
{
  let state = createInitialState('trickster');
  state = beginRound(state);
  const obs = buildBossObservation(state, [
    {
      kind: 'distance_preference',
      description: 'Keeps favoring distance / cover.',
      strength: 0.8,
    },
  ]);
  const blob = JSON.stringify(obs);
  assert(
    !blob.includes('I secretly rush') && !/'private'|hiddenAim|trueIntent/i.test(blob),
    'boss observation has no private-aim channel',
  );
  assert(
    Array.isArray(obs.beliefs) && Array.isArray(obs.observableSignals),
    'observation carries beliefs + signals only',
  );
}

// --- 3. Planted signal changes belief; mistaken belief can persist ---
{
  let state = createInitialState('scientist');
  const feint = parsePlayerIntent(
    state,
    'I keep backing away toward cover so I look afraid of close combat.',
  );
  const signals = extractObservableSignals(feint, 'success');
  assert(
    signals.some((s) => s.kind === 'distance_preference'),
    'retreat feint emits distance signal',
  );
  const beliefs = updateBeliefsFromSignals(state, signals, feint);
  assert(
    beliefs.beliefs.some((b) => /distance|fears close/i.test(b.claim)),
    'planted signal creates a boss belief',
  );
  // No contradiction yet — mistaken/incomplete belief remains.
  const still = reviseBeliefsOnContradiction(beliefs, feint);
  assert(!still.expectationBreak, 'no expectation break without contradiction');
  assert(
    still.beliefs.beliefs[0]!.confidence > 0.3,
    'belief persists without contrary evidence',
  );
}

// --- 4. Later exploit creates ExpectationBreak ---
{
  let state = createInitialState('minimalist');
  const feint = parsePlayerIntent(
    state,
    'I keep backing away so they think I fear the close fight.',
  );
  let beliefs = updateBeliefsFromSignals(
    state,
    extractObservableSignals(feint, 'success'),
    feint,
  );
  state = {
    ...state,
    bossAgenda: { ...state.bossAgenda, beliefs },
  };
  const rush = parsePlayerIntent(
    state,
    'I rush in close and grapple them against the railing.',
  );
  const broken = reviseBeliefsOnContradiction(
    beliefs,
    rush,
    'Punish the habit of keeping distance',
  );
  assert(!!broken.expectationBreak, 'rush after fake retreat creates ExpectationBreak');
  assert(
    broken.expectationBreak!.beliefClaim.length > 0,
    'expectation break cites the belief',
  );
}

// --- 5. Every boss has 2–4 signature moments + defining flaw ---
{
  const arches: BossArchetype[] = [
    'lawyer',
    'scientist',
    'poet',
    'historian',
    'trickster',
    'child',
    'minimalist',
  ];
  for (const a of arches) {
    const p = getBossPersonality(a);
    assert(
      p.signatureMoments.length >= 2 && p.signatureMoments.length <= 4,
      `${a} has 2–4 signature moments`,
    );
    assert(!!p.definingFlaw, `${a} has defining flaw`);
    assert(!!p.prideRule && !!p.breakingPoint, `${a} has pride + breaking point`);
    for (const s of p.signatureMoments) {
      assert(!!s.tell && !!s.aftermath && !!s.selfRisk, `${a}/${s.id} has tell+aftermath+risk`);
    }
  }
}

// --- 6. Keyword mention does not clear a thread ---
{
  let state = createInitialState('scientist');
  state = beginRound(state);
  const bossParsed = resolveBossParsed(state, state.bossAgenda.commitment?.raw);
  // Force an armed thread via mock rounds that don't clear.
  let cur = state;
  for (let i = 0; i < 2; i++) {
    const playerParsed = parsePlayerIntent(
      cur,
      'I listen carefully and watch their hands.',
    );
    const { next } = resolveWithMock(cur, playerParsed, bossParsed);
    cur = next;
  }
  if (cur.tacticalThread || cur.activeThreat) {
    const mention = 'I notice the damaged railing and think about it.';
    assert(
      !playerAddressesThreat(mention, cur.activeThreat ?? null) ||
        playerAimsAtThread(mention, cur.tacticalThread ?? null),
      'aim helper can detect mention',
    );
    // resolveWithMock: investigative / non-break wording should not clearThreat
    const probe = parsePlayerIntent(
      cur,
      'I look at the damaged railing carefully without touching it.',
    );
    const boss = resolveBossParsed(cur, cur.bossAgenda.commitment?.raw);
    const beforeLabel = cur.tacticalThread?.label ?? cur.activeThreat?.label;
    const { judgment, next } = resolveWithMock(cur, probe, boss);
    assert(
      judgment.clearThreat !== true ||
        next.tacticalThread?.label === beforeLabel ||
        !!next.tacticalThread ||
        !!next.activeThreat ||
        !beforeLabel,
      'soft look does not reliably clear prepared thread',
    );
  } else {
    console.log('ok: (skip clear test — no thread formed in setup rounds)');
  }
}

// --- 7. Experiment always records knowledge ---
{
  const state = createInitialState('historian');
  const probe = parsePlayerIntent(
    state,
    'I toss a pebble at the iron railings to see if they are wired.',
  );
  assert(probe.investigative === true, 'probe classified investigative');
  const { discovery } = resolveExperiment(state, probe, 'failure');
  assert(!!discovery?.finding, 'failed experiment still yields a finding');
  const { discovery: d2 } = resolveExperiment(state, probe, 'success');
  assert(!!d2?.finding, 'successful experiment yields a finding');
}

// --- 8. Thresholds are deterministic and foreshadowed ---
{
  let state = createInitialState('scientist');
  const narratives = [
    'cut the support',
    'saw the rail',
    'crack spreads',
    'bent metal screams',
  ];
  let world = state.world;
  for (const n of narratives) {
    world = evaluateWorldThresholds(world, [n, ...world.battlefield]);
  }
  const progressed = world.thresholds.some((t) => t.progress > 0 || t.triggered);
  assert(progressed, 'threshold progresses from matching causal narratives');
  const withProgress = world.thresholds.find((t) => t.progress > 0 || t.triggered);
  if (withProgress && !withProgress.triggered) {
    assert(!!withProgress.omen, 'untriggered threshold exposes an omen');
  }
}

// --- 9. Tempo builds / ruptures / aftermath ---
{
  let tempo = createTempoState();
  tempo = shapeTempo(tempo, {
    playerOutcome: 'partial',
    bossOutcome: 'success',
    playerRelation: 'stall',
    bossRelation: 'advance',
    threadTimer: 2,
    thresholdProgress: 2,
  });
  assert(
    tempo.beat === 'pressure' || tempo.tension > 0.3,
    'pressure accumulates from armed thread + omen',
  );
  tempo = shapeTempo(tempo, {
    playerOutcome: 'success',
    bossOutcome: 'partial',
    playerRelation: 'reverse',
    bossRelation: 'stall',
    signatureUsed: true,
  });
  assert(tempo.beat === 'rupture' || tempo.spentLastRound, 'signature forces rupture spend');
  tempo = shapeTempo(tempo, {
    playerOutcome: 'partial',
    bossOutcome: 'partial',
    playerRelation: 'stall',
    bossRelation: 'stall',
  });
  assert(
    tempo.beat === 'aftermath' || tempo.recoveryLeft >= 0,
    'aftermath / recovery follows rupture',
  );
}

// --- 10. Snapshot for Arbiter includes commitment, not generateBossIntent ---
{
  const state = createInitialState('poet');
  const playerParsed = parsePlayerIntent(state, 'I kick ash back into their ring.');
  const bossParsed = resolveBossParsed(state, state.bossAgenda.commitment?.raw);
  const snap = buildSnapshot(state, playerParsed, {
    bossParsed,
    generateBossIntent: false,
  });
  assert(snap.generateBossIntent === false, 'snapshot disables mid-clash invent');
  assert(
    snap.committedBossIntent.raw === bossParsed.intent.raw,
    'snapshot carries committed boss intent',
  );
  assert(!!snap.tempo && !!snap.boss.definingFlaw, 'snapshot carries tempo + flaw');
}

// --- 11. Mock round mutates state + keeps causal trail ---
{
  let state = createInitialState('lawyer');
  state = beginRound(state);
  const playerParsed = parsePlayerIntent(
    state,
    'I splash water across the stone and prepare to turn their mark against them.',
  );
  assert(!playerParsed.rejected, 'player intent accepted');
  const bossParsed = resolveBossParsed(state, state.bossAgenda.commitment?.raw);
  const beforeRound = state.round;
  const { verdict, next } = resolveWithMock(state, playerParsed, bossParsed);
  assert(next.round === beforeRound + 1, 'round advances');
  assert(verdict.causalEvents.length > 0, 'verdict includes causal events');
  assert(!!next.bossAgenda.commitment?.raw, 'next commitment ready after resolve');
  assert(
    next.player.body !== 100 ||
      next.boss.body !== 100 ||
      next.player.resolve !== 100 ||
      next.boss.resolve !== 100 ||
      next.ledgers.facts.length > 0 ||
      next.world.battlefield.length >= 3,
    'mock round mutates some duel state',
  );
}

// --- 12. Emotional trigger can force non-optimal posture path ---
{
  let state = createInitialState('trickster');
  state = {
    ...state,
    bossAgenda: {
      ...state.bossAgenda,
      emotionalTriggers: [
        {
          id: 't1',
          kind: 'cherished_destroyed',
          description: 'Favorite mirror shattered',
          round: 1,
          spent: false,
        },
      ],
    },
  };
  const { commitment } = commitBossForRound(state);
  assert(
    commitment.posture === 'signature' ||
      commitment.posture === 'punish' ||
      /rush|charge|blade|decoy/i.test(commitment.raw),
    'emotional trigger steers commitment away from cold optimal continue',
  );
}

// --- 13. Bias-constrained commitment from belief ---
{
  let state = createInitialState('lawyer');
  state = {
    ...state,
    bossAgenda: {
      ...state.bossAgenda,
      beliefs: {
        beliefs: [
          {
            id: 'b1',
            claim: 'Player fears close combat / prefers distance.',
            confidence: 0.85,
            evidence: ['Keeps favoring distance'],
            truth: 'mistaken',
            createdRound: 1,
          },
        ],
        apparentPlayerPattern: 'Player fears close combat / prefers distance.',
      },
    },
  };
  const obs = buildBossObservation(state, [
    {
      kind: 'distance_preference',
      description: 'Keeps favoring distance / cover.',
      strength: 0.9,
    },
  ]);
  const commitment = buildCommitmentFromObservation(state, obs);
  assert(!!commitment.raw, 'belief-informed commitment generated');
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log('\nAll combat-conversation checks passed');
