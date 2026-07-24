import type { Position, PositionShift } from '../types';

const ORDER: Position[] = ['LONG', 'MID', 'CLOSE'];

export function applyPositionShift(
  current: Position,
  shift: PositionShift,
): Position {
  if (shift === 'none') return current;
  const i = ORDER.indexOf(current);
  if (shift === 'closer') return ORDER[Math.min(ORDER.length - 1, i + 1)]!;
  return ORDER[Math.max(0, i - 1)]!;
}

export function positionPlausibilityHint(
  position: Position,
  category: string,
): number {
  if (category === 'ATTACK' && position === 'LONG') return -0.1;
  if (category === 'ATTACK' && position === 'CLOSE') return 0.05;
  if (category === 'UTILITY' && position === 'MID') return 0.05;
  return 0;
}
