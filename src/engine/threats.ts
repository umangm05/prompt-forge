import type { ActiveThreat, ArbiterJudgment, GameState, TensionPhase } from '../types';
import { getBossPersonality } from './bossPersonalities';

export function tensionPhase(round: number, threat?: ActiveThreat | null): TensionPhase {
  if (threat && threat.timer <= 1) return 'crisis';
  if (threat || round >= 3) return 'threat';
  return 'calm';
}

function pickTool(state: GameState): string {
  const tools = getBossPersonality(state.bossAgenda.archetype).toolkit;
  return tools[state.round % tools.length]!;
}

/** Offline / fallback dilemmas — always include method flavor. */
export function mockDilemmaIntent(state: GameState): string {
  const arena = state.world.battlefield[0] ?? 'cover';
  const weather = state.world.battlefield[1] ?? state.world.environmentalEvent ?? 'the weather';
  const objects = state.world.battlefield[2] ?? 'debris';
  const tool = pickTool(state);
  const arch = state.bossAgenda.archetype;
  const phase = tensionPhase(state.round, state.activeThreat);

  if (state.activeThreat && state.activeThreat.timer <= 1) {
    return `I finish with the ${tool} — I drive the ${state.activeThreat.label.toLowerCase()} to failure.`;
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
      `I fling ash into the ${weather.toLowerCase()} and pull it into a closing ring around your cover.`,
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

  const pool = byArch[arch] ?? byArch.minimalist!;
  if (phase === 'calm') return pool[0]!;
  return pool[state.round % pool.length]!;
}

function foreshadowFor(label: string, timer: number): string {
  const t = label.toLowerCase();
  if (/rail|beam|support|pillar|platform/.test(t)) {
    return timer <= 1
      ? 'Metal shrieks. The span sags under its own weight.'
      : 'The railing groans. Rust flakes fall as the metal begins to bend.';
  }
  if (/climb|closing|approach/.test(t)) {
    return timer <= 1
      ? 'Hands at the rim. Dust rains down on your cover.'
      : 'Boots scrape closer. Loose grit ticks onto the stone.';
  }
  if (/fire|heat|burn/.test(t)) {
    return 'Heat shimmers off the metal. Paint bubbles.';
  }
  if (/flood|water|wet/.test(t)) {
    return 'Water finds every crack. Footing darkens.';
  }
  if (/smoke|fog|ring/.test(t)) {
    return 'The air thickens. Edges of the field go soft.';
  }
  return timer <= 1
    ? 'The field complains loudly — something is about to give.'
    : 'Something on the field has started to fail.';
}

export function mockThreatForIntent(
  state: GameState,
  bossIntent: string,
  bossOutcome: string,
): ActiveThreat | null {
  if (bossOutcome === 'failure' || bossOutcome === 'backfire') {
    return state.activeThreat
      ? { ...state.activeThreat, timer: Math.max(1, state.activeThreat.timer) }
      : null;
  }

  const objects = state.world.battlefield[2] ?? 'Railing';
  const arena = state.world.battlefield[0] ?? 'Platform';
  const lower = bossIntent.toLowerCase();

  let label = 'Shifting Ground';
  if (/climb|grab the|sprint/.test(lower)) label = `Climbing ${arena}`;
  else if (/cut|saw|slice|plasma|blade|heat|charge|wedge|rig/.test(lower))
    label = `Damaged ${objects}`;
  else if (/chalk|seal|rule|bound|spike|ledger/.test(lower))
    label = `Marked Ground`;
  else if (/ring|ash|storm|rain|banner/.test(lower)) label = `Closing Weather`;
  else if (/smoke|flare|decoy|mirror/.test(lower)) label = `Blind Edge`;

  if (state.activeThreat && state.activeThreat.label === label) {
    const timer = Math.max(0, state.activeThreat.timer - 1);
    return {
      ...state.activeThreat,
      timer,
      foreshadow: foreshadowFor(label, timer),
      tension: timer <= 1 ? 'crisis' : 'threat',
    };
  }

  const timer = 3;
  return {
    id: `threat-${state.round}`,
    label,
    foreshadow: foreshadowFor(label, timer),
    timer,
    source: 'boss',
    tension: 'threat',
  };
}

export function threatFromJudgment(
  state: GameState,
  judgment: ArbiterJudgment,
): ActiveThreat | null {
  if (judgment.clearThreat) return null;

  const t = judgment.activeThreat;
  if (t && t.label.trim()) {
    const timer = Math.max(1, Math.min(4, Number(t.timer) || 3));
    const foreshadow =
      (t.foreshadow && t.foreshadow.trim()) ||
      foreshadowFor(t.label, timer);
    return {
      id: `threat-${state.round}`,
      label: t.label.trim().slice(0, 60),
      foreshadow: foreshadow.slice(0, 160),
      timer,
      source: 'boss',
      tension: tensionPhase(state.round, null),
    };
  }

  if (judgment.bossOutcome === 'failure' || judgment.bossOutcome === 'backfire') {
    return state.activeThreat
      ? { ...state.activeThreat, timer: Math.max(1, state.activeThreat.timer) }
      : null;
  }

  if (state.activeThreat) {
    const timer = Math.max(0, state.activeThreat.timer - 1);
    return {
      ...state.activeThreat,
      timer,
      foreshadow: foreshadowFor(state.activeThreat.label, timer),
      tension: timer <= 1 ? 'crisis' : 'threat',
    };
  }

  return mockThreatForIntent(state, judgment.bossIntent, judgment.bossOutcome);
}

export function crisisPayoff(threat: ActiveThreat | null): {
  playerBody: number;
  playerResolve: number;
  note: string;
} | null {
  if (!threat || threat.timer > 0) return null;
  return {
    playerBody: -6,
    playerResolve: -12,
    note: `${threat.label} gives way — debris clips you.`,
  };
}

export function playerAddressesThreat(
  playerRaw: string,
  threat: ActiveThreat | null,
): boolean {
  if (!threat) return false;
  const t = `${threat.label} ${threat.foreshadow}`.toLowerCase();
  const words = t
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const raw = playerRaw.toLowerCase();
  const hits = words.filter((w) => raw.includes(w)).length;
  return (
    hits >= 2 ||
    /\b(stop|break|save|defend|cover|pillar|rail|beam|flee|run|counter|interrupt|disarm|cutter|charge)\b/.test(
      raw,
    )
  );
}

/** UI / dossier lines — facts only, no advice. */
export function formatThreatSigns(threat: ActiveThreat): string[] {
  return [
    `⚠ ${threat.label} (${threat.timer})`,
    threat.foreshadow,
  ];
}
