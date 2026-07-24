import { COMPLEXITY_BUDGET } from '../config/gameConfig';
import {
  API_PRESETS,
  type ApiPresetId,
  type StoredApiConfig,
} from '../arbiter/apiConfig';
import { evaluateComplexity } from '../engine/complexityBudget';
import type { BossArchetype, GameState } from '../types';
import { avatarPlate, speechBubble } from './avatars';
import { ALL_BOSSES, BOSS_META } from './bossMeta';
import { buildArenaCards, cardTone } from './cards';
import { GAME_TIPS } from './tips';

/** Kill browser autofill / password-manager icons on our fields. */
const NO_FILL =
  'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"';

export type AppPhase = 'setup' | 'arena';
export type BossPick = BossArchetype | 'random';

export interface SpeechState {
  arbiter: string;
  boss: string;
  player: string;
  /** intent = declaring/verifying (do not auto-clear); verdict = after Arbiter rules */
  phase: 'idle' | 'intent' | 'verdict';
}

export interface LastJudgmentView {
  arbiterText: string;
  playerOutcome: string;
  bossOutcome: string;
  playerPrompt: string;
  bossPrompt: string;
  round: number;
}

/** Which character speech bubbles are currently open. */
export interface SpeechOpen {
  boss: boolean;
  player: boolean;
}

