import {
  ARENA_POOL,
  OBJECTS_POOL,
  WEATHER_POOL,
} from '../config/gameConfig';
import { isNearDuplicateLabel } from '../engine/labelDedupe';
import type { GameState } from '../types';
import {
  cardIllustration,
  motifAccent,
  type CardMotif,
} from './cardArt';

export type CardKind = 'terrain' | 'weather' | 'event' | 'fact' | 'mix';

export interface ArenaCard {
  id: string;
  label: string;
  kind: CardKind;
  detail?: string;
  motif: CardMotif;
  pros: string[];
  cons: string[];
  art: string;
}

interface CardProfile {
  match: RegExp;
  motif: CardMotif;
  pros: string[];
  cons: string[];
}

const PROFILES: CardProfile[] = [
  {
    match: /thick\s*smoke|smoke/i,
    motif: 'smoke',
    pros: [
      'Lowers visibility — harder for the enemy to track you',
      'Masks exact position and attack lines',
    ],
    cons: [
      'You also struggle to see the enemy',
      'Precise targeting becomes unreliable',
    ],
  },
  {
    match: /steam\s*veil|steam/i,
    motif: 'steam',
    pros: [
      'Softens heat-based arguments',
      'Creates shifting cover between exchanges',
    ],
    cons: [
      'Cuts clarity for both sides',
      'Wet heat can backfire on fire setups',
    ],
  },
  {
    match: /blind\s*zone/i,
    motif: 'fog',
    pros: [
      'Near-total concealment while you reposition',
      'Enemy awareness degrades faster',
    ],
    cons: [
      'You operate almost blind as well',
      'Friendly-fire / self-collision risk rises',
    ],
  },
  {
    match: /heavy\s*rain|rain/i,
    motif: 'rain',
    pros: [
      'Mutes open flame and heat arguments',
      'Creates conductive water paths for clever setups',
    ],
    cons: [
      'Footing becomes treacherous',
      'Fire-based pressure loses intensity',
    ],
  },
  {
    match: /fog|fog\s*bank/i,
    motif: 'fog',
    pros: [
      'Softens visual lock — easier to vanish mid-move',
      'Rewards broad area Arguments over pinpoint ones',
    ],
    cons: [
      'Both fighters lose fine tracking',
      'Ambush windows cut both ways',
    ],
  },
  {
    match: /fire|flame|ember|heat|ignite/i,
    motif: 'fire',
    pros: [
      'Amplifies burn and heat Arguments',
      'Can deny soft cover (wood, cloth, debris)',
    ],
    cons: [
      'Risky near water / rain — may collapse into steam',
      'Collateral hazard if control slips',
    ],
  },
  {
    match: /puddle|standing\s*water|wet\s*stone|water/i,
    motif: 'water',
    pros: [
      'Enables conductive / splash setups',
      'Can smother small fires',
    ],
    cons: [
      'Slows footing and clean pivots',
      'Electricity through water threatens everyone',
    ],
  },
  {
    match: /live\s*current|electric|conductive|shock|lightning/i,
    motif: 'electric',
    pros: [
      'Explosive payoff when paired with water',
      'Forces cautious movement across wet ground',
    ],
    cons: [
      'Easy to backfire on the initiator',
      'Conductive traits turn the field against you',
    ],
  },
  {
    match: /vacuum/i,
    motif: 'vacuum',
    pros: [
      'Starves fire and sound-based tells',
      'Punishes loose, high-volume Arguments',
    ],
    cons: [
      'Breathing / stamina Arguments suffer',
      'Propagating effects may simply fail',
    ],
  },
  {
    match: /low\s*gravity|gravity/i,
    motif: 'gravity',
    pros: [
      'Extends aerial / leap Arguments',
      'Softens falling damage',
    ],
    cons: [
      'Grounded leverage and bracing weaken',
      'Timing windows stretch oddly for both',
    ],
  },
  {
    match: /eclipse|dark|low\s*light/i,
    motif: 'eclipse',
    pros: [
      'Favors stealth and misdirection',
      'Degrades enemy visual awareness',
    ],
    cons: [
      'You lose visual certainty too',
      'Light-dependent setups stall',
    ],
  },
  {
    match: /oil\s*slick|oil/i,
    motif: 'oil',
    pros: [
      'Excellent for slips and denied footing',
      'Can fuel a controlled fire line',
    ],
    cons: [
      'You can lose traction yourself',
      'Ignition may spread beyond intent',
    ],
  },
  {
    match:
      /stone\s*pillar|pillar|arch|platform|floor|terrain|corridor|barricade|courtyard|plaza|chamber|amphitheater|undercroft/i,
    motif: 'stone',
    pros: [
      'Solid cover and bracing for setups',
      'Anchors structural Arguments',
    ],
    cons: [
      'Can trap you if the enemy collapses it',
      'Limits wide lateral movement',
    ],
  },
  {
    match: /dry\s*heat|crosswinds/i,
    motif: 'fog',
    pros: [
      'Shifts how heat and projectiles travel',
      'Can punish loose footing Arguments',
    ],
    cons: [
      'Affects both fighters equally',
      'Hard to ignore once active',
    ],
  },
  {
    match: /debris|gravel|glass|shard|dust|chain/i,
    motif: 'debris',
    pros: [
      'Improvised projectiles and hazards',
      'Noisy ground betrays sneaky approaches',
    ],
    cons: [
      'Cuts both ways underfoot',
      'Clutter complicates clean choreography',
    ],
  },
  {
    match: /iron|rail|metal|rust/i,
    motif: 'metal',
    pros: [
      'Conductive scaffold for clever circuits',
      'Hard barriers against soft attacks',
    ],
    cons: [
      'Conductivity can punish careless shocks',
      'Rigid cover is predictable once mapped',
    ],
  },
  {
    match: /narrow\s*corridor/i,
    motif: 'corridor',
    pros: [
      'Funnels the enemy into predictable lines',
      'Area Arguments pack more density',
    ],
    cons: [
      'You have fewer escape vectors',
      'Large-area moves risk self-trap',
    ],
  },
];

