import type { CompactGameSnapshot } from '../types';
import {
  formatPersonalityForPrompt,
  getBossPersonality,
} from '../engine/bossPersonalities';

const EXAMPLE = `{
  "bossIntent": "",
  "playerPlausibility": 0.55,
  "bossPlausibility": 0.82,
  "playerOutcome": "partial",
  "bossOutcome": "success",
  "playerRelation": "stall",
  "bossRelation": "advance",
  "targetAwarenessShift": "none",
  "awarenessTarget": "boss",
  "positionShift": "closer",
  "bossPositionShift": "none",
  "suggestedFacts": [],
  "battlefieldAdd": ["Damaged Railing"],
  "battlefieldRemove": [],
  "causalEvents": [
    {"actor":"boss","method":"plasma cutter","target":"Iron Railings","fromState":"intact","toState":"sagging","relation":"advance","narrative":"Cutter bites the iron; the rail starts to sag."},
    {"actor":"player","method":"pebble probe","target":"trip line","fromState":"unknown","toState":"tested","relation":"stall","narrative":"Your probe learns a limit but does not stop the cut."}
  ],
  "discoveries": [],
  "observableSignals": [{"kind":"setup_focus","description":"Player tests the field instead of finishing.","strength":0.6}],
  "judgmentNarrative": "• Cutter bites the iron\\n• Sparks spit onto wet stone\\n• The railing starts to sag",
  "damageWhy": "A hot spark jumps your sleeve while you were still testing the pebble — their cut connected; your probe did not stop it.",
  "fieldSigns": ["⚠ Damaged Railing (3)", "The railing groans. Rust flakes fall as the metal begins to bend."],
  "activeThreat": { "label": "Damaged Railing", "foreshadow": "The railing groans. Rust flakes fall as the metal begins to bend.", "timer": 3, "purpose": "Collapse a support", "payoff": "Support fails into your lane" },
  "clearThreat": false,
  "threadTransferTo": null,
  "signatureMomentId": null,
  "emotionalBeat": "",
  "bossReaction": "Draws the cutter.\\nKneels at the rail.\\nBlue light. Sparks."
}`;

