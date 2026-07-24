import type {
  ArbiterJudgment,
  EntityState,
  GameState,
  ResolutionOutcome,
  ResolvedVerdict,
} from '../types';
import { formatThreatSigns } from './threats';

function fmtDelta(before: number, after: number): string {
  const d = Math.round((after - before) * 10) / 10;
  const sign = d > 0 ? '+' : '';
  return `${before.toFixed(0)} → ${after.toFixed(0)} (${sign}${d})`;
}

function outcomeLabel(o: ResolutionOutcome): string {
  return o.toUpperCase();
}

export function storyToBullets(story: string): string[] {
  const raw = story.trim();
  if (!raw) return ['Something on the field has changed.'];

  const lines = raw
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);

  const alreadyBullets =
    raw.split('\n').filter((l) => /^[-*•]\s+/.test(l.trim())).length >= 2;
  if (alreadyBullets) return lines.slice(0, 5);

  const sentences = raw
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  if (sentences.length >= 2) return sentences.slice(0, 5);
  return lines.slice(0, 5);
}

function bullets(items: string[]): string[] {
  return items.map((i) => `• ${i}`);
}

/** Dossier: what changed, why it hurt, battlefield facts — never advice. */
export function composeJudgmentDocument(opts: {
  story: string;
  before: GameState;
  after: GameState;
  verdict: ResolvedVerdict;
  damageWhy?: string;
  fieldSigns?: string[];
}): string {
  const { story, before, after, verdict, damageWhy, fieldSigns } = opts;
  const happened = bullets(storyToBullets(story));

  const why = [
    damageWhy?.trim() || verdict.damageWhyPlayer,
    `Your Body ${fmtDelta(before.player.body, after.player.body)} · Resolve ${fmtDelta(before.player.resolve, after.player.resolve)}`,
    `Boss Body ${fmtDelta(before.boss.body, after.boss.body)} · Resolve ${fmtDelta(before.boss.resolve, after.boss.resolve)}`,
    `${outcomeLabel(verdict.playerOutcome)} vs ${outcomeLabel(verdict.bossOutcome)}`,
  ].filter(Boolean);

  const field: string[] = [];
  const pushField = (s: string) => {
    if (!s.trim()) return;
    if (/choose between|you should|options:/i.test(s)) return;
    const k = s.toLowerCase();
    if (field.some((f) => f.toLowerCase() === k)) return;
    field.push(s);
  };

  for (const s of fieldSigns ?? []) pushField(s);
  if (after.activeThreat) {
    for (const s of formatThreatSigns(after.activeThreat)) pushField(s);
  }
  for (const b of after.world.battlefield) pushField(b);
  if (!field.length) pushField('The arena holds its breath.');

  return [
    'What changed',
    ...happened,
    '',
    'Why it hurt',
    ...bullets(why),
    '',
    'Battlefield',
    ...bullets(field.slice(0, 8)),
  ].join('\n');
}

export function defaultBossReaction(
  verdict: ResolvedVerdict,
  bossAfter: EntityState,
): string {
  if (verdict.bossOutcome === 'backfire') {
    return 'Their tool slips.\n\nThey catch themselves.';
  }
  if (verdict.playerOutcome === 'success' && bossAfter.resolve < 40) {
    return 'They stumble.\n\nLook at you.\n\nSmile.\n\n"...Earned."';
  }
  if (
    verdict.playerOutcome === 'success' ||
    verdict.playerOutcome === 'partial'
  ) {
    return 'They reset stance.\n\nKeep working.';
  }
  if (verdict.bossOutcome === 'success') {
    return 'They do not celebrate.\n\nThey keep working the field.';
  }
  return 'They watch the field.\n\nWaiting.';
}

export function enrichMockStory(
  _playerRaw: string,
  bossRaw: string,
  verdict: ResolvedVerdict,
  _battlefield: string[],
): string {
  return [
    `• Boss commits: ${bossRaw.slice(0, 100)}`,
    `• Clash resolves ${verdict.playerOutcome} / ${verdict.bossOutcome}`,
    `• The field carries a new mark`,
  ].join('\n');
}

export function ensureNarrativeFields(judgment: ArbiterJudgment): ArbiterJudgment {
  return {
    ...judgment,
    judgmentNarrative: judgment.judgmentNarrative?.trim() || '',
    bossReaction: judgment.bossReaction?.trim() || '',
    damageWhy: judgment.damageWhy?.trim() || '',
    fieldSigns: Array.isArray(judgment.fieldSigns) ? judgment.fieldSigns : [],
  };
}
