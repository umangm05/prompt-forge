import './style.css';
import {
  applyPreset,
  configLooksReady,
  loadApiConfig,
  saveApiConfig,
  type ApiPresetId,
  type StoredApiConfig,
} from './arbiter/apiConfig';
import { ArbiterClient } from './arbiter/arbiterClient';
import {
  HELP_ASSISTS_PER_DUEL,
  JUDGMENT_LATENCY_TARGET_MS,
} from './config/gameConfig';
import {
  appendMatchLog,
  beginRound,
  buildBossParsed,
  buildSnapshot,
  composeJudgmentDocument,
  createInitialState,
  defaultBossReaction,
  enrichMockStory,
  parsePlayerIntent,
  resolveBossParsed,
  resolveWithJudgment,
  resolveWithMock,
} from './engine/gameLoop';
import type { ArbiterJudgment, BossArchetype, GameState, ParsedIntent } from './types';
import type {
  AppPhase,
  BossPick,
  LastJudgmentView,
  SpeechOpen,
  SpeechState,
} from './ui/render';
import { renderApp } from './ui/render';
import { randomBoss } from './ui/bossMeta';
import { mockHelpIntent, pickStarterIntents } from './ui/tips';
import { clearTypewriters, runTypewriters } from './ui/typewriter';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app missing');

const JUDGE_TIMEOUT_MS = 45_000;
const arbiter = new ArbiterClient();

let phase: AppPhase = 'setup';
let state: GameState = createInitialState('lawyer');
let apiConfig: StoredApiConfig = loadApiConfig();
let bossPick: BossPick = 'random';
let playerName = 'OPERATOR';
let bossRevealed = false;
let useMock = false;
let statusHint =
  'Pick a provider, paste your API key, optionally Test Connection.';
let busy = false;
let lastJudgmentMs: number | undefined;
let error: string | undefined;
let statusLine = 'awaiting argument';
let speech: SpeechState = {
  arbiter: '',
  boss: '',
  player: '',
  phase: 'idle',
};
let speechOpen: SpeechOpen = { boss: false, player: false };
let showArbiterDossier = false;
let lastJudgment: LastJudgmentView | null = null;
let clearDraft = false;
let draftSeed: string | undefined;
let showTips = true;
let starterIntents: string[] = [];
let helpsLeft = HELP_ASSISTS_PER_DUEL;

function syncArbiterConfig(): void {
  saveApiConfig(apiConfig);
  arbiter.configure(apiConfig);
}

function arbiterReady(): boolean {
  return !useMock && arbiter.isReady();
}

