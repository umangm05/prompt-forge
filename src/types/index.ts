/** PromptForge core data models (thin Arbiter design). */

export type Awareness = 'FULL' | 'APPROXIMATE' | 'LOST' | 'FALSE_INFO';
export type Position = 'LONG' | 'MID' | 'CLOSE';
export type InitiativeHolder = 'player' | 'boss';
export type ActorSide = 'player' | 'boss' | 'world';
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
export type PlanRelation =
  | 'advance'
  | 'stall'
  | 'break'
  | 'reverse'
  | 'transfer'
  | 'none';
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

export type AdaptationPosture =
  | 'continue'
  | 'accelerate'
  | 'repurpose'
  | 'pivot'
  | 'punish'
  | 'desperate'
  | 'signature'
  | 'greedy';

export type ThreadStatus =
  | 'developing'
  | 'armed'
  | 'reversed'
  | 'spent'
  | 'broken';

export type TempoBeat = 'lull' | 'pressure' | 'rupture' | 'aftermath';

export type BeliefTruth = 'correct' | 'incomplete' | 'mistaken';

export type RiskAppetite = 'cautious' | 'balanced' | 'reckless';

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

/** Persistent named battlefield element with causal memory. */
export interface FieldElement {
  id: string;
  /** Stable proper name players can refer to. */
  name: string;
  condition: string;
  createdBy: ActorSide;
  lastChangedBy: ActorSide;
  usable: boolean;
  knownProperties: string[];
  unresolvedProperties: string[];
  scars: string[];
  history: string[];
  relationships: string[];
}

export interface WorldThreshold {
  id: string;
  /** Human-readable rule the player can discover. */
  label: string;
  /** Accumulator keys this threshold watches. */
  watch: string[];
  /** Value at which the transformation fires. */
  triggerAt: number;
  progress: number;
  omen: string;
  transformation: string;
  triggered: boolean;
  /** Field element names / tags the threshold cares about. */
  match: string[];
}

export interface WorldState {
  /** Derived labels for UI / prompts (kept in sync with fieldElements). */
  battlefield: string[];
  fieldElements: FieldElement[];
  thresholds: WorldThreshold[];
  environmentalEvent?: string;
  realityPressure: number;
  initiative: InitiativeHolder;
  lastTransformation?: string;
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
  /** True when the intent is primarily investigative. */
  investigative?: boolean;
}

/** Visible boss commitment made before player input. */
export interface BossCommitment {
  raw: string;
  method: string;
  target: string;
  purpose: string;
  dependencyIds: string[];
  posture: AdaptationPosture;
  signatureId?: string;
  tell?: string;
}

export interface BossBelief {
  id: string;
  claim: string;
  confidence: number;
  evidence: string[];
  /** Referee-only truth status — never shown to the boss planner as oracle. */
  truth: BeliefTruth;
  createdRound: number;
}

export interface BeliefModel {
  beliefs: BossBelief[];
  /** Short pattern summary derived from observables only. */
  apparentPlayerPattern?: string;
}

export interface EmotionalTrigger {
  id: string;
  kind:
    | 'cherished_destroyed'
    | 'humiliation'
    | 'failed_method'
    | 'threatened_obsession'
    | 'pride_challenged';
  description: string;
  round: number;
  spent: boolean;
}

export interface SignatureMomentDef {
  id: string;
  name: string;
  tell: string;
  triggerHint: string;
  requiredMeans: string[];
  actionTemplate: string;
  selfRisk: string;
  permanentConsequence: string;
  aftermath: string;
}

export interface TempoState {
  beat: TempoBeat;
  tension: number;
  sources: string[];
  spentLastRound: boolean;
  recoveryLeft: number;
  sameBeatStreak: number;
}

export interface TacticalTemptation {
  id: string;
  /** Sensory fiction only — never "safe vs risky". */
  foreshadow: string;
  immediateGain: string;
  strategicCost: string;
  expiresIn: number;
  forSide: ActorSide;
}

export interface TacticalThread {
  id: string;
  label: string;
  foreshadow: string;
  controller: ActorSide;
  purpose: string;
  payoff: string;
  stage: number;
  timer: number;
  dependencyIds: string[];
  status: ThreadStatus;
  tension: TensionPhase;
}

export interface BossAgendaState {
  archetype: BossArchetype;
  progress: number;
  notes: string[];
  commitment?: BossCommitment;
  nextCommitment?: BossCommitment;
  beliefs: BeliefModel;
  unavailableResources: string[];
  failedMethods: string[];
  posture: AdaptationPosture;
  emotionalTriggers: EmotionalTrigger[];
  signaturesUsed: string[];
  riskAppetite: RiskAppetite;
  definingFlaw: string;
}

export type TensionPhase = 'calm' | 'threat' | 'crisis';

/**
 * Legacy view of a live field problem — derived from TacticalThread for UI.
 * Players discover implications; we do not say "choose between…".
 */
export interface ActiveThreat {
  id: string;
  label: string;
  foreshadow: string;
  timer: number;
  source: 'boss' | 'world' | 'player';
  tension: TensionPhase;
}

