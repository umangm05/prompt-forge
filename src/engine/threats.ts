import type {
  ActiveThreat,
  ArbiterJudgment,
  GameState,
  PlanRelation,
  TacticalThread,
  TensionPhase,
  ThreadStatus,
} from '../types';
import { getBossPersonality } from './bossPersonalities';

export function tensionPhase(
  round: number,
  thread?: TacticalThread | null,
): TensionPhase {
  if (thread && thread.timer <= 1 && thread.status === 'armed') return 'crisis';
  if (thread || round >= 3) return 'threat';
  return 'calm';
}

export function threadToThreat(thread?: TacticalThread): ActiveThreat | undefined {
  if (!thread) return undefined;
  if (thread.status === 'spent' || thread.status === 'broken') return undefined;
  return {
    id: thread.id,
    label: thread.label,
    foreshadow: thread.foreshadow,
    timer: thread.timer,
    source:
      thread.controller === 'player'
        ? 'player'
        : thread.controller === 'world'
          ? 'world'
          : 'boss',
    tension: thread.tension,
  };
}

function foreshadowFor(label: string, timer: number): string {
  const t = label.toLowerCase();
  if (/rail|beam|support|pillar|platform|chain/.test(t)) {
    return timer <= 1
      ? 'Metal shrieks. The span sags under its own weight.'
      : 'The railing groans. Rust flakes fall as the metal begins to bend.';
  }
  if (/climb|closing|approach/.test(t)) {
    return timer <= 1
      ? 'Hands at the rim. Dust rains down on your cover.'
      : 'Boots scrape closer. Loose grit ticks onto the stone.';
  }
  if (/fire|heat|burn/.test(t)) return 'Heat shimmers off the metal. Paint bubbles.';
  if (/flood|water|wet/.test(t)) return 'Water finds every crack. Footing darkens.';
  if (/smoke|fog|ring|blind/.test(t))
    return 'The air thickens. Edges of the field go soft.';
  if (/mark|seal|bound|chalk/.test(t))
    return 'The mark darkens. The line looks harder to cross.';
  return timer <= 1
    ? 'The field complains loudly — something is about to give.'
    : 'Something on the field has started to fail.';
}

export function mockDilemmaIntent(state: GameState): string {
  const personality = getBossPersonality(state.bossAgenda.archetype);
  const tool =
    personality.toolkit.find(
      (t) => !state.bossAgenda.unavailableResources.includes(t),
    ) ?? personality.toolkit[0]!;
  const objects =
    state.world.fieldElements.find((e) =>
      e.knownProperties.includes('objects'),
    )?.name ??
    state.world.battlefield[2] ??
    'debris';
  const arena =
    state.world.fieldElements.find((e) => e.knownProperties.includes('arena'))
      ?.name ??
    state.world.battlefield[0] ??
    'cover';

  if (state.tacticalThread && state.tacticalThread.timer <= 1) {
    return `I finish with the ${tool} — I drive the ${state.tacticalThread.label.toLowerCase()} to failure.`;
  }

  const byArch: Record<string, string[]> = {
    lawyer: [
      `I snap a chalk line across the ${arena.toLowerCase()} and declare your side out of bounds.`,
      `I stamp the ${objects.toLowerCase()} with a seal and call them binding from this beat.`,
    ],
    scientist: [
      `I draw a ${tool} and begin cutting the supports under the ${objects.toLowerCase()}.`,
      `I wedge a small charge beneath the ${arena.toLowerCase()} edge and arm it.`,
      `I heat the joint with a glove until the ${objects.toLowerCase()} softens and sags.`,
    ],
    poet: [
      `I fling ash into the air and pull weather into a closing ring around your cover.`,
      `I plant a torn banner in the ${arena.toLowerCase()} so the place starts to feel like a grave.`,
    ],
    historian: [
      `I drive an iron spike into the ${objects.toLowerCase()} and reopen the old unsafe mark.`,
      `I hold up the ledger and force the last accepted line onto the ${arena.toLowerCase()}.`,
    ],
    trickster: [
      `I toss a noise flare into the left ${objects.toLowerCase()} and start sawing the right support with a short blade.`,
      `I crack a smoke pellet and sprint the blind edge of the ${arena.toLowerCase()}.`,
    ],
    child: [
      `I grab the ${arena.toLowerCase()} with both hands and start climbing toward you.`,
      `I put my shoulder into the ${objects.toLowerCase()} and shove until it tips.`,
    ],
    minimalist: [
      `I draw a short blade and begin sawing through the ${objects.toLowerCase()}.`,
      `I kick the support once, clean, and watch the ${arena.toLowerCase()} shift.`,
    ],
  };

  const pool = byArch[state.bossAgenda.archetype] ?? byArch.minimalist!;
  return pool[state.round % pool.length]!;
}

