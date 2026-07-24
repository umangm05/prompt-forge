import type { Awareness, AwarenessShift, EntityState } from '../types';

const ORDER: Awareness[] = ['FULL', 'APPROXIMATE', 'LOST', 'FALSE_INFO'];

export function degradeAwareness(current: Awareness): Awareness {
  const i = ORDER.indexOf(current);
  return ORDER[Math.min(ORDER.length - 1, i + 1)]!;
}

export function restoreAwareness(current: Awareness): Awareness {
  const i = ORDER.indexOf(current);
  return ORDER[Math.max(0, i - 1)]!;
}

export function applyAwarenessShift(
  entity: EntityState,
  shift: AwarenessShift,
  phantomVector?: string,
): EntityState {
  if (shift === 'none') return entity;
  if (shift === 'degrade') {
    return { ...entity, awareness: degradeAwareness(entity.awareness) };
  }
  if (shift === 'hijack') {
    return {
      ...entity,
      awareness: 'FALSE_INFO',
      phantomVector: phantomVector ?? 'phantom coordinates',
    };
  }
  if (shift === 'restore') {
    const next = restoreAwareness(entity.awareness);
    return {
      ...entity,
      awareness: next,
      phantomVector: next === 'FALSE_INFO' ? entity.phantomVector : undefined,
    };
  }
  return entity;
}

export function awarenessCombatHint(awareness: Awareness): string {
  switch (awareness) {
    case 'FULL':
      return 'standard defense';
    case 'APPROXIMATE':
      return '+15% partial success vs this entity; only broad AoE defense';
    case 'LOST':
      return 'targeted attacks bypass normal defense contest';
    case 'FALSE_INFO':
      return 'actions aimed at phantom space: failure/backfire likely';
  }
}
