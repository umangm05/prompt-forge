import type { WorldState } from '../types';
import { activeOmen, advanceThresholds } from './worldThresholds';

/**
 * Random mid-fight injection removed.
 * World evolution comes from seeded latent thresholds only.
 */
export function maybeInjectEnvironmentalEvent(world: WorldState): WorldState {
  // No random injection — return world unchanged.
  // Omens surface via thresholds; transformations via advanceThresholds.
  return world;
}

/** Kept for API compat — thresholds handle persistence now. */
export function clearStaleEvent(world: WorldState, _round: number): WorldState {
  return world;
}

export function evaluateWorldThresholds(
  world: WorldState,
  causalNarratives: string[],
): WorldState {
  return advanceThresholds(world, causalNarratives);
}

export function currentOmen(world: WorldState): string | undefined {
  return activeOmen(world);
}
