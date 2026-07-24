import type {
  ArbiterJudgment,
  EntityState,
  GameState,
  ResolutionOutcome,
  ResolvedVerdict,
} from '../types';
import { elementSummary } from './fieldElements';
import { formatThreadSigns, formatThreatSigns } from './threats';

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

  if (verdict.causalEvents.length) {
    for (const e of verdict.causalEvents.slice(0, 3)) {
      const line = `${e.actor}: ${e.narrative || e.method}`;
      if (!happened.some((h) => h.includes(e.narrative.slice(0, 24)))) {
        happened.push(`• ${line}`);
      }
    }
  }

  const why = [
    damageWhy?.trim() || verdict.damageWhyPlayer,
    (verdict.expectationBreak ?? after.lastExpectationBreak)
      ? `Expectation break: they acted on "${(verdict.expectationBreak ?? after.lastExpectationBreak)!.beliefClaim}" — ${(verdict.expectationBreak ?? after.lastExpectationBreak)!.controlShift}`
      : '',
    `Your Body ${fmtDelta(before.player.body, after.player.body)} · Resolve ${fmtDelta(before.player.resolve, after.player.resolve)}`,
    `Boss Body ${fmtDelta(before.boss.body, after.boss.body)} · Resolve ${fmtDelta(before.boss.resolve, after.boss.resolve)}`,
    `${outcomeLabel(verdict.playerOutcome)}/${verdict.playerRelation} vs ${outcomeLabel(verdict.bossOutcome)}/${verdict.bossRelation}`,
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
  if (after.tacticalThread) {
    for (const s of formatThreadSigns(after.tacticalThread)) pushField(s);
  } else if (after.activeThreat) {
    for (const s of formatThreatSigns(after.activeThreat)) pushField(s);
  }
  for (const el of after.world.fieldElements.slice(0, 6)) {
    pushField(elementSummary(el));
  }
  if (after.world.thresholds.some((t) => !t.triggered && t.progress > 0)) {
    const omen = after.world.thresholds.find((t) => !t.triggered && t.progress > 0);
    if (omen) pushField(`Omen — ${omen.label}: ${omen.omen}`);
  }
  if (after.world.lastTransformation) {
    pushField(`Transformed: ${after.world.lastTransformation}`);
  }
  if (after.tempo) {
    pushField(`Tempo: ${after.tempo.beat}`);
  }
  if (after.temptation) {
    pushField(after.temptation.foreshadow);
  }
  for (const d of verdict.discoveries) {
    pushField(`Learned: ${d.finding}`);
  }
  if (!field.length) pushField('The arena holds its breath.');

  return [
    'What changed',
    ...happened.slice(0, 7),
    '',
    'Why it hurt',
    ...bullets(why),
    '',
    'Battlefield',
    ...bullets(field.slice(0, 10)),
  ].join('\n');
}

export function defaultBossReaction(
  verdict: ResolvedVerdict,
  bossAfter: EntityState,
): string {
  if (verdict.bossOutcome === 'backfire') {
    return 'Their tool slips.\n\nThey catch themselves.';
  }
  if (verdict.expectationBreak) {
    return 'They freeze.\n\nThe read was wrong.\n\nThey reset too late.';
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
    `• Clash resolves ${verdict.playerOutcome}/${verdict.playerRelation} · ${verdict.bossOutcome}/${verdict.bossRelation}`,
    verdict.discoveries[0]
      ? `• Discovery: ${verdict.discoveries[0].finding}`
      : `• The field carries a new mark`,
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
