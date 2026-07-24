import type {
  ActorSide,
  ArbiterJudgment,
  CompactGameSnapshot,
  DiscoveryResult,
  ObservableSignal,
  PlanRelation,
  ResolutionOutcome,
} from '../types';
import { createTempoState } from '../engine/tempo';
import { getBossPersonality } from '../engine/bossPersonalities';
import {
  buildHelpSystemPrompt,
  buildHelpUserPrompt,
} from './helpPrompt';
import {
  buildJudgmentSystemPrompt,
  buildJudgmentUserPrompt,
} from './prompt';
import { parseJudgmentJson } from './schema';
import type { StoredApiConfig } from './apiConfig';
import { configLooksReady } from './apiConfig';

function isOutcome(v: unknown): v is ResolutionOutcome {
  return (
    v === 'success' ||
    v === 'partial' ||
    v === 'failure' ||
    v === 'backfire'
  );
}

function isRelation(v: unknown): v is PlanRelation {
  return (
    v === 'advance' ||
    v === 'stall' ||
    v === 'break' ||
    v === 'reverse' ||
    v === 'transfer' ||
    v === 'none'
  );
}

function outcomeFromPlausibility(p: number): ResolutionOutcome {
  if (p > 0.72) return 'success';
  if (p > 0.5) return 'partial';
  if (p > 0.28) return 'failure';
  return 'backfire';
}

function normalizeJudgment(raw: unknown): ArbiterJudgment {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid judgment object');
  }
  const o = raw as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  const playerP = Number(o.playerPlausibility);
  const bossP = Number(o.bossPlausibility);
  const pPlaus = Math.max(0, Math.min(1, Number.isFinite(playerP) ? playerP : 0.55));
  const bPlaus = Math.max(0, Math.min(1, Number.isFinite(bossP) ? bossP : 0.55));

  // Missing outcomes: repair from plausibility — do NOT default everything to partial.
  const playerOutcome = isOutcome(o.playerOutcome)
    ? o.playerOutcome
    : outcomeFromPlausibility(pPlaus);
  const bossOutcome = isOutcome(o.bossOutcome)
    ? o.bossOutcome
    : outcomeFromPlausibility(bPlaus);

  const discoveries: DiscoveryResult[] = Array.isArray(o.discoveries)
    ? o.discoveries
        .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
        .map((d) => ({
          stimulus: typeof d.stimulus === 'string' ? d.stimulus : '',
          finding: typeof d.finding === 'string' ? d.finding : '',
          property: typeof d.property === 'string' ? d.property : undefined,
          disproved: typeof d.disproved === 'string' ? d.disproved : undefined,
        }))
        .filter((d) => d.finding)
    : [];

  const observableSignals: ObservableSignal[] = Array.isArray(o.observableSignals)
    ? o.observableSignals
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({
          kind: typeof s.kind === 'string' ? s.kind : 'signal',
          description: typeof s.description === 'string' ? s.description : '',
          strength: Number.isFinite(Number(s.strength)) ? Number(s.strength) : 0.5,
        }))
        .filter((s) => s.description)
    : [];

  const causalEvents = Array.isArray(o.causalEvents)
    ? o.causalEvents
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => ({
          actor: (e.actor === 'player' || e.actor === 'boss' || e.actor === 'world'
            ? e.actor
            : 'boss') as ActorSide,
          method: typeof e.method === 'string' ? e.method : '',
          target: typeof e.target === 'string' ? e.target : '',
          fromState: typeof e.fromState === 'string' ? e.fromState : undefined,
          toState: typeof e.toState === 'string' ? e.toState : undefined,
          relation: isRelation(e.relation) ? e.relation : undefined,
          narrative: typeof e.narrative === 'string' ? e.narrative : '',
        }))
        .filter((e) => e.narrative || e.method)
    : undefined;

  const transfer = o.threadTransferTo;
  const threadTransferTo =
    transfer === 'player' || transfer === 'boss' || transfer === 'world'
      ? transfer
      : null;

  return {
    playerPlausibility: pPlaus,
    bossPlausibility: bPlaus,
    playerOutcome,
    bossOutcome,
    playerRelation: isRelation(o.playerRelation) ? o.playerRelation : undefined,
    bossRelation: isRelation(o.bossRelation) ? o.bossRelation : undefined,
    contestedAssumptions: arr(o.contestedAssumptions),
    targetAwarenessShift:
      o.targetAwarenessShift === 'degrade' ||
      o.targetAwarenessShift === 'hijack' ||
      o.targetAwarenessShift === 'restore'
        ? o.targetAwarenessShift
        : 'none',
    awarenessTarget: o.awarenessTarget === 'player' ? 'player' : 'boss',
    positionShift:
      o.positionShift === 'closer' || o.positionShift === 'farther'
        ? o.positionShift
        : 'none',
    bossPositionShift:
      o.bossPositionShift === 'closer' || o.bossPositionShift === 'farther'
        ? o.bossPositionShift
        : 'none',
    hiddenTraitHint:
      typeof o.hiddenTraitHint === 'string' ? o.hiddenTraitHint : '',
    suggestedFacts: arr(o.suggestedFacts),
    suggestedAssumptions: arr(o.suggestedAssumptions),
    battlefieldAdd: arr(o.battlefieldAdd),
    battlefieldRemove: arr(o.battlefieldRemove),
    causalEvents,
    discoveries,
    observableSignals,
    judgmentNarrative:
      typeof o.judgmentNarrative === 'string' ? o.judgmentNarrative : '',
    bossReaction: typeof o.bossReaction === 'string' ? o.bossReaction : '',
    bossIntent: typeof o.bossIntent === 'string' ? o.bossIntent.trim() : '',
    damageWhy: typeof o.damageWhy === 'string' ? o.damageWhy.trim() : '',
    fieldSigns: Array.isArray(o.fieldSigns)
      ? o.fieldSigns.filter((x): x is string => typeof x === 'string')
      : typeof o.playerNowFaces === 'string' && o.playerNowFaces.trim()
        ? [o.playerNowFaces.trim()]
        : [],
    activeThreat: normalizeThreat(o.activeThreat),
    clearThreat: o.clearThreat === true,
    threadTransferTo,
    signatureMomentId:
      typeof o.signatureMomentId === 'string' ? o.signatureMomentId : null,
    emotionalBeat: typeof o.emotionalBeat === 'string' ? o.emotionalBeat : '',
  };
}