export function createThreadFromBossIntent(
  state: GameState,
  bossIntent: string,
  bossOutcome: string,
): TacticalThread | undefined {
  if (bossOutcome === 'failure' || bossOutcome === 'backfire') {
    return state.tacticalThread
      ? { ...state.tacticalThread, status: 'developing' as ThreadStatus }
      : undefined;
  }

  const objects =
    state.world.fieldElements.find((e) =>
      e.knownProperties.includes('objects'),
    )?.name ?? 'Railing';
  const arena =
    state.world.fieldElements.find((e) => e.knownProperties.includes('arena'))
      ?.name ?? 'Platform';
  const lower = bossIntent.toLowerCase();

  let label = 'Shifting Ground';
  let purpose = 'Deny safe footing';
  let payoff = 'Ground fails under the player';
  if (/climb|grab the|sprint/.test(lower)) {
    label = `Climbing ${arena}`;
    purpose = 'Close and tip';
    payoff = 'Reach and shove from above';
  } else if (/cut|saw|slice|plasma|blade|heat|charge|wedge|rig/.test(lower)) {
    label = `Damaged ${objects}`;
    purpose = 'Collapse a support';
    payoff = 'Support fails into the player lane';
  } else if (/chalk|seal|rule|bound|spike|ledger/.test(lower)) {
    label = 'Marked Ground';
    purpose = 'Bind exits with precedent';
    payoff = 'Crossing the mark costs Resolve';
  } else if (/ring|ash|storm|rain|banner/.test(lower)) {
    label = 'Closing Weather';
    purpose = 'Close a tragic ring';
    payoff = 'Only path left runs into the boss';
  } else if (/smoke|flare|decoy|mirror/.test(lower)) {
    label = 'Blind Edge';
    purpose = 'Steal attention while cutting elsewhere';
    payoff = 'False lane collapses into a real bind';
  }

  const dep =
    state.world.fieldElements.find((e) =>
      label.toLowerCase().includes(e.name.toLowerCase().split(' ')[0]!),
    )?.id ?? state.world.fieldElements[2]?.id;

  if (state.tacticalThread && state.tacticalThread.label === label) {
    const timer = Math.max(0, state.tacticalThread.timer - 1);
    return {
      ...state.tacticalThread,
      timer,
      stage: state.tacticalThread.stage + 1,
      foreshadow: foreshadowFor(label, timer),
      status: timer <= 1 ? 'armed' : 'developing',
      tension: timer <= 1 ? 'crisis' : 'threat',
      dependencyIds: dep
        ? Array.from(new Set([...state.tacticalThread.dependencyIds, dep]))
        : state.tacticalThread.dependencyIds,
    };
  }

  return {
    id: `thread-${state.round}`,
    label,
    foreshadow: foreshadowFor(label, 3),
    controller: 'boss',
    purpose,
    payoff,
    stage: 1,
    timer: 3,
    dependencyIds: dep ? [dep] : [],
    status: 'developing',
    tension: 'threat',
  };
}

