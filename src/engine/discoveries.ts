import type {
  DiscoveryResult,
  FieldElement,
  GameState,
  ParsedIntent,
  ResolutionOutcome,
} from '../types';
import { findElement, mutateFieldElement } from './fieldElements';

export function isInvestigative(raw: string, category: string): boolean {
  const t = raw.toLowerCase();
  return (
    category === 'UTILITY' ||
    /\b(test|probe|tap|toss|throw .+ at|check|see if|listen|scout|inspect|examine|trial)\b/.test(
      t,
    )
  );
}

/**
 * Every resolved experiment must reduce uncertainty.
 * A non-reaction is itself recorded evidence.
 */
export function resolveExperiment(
  state: GameState,
  playerParsed: ParsedIntent,
  outcome: ResolutionOutcome,
): { discovery?: DiscoveryResult; elements: FieldElement[] } {
  if (!playerParsed.investigative && !isInvestigative(playerParsed.intent.raw, playerParsed.intent.category)) {
    return { elements: state.world.fieldElements };
  }

  const raw = playerParsed.intent.raw;
  const elements = [...state.world.fieldElements];
  const target =
    elements.find((e) => raw.toLowerCase().includes(e.name.toLowerCase())) ??
    findElement(elements, state.tacticalThread?.label ?? '') ??
    elements.find((e) => e.unresolvedProperties.length > 0) ??
    elements[elements.length - 1];

  if (!target) {
    return {
      discovery: {
        stimulus: raw.slice(0, 80),
        finding: 'The field does not answer — nothing here reacts to that stimulus.',
        disproved: 'Immediate reaction to that probe',
      },
      elements,
    };
  }

  const unresolved = target.unresolvedProperties[0] ?? 'hidden rule';
  let finding = '';
  let property = '';
  let disproved: string | undefined;

  if (outcome === 'failure' || outcome === 'backfire') {
    finding = `${target.name} does not react to that stimulus.`;
    disproved = `${unresolved} via this stimulus`;
    property = `inert to: ${raw.slice(0, 40)}`;
  } else if (outcome === 'partial') {
    finding = `${target.name} twitches — ${unresolved} is partly revealed.`;
    property = unresolved.replace('unknown', 'partially known');
  } else {
    // Success — confirm a property from condition / scars / archetype flavor.
    if (/rail|chain|wire|support|pillar/i.test(target.name)) {
      property = 'fails after sustained cut / load';
      finding = `${target.name} sings under stress — it will fail after more load, not on a light tap.`;
    } else if (/smoke|fog|steam/i.test(target.name)) {
      property = 'blocks sight both ways';
      finding = `${target.name} thickens both sightlines — nobody sees cleanly through it.`;
    } else if (/water|rain|puddle|flood/i.test(target.name)) {
      property = 'conducts and spoils footing';
      finding = `${target.name} takes a charge and steals footing — it will not stay harmless.`;
    } else if (/mirror|glass|shard/i.test(target.name)) {
      property = 'reflections persist in fragments';
      finding = `${target.name} still throws false angles even after a crack.`;
    } else {
      property = unresolved.replace('unknown', 'known');
      finding = `${target.name} answers: ${property}.`;
    }
  }

  const idx = elements.findIndex((e) => e.id === target.id);
  if (idx >= 0) {
    elements[idx] = mutateFieldElement(elements[idx]!, 'player', {
      resolveProperty: unresolved.split(' ')[0],
      known: property,
      history: `Probed: ${finding}`,
    });
  }

  return {
    discovery: {
      stimulus: raw.slice(0, 80),
      finding,
      property,
      disproved,
    },
    elements,
  };
}
