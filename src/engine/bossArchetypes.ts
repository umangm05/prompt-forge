import type {
  AdaptationPosture,
  BossAgendaState,
  BossArchetype,
  BossCommitment,
  BossObservation,
  GameState,
  Intent,
  SignatureMomentDef,
} from '../types';
import { getBossPersonality } from './bossPersonalities';
import { mockDilemmaIntent } from './threats';
import { classifyCategory, classifyTarget } from './inputParser';

function makeIntent(raw: string): Intent {
  return {
    raw,
    category: classifyCategory(raw),
    target: classifyTarget(raw),
  };
}

export function createBossAgenda(archetype: BossArchetype): BossAgendaState {
  const p = getBossPersonality(archetype);
  return {
    archetype,
    progress: 0,
    notes: [],
    beliefs: { beliefs: [] },
    unavailableResources: [],
    failedMethods: [],
    posture: 'continue',
    emotionalTriggers: [],
    signaturesUsed: [],
    riskAppetite: p.riskAppetite,
    definingFlaw: p.definingFlaw,
  };
}

function pickTool(state: GameState): string {
  const p = getBossPersonality(state.bossAgenda.archetype);
  return (
    p.toolkit.find((t) => !state.bossAgenda.unavailableResources.includes(t)) ??
    p.toolkit[0]!
  );
}

function findReadySignature(
  state: GameState,
  observation: BossObservation,
): SignatureMomentDef | undefined {
  const p = getBossPersonality(state.bossAgenda.archetype);
  const unused = p.signatureMoments.filter(
    (s) => !state.bossAgenda.signaturesUsed.includes(s.id),
  );
  if (!unused.length) return undefined;

  const emotion = observation.emotionalTriggers.join(' ').toLowerCase();
  const field = observation.fieldNames.join(' ').toLowerCase();
  const tension = observation.tempoBeat;

  for (const s of unused) {
    const meansOk = s.requiredMeans.some(
      (m) =>
        !state.bossAgenda.unavailableResources.includes(m) &&
        (field.includes(m.split(' ').pop()!) ||
          p.toolkit.includes(m) ||
          true),
    );
    if (!meansOk) continue;

    const hint = s.triggerHint.toLowerCase();
    const emotionHit =
      /pride|humiliation|cherished|obsession|seal|mirror|banner|ledger/.test(
        hint,
      ) && emotion.length > 0;
    const tempoHit =
      (hint.includes('armed') && observation.threadStatus === 'armed') ||
      (hint.includes('pressure') && tension === 'pressure') ||
      (hint.includes('aftermath') && tension === 'aftermath') ||
      (hint.includes('lull') && tension === 'lull');
    const threadHit =
      observation.threadLabel &&
      /support|damaged|ring|blind|mark|climb/i.test(observation.threadLabel);

    if (emotionHit || (tempoHit && threadHit) || (emotionHit && tempoHit)) {
      return s;
    }
  }

  // Emotional override: defining flaw can force a signature when triggered.
  if (observation.emotionalTriggers.length && unused[0]) {
    const pFlaw = p.breakingPoint.toLowerCase();
    if (
      observation.emotionalTriggers.some((t) =>
        t.toLowerCase().split(' ').some((w) => pFlaw.includes(w) && w.length > 4),
      ) ||
      observation.emotionalTriggers.length >= 1
    ) {
      return unused.find((s) =>
        /rage|charge|sacrificial|contempt|obsession|tip|finish/i.test(s.name),
      ) ?? unused[0];
    }
  }

  return undefined;
}

/**
 * Choose posture from beliefs + emotion + available means — not from private player text.
 */
export function selectAdaptationPosture(
  state: GameState,
  observation: BossObservation,
): AdaptationPosture {
  const p = getBossPersonality(state.bossAgenda.archetype);
  const topBelief = observation.beliefs[0];
  const threadBroken =
    observation.threadStatus === 'broken' ||
    observation.threadStatus === 'reversed';
  const toolGone = observation.unavailableResources.length > 0;
  const lowVital =
    state.boss.body < 35 || state.boss.resolve < 35;

  if (observation.emotionalTriggers.length > 0) {
    // Flaw can dominate.
    if (/never retreat|never concede|never abandon|never climb down|never add/i.test(p.prideRule)) {
      return 'signature';
    }
    return 'punish';
  }

  if (lowVital && (threadBroken || toolGone)) return 'desperate';

  if (
    observation.temptationForeshadow &&
    (state.bossAgenda.riskAppetite === 'reckless' ||
      Math.random() < (state.bossAgenda.riskAppetite === 'balanced' ? 0.45 : 0.2))
  ) {
    return 'greedy';
  }

  if (toolGone || threadBroken) return 'pivot';
  if (
    observation.threadStatus === 'developing' &&
    observation.recentPlayerActions.some((a) =>
      /test|probe|look|wait|watch/i.test(a),
    )
  ) {
    return 'accelerate';
  }
  if (
    observation.fieldNames.some((n) => /broken|severed|cut/i.test(n)) &&
    observation.threadLabel
  ) {
    return 'repurpose';
  }
  if (topBelief && topBelief.confidence > 0.7) return 'punish';
  return 'continue';
}