function normalizeThreat(
  v: unknown,
): {
  label: string;
  foreshadow: string;
  timer: number;
  purpose?: string;
  payoff?: string;
} | null {
  if (!v || typeof v !== 'object') return null;
  const t = v as Record<string, unknown>;
  if (typeof t.label !== 'string' || !t.label.trim()) return null;
  const foreshadow =
    typeof t.foreshadow === 'string' && t.foreshadow.trim()
      ? t.foreshadow.trim()
      : typeof t.stakes === 'string' && t.stakes.trim()
        ? t.stakes.trim()
        : 'The field complains — something has started to fail.';
  return {
    label: t.label.trim(),
    foreshadow,
    timer: Math.max(1, Math.min(4, Number(t.timer) || 3)),
    purpose: typeof t.purpose === 'string' ? t.purpose : undefined,
    payoff: typeof t.payoff === 'string' ? t.payoff : undefined,
  };
}

/** Cloud / local OpenAI-compatible Arbiter (no WebLLM). */
export class ArbiterClient {
  private cfg: StoredApiConfig | null = null;
  private ready = false;

  isReady(): boolean {
    return this.ready && !!this.cfg && configLooksReady(this.cfg);
  }

  getConfig(): StoredApiConfig | null {
    return this.cfg;
  }

  configure(cfg: StoredApiConfig): void {
    this.cfg = cfg;
    this.ready = configLooksReady(cfg);
  }

