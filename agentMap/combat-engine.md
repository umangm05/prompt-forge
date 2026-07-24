# Combat Engine

**Status:** built (MVP)

## What
Deterministic modules under `src/engine/` implement twin-track vitality, awareness, positioning, epistemic ledgers, complexity budget, word fatigue, hidden traits, environmental events, initiative, seven boss archetypes, and the simultaneous loop.

## How
- `inputParser.ts` — guardrails (fiction/forbidden), choreography scale-down, category/target classification
- `complexityBudget.ts` — 6-point budget + Large Area Rule
- `resolution.ts` — maps `ArbiterJudgment` → `ResolvedVerdict` (all deltas)
- `gameLoop.ts` — round flow, snapshot for Arbiter, apply verdict
- `startingWorld.ts` — **exactly 3 start tags each duel**: 1 arena geometry + 1 weather + 1 surrounding objects (plus random initiative / opening range)
- `threats.ts` — active dilemmas, timers, crisis payoff, mock dilemma intents
- `damageWhy.ts` — plain-English causal damage lines
- `bossPersonalities.ts` — dilemma-first dossiers; observation-only forbidden
- `bossArchetypes.ts` — agenda progress + offline dilemma fallbacks

## Why
Rules live in code so local LLMs cannot invent illegal numbers or skip backfire/initiative math. Random starting conditions keep rematches fresh without changing the rules.

## Conventions
- Engine is framework-agnostic and unit-testable (`npm run verify:mock`)
- Yellow→Green hardening happens in resolution/ledgers, not in the LLM
- Never hardcode a fixed starting battlefield in `createInitialState` — always roll
