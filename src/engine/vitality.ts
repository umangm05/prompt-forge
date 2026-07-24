import {
  RESOLVE_FRACTURE_THRESHOLD,
  RESOLVE_FRACTURE_MULTIPLIER,
} from '../config/gameConfig';
import type { EntityState, WorldState } from '../types';

export function clampVital(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function applyDeltas(
  entity: EntityState,
  bodyDelta: number,
  resolveDelta: number,
): EntityState {
  return {
    ...entity,
    body: clampVital(entity.body + bodyDelta),
    resolve: clampVital(entity.resolve + resolveDelta),
  };
}

export function realityDistortionMultiplier(resolve: number): number {
  if (resolve >= 75) return 1;
  if (resolve < RESOLVE_FRACTURE_THRESHOLD) return RESOLVE_FRACTURE_MULTIPLIER;
  return 0.85 + (resolve / 100) * 0.15;
}

export function recalculateRealityPressure(
  world: WorldState,
  player: EntityState,
  boss: EntityState,
): number {
  const battlefieldWeight = world.battlefield.length * 0.04;
  const eventWeight = world.environmentalEvent ? 0.15 : 0;
  const fracture =
    (player.resolve < RESOLVE_FRACTURE_THRESHOLD ? 0.1 : 0) +
    (boss.resolve < RESOLVE_FRACTURE_THRESHOLD ? 0.1 : 0);
  return Math.min(1, 0.2 + battlefieldWeight + eventWeight + fracture);
}

export function checkWinner(
  player: EntityState,
  boss: EntityState,
): 'player' | 'boss' | undefined {
  if (boss.resolve <= 0) return 'player';
  if (player.resolve <= 0) return 'boss';
  if (boss.body <= 0 && player.body > 0) return 'player';
  if (player.body <= 0 && boss.body > 0) return 'boss';
  return undefined;
}
