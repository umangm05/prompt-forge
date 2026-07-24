import type { BossArchetype } from '../types';
import { BOSS_LABELS } from '../engine/bossArchetypes';
import { getBossPersonality } from '../engine/bossPersonalities';

export interface BossMeta {
  id: BossArchetype;
  name: string;
  trait: string;
  blurb: string;
  /** Glyph / monogram shown in avatar plate */
  glyph: string;
}

const GLYPHS: Record<BossArchetype, string> = {
  lawyer: '§',
  scientist: 'Δ',
  poet: '¶',
  historian: '⌛',
  trickster: '?',
  child: '◇',
  minimalist: '—',
};

function metaFor(id: BossArchetype): BossMeta {
  const p = getBossPersonality(id);
  return {
    id,
    name: BOSS_LABELS[id],
    trait: p.trait,
    blurb: `${p.goal} Tools: ${p.toolkit.slice(0, 2).join(', ')}.`,
    glyph: GLYPHS[id],
  };
}

export const BOSS_META: Record<BossArchetype, BossMeta> = {
  lawyer: metaFor('lawyer'),
  scientist: metaFor('scientist'),
  poet: metaFor('poet'),
  historian: metaFor('historian'),
  trickster: metaFor('trickster'),
  child: metaFor('child'),
  minimalist: metaFor('minimalist'),
};

export const ALL_BOSSES = Object.values(BOSS_META);

export function randomBoss(): BossArchetype {
  const ids = ALL_BOSSES.map((b) => b.id);
  return ids[Math.floor(Math.random() * ids.length)]!;
}
