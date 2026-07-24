import type { FieldElement, WorldState, WorldThreshold } from '../types';
import { createFieldElement, syncBattlefieldLabels } from './fieldElements';

interface ThresholdSeed {
  id: string;
  label: string;
  match: string[];
  watch: string[];
  triggerAt: number;
  omen: (p: number) => string;
  transformation: string;
  resultElement?: string;
}

const SEEDS: ThresholdSeed[] = [
  {
    id: 'structure-fail',
    label: 'Structural Collapse',
    match: ['pillar', 'rail', 'arch', 'platform', 'barricade', 'chain', 'statue'],
    watch: ['damage', 'cut', 'saw', 'crack', 'bent', 'broken', 'sag'],
    triggerAt: 3,
    omen: (p) =>
      p >= 2
        ? 'Stone dust rains. Load-bearing lines scream under strain.'
        : 'Hairline cracks spider across a support.',
    transformation: 'A load-bearing span gives way — half the footing becomes rubble.',
    resultElement: 'Collapsed Span',
  },
  {
    id: 'fire-roof',
    label: 'Roof Fire',
    match: ['ember', 'fire', 'heat', 'oil', 'banner', 'wood'],
    watch: ['fire', 'burn', 'heat', 'ignite', 'ember', 'smoke'],
    triggerAt: 3,
    omen: (p) =>
      p >= 2
        ? 'Heat rolls upward. Ceiling beams blacken and spit.'
        : 'A dry beam above starts to smell of char.',
    transformation: 'The roof caves in a sheet of sparks and falling timber.',
    resultElement: 'Burning Rubble',
  },
  {
    id: 'flood-line',
    label: 'Flood Breach',
    match: ['water', 'rain', 'flood', 'undercroft', 'puddle'],
    watch: ['water', 'flood', 'wet', 'rain', 'spill'],
    triggerAt: 3,
    omen: (p) =>
      p >= 2
        ? 'Water climbs the walls. Footing vanishes under a rising sheet.'
        : 'Water finds every seam and begins to pool deeper.',
    transformation: 'The arena floods — old walkways become channels.',
    resultElement: 'Flood Channel',
  },
  {
    id: 'seal-break',
    label: 'Broken Seals',
    match: ['eclipse', 'seal', 'chalk', 'mark', 'ledger', 'mirror', 'glass'],
    watch: ['seal', 'mark', 'break', 'shatter', 'illusion', 'mirror'],
    triggerAt: 3,
    omen: (p) =>
      p >= 2
        ? 'Old marks peel. Something suppressed starts to show through.'
        : 'A stamped seal flakes at the edge.',
    transformation: 'Suppressed illusions bloom across the field — nothing looks trustworthy.',
    resultElement: 'Visible Illusions',
  },
];

function matchAny(text: string, needles: string[]): boolean {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

export function seedThresholdsForArena(
  elements: FieldElement[],
): WorldThreshold[] {
  const labels = elements.map((e) => e.name).join(' ');
  const picked = SEEDS.filter((s) => matchAny(labels, s.match)).slice(0, 2);
  const fallback = SEEDS[0]!;
  const seeds = picked.length ? picked : [fallback];
  return seeds.map((s) => ({
    id: s.id,
    label: s.label,
    watch: s.watch,
    triggerAt: s.triggerAt,
    progress: 0,
    omen: s.omen(0),
    transformation: s.transformation,
    triggered: false,
    match: s.match,
  }));
}

export function advanceThresholds(
  world: WorldState,
  causalNarratives: string[],
): WorldState {
  const blob = [
    ...world.battlefield,
    ...world.fieldElements.flatMap((e) => [
      e.name,
      e.condition,
      ...e.scars,
      ...e.history.slice(-2),
    ]),
    ...causalNarratives,
  ]
    .join(' ')
    .toLowerCase();

  let lastTransformation = world.lastTransformation;
  let elements = [...world.fieldElements];
  const thresholds = world.thresholds.map((th) => {
    if (th.triggered) return th;
    const seed = SEEDS.find((s) => s.id === th.id);
    const hit = th.watch.some((w) => blob.includes(w.toLowerCase()));
    let progress = th.progress;
    if (hit) progress = Math.min(th.triggerAt, progress + 1);
    const omen = seed?.omen(progress) ?? th.omen;
    if (progress < th.triggerAt) {
      return { ...th, progress, omen };
    }
    // Fire transformation once.
    lastTransformation = th.transformation;
    if (seed?.resultElement) {
      const exists = elements.some((e) =>
        e.name.toLowerCase().includes(seed.resultElement!.toLowerCase()),
      );
      if (!exists) {
        elements.push(
          createFieldElement(seed.resultElement, 'world', {
            condition: 'transformed',
            knownProperties: ['arena-transformed'],
            history: [th.transformation],
            unresolvedProperties: ['how to use the new ground'],
          }),
        );
      }
    }
    return {
      ...th,
      progress,
      omen,
      triggered: true,
    };
  });

  return syncBattlefieldLabels({
    ...world,
    fieldElements: elements,
    thresholds,
    lastTransformation,
    environmentalEvent: lastTransformation
      ? lastTransformation.slice(0, 48)
      : world.environmentalEvent,
  });
}

export function activeOmen(world: WorldState): string | undefined {
  const live = world.thresholds.find((t) => !t.triggered && t.progress > 0);
  return live?.omen;
}