const MIX_RULES: {
  a: RegExp;
  b: RegExp;
  result: string;
  detail: string;
  motif: CardMotif;
  pros: string[];
  cons: string[];
}[] = [
  {
    a: /water|puddle|rain|wet/i,
    b: /electric|conductive|shock|lightning/i,
    result: 'Live Current',
    detail: 'Water + electricity fused',
    motif: 'electric',
    pros: [
      'Devastating zone denial across wet ground',
      'Forces the enemy to abandon flooded lines',
    ],
    cons: [
      'Extremely easy to backfire',
      'Anyone in the water is a valid path',
    ],
  },
  {
    a: /fire|flame|heat|ignite|ember/i,
    b: /rain|water|wet|puddle/i,
    result: 'Steam Veil',
    detail: 'Fire + water → steam',
    motif: 'steam',
    pros: [
      'Blurs sightlines after heat meets water',
      'Softens pure fire pressure into cover',
    ],
    cons: [
      'Neither fighter sees cleanly',
      'Original fire Argument loses bite',
    ],
  },
  {
    a: /fire|flame|ember/i,
    b: /smoke|debris|wood|book/i,
    result: 'Thick Smoke',
    detail: 'Combustion residue',
    motif: 'smoke',
    pros: [
      'Lowers visibility — less prone to be seen',
      'Breaks enemy tracking for a beat',
    ],
    cons: [
      'You cannot see the enemy clearly either',
      'Precision strikes degrade for both',
    ],
  },
  {
    a: /fog|smoke|steam/i,
    b: /eclipse|dark|low light/i,
    result: 'Blind Zone',
    detail: 'Visibility collapsed',
    motif: 'fog',
    pros: [
      'Near-total sensory soft-lock on the enemy',
      'Great for repositioning under cover',
    ],
    cons: [
      'You are nearly as blind',
      'Misaimed Arguments become likely',
    ],
  },
];

function cardId(kind: CardKind, label: string): string {
  return `${kind}:${label.toLowerCase().replace(/\s+/g, '_')}`;
}

function fallbackProfile(
  kind: CardKind,
  label: string,
): Pick<ArenaCard, 'motif' | 'pros' | 'cons'> {
  for (const p of PROFILES) {
    if (p.match.test(label)) {
      return {
        motif: p.motif,
        pros: p.pros.slice(0, 3),
        cons: p.cons.slice(0, 3),
      };
    }
  }
  switch (kind) {
    case 'weather':
      return {
        motif: 'fog',
        pros: ['Shifts how Arguments travel through the arena'],
        cons: ['Affects you as much as the enemy'],
      };
    case 'event':
      return {
        motif: 'eclipse',
        pros: ['Global pressure that reshapes plausible moves'],
        cons: ['Hard to ignore once active'],
      };
    case 'fact':
      return {
        motif: 'generic',
        pros: ['Hardened evidence the Arbiter will honor'],
        cons: ['Opponent can build counter-arguments on it too'],
      };
    case 'mix':
      return {
        motif: 'steam',
        pros: ['Compound effect with unique tactical edges'],
        cons: ['Unstable — easy to misread'],
      };
    default:
      return {
        motif: 'stone',
        pros: ['Anchors physical Arguments to the arena'],
        cons: ['Can be turned into a trap if contested'],
      };
  }
}