export interface CausalEvent {
  id: string;
  actor: ActorSide;
  method: string;
  target: string;
  fromState: string;
  toState: string;
  relation: PlanRelation;
  narrative: string;
}

export interface ObservableSignal {
  kind: string;
  description: string;
  strength: number;
}

export interface DiscoveryResult {
  stimulus: string;
  finding: string;
  property?: string;
  disproved?: string;
}

export interface ExpectationBreak {
  beliefId: string;
  beliefClaim: string;
  contradictingAction: string;
  controlShift: string;
}

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
  /** Primary shared dilemma / setup chain. */
  tacticalThread?: TacticalThread;
  /** Legacy alias for UI — mirrors tacticalThread when present. */
  activeThreat?: ActiveThreat;
  tempo: TempoState;
  temptation?: TacticalTemptation;
  discoveries: DiscoveryResult[];
  lastCausalEvents: CausalEvent[];
  lastExpectationBreak?: ExpectationBreak;
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
  playerRelation?: PlanRelation;
  bossRelation?: PlanRelation;
  contestedAssumptions: string[];
  targetAwarenessShift: AwarenessShift;
  /** Which side's awareness is shifted (default: opponent of actor). */
  awarenessTarget?: 'player' | 'boss';
  positionShift: PositionShift;
  /** Independent boss range shift when provided. */
  bossPositionShift?: PositionShift;
  hiddenTraitHint: string;
  suggestedFacts: string[];
  suggestedAssumptions: string[];
  battlefieldAdd: string[];
  battlefieldRemove: string[];
  causalEvents?: Array<{
    actor: ActorSide;
    method: string;
    target: string;
    fromState?: string;
    toState?: string;
    relation?: PlanRelation;
    narrative: string;
  }>;
  discoveries?: DiscoveryResult[];
  observableSignals?: ObservableSignal[];
  judgmentNarrative: string;
  bossReaction: string;
  /**
   * Reserved for offline / recommit paths. Live API resolves a precommitted
   * boss Argument; inventing a new one mid-clash is ignored.
   */
  bossIntent: string;
  damageWhy: string;
  fieldSigns: string[];
  activeThreat?: {
    label: string;
    foreshadow: string;
    timer: number;
    purpose?: string;
    payoff?: string;
  } | null;
  /** True only if a causal mutation broke / reversed / spent the thread. */
  clearThreat?: boolean;
  threadTransferTo?: ActorSide | null;
  signatureMomentId?: string | null;
  emotionalBeat?: string;
}

/** Deterministic engine output after applying judgment. */
export interface ResolvedVerdict {
  calculatedComplexity: { player: number; boss: number };
  playerBodyDelta: number;
  playerResolveDelta: number;
  bossBodyDelta: number;
  bossResolveDelta: number;
  targetAwarenessShift: AwarenessShift;
  awarenessTarget: 'player' | 'boss';
  positionShift: PositionShift;
  bossPositionShift: PositionShift;
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
  playerRelation: PlanRelation;
  bossRelation: PlanRelation;
  causalEvents: CausalEvent[];
  discoveries: DiscoveryResult[];
  observableSignals: ObservableSignal[];
  expectationBreak?: ExpectationBreak;
  damageWhyPlayer: string;
  damageWhyBoss: string;
  threadCleared: boolean;
  threadTransferredTo?: ActorSide;
}

/** Sanitized observation for boss planning — never includes private player aim. */
export interface BossObservation {
  round: number;
  observableSignals: ObservableSignal[];
  fieldNames: string[];
  threadLabel?: string;
  threadStatus?: ThreadStatus;
  tempoBeat: TempoBeat;
  temptationForeshadow?: string;
  recentPlayerActions: string[];
  beliefs: Array<{ claim: string; confidence: number }>;
  unavailableResources: string[];
  failedMethods: string[];
  emotionalTriggers: string[];
  lastTransformation?: string;
  omen?: string;
}

export interface CompactGameSnapshot {
  round: number;
  initiative: InitiativeHolder;
  realityPressure: number;
  environmentalEvent?: string;
  battlefield: string[];
  fieldElements: Array<{
    name: string;
    condition: string;
    knownProperties: string[];
    scars: string[];
  }>;
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
    posture: AdaptationPosture;
    definingFlaw: string;
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
      biases: string[];
      obsessions: string[];
      prideRule: string;
      fear: string;
      habit: string;
      blindSpots: string[];
      breakingPoint: string;
      signatureMoments: SignatureMomentDef[];
    };
  };
  /** Committed boss Argument for this clash — not invented after reading player. */
  committedBossIntent: Intent;
  playerIntent: Intent;
  bossIntent?: Intent;
  playerFatiguePenalty: number;
  bossFatiguePenalty: number;
  /** Always false in the commitment loop; kept for ping/backward compat. */
  generateBossIntent: boolean;
  activeThreat?: ActiveThreat;
  tacticalThread?: TacticalThread;
  tempo: TempoState;
  temptationForeshadow?: string;
  tension: TensionPhase;
  recentBossIntents: string[];
  discoveries: DiscoveryResult[];
  omen?: string;
  lastTransformation?: string;
}
