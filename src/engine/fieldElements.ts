import type { ActorSide, FieldElement, WorldState } from '../types';
import { isNearDuplicateLabel } from './labelDedupe';

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function createFieldElement(
  name: string,
  createdBy: ActorSide,
  opts?: {
    condition?: string;
    knownProperties?: string[];
    unresolvedProperties?: string[];
    history?: string[];
  },
): FieldElement {
  return {
    id: `fe-${slug(name)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    condition: opts?.condition ?? 'intact',
    createdBy,
    lastChangedBy: createdBy,
    usable: true,
    knownProperties: opts?.knownProperties ?? [],
    unresolvedProperties: opts?.unresolvedProperties ?? [
      'trigger unknown',
      'limit unknown',
    ],
    scars: [],
    history: opts?.history ?? [`Appeared (${createdBy}).`],
    relationships: [],
  };
}

export function elementsFromStartingTags(
  tags: string[],
): FieldElement[] {
  return tags.map((tag, i) => {
    const kind = i === 0 ? 'arena' : i === 1 ? 'weather' : 'objects';
    return createFieldElement(tag, 'world', {
      condition: 'present',
      knownProperties: [kind],
      unresolvedProperties:
        kind === 'objects'
          ? ['how it fails', 'who can seize it']
          : ['how it shifts mid-fight'],
      history: [`Seeded as starting ${kind}.`],
    });
  });
}

export function syncBattlefieldLabels(world: WorldState): WorldState {
  return {
    ...world,
    battlefield: world.fieldElements
      .filter((e) => e.usable || e.scars.length > 0)
      .map((e) =>
        e.condition === 'intact' || e.condition === 'present'
          ? e.name
          : `${e.name} (${e.condition})`,
      ),
  };
}

export function findElement(
  elements: FieldElement[],
  query: string,
): FieldElement | undefined {
  const q = query.toLowerCase();
  return elements.find(
    (e) =>
      e.name.toLowerCase() === q ||
      e.name.toLowerCase().includes(q) ||
      q.includes(e.name.toLowerCase()),
  );
}

export function mutateFieldElement(
  el: FieldElement,
  changer: ActorSide,
  opts: {
    condition?: string;
    scar?: string;
    known?: string;
    resolveProperty?: string;
    relationship?: string;
    history?: string;
    usable?: boolean;
  },
): FieldElement {
  const knownProperties = [...el.knownProperties];
  let unresolvedProperties = [...el.unresolvedProperties];
  if (opts.known && !knownProperties.includes(opts.known)) {
    knownProperties.push(opts.known);
  }
  if (opts.resolveProperty) {
    unresolvedProperties = unresolvedProperties.filter(
      (p) => !p.toLowerCase().includes(opts.resolveProperty!.toLowerCase()),
    );
    if (!knownProperties.includes(opts.resolveProperty)) {
      knownProperties.push(opts.resolveProperty);
    }
  }
  const scars = opts.scar ? [...el.scars, opts.scar].slice(-6) : el.scars;
  const history = opts.history
    ? [...el.history, opts.history].slice(-8)
    : el.history;
  const relationships = opts.relationship
    ? [...el.relationships, opts.relationship].slice(-6)
    : el.relationships;
  return {
    ...el,
    condition: opts.condition ?? el.condition,
    lastChangedBy: changer,
    usable: opts.usable ?? el.usable,
    knownProperties,
    unresolvedProperties,
    scars,
    history,
    relationships,
  };
}

/** Apply string add/remove proposals into structured elements with identity. */
export function applyFieldMutations(
  world: WorldState,
  add: string[],
  remove: string[],
  actor: ActorSide,
): WorldState {
  let elements = [...world.fieldElements];

  for (const r of remove) {
    const existing = findElement(elements, r);
    if (!existing) continue;
    elements = elements.map((e) =>
      e.id === existing.id
        ? mutateFieldElement(e, actor, {
            condition: 'broken',
            scar: `Broken by ${actor}`,
            history: `${actor} removed / broke ${e.name}.`,
            usable: false,
            relationship: `Successor potential retained in scars`,
          })
        : e,
    );
  }

  for (const a of add) {
    const label = a.trim();
    if (!label) continue;
    if (isNearDuplicateLabel(label, elements.map((e) => e.name))) {
      const existing = findElement(elements, label);
      if (existing) {
        elements = elements.map((e) =>
          e.id === existing.id
            ? mutateFieldElement(e, actor, {
                condition: e.condition === 'broken' ? 'repurposed' : 'altered',
                history: `${actor} altered ${e.name}.`,
                scar: `Altered by ${actor}`,
                usable: true,
              })
            : e,
        );
      }
      continue;
    }
    // Inherit history if this looks like a successor of a broken element.
    const broken = elements.find(
      (e) =>
        !e.usable &&
        (label.toLowerCase().includes(e.name.toLowerCase().split(' ')[0]!) ||
          e.name.toLowerCase().includes(label.toLowerCase().split(' ')[0]!)),
    );
    const created = createFieldElement(label, actor, {
      condition: 'fresh',
      history: broken
        ? [
            `Succeeded ${broken.name}.`,
            ...(broken.scars.slice(-2).map((s) => `Inherited: ${s}`)),
          ]
        : undefined,
      knownProperties: broken ? [...broken.knownProperties.slice(0, 2)] : [],
    });
    if (broken) {
      created.relationships.push(`Born from ${broken.name}`);
    }
    elements.push(created);
  }

  return syncBattlefieldLabels({ ...world, fieldElements: elements });
}

export function elementSummary(el: FieldElement): string {
  const bits = [el.name];
  if (el.condition !== 'intact' && el.condition !== 'present') {
    bits.push(`[${el.condition}]`);
  }
  if (el.scars[0]) bits.push(`— ${el.scars[0]}`);
  return bits.join(' ');
}