function enrich(
  kind: CardKind,
  label: string,
  detail: string | undefined,
  override?: Pick<ArenaCard, 'motif' | 'pros' | 'cons'>,
): ArenaCard {
  const profile = override ?? fallbackProfile(kind, label);
  const accent = motifAccent(kind);
  return {
    id: cardId(kind, label),
    label,
    kind,
    detail,
    motif: profile.motif,
    pros: profile.pros.slice(0, 3),
    cons: profile.cons.slice(0, 3),
    art: cardIllustration(profile.motif, accent),
  };
}

/** Build the center table of currently valid arena cards (+ mixes). */
export function buildArenaCards(state: GameState): ArenaCard[] {
  const cards: ArenaCard[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  const push = (c: ArenaCard) => {
    const key = c.label.toLowerCase();
    if (seenIds.has(c.id) || seenLabels.has(key)) return;
    // Drop paraphrases of cards already on the table (LLM often restates weather/terrain).
    if (isNearDuplicateLabel(c.label, [...seenLabels])) return;
    seenIds.add(c.id);
    seenLabels.add(key);
    cards.push(c);
  };

  const arenaSet = new Set<string>(ARENA_POOL);
  const weatherSet = new Set<string>(WEATHER_POOL);
  const objectSet = new Set<string>(OBJECTS_POOL);

  // Prefer structured named elements (with scars / identity) when present.
  if (state.world.fieldElements?.length) {
    for (const el of state.world.fieldElements) {
      if (!el.usable && !el.scars.length) continue;
      let kind: CardKind = 'terrain';
      let detail = el.condition;
      if (el.knownProperties.includes('weather') || /rain|fog|vacuum|gravity|eclipse|heat|wind/i.test(el.name)) {
        kind = 'weather';
        detail = el.scars[0] ?? 'Weather';
      } else if (el.knownProperties.includes('arena') || arenaSet.has(el.name)) {
        kind = 'terrain';
        detail = el.scars[0] ?? 'Arena geometry';
      } else if (el.knownProperties.includes('objects') || objectSet.has(el.name)) {
        kind = 'terrain';
        detail = el.scars[0] ?? 'Surrounding objects';
      } else if (el.scars.length || el.condition === 'transformed') {
        kind = 'event';
        detail = el.history[el.history.length - 1] ?? el.condition;
      }
      const card = enrich(kind, el.name, detail);
      if (el.scars[0]) {
        card.cons = [`Scar: ${el.scars[0]}`, ...card.cons].slice(0, 3);
      }
      if (el.knownProperties[0]) {
        card.pros = [`Known: ${el.knownProperties[0]}`, ...card.pros].slice(0, 3);
      }
      push(card);
    }
  } else {
    for (const t of state.world.battlefield) {
      let kind: CardKind = 'terrain';
      let detail = 'Active battlefield state';
      if (
        weatherSet.has(t) ||
        /rain|fog|vacuum|gravity|eclipse|heat|wind/i.test(t)
      ) {
        kind = 'weather';
        detail = 'Weather';
      } else if (arenaSet.has(t)) {
        kind = 'terrain';
        detail = 'Arena geometry';
      } else if (objectSet.has(t)) {
        kind = 'terrain';
        detail = 'Surrounding objects';
      }
      push(enrich(kind, t, detail));
    }
  }

  // Weather is already on the battlefield at duel start — do not add a 4th duplicate event card.
  if (
    state.world.environmentalEvent &&
    !seenLabels.has(state.world.environmentalEvent.toLowerCase())
  ) {
    push(
      enrich(
        'event',
        state.world.environmentalEvent,
        'Global environmental event',
      ),
    );
  }

  // Green Facts stay in the side ledger — do not clone them as arena cards.

  // Live field problem as a visible card (foreshadow lives in BATTLEFIELD_SIGNS).
  if (state.activeThreat) {
    push(
      enrich(
        'event',
        `⚠ ${state.activeThreat.label} (${state.activeThreat.timer})`,
        state.activeThreat.foreshadow,
      ),
    );
  }

  const labels = cards.map((c) => c.label);
  for (const rule of MIX_RULES) {
    const hasA = labels.some((l) => rule.a.test(l));
    const hasB = labels.some((l) => rule.b.test(l));
    if (hasA && hasB) {
      push(
        enrich('mix', rule.result, rule.detail, {
          motif: rule.motif,
          pros: rule.pros,
          cons: rule.cons,
        }),
      );
    }
  }

  return cards;
}

export function cardTone(kind: CardKind): string {
  switch (kind) {
    case 'terrain':
      return 'border-terminal-dim text-terminal-text';
    case 'weather':
      return 'border-neon/60 text-neon';
    case 'event':
      return 'border-amber text-amber';
    case 'fact':
      return 'border-neon text-neon';
    case 'mix':
      return 'border-crimson text-crimson shadow-crimson';
  }
}