export interface UiCallbacks {
  onSelectPreset: (preset: ApiPresetId) => void;
  onApiConfigChange: (partial: Partial<StoredApiConfig>) => void;
  onTestApi: () => void;
  onSelectBoss: (pick: BossPick) => void;
  onPlayerName: (name: string) => void;
  onUseMockToggle: (useMock: boolean) => void;
  onStartGame: () => void;
  onSubmitIntent: (raw: string) => void;
  onNewDuel: () => void;
  onToggleArbiterDossier: () => void;
  onCloseArbiterDossier: () => void;
  onToggleBossSpeech: () => void;
  onTogglePlayerSpeech: () => void;
  onCloseCharacterSpeech: () => void;
  onToggleTips: () => void;
  onPickStarterIntent: (text: string) => void;
  onRequestHelp: () => void;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function miniBar(value: number, accent: 'neon' | 'crimson'): string {
  const cls = accent === 'neon' ? 'bg-neon' : 'bg-crimson';
  const v = Math.max(0, Math.min(100, value));
  return `<div class="h-1.5 bg-terminal-bg border border-terminal-border overflow-hidden"><div class="bar-fill h-full ${cls}" style="width:${v}%"></div></div>`;
}

function renderSetup(opts: {
  api: StoredApiConfig;
  bossPick: BossPick;
  playerName: string;
  useMock: boolean;
  arbiterReady: boolean;
  statusHint: string;
  error?: string;
}): string {
  const canStart = opts.useMock || opts.arbiterReady;
  const selectedBoss =
    opts.bossPick === 'random' ? null : BOSS_META[opts.bossPick];
  const preset = API_PRESETS[opts.api.preset];

  return `
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-terminal-bg/90 backdrop-blur-sm">
    <div class="scanline absolute inset-0 opacity-30 pointer-events-none"></div>
    <div class="relative w-full max-w-4xl max-h-[94vh] overflow-y-auto log-scroll border border-neon/40 bg-terminal-panel shadow-neon">
      <div class="border-b border-terminal-border px-4 py-3 flex flex-wrap justify-between gap-2">
        <div>
          <div class="text-neon text-[10px] tracking-[0.4em]">PROMPTFORGE // BOOT</div>
          <h1 class="text-xl md:text-2xl text-terminal-text font-semibold tracking-tight">SYSTEM_SELECT</h1>
        </div>
        <div class="text-[10px] text-terminal-dim font-mono text-right">
          <div>ARBITER ${opts.useMock ? 'MOCK' : opts.arbiterReady ? 'API_READY' : 'NEED_KEY'}</div>
          <div>${esc(opts.api.preset.toUpperCase())} · ${esc(opts.api.model)}</div>
        </div>
      </div>

      <div class="p-4 md:p-6 grid gap-5 md:grid-cols-2">
        <section>
          <h2 class="text-neon text-xs tracking-widest mb-2">> ARBITER_API</h2>
          <p class="text-[11px] text-terminal-dim mb-3">WebLLM removed — use a fast OpenAI-compatible API (Groq recommended).</p>
          <div class="flex flex-wrap gap-1.5 mb-3">
            ${(Object.keys(API_PRESETS) as ApiPresetId[])
              .map(
                (id) => `
              <button data-preset="${id}" class="px-2 py-1.5 text-[10px] border font-mono ${
                opts.api.preset === id && !opts.useMock
                  ? 'border-neon text-neon bg-neon/10'
                  : 'border-terminal-border text-terminal-dim hover:border-neon/40'
              }">${esc(API_PRESETS[id].label)}</button>`,
              )
              .join('')}
          </div>
          <p class="text-[10px] text-terminal-dim mb-3">${esc(preset.hint)}</p>
          <label class="block text-[10px] text-terminal-dim tracking-widest mb-1">BASE_URL</label>
          <input id="api-base" name="pf-api-base" value="${esc(opts.api.baseUrl)}" ${NO_FILL} class="w-full mb-2 bg-terminal-bg border border-terminal-border text-terminal-text text-xs px-2 py-1.5 font-mono focus:outline-none focus:border-neon" ${opts.useMock ? 'disabled' : ''} />
          <label class="block text-[10px] text-terminal-dim tracking-widest mb-1">MODEL</label>
          <input id="api-model" name="pf-api-model" value="${esc(opts.api.model)}" ${NO_FILL} class="w-full mb-2 bg-terminal-bg border border-terminal-border text-terminal-text text-xs px-2 py-1.5 font-mono focus:outline-none focus:border-neon" ${opts.useMock ? 'disabled' : ''} />
          <label class="block text-[10px] text-terminal-dim tracking-widest mb-1">API_KEY ${opts.api.preset === 'ollama' ? '(optional)' : ''}</label>
          <input id="api-key" name="pf-api-key" type="password" value="${esc(opts.api.apiKey)}" placeholder="sk-…" autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" class="w-full mb-3 bg-terminal-bg border border-terminal-border text-neon text-xs px-2 py-1.5 font-mono focus:outline-none focus:border-neon" ${opts.useMock ? 'disabled' : ''} />
          <div class="flex flex-wrap gap-2 mb-3">
            <button type="button" id="btn-test-api" class="px-3 py-1.5 text-[10px] border border-neon text-neon font-mono ${opts.useMock ? 'opacity-40' : ''}" ${opts.useMock ? 'disabled' : ''}>TEST_CONNECTION</button>
            <label class="flex items-center gap-2 text-[11px] text-amber font-mono cursor-pointer">
              <input type="checkbox" id="mock-toggle" ${opts.useMock ? 'checked' : ''} class="accent-amber" />
              USE_MOCK (offline)
            </label>
          </div>
          <div class="border border-terminal-border p-3 bg-terminal-bg text-[10px] text-terminal-dim font-mono">
            ${esc(opts.statusHint)}
          </div>
        </section>

        <section>
          <h2 class="text-crimson text-xs tracking-widest mb-2">> BOSS</h2>
          <div class="flex gap-3 mb-3 items-start">
            ${
              opts.bossPick === 'random'
                ? avatarPlate('unknown', { size: 'md' })
                : avatarPlate('boss', { bossId: opts.bossPick, size: 'md' })
            }
            <div class="min-w-0">
              <div class="text-crimson text-sm font-semibold">
                ${opts.bossPick === 'random' ? 'RANDOM_BOSS' : esc(selectedBoss!.name)}
              </div>
              <div class="text-[10px] text-amber tracking-wide">
                ${opts.bossPick === 'random' ? 'TRAIT: ???' : `TRAIT: ${esc(selectedBoss!.trait)}`}
              </div>
              <p class="text-[11px] text-terminal-dim mt-1 leading-relaxed">
                ${
                  opts.bossPick === 'random'
                    ? 'Identity hidden until the duel starts. Puzzle revealed in-arena.'
                    : esc(selectedBoss!.blurb)
                }
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto log-scroll mb-2">
            <button data-boss="random" class="px-2 py-1.5 text-[10px] border font-mono ${
              opts.bossPick === 'random'
                ? 'border-crimson text-crimson bg-crimson/10'
                : 'border-terminal-border text-terminal-dim'
            }">? RANDOM</button>
            ${ALL_BOSSES.map(
              (b) => `
              <button data-boss="${b.id}" class="px-2 py-1.5 text-[10px] border font-mono text-left ${
                opts.bossPick === b.id
                  ? 'border-crimson text-crimson bg-crimson/10'
                  : 'border-terminal-border text-terminal-dim hover:border-crimson/40'
              }">${esc(b.name)}</button>`,
            ).join('')}
          </div>
        </section>

        <section class="md:col-span-2 border border-amber/40 bg-terminal-bg p-4 space-y-3">
          <h2 class="text-amber text-xs tracking-widest">> HOW_TO_PLAY</h2>
          <p class="text-[12px] text-terminal-text leading-relaxed">
            PromptForge is a <span class="text-neon">courtroom for reality</span> — but the real game is
            <span class="text-crimson">creating dilemmas</span>. You declare Arguments (attempts).
            The boss commits at the same time to a problem you must answer. The Arbiter judges the clash.
          </p>
          <div class="grid md:grid-cols-2 gap-3 text-[11px] text-terminal-dim font-mono leading-relaxed">
            <div>
              <div class="text-neon tracking-widest mb-1">THE LOOP</div>
              <ol class="list-decimal pl-4 space-y-1">
                <li>Read 3 cards + <span class="text-crimson">Battlefield signs</span> (⚠ Damaged Railing (3)…).</li>
                <li>Discover implications yourself — the game will not say “choose between…”.</li>
                <li>Commit an intent. Never guaranteed results (<span class="text-crimson">“I deal 20 damage”</span>).</li>
                <li>Bosses use tools (blade, cutter, chalk…) and advance a plan you can sense.</li>
                <li>Read <span class="text-amber">Why it hurt</span> — numbers always have a cause.</li>
              </ol>
            </div>
            <div>
              <div class="text-neon tracking-widest mb-1">HOW YOU WIN</div>
              <ul class="list-disc pl-4 space-y-1">
                <li><span class="text-terminal-text">Body</span> — physical integrity.</li>
                <li><span class="text-terminal-text">Resolve</span> — belief. Hit 0 = duel loss.</li>
                <li>Ignore a threat timer and it <span class="text-crimson">pays off</span>.</li>
                <li><span class="text-amber">2 HELPs</span> / duel · <span class="text-amber">?</span> for tips + sample intents.</li>
              </ul>
            </div>
          </div>
          <p class="text-[10px] text-terminal-dim font-mono">
            Tip: configure an API key (Groq recommended) or enable Mock for offline play. Keys stay in your browser only.
          </p>
        </section>

        <section class="md:col-span-2 flex flex-wrap items-end justify-between gap-3">
          <label class="text-[10px] text-terminal-dim tracking-widest block">
            YOUR NAME
            <span class="block normal-case tracking-normal text-terminal-dim/80 font-normal mt-0.5 mb-1">Shown on your card in the arena.</span>
            <input id="player-name" name="pf-player-name" value="${esc(opts.playerName)}" maxlength="18" placeholder="e.g. Mira" ${NO_FILL} class="block w-48 bg-terminal-bg border border-neon/40 text-neon text-xs px-2 py-1.5 font-mono focus:outline-none focus:border-neon" />
          </label>
          <div class="flex flex-col items-end gap-1">
            ${
              opts.error
                ? `<div class="text-[10px] text-crimson max-w-xs text-right">${esc(opts.error)}</div>`
                : ''
            }
            <button id="btn-start" class="px-5 py-2.5 text-xs tracking-widest border font-mono ${
              canStart
                ? 'border-neon text-neon bg-neon/15 hover:bg-neon/25'
                : 'border-terminal-border text-terminal-dim opacity-50 cursor-not-allowed'
            }" ${canStart ? '' : 'disabled'}>
              ${canStart ? 'ENTER_ARENA' : 'ADD_API_KEY_OR_MOCK'}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>`;
}

function renderArbiterDossier(last: LastJudgmentView | null): string {
  if (!last) {
    return `
    <div id="arbiter-dossier" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-sm">
      <div class="w-full max-w-xl border border-amber bg-terminal-panel p-5 shadow-[0_0_24px_#ffb02033]">
        <div class="flex justify-between items-center mb-3">
          <span class="text-amber text-xs tracking-widest">ARBITER_JUDGMENT</span>
          <button type="button" id="btn-close-dossier" class="text-terminal-dim hover:text-amber text-xs font-mono">[CLOSE]</button>
        </div>
        <p class="text-sm text-terminal-dim leading-relaxed">No judgment yet. Commit an Argument first.</p>
      </div>
    </div>`;
  }
  return `
  <div id="arbiter-dossier" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-sm">
    <div class="w-full max-w-xl max-h-[85vh] overflow-y-auto log-scroll border border-amber bg-terminal-panel p-5 md:p-6 shadow-[0_0_24px_#ffb02033]">
      <div class="flex justify-between items-center mb-4">
        <div>
          <div class="text-amber text-xs tracking-widest">ARBITER_JUDGMENT · ROUND ${last.round}</div>
          <div class="text-[11px] text-terminal-dim mt-1">YOU ${esc(last.playerOutcome.toUpperCase())} · BOSS ${esc(last.bossOutcome.toUpperCase())}</div>
        </div>
        <button type="button" id="btn-close-dossier" class="text-terminal-dim hover:text-amber text-xs font-mono">[CLOSE]</button>
      </div>
      <div class="mb-4 space-y-3 border border-terminal-border bg-terminal-bg/60 p-3">
        <div>
          <div class="text-neon text-[10px] tracking-widest mb-1">YOUR_INTENT</div>
          <p class="text-[12px] text-terminal-text leading-snug whitespace-pre-wrap">${esc(last.playerPrompt)}</p>
        </div>
        <div>
          <div class="text-crimson text-[10px] tracking-widest mb-1">BOSS_INTENT</div>
          <p class="text-[12px] text-terminal-text leading-snug whitespace-pre-wrap">${esc(last.bossPrompt)}</p>
        </div>
      </div>
      <div class="judgment-prose text-[13px] md:text-sm text-terminal-text leading-relaxed whitespace-pre-wrap">${esc(last.arbiterText)}</div>
    </div>
  </div>`;
}

function renderArena(
  state: GameState,
  opts: {
    playerName: string;
    bossRevealed: boolean;
    speech: SpeechState;
    speechOpen: SpeechOpen;
    busy: boolean;
    statusLine: string;
    lastJudgmentMs?: number;
    error?: string;
    draft: string;
    clearDraft?: boolean;
    showArbiterDossier: boolean;
    lastJudgment: LastJudgmentView | null;
    showTips: boolean;
    starterIntents: string[];
    helpsLeft: number;
  },
): string {
  const bossId = state.bossAgenda.archetype;
  const bossMeta = BOSS_META[bossId];
  const cards = buildArenaCards(state);
  const showBoss = opts.bossRevealed;
  const bossBubble =
    opts.speechOpen.boss && opts.speech.boss.trim()
      ? speechBubble(opts.speech.boss, 'crimson', 'left', 'boss')
      : '';
  const playerBubble =
    opts.speechOpen.player && opts.speech.player.trim()
      ? speechBubble(opts.speech.player, 'neon', 'down', 'player')
      : '';

  const starterChips = opts.starterIntents
    .map(
      (t) => `
      <button type="button" data-starter-intent="${esc(t)}" class="text-left px-2 py-1.5 border border-neon/30 text-[10px] text-neon/90 font-mono hover:bg-neon/10 leading-snug">
        ${esc(t)}
      </button>`,
    )
    .join('');

  return `
  <div id="arena-root" class="relative min-h-screen overflow-hidden">
    <div class="scanline absolute inset-0 z-10 opacity-30 pointer-events-none"></div>

    <!-- TOP MIDDLE: tips + starter intents -->
    <div class="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[min(92%,420px)] pointer-events-auto">
      <div class="flex items-start gap-2">
        <button type="button" id="btn-tips" class="shrink-0 w-9 h-9 border border-amber text-amber bg-terminal-panel/95 font-mono text-lg leading-none hover:bg-amber/10" title="Tips & sample intents">?</button>
        <div class="flex-1 min-w-0">
          ${
            opts.showTips
              ? `<div id="tips-panel" class="border border-amber/50 bg-terminal-panel/95 p-3 shadow-[0_0_18px_#ffb02022] max-h-[42vh] overflow-y-auto log-scroll">
                  <div class="text-amber text-[10px] tracking-widest mb-2">TIPS · HOW_TO_PLAY</div>
                  <ul class="text-[10px] text-terminal-dim font-mono space-y-1.5 mb-3 list-disc pl-4 leading-relaxed">
                    ${GAME_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}
                  </ul>
                  <div class="text-neon text-[10px] tracking-widest mb-1.5">TRY_THESE (click to fill)</div>
                  <div class="grid gap-1.5">${starterChips}</div>
                </div>`
              : `<div class="text-[10px] text-terminal-dim font-mono pt-2">click <span class="text-amber">?</span> for tips · sample intents</div>`
          }
        </div>
      </div>
    </div>

    <!-- TOP LEFT: Boss card + bubble to the RIGHT pointing at avatar -->
    <aside class="absolute top-3 left-3 z-20 flex items-start gap-2 max-w-[min(100%,520px)]" data-speech-zone="boss">
      <div class="boss-card w-[min(100%,260px)] border border-crimson/50 bg-terminal-panel/95 p-3 shadow-crimson shrink-0">
        <div class="flex gap-3 items-start">
          <button type="button" id="btn-boss-avatar" class="boss-avatar shrink-0 cursor-pointer group text-left" title="Toggle boss speech">
            ${
              showBoss
                ? avatarPlate('boss', { bossId, size: 'md' })
                : avatarPlate('unknown', { size: 'md' })
            }
            <div class="text-[8px] text-terminal-dim mt-1 group-hover:text-crimson">click · speech</div>
          </button>
          <div class="min-w-0 flex-1">
            <div class="text-crimson text-xs tracking-widest">${showBoss ? esc(bossMeta.name) : 'UNKNOWN_ENTITY'}</div>
            <div class="text-[10px] text-terminal-dim mb-2">${showBoss ? esc(bossMeta.trait) : 'TRAIT: ???'} · AGENDA ${state.bossAgenda.progress}</div>
            <div class="text-[10px] text-terminal-dim flex justify-between"><span>BODY</span><span>${state.boss.body.toFixed(0)}</span></div>
            ${miniBar(state.boss.body, 'crimson')}
            <div class="text-[10px] text-terminal-dim flex justify-between mt-1"><span>RESOLVE</span><span>${state.boss.resolve.toFixed(0)}</span></div>
            ${miniBar(state.boss.resolve, 'crimson')}
            <div class="mt-2 text-[10px] text-terminal-dim">AWARE <span class="text-crimson">${state.boss.awareness}</span></div>
          </div>
        </div>
      </div>
      <div class="boss-bubble pt-2 shrink-0" data-speech-zone="boss">
        ${bossBubble}
      </div>
    </aside>

    <!-- TOP RIGHT status -->
    <div class="absolute top-3 right-3 z-20 text-right text-[10px] font-mono text-terminal-dim">
      <div>ROUND <span class="text-neon">${state.round}</span></div>
      <div>INIT <span class="text-amber">${state.world.initiative.toUpperCase()}</span></div>
      <div>P_r ${(state.world.realityPressure * 100).toFixed(0)}%</div>
      ${
        opts.lastJudgmentMs != null
          ? `<div>JSON ${opts.lastJudgmentMs}ms</div>`
          : ''
      }
    </div>

    <!-- MIDDLE LEFT: Arbiter + bubble to the right pointing at avatar -->
    <div class="absolute top-1/2 left-3 md:left-6 z-20 -translate-y-1/2 flex items-start gap-2">
      <button type="button" id="btn-arbiter" class="flex flex-col items-center gap-2 shrink-0 cursor-pointer group" title="Open last judgment dossier">
        ${avatarPlate('arbiter', { size: 'lg' })}
        <div class="text-amber text-[10px] tracking-widest group-hover:underline">ARBITER</div>
        <div class="text-[9px] text-terminal-dim">click · dossier</div>
      </button>
      <div class="pt-4">
        ${speechBubble(opts.speech.arbiter, 'amber', 'left', 'arbiter')}
      </div>
    </div>

    ${opts.showArbiterDossier ? renderArbiterDossier(opts.lastJudgment) : ''}

    <!-- MIDDLE RIGHT: Threat / Environment / facts -->
    <aside class="absolute top-24 right-3 bottom-36 z-20 w-[min(100%,260px)] overflow-y-auto log-scroll">
      <div class="border border-terminal-border bg-terminal-panel/95 p-3 space-y-3">
        <div class="border ${state.activeThreat ? 'border-crimson/60 bg-crimson/10' : 'border-terminal-border'} p-2">
          <div class="text-crimson text-[10px] tracking-widest mb-1">BATTLEFIELD_SIGNS</div>
          ${
            state.activeThreat
              ? `<p class="text-[12px] text-terminal-text font-mono leading-snug">⚠ ${esc(state.activeThreat.label)} (${state.activeThreat.timer})</p>
                 <p class="text-[10px] text-terminal-dim mt-1.5 leading-relaxed">${esc(state.activeThreat.foreshadow)}</p>`
              : `<p class="text-[10px] text-terminal-dim font-mono">Quiet for now. Watch for new marks on the field.</p>`
          }
        </div>
        <div>
          <div class="text-amber text-[10px] tracking-widest mb-1">ENVIRONMENT</div>
          <p class="text-[11px] text-terminal-text font-mono">${esc(state.world.environmentalEvent ?? 'STABLE')}</p>
          <p class="text-[10px] text-terminal-dim mt-1">RANGE ${state.player.position}</p>
        </div>
        <div>
          <div class="text-neon text-[10px] tracking-widest mb-1">GREEN_FACTS</div>
          <ul class="text-[11px] text-neon/80 space-y-1 font-mono">
            ${
              state.ledgers.facts.length
                ? state.ledgers.facts.map((f) => `<li>✔ ${esc(f.replace(/^✔\s*/, ''))}</li>`).join('')
                : '<li class="text-terminal-dim">—</li>'
            }
          </ul>
        </div>
        <div>
          <div class="text-amber text-[10px] tracking-widest mb-1">YELLOW_ASSUMPTIONS</div>
          <ul class="text-[11px] text-amber/80 space-y-1 font-mono">
            ${
              state.ledgers.assumptions.length
                ? state.ledgers.assumptions.map((a) => `<li>? ${esc(a.replace(/^\?\s*/, ''))}</li>`).join('')
                : '<li class="text-terminal-dim">—</li>'
            }
          </ul>
        </div>
        <div>
          <div class="text-terminal-dim text-[10px] tracking-widest mb-1">BATTLEFIELD_RAW</div>
          <p class="text-[11px] font-mono text-terminal-text">${esc(state.world.battlefield.join(' · ') || '—')}</p>
        </div>
      </div>
    </aside>

    <!-- CENTER: Card table -->
    <main class="absolute inset-0 z-10 flex items-center justify-center px-36 md:px-48 pointer-events-none">
      <div class="pointer-events-auto w-full max-w-xl border border-terminal-border/80 bg-terminal-bg/70 p-4 backdrop-blur-sm">
        <div class="flex justify-between items-center mb-3">
          <span class="text-neon text-[10px] tracking-[0.3em]">ARENA_CARDS</span>
          <span class="text-[10px] text-terminal-dim">${cards.length} ACTIVE</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 min-h-[160px]">
          ${
            cards.length === 0
              ? `<div class="col-span-full text-center text-terminal-dim text-xs font-mono py-10">no active cards · shape the arena</div>`
              : cards
                  .map((c) => {
                    const pros = c.pros
                      .map((p) => `<li>+ ${esc(p)}</li>`)
                      .join('');
                    const cons = c.cons
                      .map((n) => `<li>− ${esc(n)}</li>`)
                      .join('');
                    return `
            <div class="card-tile group relative border ${cardTone(c.kind)} bg-terminal-panel min-h-[118px] overflow-hidden">
              <div class="card-face absolute inset-0 p-2 flex flex-col transition-opacity duration-150 group-hover:opacity-0">
                <div class="text-[9px] tracking-widest opacity-70">${c.kind.toUpperCase()}</div>
                <div class="flex-1 flex items-center justify-center py-1">${c.art}</div>
                <div class="text-xs font-semibold leading-tight text-center">${esc(c.label)}</div>
              </div>
              <div class="card-hover absolute inset-0 p-2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-terminal-bg/95 z-10 overflow-y-auto log-scroll">
                <div class="text-[9px] tracking-widest mb-1">${esc(c.label)}</div>
                <div class="text-[9px] text-neon tracking-widest mb-0.5">PRO</div>
                <ul class="text-[9px] leading-snug space-y-0.5 mb-1.5 text-terminal-text">${pros}</ul>
                <div class="text-[9px] text-crimson tracking-widest mb-0.5">CON</div>
                <ul class="text-[9px] leading-snug space-y-0.5 text-terminal-dim">${cons}</ul>
              </div>
            </div>`;
                  })
                  .join('')
          }
        </div>
        ${
          state.winner
            ? `<div class="mt-4 border border-amber bg-amber/10 p-3 text-center">
                <div class="text-amber text-xs tracking-widest mb-1">MATCH_END</div>
                <div class="text-sm mb-2">${state.winner === 'player' ? 'YOU HOLD REALITY' : 'BOSS HOLDS REALITY'}</div>
                <button id="btn-new-duel" class="pointer-events-auto px-3 py-1.5 text-[11px] border border-neon text-neon font-mono">NEW_DUEL</button>
              </div>`
            : ''
        }
      </div>
    </main>

    <!-- BOTTOM RIGHT: Player bubble ABOVE card, pointing down at avatar -->
    <aside class="absolute bottom-24 right-3 z-20 flex flex-col items-end gap-2 w-[min(100%,300px)]" data-speech-zone="player">
      <div class="player-bubble self-end mr-2" data-speech-zone="player">
        ${playerBubble}
      </div>
      <div class="player-card w-full border border-neon/50 bg-terminal-panel/95 p-3 shadow-neon">
        <div class="flex gap-3 items-end flex-row-reverse">
          <button type="button" id="btn-player-avatar" class="player-avatar shrink-0 cursor-pointer group text-right" title="Toggle your speech">
            ${avatarPlate('player', { size: 'md' })}
            <div class="text-[8px] text-terminal-dim mt-1 group-hover:text-neon">click · speech</div>
          </button>
          <div class="min-w-0 flex-1 text-right">
            <div class="text-neon text-xs tracking-widest">${esc(opts.playerName)}</div>
            <div class="text-[10px] text-terminal-dim mb-2">TRAIT ${esc(state.player.hiddenTrait)} · ${state.player.awareness}</div>
            <div class="text-[10px] text-terminal-dim flex justify-between"><span>BODY</span><span>${state.player.body.toFixed(0)}</span></div>
            ${miniBar(state.player.body, 'neon')}
            <div class="text-[10px] text-terminal-dim flex justify-between mt-1"><span>RESOLVE</span><span>${state.player.resolve.toFixed(0)}</span></div>
            ${miniBar(state.player.resolve, 'neon')}
            <div class="mt-2 text-[10px] text-terminal-dim">FX: ${esc(
              [
                state.world.environmentalEvent,
                state.player.awareness !== 'FULL' ? `aware=${state.player.awareness}` : '',
              ]
                .filter(Boolean)
                .join(' · ') || 'none',
            )}</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- BOTTOM MIDDLE: Chat -->
    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-[min(92%,560px)]">
      ${
        opts.error
          ? `<div class="mb-2 border border-crimson bg-crimson/10 px-2 py-1 text-[10px] text-crimson font-mono">${esc(opts.error)}</div>`
          : ''
      }
      <div class="border border-neon/40 bg-terminal-panel/95 p-2 shadow-neon">
        <div class="flex justify-between text-[10px] text-terminal-dim font-mono mb-1">
          <span>> ARGUMENT_INPUT</span>
          <span id="budget-hint">C_b ${COMPLEXITY_BUDGET}</span>
        </div>
        <textarea id="intent-input" name="pf-intent" rows="2" ${NO_FILL} class="w-full bg-terminal-bg border border-terminal-border text-neon text-xs p-2 font-mono focus:outline-none focus:border-neon resize-none" placeholder="Declare intent — not outcome…" ${opts.busy || !!state.winner ? 'disabled' : ''}>${esc(opts.clearDraft ? '' : opts.draft)}</textarea>
        <div class="mt-1 flex justify-between items-center gap-2">
          <span class="text-[10px] text-terminal-dim font-mono truncate">${esc(opts.statusLine)}</span>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="btn-help" class="px-2.5 py-1.5 text-[10px] border border-amber text-amber font-mono tracking-widest disabled:opacity-40" ${opts.busy || !!state.winner || opts.helpsLeft <= 0 ? 'disabled' : ''} title="Spend 1 HELP for a suggested Argument">
              HELP ${opts.helpsLeft}/2
            </button>
            <button id="btn-submit" class="px-4 py-1.5 text-[11px] border border-neon text-neon bg-neon/10 font-mono tracking-widest disabled:opacity-40" ${opts.busy || !!state.winner ? 'disabled' : ''}>
              ${opts.busy ? '…' : 'COMMIT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export function renderApp(
  root: HTMLElement,
  state: GameState,
  opts: {
    phase: AppPhase;
    api: StoredApiConfig;
    bossPick: BossPick;
    playerName: string;
    bossRevealed: boolean;
    useMock: boolean;
    arbiterReady: boolean;
    statusHint: string;
    busy: boolean;
    speech: SpeechState;
    speechOpen: SpeechOpen;
    statusLine: string;
    lastJudgmentMs?: number;
    error?: string;
    showArbiterDossier: boolean;
    lastJudgment: LastJudgmentView | null;
    clearDraft?: boolean;
    /** When set, fills the intent box (starter chip / HELP). */
    draftSeed?: string;
    showTips: boolean;
    starterIntents: string[];
    helpsLeft: number;
  },
  cb: UiCallbacks,
): void {
  const draft =
    opts.draftSeed != null
      ? opts.draftSeed
      : opts.clearDraft
        ? ''
        : ((root.querySelector('#intent-input') as HTMLTextAreaElement | null)
            ?.value ?? '');

  if (opts.phase === 'setup') {
    root.innerHTML = renderSetup({
      api: opts.api,
      bossPick: opts.bossPick,
      playerName: opts.playerName,
      useMock: opts.useMock,
      arbiterReady: opts.arbiterReady,
      statusHint: opts.statusHint,
      error: opts.error,
    });
  } else {
    root.innerHTML = renderArena(state, {
      playerName: opts.playerName,
      bossRevealed: opts.bossRevealed,
      speech: opts.speech,
      speechOpen: opts.speechOpen,
      busy: opts.busy,
      statusLine: opts.statusLine,
      lastJudgmentMs: opts.lastJudgmentMs,
      error: opts.error,
      draft,
      clearDraft: opts.clearDraft,
      showArbiterDossier: opts.showArbiterDossier,
      lastJudgment: opts.lastJudgment,
      showTips: opts.showTips,
      starterIntents: opts.starterIntents,
      helpsLeft: opts.helpsLeft,
    });
  }

  // Setup bindings
  root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () =>
      cb.onSelectPreset(btn.dataset.preset as ApiPresetId),
    );
  });
  const syncApiField = (id: string, key: keyof StoredApiConfig) => {
    const el = root.querySelector(`#${id}`) as HTMLInputElement | null;
    el?.addEventListener('change', () =>
      cb.onApiConfigChange({ [key]: el.value }),
    );
    el?.addEventListener('blur', () =>
      cb.onApiConfigChange({ [key]: el.value }),
    );
  };
  syncApiField('api-base', 'baseUrl');
  syncApiField('api-model', 'model');
  syncApiField('api-key', 'apiKey');
  root.querySelector('#btn-test-api')?.addEventListener('click', () => cb.onTestApi());
  root.querySelectorAll<HTMLButtonElement>('[data-boss]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.boss!;
      cb.onSelectBoss(v === 'random' ? 'random' : (v as BossArchetype));
    });
  });
  const mock = root.querySelector('#mock-toggle') as HTMLInputElement | null;
  mock?.addEventListener('change', () => cb.onUseMockToggle(mock.checked));
  const nameInput = root.querySelector('#player-name') as HTMLInputElement | null;
  nameInput?.addEventListener('change', () => cb.onPlayerName(nameInput.value.trim() || 'OPERATOR'));
  nameInput?.addEventListener('blur', () => cb.onPlayerName(nameInput.value.trim() || 'OPERATOR'));
  root.querySelector('#btn-start')?.addEventListener('click', () => cb.onStartGame());

  // Arena bindings
  root.querySelector('#btn-new-duel')?.addEventListener('click', () => cb.onNewDuel());
  root.querySelector('#btn-arbiter')?.addEventListener('click', () => cb.onToggleArbiterDossier());
  root.querySelector('#btn-close-dossier')?.addEventListener('click', () => cb.onCloseArbiterDossier());
  root.querySelector('#arbiter-dossier')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cb.onCloseArbiterDossier();
  });
  root.querySelector('#btn-boss-avatar')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cb.onToggleBossSpeech();
  });
  root.querySelector('#btn-player-avatar')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cb.onTogglePlayerSpeech();
  });
  root.querySelector('#btn-tips')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cb.onToggleTips();
  });
  root.querySelector('#btn-help')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cb.onRequestHelp();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-starter-intent]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.dataset.starterIntent ?? '';
      if (text) cb.onPickStarterIntent(text);
    });
  });
  root.querySelector('#arena-root')?.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (!t) return;
    if (t.closest('[data-speech-zone]')) return;
    if (t.closest('#arbiter-dossier, #btn-arbiter, #btn-tips, #tips-panel')) return;
    cb.onCloseCharacterSpeech();
  });
  const input = root.querySelector('#intent-input') as HTMLTextAreaElement | null;
  const budgetHint = root.querySelector('#budget-hint');
  const updateBudget = () => {
    if (!input || !budgetHint) return;
    const c = evaluateComplexity(input.value);
    budgetHint.textContent = `C_b ${c.total}/${COMPLEXITY_BUDGET}${c.overBudget ? ' OVER' : ''}`;
  };
  input?.addEventListener('input', updateBudget);
  updateBudget();
  root.querySelector('#btn-submit')?.addEventListener('click', () => {
    if (!input?.value.trim()) return;
    cb.onSubmitIntent(input.value.trim());
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (input.value.trim()) cb.onSubmitIntent(input.value.trim());
    }
  });
}
