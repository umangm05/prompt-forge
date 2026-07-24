import type {
  BossAgendaState,
  BossArchetype,
  GameState,
  Intent,
} from '../types';
import { getBossPersonality } from './bossPersonalities';
import { mockDilemmaIntent } from './threats';
import { classifyCategory, classifyTarget } from './inputParser';

function makeIntent(raw: string): Intent {
  return {
    raw,
    category: classifyCategory(raw),
    target: classifyTarget(raw),
  };
}

export function createBossAgenda(archetype: BossArchetype): BossAgendaState {
  return { archetype, progress: 0, notes: [] };
}

/** Offline / fallback — always a dilemma move, never empty observation. */
export function generateBossIntent(state: GameState): Intent {
  return makeIntent(mockDilemmaIntent(state));
}

export function updateBossAgenda(
  agenda: BossAgendaState,
  state: GameState,
  bossOutcome: string,
): BossAgendaState {
  const notes = [...agenda.notes];
  let progress = agenda.progress;

  if (
    agenda.archetype === 'scientist' &&
    bossOutcome !== 'backfire' &&
    bossOutcome !== 'failure'
  ) {
    if (state.boss.body > 40) {
      progress += 1;
      notes.push(`Pressure tag #${progress}`);
    }
  }
  if (
    agenda.archetype === 'lawyer' &&
    state.ledgers.facts.length > agenda.progress
  ) {
    progress = state.ledgers.facts.length;
  }
  if (state.activeThreat) {
    progress = Math.min(5, progress + 1);
    notes.push(`Threat: ${state.activeThreat.label}`);
  }

  return { ...agenda, progress, notes: notes.slice(-8) };
}

export const BOSS_LABELS: Record<BossArchetype, string> = {
  lawyer: getBossPersonality('lawyer').name,
  scientist: getBossPersonality('scientist').name,
  poet: getBossPersonality('poet').name,
  historian: getBossPersonality('historian').name,
  trickster: getBossPersonality('trickster').name,
  child: getBossPersonality('child').name,
  minimalist: getBossPersonality('minimalist').name,
};
