import type { CompactGameSnapshot } from '../types';
import {
  formatPersonalityForPrompt,
  getBossPersonality,
} from '../engine/bossPersonalities';

const EXAMPLE = `{
  "bossIntent": "I draw a compact plasma cutter and begin slicing through the iron railing supports.",
  "playerPlausibility": 0.55,
  "bossPlausibility": 0.82,
  "playerOutcome": "partial",
  "bossOutcome": "success",
  "targetAwarenessShift": "none",
  "positionShift": "closer",
  "suggestedFacts": [],
  "battlefieldAdd": ["Damaged Railing"],
  "judgmentNarrative": "• Cutter bites the iron\\n• Sparks spit onto wet stone\\n• The railing starts to sag",
  "damageWhy": "A hot spark jumps your sleeve while you were still testing the pebble — their cut connected; your probe did not stop it.",
  "fieldSigns": ["⚠ Damaged Railing (3)", "The railing groans. Rust flakes fall as the metal begins to bend."],
  "activeThreat": { "label": "Damaged Railing", "foreshadow": "The railing groans. Rust flakes fall as the metal begins to bend.", "timer": 3 },
  "clearThreat": false,
  "bossReaction": "Draws the cutter.\\nKneels at the rail.\\nBlue light. Sparks."
}`;

export function buildJudgmentSystemPrompt(): string {
  return `You are the Arbiter of PromptForge — an emergent tactics arena where language is the controller.
Primary objective each turn: CREATE OR SOLVE A DILEMMA by changing the battlefield.
Not: calculate damage. Not: lecture the player.
Reply with ONE JSON object only. No markdown fences.

FLOW:
1) Invent bossIntent (simultaneous commitment) with METHOD FLAVOR.
2) Judge sparsely.
3) Show field signs the player can discover — never solve the puzzle for them.

BOSS INTENT:
- Advances that boss's long-term goal / signature plan.
- MUST name WITH WHAT (blade, plasma cutter, chalk, heat glove, both hands, charge…).
  Bad: "I cut the railing."
  Good: "I draw a short blade and begin sawing through the iron railing."
- FORBIDDEN: observation-only. FORBIDDEN: soft-repeating recentBossIntents — escalate.
- Plain English. 1–2 sentences. Intent form, never guaranteed damage numbers.

JUDGMENT / FIELD:
- fieldSigns: 2–4 sensory FACTS only (⚠ Label (N), groans, sparks, smoke…).
- NEVER write "Choose between…", "You should…", "Options:…". Trust the player.
- damageWhy: one narrative cause ("collapsing beam clips your shoulder"), not a lecture.
- bossReaction: what the player SEES. Short beats. Let them infer.
- judgmentNarrative: ≤5 short "• " bullets.
- Do NOT invent final Body/Resolve numbers.

Required keys:
bossIntent, playerPlausibility, bossPlausibility, playerOutcome, bossOutcome,
targetAwarenessShift, positionShift, suggestedFacts, battlefieldAdd,
judgmentNarrative, damageWhy, fieldSigns, activeThreat, clearThreat, bossReaction

activeThreat: { label, foreshadow, timer } or null
clearThreat: true only if the player clearly interrupted the prior field problem

Example:
${EXAMPLE}`;
}

export function buildJudgmentUserPrompt(snapshot: CompactGameSnapshot): string {
  const full = getBossPersonality(snapshot.boss.archetype);
  const p = snapshot.boss.personality ?? {
    name: full.name,
    trait: full.trait,
    goal: full.goal,
    motive: full.motive,
    voice: full.voice,
    toolkit: full.toolkit,
    tactics: full.tactics,
    taboos: full.taboos,
    sampleMoves: full.sampleMoves,
  };

  const personalityBlock = formatPersonalityForPrompt({
    id: snapshot.boss.archetype,
    ...p,
    goal: p.goal ?? full.goal,
    toolkit: p.toolkit ?? full.toolkit,
  });

  const bossIntentBlock = snapshot.generateBossIntent
    ? `Boss Argument: [INVENT — include TOOL/METHOD. Advance their goal. Observation-only invalid.]`
    : `Boss Argument [${snapshot.bossIntent?.category ?? 'ATTACK'}]: ${snapshot.bossIntent?.raw ?? '(none)'}`;

  const threatBlock = snapshot.activeThreat
    ? `FIELD PROBLEM: ⚠ ${snapshot.activeThreat.label} (${snapshot.activeThreat.timer}) — ${snapshot.activeThreat.foreshadow}`
    : 'FIELD PROBLEM: none yet — create a visible one.';

  const recent = snapshot.recentBossIntents?.length
    ? snapshot.recentBossIntents.map((x) => `• ${x}`).join('\n')
    : '• (none yet)';

  return `Round ${snapshot.round}. Tension=${snapshot.tension}. Initiative=${snapshot.initiative}. P_r=${snapshot.realityPressure.toFixed(2)}.
Battlefield: ${snapshot.battlefield.join('; ') || 'none'}
Event: ${snapshot.environmentalEvent ?? 'none'}
Green facts: ${snapshot.facts.slice(-6).join('; ') || 'none'}
Yellow assumptions: ${snapshot.assumptions.slice(-4).join('; ') || 'none'}
${threatBlock}

Recent boss intents (escalate the PLAN — do not soft-repeat):
${recent}

Player — body ${snapshot.player.body}, resolve ${snapshot.player.resolve}, awareness ${snapshot.player.awareness}, position ${snapshot.player.position}
Player Argument [${snapshot.playerIntent.category}]: ${snapshot.playerIntent.raw}

=== BOSS ===
${personalityBlock}
Agenda progress: ${snapshot.boss.agendaProgress}
Boss — body ${snapshot.boss.body}, resolve ${snapshot.boss.resolve}, awareness ${snapshot.boss.awareness}, position ${snapshot.boss.position}
${bossIntentBlock}

Invent flavored bossIntent, judge sparsely, return fieldSigns (facts only — no advice). JSON only.`;
}
