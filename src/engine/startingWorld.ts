import {
  ARENA_POOL,
  OBJECTS_POOL,
  WEATHER_POOL,
} from '../config/gameConfig';
import type { InitiativeHolder, Position, WorldState } from '../types';
import { elementsFromStartingTags, syncBattlefieldLabels } from './fieldElements';
import { seedThresholdsForArena } from './worldThresholds';

export interface StartingLayout {
  world: WorldState;
  playerPosition: Position;
  bossPosition: Position;
}

function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

/**
 * Fresh arena each duel — exactly 3 starting conditions:
 * arena geometry, weather, surrounding objects.
 * Also seeds latent world thresholds from those tags.
 */
export function rollStartingLayout(rng: () => number = Math.random): StartingLayout {
  const arena = pickOne(ARENA_POOL, rng);
  const weather = pickOne(WEATHER_POOL, rng);
  const objects = pickOne(OBJECTS_POOL, rng);

  const positions: Position[] = ['LONG', 'MID', 'CLOSE'];
  const playerPosition = pickOne(positions, rng);
  const other = positions.filter((p) => p !== playerPosition);
  const bossPosition =
    rng() < 0.7 ? pickOne(other.length ? other : positions, rng) : playerPosition;

  const initiative: InitiativeHolder = rng() < 0.5 ? 'player' : 'boss';
  const fieldElements = elementsFromStartingTags([arena, weather, objects]);
  const thresholds = seedThresholdsForArena(fieldElements);

  const world = syncBattlefieldLabels({
    battlefield: [arena, weather, objects],
    fieldElements,
    thresholds,
    environmentalEvent: weather,
    realityPressure: 0.18 + rng() * 0.2,
    initiative,
  });

  return {
    world,
    playerPosition,
    bossPosition,
  };
}
