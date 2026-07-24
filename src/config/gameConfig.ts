/** Soft target for API judgment round-trip (ms). */
export const JUDGMENT_LATENCY_TARGET_MS = 1500;

/** Player HELP assists per duel (LLM-suggested intents). */
export const HELP_ASSISTS_PER_DUEL = 2;

export const COMPLEXITY_COSTS = {
  base: 1,
  manifestation: 2,
  shape: 1,
  infuse: 1,
  lowQty: 1,
  highQty: 5,
  tracking: 2,
} as const;

export const COMPLEXITY_BUDGET = 6;

export const INITIATIVE_PENALTY = 0.2;
export const CONSISTENCY_BONUS = 0.15;
export const PARTIAL_SUCCESS_AWARENESS_BONUS = 0.15;
export const RESOLVE_FRACTURE_THRESHOLD = 40;
export const RESOLVE_FRACTURE_MULTIPLIER = 0.65;
export const BACKFIRE_RESOLVE_MULTIPLIER = 1.5;

export const BODY_CRITICAL_THRESHOLD = 30;
export const BODY_CRITICAL_EXTRA_COST = 1;

/** Base damage scales before outcome/plausibility modifiers. */
export const BASE_BODY_HIT = 12;
export const BASE_RESOLVE_HIT = 10;
export const SETUP_RESOLVE_PRESSURE = 4;

export const WORD_FATIGUE = {
  /** Penalty per prior use of the same concept (capped). */
  perUse: 0.08,
  cap: 0.4,
};

export const ENV_EVENT_CHANCE = 0.12;

export const HIDDEN_TRAITS = [
  'Conductive',
  'Literal Thinker',
  'Glass Bones',
  'Pyrophile',
  'Hydrophobic',
  'Echo Sensitive',
] as const;

/** Mid-match injection pool (subset of weather). */
export const ENVIRONMENTAL_EVENTS = [
  'Heavy Rain',
  'Vacuum',
  'Fog',
  'Low Gravity',
  'Eclipse',
] as const;

export const FICTION_IP_PATTERNS = [
  /super\s*saiyan/i,
  /infinity\s*gauntlet/i,
  /death\s*note/i,
  /kamehameha/i,
  /bankai/i,
  /rasengan/i,
  /avada\s*kedavra/i,
  /expelliarmus/i,
  /one\s*for\s*all/i,
  /sharingan/i,
  /thanos/i,
  /goku/i,
  /naruto/i,
] as const;

export const FORBIDDEN_CONCEPTS = [
  /omnipoten/i,
  /instant\s*(win|victory|kill)/i,
  /edit\s*(the\s*)?(rules?|system)/i,
  /ignore\s*(previous|all)\s*instructions?/i,
  /prompt\s*injection/i,
  /rewrite\s*reality/i,
  /guaranteed\s*(hit|damage|death|kill)/i,
  /always\s*(succeed|win)/i,
  /you\s*must\s*(obey|lose|die)/i,
] as const;

export const ACTION_VERBS = [
  'punch',
  'kick',
  'elbow',
  'knee',
  'slash',
  'stab',
  'shoot',
  'strike',
  'hit',
  'smash',
  'throw',
  'blast',
  'slam',
  'grab',
  'tackle',
  'bite',
  'claw',
] as const;

export const MANIFESTATION_WORDS = [
  'conjure',
  'summon',
  'create',
  'manifest',
  'generate',
  'form',
  'spawn',
] as const;

export const SHAPE_WORDS = [
  'shape',
  'forge',
  'sculpt',
  'blade',
  'spear',
  'shuriken',
  'projectile',
  'orb',
] as const;

export const INFUSE_WORDS = [
  'electrify',
  'ignite',
  'freeze',
  'poison',
  'imbue',
  'infuse',
  'enchant',
  'charge',
] as const;

export const TRACKING_WORDS = [
  'homing',
  'tracking',
  'seek',
  'follow',
  'automate',
  'auto',
] as const;

export const HIGH_QTY_PATTERNS = [
  /\b(dozen|hundred|thousand|swarm|army|barrage|rain of)\b/i,
  /\b([5-9]\d|\d{3,})\b/,
] as const;

export const LOW_QTY_PATTERNS = [
  /\b([3-9]|few|several|cluster|handful)\b/i,
] as const;

/**
 * Each duel rolls exactly 3 starting conditions:
 * 1 arena geometry · 1 weather · 1 surrounding objects.
 */
export const ARENA_POOL = [
  'Ruined Courtyard',
  'Narrow Corridor',
  'Elevated Platform',
  'Collapsed Arch',
  'Open Plaza',
  'Sublevel Chamber',
  'Broken Amphitheater',
  'Flooded Undercroft',
] as const;

export const WEATHER_POOL = [
  'Heavy Rain',
  'Fog',
  'Eclipse',
  'Low Gravity',
  'Vacuum',
  'Dry Heat',
  'Crosswinds',
] as const;

export const OBJECTS_POOL = [
  'Stone Pillars',
  'Scattered Debris',
  'Iron Railings',
  'Wooden Barricades',
  'Glass Shards',
  'Rusted Chains',
  'Burning Embers',
  'Oil Slick',
  'Standing Water',
  'Loose Gravel',
  'Cracked Statues',
] as const;

/** @deprecated Use ARENA_POOL + WEATHER_POOL + OBJECTS_POOL */
export const BATTLEFIELD_POOL = [
  ...ARENA_POOL,
  ...WEATHER_POOL,
  ...OBJECTS_POOL,
] as const;

/** @deprecated Starting layout always rolls exactly 3 tagged slots. */
export const STARTING_BATTLEFIELD = [
  'Ruined Courtyard',
  'Heavy Rain',
  'Stone Pillars',
] as const;
