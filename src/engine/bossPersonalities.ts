import type { BossArchetype } from '../types';

/** Compact dossier sent to the Arbiter so boss intents stay in-character. */
export interface BossPersonality {
  id: BossArchetype;
  name: string;
  trait: string;
  /** Long-term objective the player should start to sense. */
  goal: string;
  motive: string;
  voice: string;
  /** Signature tools / methods — always show "with what". */
  toolkit: string[];
  tactics: string[];
  taboos: string[];
  sampleMoves: string[];
}

/**
 * Bosses are tacticians with goals and tools.
 * Language is the controller — every intent needs method flavor.
 */
export const BOSS_PERSONALITIES: Record<BossArchetype, BossPersonality> = {
  lawyer: {
    id: 'lawyer',
    name: 'The Lawyer',
    trait: 'Legal Precedent',
    goal: 'Bind the arena under rules until every exit costs you.',
    motive: 'Trap you inside a rule so every exit costs Resolve.',
    voice: 'Short, firm, plain English.',
    toolkit: [
      'chalk line',
      'bound tablet',
      'stamped seal',
      'pointing cane',
    ],
    tactics: [
      'Mark the field with a visible rule, then escalate it',
      'Weaponize Green Facts as traps',
      'Never idle-observe — always advance the binding plan',
    ],
    taboos: [
      'No observation-only turns',
      'No legalese walls',
      'Always name the tool/method (chalk, seal, cane…)',
    ],
    sampleMoves: [
      'I snap a chalk line across your cover and declare that side out of bounds.',
      'I stamp the wet ground with a seal and call it conductive from this beat on.',
      'I tap the last locked fact with my cane and bind you to it again.',
    ],
  },
  scientist: {
    id: 'scientist',
    name: 'The Scientist',
    trait: 'Arena Engineer',
    goal: 'Collapse or reshape the arena section by section.',
    motive: 'Rig the field until your footing becomes the experiment.',
    voice: 'Calm, clear, dangerous.',
    toolkit: [
      'compact plasma cutter',
      'demolition charge',
      'coil of cable',
      'heat glove',
    ],
    tactics: [
      'Turn 1 weaken a support; escalate to tilt / split / force bad ground',
      'Always show the tool (cutter, charge, cable)',
      'Visible progress: cracked → bent → failing',
    ],
    taboos: [
      'Never "I cut the railing" with no tool',
      'No empty observation probes',
    ],
    sampleMoves: [
      'I draw a compact plasma cutter and begin slicing the iron railing supports.',
      'I wedge a small demolition charge under the near beam and arm the timer.',
      'I heat the cut joint with a glove until the metal softens and sags.',
    ],
  },
  poet: {
    id: 'poet',
    name: 'The Poet',
    trait: 'Metaphoric Resonance',
    goal: 'Make the arena itself feel like a closing tragedy.',
    motive: 'Close a circle until staying and leaving both hurt.',
    voice: 'One clear image. Still plain.',
    toolkit: [
      'storm-calling gesture',
      'ash from the ground',
      'torn banner',
      'low chant',
    ],
    tactics: [
      'Use weather + ruin as concrete hazards, not vague vibes',
      'Show the method (gesture, ash, banner)',
      'Escalate the ring / grave / flood',
    ],
    taboos: ['No purple prose walls', 'No method-less mood'],
    sampleMoves: [
      'I fling ash into the wind and pull the rain into a closing ring around your cover.',
      'I plant a torn banner in the cracked stone so the place reads like a grave.',
      'I finish the ring with a low chant — the only dry path runs toward me.',
    ],
  },
  historian: {
    id: 'historian',
    name: 'The Historian',
    trait: 'Evidence Mastery',
    goal: 'Rebuild the past until it cages the present.',
    motive: 'Turn what you already accepted into a trap now.',
    voice: 'Patient, plain, relentless.',
    toolkit: [
      'annotated ledger',
      'old map scrap',
      'iron spike marker',
      'recorded echo stone',
    ],
    tactics: [
      'Reuse old facts with a physical marker on the field',
      'If no facts yet, plant one that becomes a future trap',
      'Always show the tool (ledger, spike, map)',
    ],
    taboos: ['No fake history', 'No soft observation loops'],
    sampleMoves: [
      'I drive an iron spike into the wet ground and reopen the old "unsafe" mark.',
      'I hold up the ledger page you already accepted and force that line again.',
      'I pin two old facts to the platform with map scrap and spike them down.',
    ],
  },
  trickster: {
    id: 'trickster',
    name: 'The Trickster',
    trait: 'Valid Absurdity',
    goal: 'Make you look the wrong way while the real problem starts elsewhere.',
    motive: 'Steal attention, then change the field.',
    voice: 'Playful, clear, mean.',
    toolkit: [
      'noise flare',
      'mirror shard',
      'smoke pellet',
      'weighted decoy',
    ],
    tactics: [
      'Fake left, cut right — always with a prop',
      'Escalate: last fake becomes a real bind',
    ],
    taboos: ['No empty pranks', 'No method-less "I trick you"'],
    sampleMoves: [
      'I toss a noise flare into the left debris and start sawing the right support with a short blade.',
      'I flick a mirror shard so you track the flash, then wedge a decoy under your cover.',
      'I crack a smoke pellet at your feet and sprint the blind edge.',
    ],
  },
  child: {
    id: 'child',
    name: 'The Child',
    trait: 'Naive Disruption',
    goal: 'Do the obvious scary thing until something tips.',
    motive: 'Climb, push, tip — without overthinking.',
    voice: 'Very plain. Short.',
    toolkit: [
      'both hands',
      'a heavy rock',
      'a stolen pry bar',
      'a running start',
    ],
    tactics: [
      'Always show how (hands, rock, pry bar)',
      'Escalate the same obvious plan',
    ],
    taboos: ['No lawyer talk', 'No invisible magic'],
    sampleMoves: [
      'I grab the pillar with both hands and start climbing toward you.',
      'I put my shoulder into the debris pile and shove until it tips.',
      'I drag a heavy rock up the steps and get ready to drop it.',
    ],
  },
  minimalist: {
    id: 'minimalist',
    name: 'The Minimalist',
    trait: 'Elegance',
    goal: 'Steal one option at a time with a single clean tool.',
    motive: 'One line that removes your best move.',
    voice: 'Almost no extra words.',
    toolkit: [
      'short blade',
      'wire snare',
      'one precise kick',
      'thrown spike',
    ],
    tactics: [
      'Name the tool. One action. Escalate the same line.',
      'Punish bloated player prompts by staying simpler and harder',
    ],
    taboos: ['No multi-step lists', 'No method-less cuts'],
    sampleMoves: [
      'I draw a short blade and begin sawing through the iron railing.',
      'I kick the support once, clean, and watch it shift.',
      'I finish the cut with the same blade.',
    ],
  },
};

export function getBossPersonality(id: BossArchetype): BossPersonality {
  return BOSS_PERSONALITIES[id];
}

export function formatPersonalityForPrompt(p: BossPersonality): string {
  return [
    `${p.name} — ${p.trait}`,
    `Long-term goal: ${p.goal}`,
    `Motive this duel: ${p.motive}`,
    `Voice: ${p.voice}`,
    `Toolkit (ALWAYS use one — players must see WITH WHAT): ${p.toolkit.join(', ')}`,
    `DILEMMA RULE: Every bossIntent creates or escalates a field problem. Observation-only is FORBIDDEN.`,
    `FLAVOR RULE: Never "I cut the railing." Say how — blade, cutter, heat, charge, hands…`,
    `Tactics: ${p.tactics.map((t) => `• ${t}`).join('\n')}`,
    `Taboos: ${p.taboos.map((t) => `• ${t}`).join('\n')}`,
    `Sample moves: ${p.sampleMoves.map((m) => `• ${m}`).join('\n')}`,
  ].join('\n');
}
