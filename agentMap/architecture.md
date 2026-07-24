# Architecture

**Status:** built (MVP)

## What
PromptForge is a client-side SPA. A deterministic combat engine owns rules and math; an **OpenAI-compatible API Arbiter** supplies qualitative judgment. Mock mode works fully offline.

## How
```
UI → gameLoop → inputParser/complexityBudget → ArbiterClient (HTTP)
  → JSON ArbiterJudgment
  → resolution.ts (all numeric deltas)
  → state mutation → arena UI / speech bubbles / cards
```

## Why
API Arbiter avoids multi-GB downloads and WebGPU inconsistency while keeping the thin-Arbiter split (LLM judges, code computes).

## Conventions
- Source under `src/`: `config/`, `types/`, `engine/`, `arbiter/`, `ui/`
- No game server; API key stays in the browser
- Mock path must always work for offline testing
