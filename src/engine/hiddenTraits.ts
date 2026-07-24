import { HIDDEN_TRAITS } from '../config/gameConfig';
import type { EntityState } from '../types';

export function pickHiddenTrait(seed?: number): string {
  const i =
    typeof seed === 'number'
      ? Math.abs(seed) % HIDDEN_TRAITS.length
      : Math.floor(Math.random() * HIDDEN_TRAITS.length);
  return HIDDEN_TRAITS[i]!;
}

export function revealTrait(
  entity: EntityState,
  hint: string,
): { entity: EntityState; revealed: string } {
  if (entity.hiddenTraitRevealed || !hint.trim()) {
    return { entity, revealed: '' };
  }
  const hintLower = hint.toLowerCase();
  const match =
    hintLower.includes(entity.hiddenTrait.toLowerCase()) ||
    entity.hiddenTrait.toLowerCase().includes(hintLower.slice(0, 8));
  if (!match) return { entity, revealed: '' };
  return {
    entity: { ...entity, hiddenTraitRevealed: true },
    revealed: entity.hiddenTrait,
  };
}

export function traitExploitBonus(raw: string, trait: string, revealed: boolean): number {
  if (!revealed) return 0;
  const t = trait.toLowerCase();
  const r = raw.toLowerCase();
  if (t === 'conductive' && /(electric|shock|lightning|current)/.test(r)) return 0.2;
  if (t === 'glass bones' && /(blunt|crush|smash|impact|fall)/.test(r)) return 0.2;
  if (t === 'pyrophile' && /(fire|flame|burn|heat)/.test(r)) return -0.15;
  if (t === 'literal thinker' && /(metaphor|symbol|poem|figure)/.test(r)) return 0.15;
  if (t === 'hydrophobic' && /(water|flood|rain|soak)/.test(r)) return 0.15;
  if (t === 'echo sensitive' && /(loud|echo|sonic|sound|noise)/.test(r)) return 0.15;
  return 0;
}