export function buildCommitmentFromObservation(
  state: GameState,
  observation: BossObservation,
): BossCommitment {
  const p = getBossPersonality(state.bossAgenda.archetype);
  const tool = pickTool(state);
  const posture = selectAdaptationPosture(state, observation);
  const signature = posture === 'signature' || posture === 'desperate'
    ? findReadySignature(state, observation)
    : posture === 'greedy'
      ? undefined
      : findReadySignature(state, observation);

  // Signature only when opportunity + identity align — not on a cooldown clock.
  if (signature && (posture === 'signature' || posture === 'desperate' || posture === 'punish')) {
    const objects = observation.fieldNames[2] ?? 'the support';
    const raw = signature.actionTemplate
      .replace(/pillar|support|railing/gi, objects)
      .slice(0, 220);
    return {
      raw,
      method: signature.requiredMeans[0] ?? tool,
      target: observation.threadLabel ?? objects,
      purpose: signature.permanentConsequence,
      dependencyIds: state.tacticalThread?.dependencyIds ?? [],
      posture: 'signature',
      signatureId: signature.id,
      tell: signature.tell,
    };
  }

  const belief = observation.beliefs[0]?.claim;
  let raw = mockDilemmaIntent(state);

  if (posture === 'accelerate' && state.tacticalThread) {
    raw = `I push harder with the ${tool} — I advance the ${state.tacticalThread.label.toLowerCase()} before you can answer.`;
  } else if (posture === 'repurpose' && state.tacticalThread) {
    raw = `I seize the damaged line with the ${tool} and turn your break into my snare.`;
  } else if (posture === 'pivot') {
    raw = `I drop the dead line and start a new bind with the ${tool} on fresh ground.`;
  } else if (posture === 'punish' && belief) {
    raw = `I use the ${tool} to punish the habit I think you showed — ${belief.slice(0, 60)}`;
  } else if (posture === 'greedy' && observation.temptationForeshadow) {
    raw = `I take the opening with the ${tool}, even if the longer plan waits.`;
  } else if (posture === 'desperate') {
    raw = `I spend everything left — ${tool} into the nearest support, no retreat.`;
  }

  // Obsession / pride can refuse retreat even when pivot would be smarter.
  if (
    posture === 'pivot' &&
    /never abandon|never concede|finish the|never climb down/i.test(p.prideRule) &&
    state.tacticalThread
  ) {
    raw = `I refuse to drop it — I finish with the ${tool} on the ${state.tacticalThread.label.toLowerCase()}.`;
    return {
      raw,
      method: tool,
      target: state.tacticalThread.label,
      purpose: state.tacticalThread.purpose,
      dependencyIds: state.tacticalThread.dependencyIds,
      posture: 'continue',
    };
  }

  return {
    raw,
    method: tool,
    target: observation.threadLabel ?? observation.fieldNames[2] ?? 'the field',
    purpose: p.goal,
    dependencyIds: state.tacticalThread?.dependencyIds ?? [],
    posture,
  };
}

/** Offline / first commitment — no private player text. */
export function generateBossIntent(state: GameState): Intent {
  if (state.bossAgenda.commitment?.raw) {
    return makeIntent(state.bossAgenda.commitment.raw);
  }
  return makeIntent(mockDilemmaIntent(state));
}

export function commitBossForRound(
  state: GameState,
  observation?: BossObservation,
): { state: GameState; commitment: BossCommitment } {
  const obs: BossObservation =
    observation ?? {
      round: state.round,
      observableSignals: [],
      fieldNames: state.world.fieldElements.map((e) => e.name),
      threadLabel: state.tacticalThread?.label,
      threadStatus: state.tacticalThread?.status,
      tempoBeat: state.tempo.beat,
      temptationForeshadow: state.temptation?.foreshadow,
      recentPlayerActions: state.matchLog.slice(-3).map((m) => m.playerPrompt),
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
      omen: state.world.thresholds.find((t) => !t.triggered && t.progress > 0)
        ?.omen,
    };

  const commitment =
    state.bossAgenda.nextCommitment ??
    buildCommitmentFromObservation(state, obs);

  return {
    commitment,
    state: {
      ...state,
      bossAgenda: {
        ...state.bossAgenda,
        commitment,
        nextCommitment: undefined,
        posture: commitment.posture,
      },
    },
  };
}

export function updateBossAgenda(
  agenda: BossAgendaState,
  state: GameState,
  bossOutcome: string,
  opts?: {
    posture?: AdaptationPosture;
    signatureId?: string;
    failedMethod?: string;
    unavailable?: string[];
  },
): BossAgendaState {
  const notes = [...agenda.notes];
  let progress = agenda.progress;

  if (bossOutcome !== 'backfire' && bossOutcome !== 'failure') {
    progress += 1;
  }
  if (state.tacticalThread) {
    notes.push(`Thread: ${state.tacticalThread.label} [${state.tacticalThread.status}]`);
  }
  if (opts?.failedMethod) {
    notes.push(`Failed: ${opts.failedMethod}`);
  }

  return {
    ...agenda,
    progress: Math.min(12, progress),
    notes: notes.slice(-8),
    posture: opts?.posture ?? agenda.posture,
    signaturesUsed: opts?.signatureId
      ? [...agenda.signaturesUsed, opts.signatureId].slice(-6)
      : agenda.signaturesUsed,
    failedMethods: opts?.failedMethod
      ? [...agenda.failedMethods, opts.failedMethod].slice(-6)
      : agenda.failedMethods,
    unavailableResources: opts?.unavailable
      ? Array.from(
          new Set([...agenda.unavailableResources, ...opts.unavailable]),
        ).slice(-8)
      : agenda.unavailableResources,
  };
}

export const BOSS_LABELS: Record<BossArchetype, string> = {
  lawyer: getBossPersonality('lawyer').name,
  scientist: getBossPersonality('scientist').name,
  poet: getBossPersonality('poet').name,
  historian: getBossPersonality('historian').name,
  trickster: getBossPersonality('trickster').name,
  child: getBossPersonality('child').name,
  minimalist: getBossPersonality('minimalist').name,
};