export function threadFromJudgment(
  state: GameState,
  judgment: ArbiterJudgment,
  bossRelation: PlanRelation,
): TacticalThread | undefined {
  if (
    judgment.clearThreat &&
    (bossRelation === 'break' ||
      judgment.playerRelation === 'break' ||
      judgment.playerRelation === 'reverse' ||
      judgment.playerRelation === 'transfer')
  ) {
    if (!state.tacticalThread) return undefined;
    return {
      ...state.tacticalThread,
      status:
        judgment.playerRelation === 'reverse' ||
        judgment.threadTransferTo === 'player'
          ? 'reversed'
          : 'broken',
      foreshadow: 'The prepared line hangs unfinished.',
    };
  }

  if (judgment.threadTransferTo && state.tacticalThread) {
    return {
      ...state.tacticalThread,
      controller: judgment.threadTransferTo,
      status: 'reversed',
      foreshadow: `${state.tacticalThread.label} now answers to ${judgment.threadTransferTo}.`,
    };
  }

  const t = judgment.activeThreat;
  if (t && t.label.trim()) {
    const timer = Math.max(1, Math.min(4, Number(t.timer) || 3));
    const dep = state.world.fieldElements[2]?.id;
    if (state.tacticalThread && state.tacticalThread.label === t.label.trim()) {
      return {
        ...state.tacticalThread,
        timer,
        foreshadow: (t.foreshadow || foreshadowFor(t.label, timer)).slice(0, 160),
        status: timer <= 1 ? 'armed' : 'developing',
        tension: tensionPhase(state.round, {
          ...state.tacticalThread,
          timer,
        }),
        purpose: t.purpose ?? state.tacticalThread.purpose,
        payoff: t.payoff ?? state.tacticalThread.payoff,
      };
    }
    return {
      id: `thread-${state.round}`,
      label: t.label.trim().slice(0, 60),
      foreshadow: (t.foreshadow || foreshadowFor(t.label, timer)).slice(0, 160),
      controller: 'boss',
      purpose: t.purpose ?? 'Advance the boss plan',
      payoff: t.payoff ?? 'Prepared chain pays off',
      stage: 1,
      timer,
      dependencyIds: dep ? [dep] : [],
      status: 'developing',
      tension: 'threat',
    };
  }

  if (judgment.bossOutcome === 'failure' || judgment.bossOutcome === 'backfire') {
    return state.tacticalThread;
  }

  if (state.tacticalThread && state.tacticalThread.status === 'developing') {
    const timer = Math.max(0, state.tacticalThread.timer - 1);
    return {
      ...state.tacticalThread,
      timer,
      stage: state.tacticalThread.stage + 1,
      foreshadow: foreshadowFor(state.tacticalThread.label, timer),
      status: timer <= 1 ? 'armed' : 'developing',
      tension: timer <= 1 ? 'crisis' : 'threat',
    };
  }

  return (
    createThreadFromBossIntent(
      state,
      judgment.bossIntent || state.bossAgenda.commitment?.raw || '',
      judgment.bossOutcome,
    ) ?? state.tacticalThread
  );
}

/** Payoff only from the prepared causal chain — not generic timer damage. */
export function crisisPayoff(thread: TacticalThread | null): {
  playerBody: number;
  playerResolve: number;
  note: string;
  consumeDependencies: boolean;
} | null {
  if (!thread || thread.timer > 0) return null;
  if (thread.status === 'broken' || thread.status === 'reversed') return null;
  return {
    playerBody: -6,
    playerResolve: -12,
    note: `${thread.label} pays off — ${thread.payoff}`,
    consumeDependencies: true,
  };
}

/**
 * Keyword mention is NOT enough. Causal success is required to clear a thread.
 * This helper only hints that the player *aimed* at the problem.
 */
export function playerAimsAtThread(
  playerRaw: string,
  thread: TacticalThread | null,
): boolean {
  if (!thread) return false;
  const t = `${thread.label} ${thread.foreshadow}`.toLowerCase();
  const words = t
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const raw = playerRaw.toLowerCase();
  const hits = words.filter((w) => raw.includes(w)).length;
  return hits >= 2;
}

/** @deprecated Use playerAimsAtThread — mention alone must not clear. */
export function playerAddressesThreat(
  playerRaw: string,
  threat: ActiveThreat | null,
): boolean {
  if (!threat) return false;
  return playerAimsAtThread(playerRaw, {
    id: threat.id,
    label: threat.label,
    foreshadow: threat.foreshadow,
    controller: threat.source === 'player' ? 'player' : 'boss',
    purpose: '',
    payoff: '',
    stage: 1,
    timer: threat.timer,
    dependencyIds: [],
    status: 'developing',
    tension: threat.tension,
  });
}

export function formatThreatSigns(threat: ActiveThreat): string[] {
  return [`⚠ ${threat.label} (${threat.timer})`, threat.foreshadow];
}

export function formatThreadSigns(thread: TacticalThread): string[] {
  return [
    `⚠ ${thread.label} (${thread.timer})`,
    thread.foreshadow,
    `Purpose: ${thread.purpose}`,
  ];
}
