# Combat Engine

**Status:** built — tactical conversation / memorable moments redesign

## What
Deterministic modules under `src/engine/` implement twin-track vitality, awareness, positioning, epistemic ledgers, complexity budget, word fatigue, hidden traits, **seeded world thresholds**, initiative, seven boss archetypes with **fallible beliefs + signature moments**, and a **commitment-first** combat loop.

## How
- `inputParser.ts` — guardrails, category/target, investigative flag; verb stacks keep first clause (no silent full rewrite)
- `complexityBudget.ts` — 6-point budget + Large Area Rule
- `resolution.ts` — maps `ArbiterJudgment` → `ResolvedVerdict` (all deltas); requires causal events for damage; relation tags `advance|stall|break|reverse|transfer`
- `gameLoop.ts` — commit → clash → reduce → signals → beliefs → thresholds → tempo → temptation → recommit
- `startingWorld.ts` — 3 start tags + named `FieldElement`s + latent `WorldThreshold`s
- `fieldElements.ts` — provenance, scars, history, successor identity
- `threats.ts` — `TacticalThread` (shared setup/payoff); keyword mention does **not** clear
- `beliefs.ts` — observable signals → fallible boss beliefs → `ExpectationBreak`
- `tempo.ts` — `lull|pressure|rupture|aftermath`
- `temptations.ts` — fiction-only greed windows (no safe/risky labels)
- `discoveries.ts` — experiments always reduce uncertainty
- `worldThresholds.ts` / `environmentalEvents.ts` — earned transformations; **no random mid-fight injection**
- `bossPersonalities.ts` — flaws, biases, 2–4 signature moments per boss
- `bossArchetypes.ts` — belief/emotion-constrained adaptation + commitments
- `damageWhy.ts` — state-aware causal damage lines

## Why
Rules live in code so local LLMs cannot invent illegal numbers, clear threats by keyword, or omnisciently counter the player's private aim. Drama selects among causally valid actions — bosses are interesting, not perfectly optimal.

## Conventions
- Engine is framework-agnostic and unit-testable (`npm run verify:mock`)
- Boss commits **before** player input; Arbiter judges the committed clash
- Yellow→Green hardening happens in resolution/ledgers, not in the LLM
- Never hardcode a fixed starting battlefield in `createInitialState` — always roll
- UI never enumerates player decisions; expose causal fiction only
