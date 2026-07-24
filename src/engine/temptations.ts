import type {
  GameState,
  TacticalTemptation,
} from '../types';

/** Detect fiction-only temptations — never label safe/risky. */
export function detectTemptation(state: GameState): TacticalTemptation | undefined {
  const thread = state.tacticalThread;
  const bossExposed =
    state.boss.awareness === 'LOST' ||
    state.boss.awareness === 'FALSE_INFO' ||
    state.tempo.beat === 'aftermath';

  if (thread && thread.timer <= 2 && thread.status === 'armed' && bossExposed) {
    return {
      id: `temp-thread-${state.round}`,
      foreshadow: `${thread.label} still advances — and they are open for a beat.`,
      immediateGain: 'Strike the exposed opening now.',
      strategicCost: `Ignoring ${thread.label} lets its payoff ripen.`,
      expiresIn: 1,
      forSide: 'player',
    };
  }

  if (
    thread &&
    thread.controller === 'boss' &&
    thread.timer <= 1 &&
    state.player.position === 'CLOSE'
  ) {
    return {
      id: `temp-boss-${state.round}`,
      foreshadow: `The ${thread.label.toLowerCase()} is one beat from paying off — and you are inside reach.`,
      immediateGain: 'Finish the prepared payoff.',
      strategicCost: 'Punishing the close body abandons the ritual.',
      expiresIn: 1,
      forSide: 'boss',
    };
  }

  const omen = state.world.thresholds.find((t) => !t.triggered && t.progress >= 2);
  if (omen && state.bossAgenda.beliefs.apparentPlayerPattern) {
    return {
      id: `temp-omen-${state.round}`,
      foreshadow: `${omen.omen} Meanwhile a clear read on their habit hangs in the air.`,
      immediateGain: 'Exploit the read immediately.',
      strategicCost: 'Pushing now may cross the world threshold for everyone.',
      expiresIn: 2,
      forSide: 'boss',
    };
  }

  if (state.temptation && state.temptation.expiresIn > 0) {
    return {
      ...state.temptation,
      expiresIn: state.temptation.expiresIn - 1,
    };
  }

  return undefined;
}

export function tickTemptation(
  t?: TacticalTemptation,
): TacticalTemptation | undefined {
  if (!t) return undefined;
  if (t.expiresIn <= 0) return undefined;
  return { ...t, expiresIn: t.expiresIn - 1 };
}
