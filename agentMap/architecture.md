# Architecture

**Status:** built — commitment-first thin Arbiter

## What
PromptForge is a client-side SPA. A deterministic combat engine owns rules, math, beliefs, tempo, thresholds, and boss recommitment; an **OpenAI-compatible API Arbiter** supplies qualitative judgment of a **precommitted** clash. Mock mode works fully offline.

## How
```
UI shows boss commitment
  → player Argument
  → gameLoop snapshot (committedBossIntent; generateBossIntent=false)
  → ArbiterClient judges collision (copies commitment)
  → resolution.ts (deltas from causal events)
  → beliefs / thresholds / tempo / temptation / recommit
  → arena UI (signs, omens, named field, speech, cards)
```

## Why
API Arbiter avoids multi-GB downloads and WebGPU inconsistency while keeping the thin-Arbiter split (LLM judges, code computes). Separating referee truth from boss observation makes bluffs and expectation traps real.

## Conventions
- Source under `src/`: `config/`, `types/`, `engine/`, `arbiter/`, `ui/`
- No game server; API key stays in the browser
- Mock path must always work for offline testing (`npm run verify:mock`)