function paint(opts?: { runTyping?: boolean }): void {
  clearTypewriters();

  renderApp(
    app!,
    state,
    {
      phase,
      api: apiConfig,
      bossPick,
      playerName,
      bossRevealed,
      useMock,
      arbiterReady: arbiterReady(),
      statusHint,
      busy,
      speech,
      speechOpen,
      statusLine,
      lastJudgmentMs,
      error,
      showArbiterDossier,
      lastJudgment,
      clearDraft,
      draftSeed,
      showTips,
      starterIntents,
      helpsLeft,
    },
    {
      onSelectPreset: (preset: ApiPresetId) => {
        apiConfig = applyPreset(preset, apiConfig);
        useMock = false;
        syncArbiterConfig();
        statusHint = `${preset.toUpperCase()} selected. Paste key if needed, then Test Connection.`;
        paint({ runTyping: false });
      },
      onApiConfigChange: (partial) => {
        apiConfig = { ...apiConfig, ...partial };
        useMock = false;
        syncArbiterConfig();
        statusHint = configLooksReady(apiConfig)
          ? 'Config looks ready. Test Connection or Enter Arena.'
          : 'Add base URL, model, and API key (Ollama key optional).';
        paint({ runTyping: false });
      },
      onTestApi: () => void testApi(),
      onSelectBoss: (pick) => {
        bossPick = pick;
        paint({ runTyping: false });
      },
      onPlayerName: (name) => {
        playerName = name.slice(0, 18) || 'OPERATOR';
      },
      onUseMockToggle: (v) => {
        useMock = v;
        statusHint = v
          ? 'Mock Arbiter — offline, deterministic judgments.'
          : configLooksReady(apiConfig)
            ? 'API Arbiter ready.'
            : 'Configure API or keep Mock enabled.';
        paint({ runTyping: false });
      },
      onStartGame: () => startGame(),
      onSubmitIntent: (raw) => void runTurn(raw),
      onNewDuel: () => {
        phase = 'setup';
        speech = { arbiter: '', boss: '', player: '', phase: 'idle' };
        speechOpen = { boss: false, player: false };
        lastJudgmentMs = undefined;
        lastJudgment = null;
        showArbiterDossier = false;
        clearDraft = true;
        draftSeed = undefined;
        showTips = true;
        helpsLeft = HELP_ASSISTS_PER_DUEL;
        starterIntents = [];
        error = undefined;
        bossRevealed = bossPick !== 'random';
        statusLine = 'awaiting argument';
        paint({ runTyping: false });
        clearDraft = false;
      },
      onToggleArbiterDossier: () => {
        showArbiterDossier = !showArbiterDossier;
        if (showArbiterDossier) {
          speechOpen = { boss: false, player: false };
        } else if (speech.boss.trim()) {
          speechOpen = { boss: true, player: false };
        }
        paint();
      },
      onCloseArbiterDossier: () => {
        showArbiterDossier = false;
        // After judgment, surface the boss reaction without requiring an avatar click.
        if (speech.boss.trim()) {
          speechOpen = { boss: true, player: false };
        }
        paint();
      },
      onToggleBossSpeech: () => {
        if (!speech.boss.trim()) return;
        speechOpen = { boss: !speechOpen.boss, player: false };
        paint();
      },
      onTogglePlayerSpeech: () => {
        if (!speech.player.trim()) return;
        speechOpen = { player: !speechOpen.player, boss: false };
        paint();
      },
      onCloseCharacterSpeech: () => {
        if (!speechOpen.boss && !speechOpen.player) return;
        speechOpen = { boss: false, player: false };
        paint({ runTyping: false });
      },
      onToggleTips: () => {
        showTips = !showTips;
        paint({ runTyping: false });
      },
      onPickStarterIntent: (text) => {
        draftSeed = text;
        showTips = false;
        paint({ runTyping: false });
        draftSeed = undefined;
      },
      onRequestHelp: () => void requestHelp(),
    },
  );

  if (clearDraft) clearDraft = false;
  if (draftSeed != null) draftSeed = undefined;

  // Type speech even if dossier is open — bubbles stay visible underneath.
  if (opts?.runTyping !== false && phase === 'arena') {
    runTypewriters(app!, { cps: 48 });
  }
}

function setSpeech(
  next: Omit<SpeechState, 'phase'> & { phase: SpeechState['phase'] },
): void {
  speech = next;
}

async function requestHelp(): Promise<void> {
  if (busy || state.winner || phase !== 'arena' || helpsLeft <= 0) return;
  busy = true;
  error = undefined;
  statusLine = 'asking for HELP…';
  paint({ runTyping: false });
  try {
    let suggestion: string;
    if (useMock || !arbiter.isReady()) {
      await new Promise((r) => setTimeout(r, 200));
      suggestion = mockHelpIntent(state);
    } else {
      const snapshot = buildSnapshot(
        state,
        parsePlayerIntent(state, 'I look for an opening.'),
        { generateBossIntent: true },
      );
      suggestion = await withTimeout(
        arbiter.suggestIntent(snapshot),
        JUDGE_TIMEOUT_MS,
        'HELP suggestion',
      );
    }
    helpsLeft -= 1;
    draftSeed = suggestion;
    showTips = false;
    statusLine = `HELP used · ${helpsLeft} left`;
  } catch (e) {
    error = e instanceof Error ? e.message : 'HELP failed';
    statusLine = 'help error';
  }
  busy = false;
  paint({ runTyping: false });
}