  async ping(): Promise<string> {
    if (!this.cfg || !configLooksReady(this.cfg)) {
      throw new Error('Configure API base URL, model, and key first.');
    }
    const p = getBossPersonality('lawyer');
    const committed = {
      raw: 'I snap a chalk line across the wet floor and call it binding.',
      category: 'SETUP' as const,
      target: 'ENVIRONMENT' as const,
    };
    const judgment = await this.judge({
      round: 0,
      initiative: 'player',
      realityPressure: 0.2,
      battlefield: ['Stone Pillars'],
      fieldElements: [
        {
          name: 'Stone Pillars',
          condition: 'present',
          knownProperties: ['objects'],
          scars: [],
        },
      ],
      facts: [],
      assumptions: [],
      player: {
        body: 100,
        resolve: 100,
        awareness: 'FULL',
        position: 'MID',
        hiddenTraitRevealed: false,
      },
      boss: {
        body: 100,
        resolve: 100,
        awareness: 'FULL',
        position: 'MID',
        archetype: 'lawyer',
        agendaProgress: 0,
        posture: 'continue',
        definingFlaw: p.definingFlaw,
        personality: {
          name: p.name,
          trait: p.trait,
          goal: p.goal,
          motive: p.motive,
          voice: p.voice,
          toolkit: p.toolkit,
          tactics: p.tactics,
          taboos: p.taboos,
          sampleMoves: p.sampleMoves,
          biases: p.biases,
          obsessions: p.obsessions,
          prideRule: p.prideRule,
          fear: p.fear,
          habit: p.habit,
          blindSpots: p.blindSpots,
          breakingPoint: p.breakingPoint,
          signatureMoments: p.signatureMoments,
        },
      },
      committedBossIntent: committed,
      playerIntent: {
        raw: 'I test the connection with a cautious probe.',
        category: 'UTILITY',
        target: 'ENVIRONMENT',
      },
      bossIntent: committed,
      playerFatiguePenalty: 0,
      bossFatiguePenalty: 0,
      generateBossIntent: false,
      tempo: createTempoState(),
      tension: 'calm',
      recentBossIntents: [],
      discoveries: [],
    });
    return `OK · outcomes ${judgment.playerOutcome}/${judgment.bossOutcome}`;
  }

  async judge(snapshot: CompactGameSnapshot): Promise<ArbiterJudgment> {
    const content = await this.chatJson({
      system: buildJudgmentSystemPrompt(),
      user: buildJudgmentUserPrompt(snapshot),
      temperature: 0.45,
      maxTokens: 1400,
    });
    const judgment = normalizeJudgment(parseJudgmentJson(content));
    // Enforce precommitment: never let the model replace the boss Argument.
    const committed = snapshot.committedBossIntent?.raw?.trim();
    if (committed) {
      judgment.bossIntent = committed;
    }
    return judgment;
  }

  /** One player-style Argument suggestion that uses the current field. */
  async suggestIntent(snapshot: CompactGameSnapshot): Promise<string> {
    const content = await this.chatJson({
      system: buildHelpSystemPrompt(),
      user: buildHelpUserPrompt(snapshot),
      temperature: 0.7,
      maxTokens: 220,
    });
    const parsed = parseJudgmentJson(content) as { intent?: unknown };
    if (typeof parsed.intent === 'string' && parsed.intent.trim()) {
      return parsed.intent.trim();
    }
    throw new Error('Help response missing intent');
  }

  private async chatJson(opts: {
    system: string;
    user: string;
    temperature: number;
    maxTokens: number;
  }): Promise<string> {
    if (!this.cfg || !configLooksReady(this.cfg)) {
      throw new Error('Arbiter API not configured');
    }

    const base = this.cfg.baseUrl.replace(/\/$/, '');
    const url = `${base}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.cfg.apiKey.trim()) {
      headers.Authorization = `Bearer ${this.cfg.apiKey.trim()}`;
    }
    if (base.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'PromptForge';
    }

    const body = {
      model: this.cfg.model,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(
        e instanceof Error
          ? `Network error: ${e.message}`
          : 'Network error talking to Arbiter API',
      );
    }

    if (!res.ok) {
      if (res.status === 400 || res.status === 422) {
        const retry = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, response_format: undefined }),
        });
        if (retry.ok) return readContent(retry);
        const errText = await retry.text().catch(() => '');
        throw new Error(
          `Arbiter API ${retry.status}: ${errText.slice(0, 240) || retry.statusText}`,
        );
      }
      const errText = await res.text().catch(() => '');
      throw new Error(
        `Arbiter API ${res.status}: ${errText.slice(0, 240) || res.statusText}`,
      );
    }

    return readContent(res);
  }
}

async function readContent(res: Response): Promise<string> {
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Empty Arbiter API response');
  }
  return content;
}
