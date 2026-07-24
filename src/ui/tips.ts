import type { GameState } from '../types';

export const GAME_TIPS = [
  'Language is the controller. Outthink them — do not chase perfect sentences.',
  'Read BOSS_COMMITS before you type. They chose before you did.',
  'Watch Battlefield signs + omens. Infer danger yourself — never wait for “choose between…”.',
  'Bosses always act WITH something (blade, cutter, chalk, hands). Ask “with what?”',
  'Probes always teach. Feints plant beliefs. Signature tells change the whole fight.',
  'Declare an attempt (“I try to…”) — never “I deal 20 damage.”',
  'Win by breaking Resolve (belief), not only Body. Wrong boss reads hurt them too.',
  'You get 2 HELPs per duel for a field-aware suggested Argument.',
];

const STARTER_POOL = [
  'I splash water across the ground to make the footing slick.',
  'I kick debris toward them to break their focus.',
  'I take cover behind the nearest solid structure.',
  'I close the distance carefully and throw a short punch.',
  'I use the wind to fling dust into their eyes.',
  'I stamp the wet ground to splash them and force a step back.',
  'I shove a loose object between us as a quick barrier.',
  'I feint left, then slide right along the edge of the arena.',
  'I call out that the wet ground is unsafe and force them to admit it.',
  'I listen for their steps and move where the sound is weakest.',
  'I toss a pebble at the hazard to see what it does.',
  'I keep backing away so they think I fear the close fight.',
];

/** Pick a few starter intents, biased toward current battlefield words. */
export function pickStarterIntents(state: GameState, count = 3): string[] {
  const tags = state.world.battlefield.map((t) => t.toLowerCase());
  const contextual: string[] = [];

  if (state.bossAgenda.commitment) {
    contextual.push(
      `I interrupt their ${state.bossAgenda.commitment.method} before it finishes.`,
    );
  }
  if (state.tacticalThread) {
    contextual.push(
      `I test the ${state.tacticalThread.label.toLowerCase()} with a thrown scrap before I commit.`,
    );
  }
  if (tags.some((t) => /rain|wet|water|puddle/i.test(t))) {
    contextual.push('I splash the standing water to make them slip.');
    contextual.push('I keep to dry footing and force them into the wet line.');
  }
  if (tags.some((t) => /wind|crosswind/i.test(t))) {
    contextual.push('I lean into the wind and throw grit toward their face.');
  }
  if (tags.some((t) => /fog|smoke|steam|eclipse/i.test(t))) {
    contextual.push('I move through the low visibility and reappear on their flank.');
  }
  if (tags.some((t) => /pillar|barricade|platform|debris|shard|rail|chain/i.test(t))) {
    contextual.push('I duck behind cover, then shove it to knock them off balance.');
  }
  if (tags.some((t) => /ember|fire|heat|oil/i.test(t))) {
    contextual.push('I kick hot debris toward them without standing in it myself.');
  }
  if (tags.some((t) => /mirror|glass/i.test(t))) {
    contextual.push('I crack the mirror edge with debris to see if the reflections stay.');
  }

  const pool = [...contextual, ...STARTER_POOL];
  const picked: string[] = [];
  const used = new Set<number>();
  while (picked.length < count && used.size < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    picked.push(pool[i]!);
  }
  return picked;
}

/** Offline HELP suggestion when API is unavailable. */
export function mockHelpIntent(state: GameState): string {
  const objects =
    state.world.fieldElements.find((e) => e.knownProperties.includes('objects'))
      ?.name ??
    state.world.battlefield[2] ??
    'nearby debris';
  const arena =
    state.world.fieldElements.find((e) => e.knownProperties.includes('arena'))
      ?.name ??
    state.world.battlefield[0] ??
    'the arena';
  const weather =
    state.world.fieldElements.find((e) => e.knownProperties.includes('weather'))
      ?.name ?? state.world.environmentalEvent;
  const fact = state.ledgers.facts[0]?.replace(/^✔\s*/, '');
  const commit = state.bossAgenda.commitment;

  if (state.tacticalThread) {
    return `I probe the ${state.tacticalThread.label.toLowerCase()} with a scrap from the ${objects.toLowerCase()} before I decide whether to break it or use it.`;
  }
  if (commit) {
    return `I feint away from their ${commit.method}, then rush the ${objects.toLowerCase()} they are counting on.`;
  }
  if (fact) {
    return `I use the fact "${fact}" and the ${objects.toLowerCase()} to press them while they are off-balance.`;
  }
  if (weather) {
    return `I use the ${weather.toLowerCase()} and the ${objects.toLowerCase()} to force them to lose footing on the ${arena.toLowerCase()}.`;
  }
  return `I use the ${objects.toLowerCase()} on the ${arena.toLowerCase()} to create an opening, then close in.`;
}