async function testApi(): Promise<void> {
  syncArbiterConfig();
  if (!configLooksReady(apiConfig)) {
    error = 'Add API key (unless Ollama) plus base URL and model.';
    paint({ runTyping: false });
    return;
  }
  statusHint = 'Testing Arbiter API…';
  error = undefined;
  paint({ runTyping: false });
  try {
    const msg = await withTimeout(arbiter.ping(), JUDGE_TIMEOUT_MS, 'API test');
    statusHint = `Connected — ${msg}`;
    error = undefined;
  } catch (e) {
    error = e instanceof Error ? e.message : 'API test failed';
    statusHint = 'Connection failed. Check key / model / base URL.';
  }
  paint({ runTyping: false });
}

function startGame(): void {
  syncArbiterConfig();
  if (!useMock && !arbiter.isReady()) {
    error = 'Configure API (or enable Mock) before entering the arena.';
    paint({ runTyping: false });
    return;
  }

  const arch: BossArchetype =
    bossPick === 'random' ? randomBoss() : bossPick;
  bossRevealed = bossPick !== 'random';
  state = createInitialState(arch);
  state.player.name = playerName;
  phase = 'arena';
  error = undefined;
  lastJudgment = null;
  showArbiterDossier = false;
  speechOpen = { boss: false, player: false };
  clearDraft = true;
  draftSeed = undefined;
  showTips = true;
  helpsLeft = HELP_ASSISTS_PER_DUEL;
  starterIntents = pickStarterIntents(state, 3);
  statusLine = useMock
    ? 'mock arbiter online'
    : `api arbiter · ${apiConfig.model} · target <${JUDGMENT_LATENCY_TARGET_MS}ms`;
  setSpeech({
    arbiter: 'Ready.',
    boss: bossRevealed ? 'They arrive.' : '?',
    player: '',
    phase: 'verdict',
  });
  paint({ runTyping: false });

  if (!bossRevealed) {
    setTimeout(() => {
      bossRevealed = true;
      setSpeech({
        player: '',
        boss: 'They arrive.',
        arbiter: 'Begin.',
        phase: 'verdict',
      });
      paint({ runTyping: false });
    }, 900);
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

function buildRecap(
  before: GameState,
  judgment: ArbiterJudgment,
  verdict: Awaited<ReturnType<typeof resolveWithMock>>['verdict'],
  next: GameState,
  playerRaw: string,
  bossRaw: string,
): { document: string; bossLine: string } {
  const story =
    judgment.judgmentNarrative.trim() ||
    enrichMockStory(
      playerRaw,
      bossRaw,
      verdict,
      before.world.battlefield,
    );
  const document = composeJudgmentDocument({
    story,
    before,
    after: next,
    verdict,
    damageWhy: judgment.damageWhy || verdict.damageWhyPlayer,
    fieldSigns: judgment.fieldSigns,
  });
  // Prefer short observable beat; fall back to the boss Argument itself.
  const bossLine =
    judgment.bossReaction.trim() ||
    judgment.bossIntent.trim() ||
    defaultBossReaction(verdict, next.boss);
  return { document, bossLine };
}

async function runTurn(raw: string): Promise<void> {
  if (busy || state.winner || phase !== 'arena') return;
  if (!useMock && !arbiter.isReady()) {
    error = 'Arbiter API not ready.';
    paint({ runTyping: false });
    return;
  }

  busy = true;
  error = undefined;
  showArbiterDossier = false;
  speechOpen = { boss: false, player: false };
  statusLine = 'verifying…';

  // Store speech text; bubbles stay closed until avatar click
  setSpeech({
    player: '',
    boss: '',
    arbiter: 'Weighing…',
    phase: 'intent',
  });

  const playerParsed = parsePlayerIntent(state, raw);
  if (playerParsed.rejected) {
    busy = false;
    error = playerParsed.rejected;
    statusLine = 'rejected';
    paint({ runTyping: false });
    return;
  }

  const before = state;
  state = beginRound(state);
  const roundNum = state.round;

  paint();

  try {
    let judgment: ArbiterJudgment;
    let verdict: Awaited<ReturnType<typeof resolveWithMock>>['verdict'];
    let next: GameState;
    let bossParsed: ParsedIntent;
    const t0 = performance.now();

    if (useMock || !arbiter.isReady()) {
      // Offline: personality-flavored scripted intent + mock judgment
      bossParsed = buildBossParsed(state);
      await new Promise((r) => setTimeout(r, 350));
      const result = resolveWithMock(state, playerParsed, bossParsed);
      judgment = result.judgment;
      verdict = result.verdict;
      next = result.next;
      lastJudgmentMs = Math.round(performance.now() - t0);
    } else {
      // API: send personality + player intent; boss Argument comes back in same JSON
      statusLine = `calling ${apiConfig.model}…`;
      paint({ runTyping: false });
      const snapshot = buildSnapshot(state, playerParsed, {
        generateBossIntent: true,
      });
      judgment = await withTimeout(
        arbiter.judge(snapshot),
        JUDGE_TIMEOUT_MS,
        'Arbiter judgment',
      );
      lastJudgmentMs = Math.round(performance.now() - t0);
      bossParsed = resolveBossParsed(state, judgment.bossIntent);
      const resolved = resolveWithJudgment(
        state,
        judgment,
        playerParsed,
        bossParsed,
      );
      verdict = resolved.verdict;
      next = resolved.next;
    }

    const { document, bossLine } = buildRecap(
      before,
      judgment,
      verdict,
      next,
      playerParsed.intent.raw,
      bossParsed.intent.raw,
    );

    const arbiterText = playerParsed.scaledDown
      ? `[scaled]\n\n${document}`
      : document;

    state = appendMatchLog(next, {
      round: roundNum,
      playerPrompt: playerParsed.intent.raw,
      bossPrompt: bossParsed.intent.raw,
      arbiterText,
      playerOutcome: verdict.playerOutcome,
      bossOutcome: verdict.bossOutcome,
      judgmentMs: lastJudgmentMs,
    });

    lastJudgment = {
      round: roundNum,
      arbiterText,
      playerOutcome: verdict.playerOutcome,
      bossOutcome: verdict.bossOutcome,
      playerPrompt: playerParsed.intent.raw,
      bossPrompt: bossParsed.intent.raw,
    };

    // Speech ready; boss bubble auto-opens when the dossier is closed.
    setSpeech({
      player: verdict.playerOutcome.toUpperCase(),
      boss: bossLine,
      arbiter: `YOU ${verdict.playerOutcome.toUpperCase()} · BOSS ${verdict.bossOutcome.toUpperCase()}`,
      phase: 'verdict',
    });
    speechOpen = { boss: false, player: false };

    clearDraft = true;
    showArbiterDossier = true;
    starterIntents = pickStarterIntents(next, 3);
    statusLine =
      lastJudgmentMs != null
        ? `resolved · ${lastJudgmentMs}ms · ${verdict.playerOutcome}/${verdict.bossOutcome}`
        : 'resolved';
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : 'Arbiter API failed. Check key/model or use Mock.';
    statusLine = 'error';
    speech = { ...speech, phase: 'idle' };
  }

  busy = false;
  paint();
}

syncArbiterConfig();
if (configLooksReady(apiConfig)) {
  statusHint = 'Saved API config loaded. Test Connection or Enter Arena.';
}
paint({ runTyping: false });

declare global {
  interface Window {
    __promptForge?: {
      getState: () => GameState;
      mockTurn: (raw: string) => void;
    };
  }
}

window.__promptForge = {
  getState: () => state,
  mockTurn: (raw: string) => {
    useMock = true;
    if (phase !== 'arena') startGame();
    void runTurn(raw);
  },
};
