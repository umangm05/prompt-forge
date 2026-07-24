import type {
  BeliefModel,
  BossBelief,
  BossObservation,
  ExpectationBreak,
  GameState,
  ObservableSignal,
  ParsedIntent,
  ResolutionOutcome,
} from '../types';
import { getBossPersonality } from './bossPersonalities';

export function emptyBeliefs(): BeliefModel {
  return { beliefs: [] };
}

function inferSignalFromIntent(
  parsed: ParsedIntent,
  outcome: ResolutionOutcome,
): ObservableSignal[] {
  const raw = parsed.intent.raw.toLowerCase();
  const signals: ObservableSignal[] = [];

  if (/\b(retreat|back|away|distance|far|cover)\b/.test(raw)) {
    signals.push({
      kind: 'distance_preference',
      description: 'Keeps favoring distance / cover.',
      strength: outcome === 'failure' ? 0.4 : 0.8,
    });
  }
  if (/\b(close|rush|charge|grapple|melee|punch|kick)\b/.test(raw)) {
    signals.push({
      kind: 'close_preference',
      description: 'Presses into close range.',
      strength: 0.75,
    });
  }
  if (/\b(feint|fake|bait|lure|pretend|appear|look like)\b/.test(raw)) {
    signals.push({
      kind: 'possible_feint',
      description: 'Shows an exaggerated preference that may be staged.',
      strength: 0.55,
    });
  }
  if (parsed.investigative || /\b(test|probe|tap|throw|check|see if)\b/.test(raw)) {
    signals.push({
      kind: 'investigation',
      description: 'Tests the field instead of finishing a kill.',
      strength: 0.6,
    });
  }
  if (parsed.intent.category === 'SETUP') {
    signals.push({
      kind: 'setup_focus',
      description: 'Invests in the field rather than direct pressure.',
      strength: 0.65,
    });
  }
  if (!signals.length) {
    signals.push({
      kind: 'general_pressure',
      description: `Committed a ${parsed.intent.category.toLowerCase()} action.`,
      strength: 0.4,
    });
  }
  return signals;
}

export function extractObservableSignals(
  playerParsed: ParsedIntent,
  playerOutcome: ResolutionOutcome,
  extras: ObservableSignal[] = [],
): ObservableSignal[] {
  return [...inferSignalFromIntent(playerParsed, playerOutcome), ...extras];
}

function biasWeight(
  archetype: GameState['bossAgenda']['archetype'],
  kind: string,
): number {
  const p = getBossPersonality(archetype);
  let w = 1;
  if (p.blindSpots.some((b) => kind.includes('feint') || /bait|bluff/i.test(b))) {
    // Blind to feints — over-trusts surface signals.
    if (kind === 'possible_feint') w *= 0.3;
    if (kind === 'distance_preference' || kind === 'close_preference') w *= 1.35;
  }
  if (p.obsessions.some((o) => /rule|fact|evidence|observe/i.test(o))) {
    if (kind === 'investigation' || kind === 'setup_focus') w *= 1.25;
  }
  if (/never retreat|pride/i.test(p.prideRule) && kind === 'distance_preference') {
    w *= 1.2; // reads retreat as fear / weakness
  }
  return w;
}

