/** PromptForge core data models (thin Arbiter design). */

export type Awareness = 'FULL' | 'APPROXIMATE' | 'LOST' | 'FALSE_INFO';
export type Position = 'LONG' | 'MID' | 'CLOSE';
export type InitiativeHolder = 'player' | 'boss';
export type ArgumentCategory =
  | 'ATTACK'
  | 'SETUP'
  | 'DEFENSE'
  | 'MANIPULATION'
  | 'UTILITY';
export type ArgumentTarget =
  | 'OPPONENT'
  | 'ENVIRONMENT'
  | 'POSITION'
  | 'OBJECT';
export type ResolutionOutcome =
  | 'success'
  | 'partial'
  | 'failure'
  | 'backfire';
export type AwarenessShift = 'none' | 'degrade' | 'hijack' | 'restore';
export type PositionShift = 'none' | 'closer' | 'farther';
export type BossArchetype =
  | 'lawyer'
  | 'scientist'
  | 'poet'
  | 'historian'
  | 'trickster'
  | 'child'
  | 'minimalist';
export interface EntityState {
  id: 'player' | 'boss';
  name: string;
  body: number;
  resolve: number;
  awareness: Awareness;
  phantomVector?: string;
  position: Position;
  hiddenTrait: string;
  hiddenTraitRevealed: boolean;
  conceptUsage: Record<string, number>;
}

export interface EpistemicMatrix {
  facts: string[];
  assumptions: string[];
}

export interface WorldState {
  battlefield: string[];
  environmentalEvent?: string;
  realityPressure: number;
  initiative: InitiativeHolder;
}

export interface Intent {
  raw: string;
  category: ArgumentCategory;
  target: ArgumentTarget;
}

export interface ComplexityBreakdown {
  total: number;
  overBudget: boolean;
  largeArea: boolean;
  layers: { label: string; cost: number }[];
}

export interface ParsedIntent {
  intent: Intent;
  complexity: ComplexityBreakdown;
  concepts: string[];
  scaledDown: boolean;
  rejected?: string;
  fatiguePenalty: number;
}

export interface BossAgendaState {
  archetype: BossArchetype;
  /** Scientist observation tags, Lawyer precedent count, Poet alignment, etc. */
  progress: number;
  notes: string[];
}

export type TensionPhase = 'calm' | 'threat' | 'crisis';

/**
 * A live field problem — shown as a foreshadowed fact, never as advice.
 * Players discover implications; we do not say "choose between…".
 */
export interface ActiveThreat {
  id: string;
  /** Short battlefield label, e.g. "Damaged Railing". */
  label: string;
  /** Sensory foreshadow the player can infer from, e.g. "Metal groans. Rust flakes fall." */
  foreshadow: string;
  /** Rounds until payoff (0 = pays off now). Shown as (N) beside the label. */
  timer: number;
  source: 'boss' | 'world';
  tension: TensionPhase;
}

/** One row in the Log Matrix (core match history view). */
export interface MatchLogEntry {
  round: number;
  playerPrompt: string;
  bossPrompt: string;
  arbiterText: string;
  playerOutcome: ResolutionOutcome;
  bossOutcome: ResolutionOutcome;
  judgmentMs?: number;
}

export interface GameState {
  round: number;
  player: EntityState;
  boss: EntityState;
  ledgers: EpistemicMatrix;
  world: WorldState;
  bossAgenda: BossAgendaState;
  /** Live dilemma the player must answer or escalate. */
  activeThreat?: ActiveThreat;
  winner?: 'player' | 'boss';
  log: string[];
  matchLog: MatchLogEntry[];
}

/** Qualitative judgment from the LLM (no numeric HP deltas — engine owns those). */
export interface ArbiterJudgment {
  playerPlausibility: number;
  bossPlausibility: number;
  playerOutcome: ResolutionOutcome;
  bossOutcome: ResolutionOutcome;
  contestedAssumptions: string[];
  targetAwarenessShift: AwarenessShift;
  positionShift: PositionShift;
  hiddenTraitHint: string;
  suggestedFacts: string[];
  suggestedAssumptions: string[];
  battlefieldAdd: string[];
  battlefieldRemove: string[];
  /** Sparse bullets: what changed — not a lecture. */
  judgmentNarrative: string;
  /** Short observable boss beat (what you see), not an explanation. */
  bossReaction: string;
  /**
   * Boss Argument invented by the Arbiter in-character (same API response).
   * Empty when using offline mock generation.
   */
  bossIntent: string;
  /** One plain sentence: why Body/Resolve moved (narrative cause). */
  damageWhy: string;
  /**
   * Sensory field facts only — never "choose between…".
   * e.g. ["⚠ Damaged Railing (3)", "The iron groans as weight shifts."]
   */
  fieldSigns: string[];
  /** New/updated threat (label + foreshadow + timer), or null. */
  activeThreat?: {
    label: string;
    foreshadow: string;
    timer: number;
  } | null;
  /** True if the player successfully broke the prior threat this beat. */
  clearThreat?: boolean;
}

/** Deterministic engine output after applying judgment. */
export interface ResolvedVerdict {
  calculatedComplexity: { player: number; boss: number };
  playerBodyDelta: number;
  playerResolveDelta: number;
  bossBodyDelta: number;
  bossResolveDelta: number;
  targetAwarenessShift: AwarenessShift;
  positionShift: PositionShift;
  initiativeWinner: InitiativeHolder | 'none';
  hiddenTraitRevealed: string;
  ledgerMutations: {
    addFacts: string[];
    addAssumptions: string[];
    hardenAssumptions: string[];
    removeAssumptions: string[];
  };
  battlefieldMutations: {
    add: string[];
    remove: string[];
  };
  playerOutcome: ResolutionOutcome;
  bossOutcome: ResolutionOutcome;
  /** Engine-authored causal lines for the dossier. */
  damageWhyPlayer: string;
  damageWhyBoss: string;
}

export interface CompactGameSnapshot {
  round: number;
  initiative: InitiativeHolder;
  realityPressure: number;
  environmentalEvent?: string;
  battlefield: string[];
  facts: string[];
  assumptions: string[];
  player: {
    body: number;
    resolve: number;
    awareness: Awareness;
    position: Position;
    hiddenTraitRevealed: boolean;
    hiddenTrait?: string;
  };
  boss: {
    body: number;
    resolve: number;
    awareness: Awareness;
    position: Position;
    archetype: BossArchetype;
    agendaProgress: number;
    /** Full personality dossier for in-character boss Argument generation. */
    personality: {
      name: string;
      trait: string;
      goal: string;
      motive: string;
      voice: string;
      toolkit: string[];
      tactics: string[];
      taboos: string[];
      sampleMoves: string[];
    };
  };
  playerIntent: Intent;
  /**
   * Present for mock / ping paths. Omitted (or placeholder) when the Arbiter
   * must invent the boss Argument from personality in the same response.
   */
  bossIntent?: Intent;
  playerFatiguePenalty: number;
  bossFatiguePenalty: number;
  /** When true, Arbiter must invent bossIntent before judging. */
  generateBossIntent: boolean;
  activeThreat?: ActiveThreat;
  tension: TensionPhase;
  /** Prior boss intents so the Arbiter escalates instead of looping. */
  recentBossIntents: string[];
}
