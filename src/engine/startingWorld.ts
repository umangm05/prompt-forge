import {
  ARENA_POOL,
  OBJECTS_POOL,
  WEATHER_POOL,
} from '../config/gameConfig';
import type { InitiativeHolder, Position, WorldState } from '../types';

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

  return {
    world: {
      battlefield: [arena, weather, objects],
      environmentalEvent: weather,
      realityPressure: 0.18 + rng() * 0.2,
      initiative,
    },
    playerPosition,
    bossPosition,
  };
}
