import type { ArbiterJudgment, CompactGameSnapshot, ResolutionOutcome } from '../types';
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

function normalizeJudgment(raw: unknown): ArbiterJudgment {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid judgment object');
  }
  const o = raw as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  const playerP = Number(o.playerPlausibility);
  const bossP = Number(o.bossPlausibility);

  return {
    playerPlausibility: Math.max(
      0,
      Math.min(1, Number.isFinite(playerP) ? playerP : 0.5),
    ),
    bossPlausibility: Math.max(
      0,
      Math.min(1, Number.isFinite(bossP) ? bossP : 0.5),
    ),
    playerOutcome: isOutcome(o.playerOutcome) ? o.playerOutcome : 'partial',
    bossOutcome: isOutcome(o.bossOutcome) ? o.bossOutcome : 'partial',
    contestedAssumptions: arr(o.contestedAssumptions),
    targetAwarenessShift:
      o.targetAwarenessShift === 'degrade' ||
      o.targetAwarenessShift === 'hijack' ||
      o.targetAwarenessShift === 'restore'
        ? o.targetAwarenessShift
        : 'none',
    positionShift:
      o.positionShift === 'closer' || o.positionShift === 'farther'
        ? o.positionShift
        : 'none',
    hiddenTraitHint:
      typeof o.hiddenTraitHint === 'string' ? o.hiddenTraitHint : '',
    suggestedFacts: arr(o.suggestedFacts),
    suggestedAssumptions: arr(o.suggestedAssumptions),
    battlefieldAdd: arr(o.battlefieldAdd),
    battlefieldRemove: arr(o.battlefieldRemove),
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
  };
}

function normalizeThreat(
  v: unknown,
): { label: string; foreshadow: string; timer: number } | null {
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
    const judgment = await this.judge({
      round: 0,
      initiative: 'player',
      realityPressure: 0.2,
      battlefield: ['Stone Pillars'],
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
        personality: {
          name: 'The Lawyer',
          trait: 'Legal Precedent',
          goal: 'Bind the arena under rules.',
          motive: 'Trap via precedent.',
          voice: 'Plain firm sentences.',
          toolkit: ['chalk line', 'stamped seal'],
          tactics: ['Cite rules simply'],
          taboos: ['No legalese walls'],
          sampleMoves: [
            'I snap a chalk line across the wet floor and call it binding.',
          ],
        },
      },
      playerIntent: {
        raw: 'I test the connection with a cautious probe.',
        category: 'UTILITY',
        target: 'ENVIRONMENT',
      },
      playerFatiguePenalty: 0,
      bossFatiguePenalty: 0,
      generateBossIntent: true,
      tension: 'calm',
      recentBossIntents: [],
    });
    return `OK · outcomes ${judgment.playerOutcome}/${judgment.bossOutcome}`;
  }

  async judge(snapshot: CompactGameSnapshot): Promise<ArbiterJudgment> {
    const content = await this.chatJson({
      system: buildJudgmentSystemPrompt(),
      user: buildJudgmentUserPrompt(snapshot),
      temperature: 0.45,
      maxTokens: 1100,
    });
    return normalizeJudgment(parseJudgmentJson(content));
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