export function buildJudgmentSystemPrompt(): string {
  return `You are the Arbiter of PromptForge — an emergent tactics arena where language is the controller.
Primary objective each turn: Advance the tactical conversation.Every turn should either:
• change control
• change understanding
• change pressure
• or permanently change the battlefield.
If none of these occur,
the turn failed.

Players should leave the turn with a better mental model of the battle than they had before.
If the player's understanding did not evolve, the turn is incomplete, even if the battlefield changed.

Not: calculate damage. Not: lecture the player. Not: invent a new boss plan after reading the player.
Reply with ONE JSON object only. No markdown fences.

CRITICAL FLOW:
1) The boss Argument is ALREADY COMMITTED (see committedBossIntent). Copy it into bossIntent unchanged.
2) Judge the collision of intentions. Determine which assumptions survived. Determine which assumptions were disproven. Determine whose plan advanced. Do not merely compare actions.
3) Emit causalEvents, discoveries (if any experiment), observableSignals, fieldSigns.
4) Do NOT invent a cleverer boss counter that uses private knowledge of the player's aim.

BOSS INTENT:
- bossIntent MUST equal committedBossIntent (same words). Empty invent is forbidden.
- The boss already chose with method flavor before this call.
- Every committed action should express personality. If another boss with different personality could perform the same action, rewrite it. The action should only make sense for THIS boss.

DISCOVERY:
A discovery is durable knowledge. It must permanently answer one tactical question.
Examples:
✓ Water conducts sound farther than expected.
✓ Banner location matters more than the cloth.
✓ Glass reflections reveal movement.
✓ The ritual ignores floating objects.
Bad discoveries:
✗ Water ripples.
✗ Nothing obvious happens.
✗ The area feels strange.

Avoid introducing generic combat modifiers such as:
Smoke
Dust
Wind
Noise
Darkness
unless they are central to
the boss identity,
terrain,
or tactical thread.
Generic modifiers are a last resort.

JUDGMENT / FIELD:
- fieldSigns: 2–4 sensory FACTS only (⚠ Label (N), groans, sparks, smoke…).
- NEVER write "Choose between…", "You should…", "Options:…". Trust the player.
- damageWhy: one narrative cause ("collapsing beam clips your shoulder"), not a lecture.
- bossReaction: bossReaction should reveal intent. The player should infer what the boss wants, not merely what it did. Good: The boss repeatedly checks the planted banner before extending the storm. Bad: Wind grows stronger.
- judgmentNarrative: ≤5 short "• " bullets answering: what changed, who caused it, what pressure exists.
- clearThreat=true ONLY if the player causally broke/reversed/transferred the thread — not for probes or keyword mentions.
- Investigations MUST return a discoveries[] entry (even "does not react").
- playerRelation / bossRelation: advance|stall|break|reverse|transfer|none
- Do NOT invent final Body/Resolve numbers.
- Prefer success/failure/backfire when earned; do not default everything to partial.
- If a signature tell matches a committed signature moment, set signatureMomentId.

Before introducing any new battlefield element ask:
Can the committed boss action instead exploit:
- existing terrain
- existing field elements
- world omen
- player-created objects
- previous discoveries
If yes,
prefer that.
Only introduce a new field element if none of the above naturally support the commitment.

Required keys:
bossIntent, playerPlausibility, bossPlausibility, playerOutcome, bossOutcome,
playerRelation, bossRelation, targetAwarenessShift, awarenessTarget, positionShift, bossPositionShift,
suggestedFacts, battlefieldAdd, battlefieldRemove, causalEvents, discoveries, observableSignals,
judgmentNarrative, damageWhy, fieldSigns, activeThreat, clearThreat, threadTransferTo,
signatureMomentId, emotionalBeat, bossReaction

activeThreat: { label, foreshadow, timer, purpose, payoff } or null

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
    biases: full.biases,
    obsessions: full.obsessions,
    prideRule: full.prideRule,
    fear: full.fear,
    habit: full.habit,
    blindSpots: full.blindSpots,
    breakingPoint: full.breakingPoint,
    signatureMoments: full.signatureMoments,
  };

  const personalityBlock = formatPersonalityForPrompt({
    ...full,
    ...p,
    id: snapshot.boss.archetype,
    goal: p.goal ?? full.goal,
    toolkit: p.toolkit ?? full.toolkit,
    biases: p.biases ?? full.biases,
    obsessions: p.obsessions ?? full.obsessions,
    prideRule: p.prideRule ?? full.prideRule,
    fear: p.fear ?? full.fear,
    habit: p.habit ?? full.habit,
    blindSpots: p.blindSpots ?? full.blindSpots,
    breakingPoint: p.breakingPoint ?? full.breakingPoint,
    definingFlaw: snapshot.boss.definingFlaw ?? full.definingFlaw,
    riskAppetite: full.riskAppetite,
    signatureMoments: p.signatureMoments ?? full.signatureMoments,
    characteristicTemptation: full.characteristicTemptation,
  });

  const committed =
    snapshot.committedBossIntent?.raw ??
    snapshot.bossIntent?.raw ??
    '(missing commitment)';

  const threatBlock = snapshot.tacticalThread
    ? `THREAD: ⚠ ${snapshot.tacticalThread.label} (${snapshot.tacticalThread.timer}) [${snapshot.tacticalThread.status}] — ${snapshot.tacticalThread.foreshadow}
Purpose: ${snapshot.tacticalThread.purpose}
Payoff: ${snapshot.tacticalThread.payoff}`
    : snapshot.activeThreat
      ? `FIELD PROBLEM: ⚠ ${snapshot.activeThreat.label} (${snapshot.activeThreat.timer}) — ${snapshot.activeThreat.foreshadow}`
      : 'THREAD: none yet — if the committed boss action creates one, set activeThreat.';

  const fieldBlock = snapshot.fieldElements?.length
    ? snapshot.fieldElements
        .map(
          (e) =>
            `• ${e.name} [${e.condition}] known=${e.knownProperties.join('/') || '—'} scars=${e.scars.join(';') || '—'}`,
        )
        .join('\n')
    : snapshot.battlefield.map((b) => `• ${b}`).join('\n');

  const recent = snapshot.recentBossIntents?.length
    ? snapshot.recentBossIntents.map((x) => `• ${x}`).join('\n')
    : '• (none yet)';

  return `Round ${snapshot.round}. Tempo=${snapshot.tempo.beat} (tension ${snapshot.tempo.tension.toFixed(2)}). TensionPhase=${snapshot.tension}. Initiative=${snapshot.initiative}. P_r=${snapshot.realityPressure.toFixed(2)}.
Boss posture: ${snapshot.boss.posture}
Omen: ${snapshot.omen ?? 'none'}
Last transformation: ${snapshot.lastTransformation ?? 'none'}
Temptation (fiction only): ${snapshot.temptationForeshadow ?? 'none'}

Named field:
${fieldBlock}

Event: ${snapshot.environmentalEvent ?? 'none'}
Green facts: ${snapshot.facts.slice(-6).join('; ') || 'none'}
Yellow assumptions: ${snapshot.assumptions.slice(-4).join('; ') || 'none'}
${threatBlock}

Recent boss intents (history only — do not invent a new plan):
${recent}

Discoveries so far: ${
    snapshot.discoveries?.length
      ? snapshot.discoveries.map((d) => d.finding).join('; ')
      : 'none'
  }

Player — body ${snapshot.player.body}, resolve ${snapshot.player.resolve}, awareness ${snapshot.player.awareness}, position ${snapshot.player.position}
Player Argument [${snapshot.playerIntent.category}]: ${snapshot.playerIntent.raw}

=== BOSS (already committed — COPY into bossIntent) ===
${personalityBlock}
Agenda progress: ${snapshot.boss.agendaProgress}
Boss — body ${snapshot.boss.body}, resolve ${snapshot.boss.resolve}, awareness ${snapshot.boss.awareness}, position ${snapshot.boss.position}
COMMITTED Boss Argument: ${committed}

Judge the clash against the COMMITTED boss Argument. Copy it into bossIntent. Return causalEvents + fieldSigns (facts only — no advice). JSON only.`;
}