export function updateBeliefsFromSignals(
  state: GameState,
  signals: ObservableSignal[],
  playerParsed: ParsedIntent,
): BeliefModel {
  const beliefs = [...state.bossAgenda.beliefs.beliefs];
  const arch = state.bossAgenda.archetype;

  for (const sig of signals) {
    const weight = sig.strength * biasWeight(arch, sig.kind);
    if (weight < 0.35) continue;

    let claim = '';
    let truth: BossBelief['truth'] = 'incomplete';

    if (sig.kind === 'distance_preference') {
      claim = 'Player fears close combat / prefers distance.';
      // If they actually have close tools in text but show retreat — likely mistaken.
      truth = /\b(feint|bait|lure|appear)\b/i.test(playerParsed.intent.raw)
        ? 'mistaken'
        : 'incomplete';
    } else if (sig.kind === 'close_preference') {
      claim = 'Player wants to force a close exchange.';
      truth = 'incomplete';
    } else if (sig.kind === 'setup_focus') {
      claim = 'Player is dismantling the field before striking.';
      truth = 'incomplete';
    } else if (sig.kind === 'investigation') {
      claim = 'Player is fishing for information, not committing.';
      truth = 'incomplete';
    } else if (sig.kind === 'possible_feint') {
      claim = 'Player may be staging a false preference.';
      truth = 'correct';
    } else {
      claim = sig.description;
    }

    const existing = beliefs.find((b) => b.claim === claim);
    if (existing) {
      existing.confidence = Math.min(1, existing.confidence + weight * 0.25);
      existing.evidence = [...existing.evidence, sig.description].slice(-4);
    } else {
      beliefs.push({
        id: `bel-${sig.kind}-${state.round}`,
        claim,
        confidence: Math.min(0.95, 0.35 + weight * 0.4),
        evidence: [sig.description],
        truth,
        createdRound: state.round,
      });
    }
  }

  // Cap belief list.
  const trimmed = beliefs
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);

  const top = trimmed[0];
  return {
    beliefs: trimmed,
    apparentPlayerPattern: top?.claim,
  };
}

/** Revise beliefs only when contradictory evidence is observable. */
export function reviseBeliefsOnContradiction(
  beliefs: BeliefModel,
  playerParsed: ParsedIntent,
  commitmentClaim?: string,
): { beliefs: BeliefModel; expectationBreak?: ExpectationBreak } {
  const raw = playerParsed.intent.raw.toLowerCase();
  let expectationBreak: ExpectationBreak | undefined;
  const stillRetreating = /\b(retreat|back(?:ing)? away|keep distance|stay back)\b/.test(
    raw,
  );
  const next = beliefs.beliefs.map((b) => {
    const fearsClose = /fears close|prefers distance/i.test(b.claim);
    // Require a real close commitment — do not match the word "close" inside "afraid of close combat".
    const rushed =
      !stillRetreating &&
      /\b(rush|charge|grapple|sprint|leap|close (?:in|the distance)|into (?:melee|them)|tackle)\b/.test(
        raw,
      );
    if (fearsClose && rushed && b.confidence >= 0.45) {
      expectationBreak = {
        beliefId: b.id,
        beliefClaim: b.claim,
        contradictingAction: playerParsed.intent.raw.slice(0, 120),
        controlShift: commitmentClaim
          ? `Punished the commitment built on: ${commitmentClaim}`
          : 'Seized the opening the false read created.',
      };
      return {
        ...b,
        confidence: Math.max(0.1, b.confidence - 0.5),
        truth: 'mistaken' as const,
        evidence: [...b.evidence, 'Contradicted by sudden close pressure.'].slice(
          -4,
        ),
      };
    }
    return b;
  });
  return {
    beliefs: {
      beliefs: next,
      apparentPlayerPattern: next[0]?.claim ?? beliefs.apparentPlayerPattern,
    },
    expectationBreak,
  };
}

export function buildBossObservation(
  state: GameState,
  signals: ObservableSignal[],
): BossObservation {
  const omen = state.world.thresholds.find(
    (t) => !t.triggered && t.progress > 0,
  )?.omen;
  return {
    round: state.round,
    observableSignals: signals,
    fieldNames: state.world.fieldElements.map((e) => e.name),
    threadLabel: state.tacticalThread?.label,
    threadStatus: state.tacticalThread?.status,
    tempoBeat: state.tempo.beat,
    temptationForeshadow: state.temptation?.foreshadow,
    recentPlayerActions: state.matchLog
      .slice(-3)
      .map((m) => m.playerPrompt)
      .filter(Boolean),
    beliefs: state.bossAgenda.beliefs.beliefs.map((b) => ({
      claim: b.claim,
      confidence: b.confidence,
    })),
    unavailableResources: state.bossAgenda.unavailableResources,
    failedMethods: state.bossAgenda.failedMethods,
    emotionalTriggers: state.bossAgenda.emotionalTriggers
      .filter((t) => !t.spent)
      .map((t) => t.description),
    lastTransformation: state.world.lastTransformation,
    omen,
  };
}
