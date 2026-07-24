import {
  ACTION_VERBS,
  FICTION_IP_PATTERNS,
  FORBIDDEN_CONCEPTS,
} from '../config/gameConfig';
import type {
  ArgumentCategory,
  ArgumentTarget,
  EntityState,
  ParsedIntent,
} from '../types';
import { evaluateComplexity, scaleDownText } from './complexityBudget';
import { isInvestigative } from './discoveries';
import { extractConcepts, fatiguePenalty } from './wordFatigue';

function countActionVerbs(raw: string): number {
  const lower = raw.toLowerCase();
  return ACTION_VERBS.filter((v) => lower.includes(v)).length;
}

function looksLikeOutcomeDeclaration(raw: string): boolean {
  return (
    /\b(hits? you|kills? you|you die|you take|guaranteed|deals?\s+\d+|burns? you|destroys? you)\b/i.test(
      raw,
    ) || /\bmy .+ (hits|lands|succeeds)\b/i.test(raw)
  );
}

function checkGuardrails(raw: string): string | undefined {
  for (const p of FICTION_IP_PATTERNS) {
    if (p.test(raw)) {
      return 'Fiction Import Rule: external IP / named abilities are not allowed. Describe original effects.';
    }
  }
  for (const p of FORBIDDEN_CONCEPTS) {
    if (p.test(raw)) {
      return 'Forbidden concept: omnipotence, instant victory, rule editing, prompt injection, or reality rewriting are rejected.';
    }
  }
  if (looksLikeOutcomeDeclaration(raw)) {
    return 'Outcome declarations are illegal. Describe intent/attempt, not guaranteed results.';
  }
  return undefined;
}

export function classifyCategory(raw: string): ArgumentCategory {
  const t = raw.toLowerCase();
  if (/\b(dodge|block|guard|shield|parry|cover|defend)\b/.test(t)) return 'DEFENSE';
  if (/\b(hide|deceive|fake|mislead|distract|confuse|fear|intimidate)\b/.test(t))
    return 'MANIPULATION';
  if (/\b(move|close|retreat|scout|listen|search|reposition|dash|circle)\b/.test(t))
    return 'UTILITY';
  if (
    /\b(flood|rain|ignite|flood|smoke|steam|break|shatter|wet|heat|spill|pour)\b/.test(
      t,
    )
  )
    return 'SETUP';
  return 'ATTACK';
}

export function classifyTarget(raw: string): ArgumentTarget {
  const t = raw.toLowerCase();
  if (/\b(pillar|ground|floor|wall|water|fire|rain|terrain|arena|environment)\b/.test(t))
    return 'ENVIRONMENT';
  if (/\b(close|distance|range|approach|retreat|flank|position)\b/.test(t))
    return 'POSITION';
  if (/\b(object|debris|rock|weapon|tool|book|shelf)\b/.test(t)) return 'OBJECT';
  return 'OPPONENT';
}

export function parseIntent(raw: string, entity: EntityState): ParsedIntent {
  const trimmed = raw.trim();
  const rejected = checkGuardrails(trimmed);
  if (rejected) {
    return {
      intent: {
        raw: trimmed,
        category: 'ATTACK',
        target: 'OPPONENT',
      },
      complexity: evaluateComplexity(trimmed),
      concepts: [],
      scaledDown: false,
      rejected,
      fatiguePenalty: 0,
    };
  }

  let text = trimmed;
  let scaledDown = false;
  const verbCount = countActionVerbs(text);
  if (verbCount > 3) {
    // Preserve the first clause rather than replacing authorship entirely.
    const first = trimmed.split(/,| then | and then /i)[0]?.trim();
    text =
      first && first.length > 12
        ? first
        : 'I commit to one clear tactical pressure instead of a verb stack.';
    scaledDown = true;
  }

  let complexity = evaluateComplexity(text);
  if (complexity.overBudget) {
    text = scaleDownText(text, complexity);
    complexity = evaluateComplexity(text);
    scaledDown = true;
  }

  const concepts = extractConcepts(text);
  const category = classifyCategory(text);
  return {
    intent: {
      raw: text,
      category,
      target: classifyTarget(text),
    },
    complexity,
    concepts,
    scaledDown,
    fatiguePenalty: fatiguePenalty(entity, concepts),
    investigative: isInvestigative(text, category),
  };
}
