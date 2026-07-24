import { WORD_FATIGUE } from '../config/gameConfig';
import type { EntityState } from '../types';

const STOP = new Set([
  'i',
  'a',
  'an',
  'the',
  'to',
  'and',
  'or',
  'of',
  'in',
  'on',
  'with',
  'my',
  'your',
  'you',
  'me',
  'into',
  'from',
  'for',
  'at',
  'as',
  'is',
  'are',
  'be',
  'by',
]);

export function extractConcepts(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
    .slice(0, 12);
}

export function fatiguePenalty(
  entity: EntityState,
  concepts: string[],
): number {
  let penalty = 0;
  for (const c of concepts) {
    const uses = entity.conceptUsage[c] ?? 0;
    if (uses > 0) penalty += uses * WORD_FATIGUE.perUse;
  }
  return Math.min(WORD_FATIGUE.cap, penalty);
}

export function recordConcepts(
  entity: EntityState,
  concepts: string[],
): EntityState {
  const usage = { ...entity.conceptUsage };
  for (const c of concepts) {
    usage[c] = (usage[c] ?? 0) + 1;
  }
  return { ...entity, conceptUsage: usage };
}
