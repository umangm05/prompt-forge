import {
  COMPLEXITY_BUDGET,
  COMPLEXITY_COSTS,
  HIGH_QTY_PATTERNS,
  INFUSE_WORDS,
  LOW_QTY_PATTERNS,
  MANIFESTATION_WORDS,
  SHAPE_WORDS,
  TRACKING_WORDS,
} from '../config/gameConfig';
import type { ComplexityBreakdown } from '../types';

function countMatches(text: string, words: readonly string[]): number {
  const lower = text.toLowerCase();
  return words.filter((w) => lower.includes(w)).length;
}

export function evaluateComplexity(raw: string): ComplexityBreakdown {
  const layers: { label: string; cost: number }[] = [
    { label: 'Base Action', cost: COMPLEXITY_COSTS.base },
  ];

  const manifestations = countMatches(raw, MANIFESTATION_WORDS);
  if (manifestations > 0) {
    layers.push({
      label: 'Manifestation',
      cost: COMPLEXITY_COSTS.manifestation * Math.min(manifestations, 2),
    });
  }

  const shapes = countMatches(raw, SHAPE_WORDS);
  if (shapes > 0) {
    layers.push({
      label: 'Geometric Shape',
      cost: COMPLEXITY_COSTS.shape * Math.min(shapes, 2),
    });
  }

  const infuses = countMatches(raw, INFUSE_WORDS);
  if (infuses > 0) {
    layers.push({
      label: 'Imbue / Infuse',
      cost: COMPLEXITY_COSTS.infuse * infuses,
    });
  }

  const highQty = HIGH_QTY_PATTERNS.some((p) => p.test(raw));
  const lowQty = !highQty && LOW_QTY_PATTERNS.some((p) => p.test(raw));
  if (highQty) {
    layers.push({ label: 'High Quantity', cost: COMPLEXITY_COSTS.highQty });
  } else if (lowQty) {
    layers.push({ label: 'Low Quantity', cost: COMPLEXITY_COSTS.lowQty });
  }

  const tracking = countMatches(raw, TRACKING_WORDS);
  if (tracking > 0) {
    layers.push({ label: 'Behavioral Logic', cost: COMPLEXITY_COSTS.tracking });
  }

  const total = layers.reduce((sum, l) => sum + l.cost, 0);
  return {
    total,
    overBudget: total > COMPLEXITY_BUDGET,
    largeArea: highQty,
    layers,
  };
}

export function scaleDownText(raw: string, complexity: ComplexityBreakdown): string {
  if (!complexity.overBudget && !complexity.largeArea) return raw;
  let scaled = raw;
  if (complexity.largeArea) {
    scaled = scaled
      .replace(/\b(hundred|thousand|swarm|army|barrage)\b/gi, 'few')
      .replace(/\b([5-9]\d|\d{3,})\b/g, '3');
  }
  return `I attempt a focused, limited version of: ${scaled}`;
}
