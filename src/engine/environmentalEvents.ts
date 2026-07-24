import {
  ENV_EVENT_CHANCE,
  ENVIRONMENTAL_EVENTS,
} from '../config/gameConfig';
import type { WorldState } from '../types';

export function maybeInjectEnvironmentalEvent(
  world: WorldState,
  force?: boolean,
): WorldState {
  if (world.environmentalEvent && !force) return world;
  if (!force && Math.random() > ENV_EVENT_CHANCE) return world;
  const event =
    ENVIRONMENTAL_EVENTS[
      Math.floor(Math.random() * ENVIRONMENTAL_EVENTS.length)
    ]!;
  const battlefield = world.battlefield.includes(event)
    ? world.battlefield
    : [...world.battlefield, event];
  return { ...world, environmentalEvent: event, battlefield };
}

export function clearStaleEvent(world: WorldState, round: number): WorldState {
  if (!world.environmentalEvent) return world;
  if (round % 4 === 0) {
    return { ...world, environmentalEvent: undefined };
  }
  return world;
}
