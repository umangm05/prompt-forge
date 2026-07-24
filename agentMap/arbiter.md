# Arbiter (OpenAI-compatible API)

**Status:** built — emergent tactics / language-as-controller

## What
One JSON response that:
1. Invents a flavored boss Argument (`bossIntent` — always **with what**)
2. Judges sparsely
3. Returns `damageWhy`, `fieldSigns` (facts only), `activeThreat` `{label, foreshadow, timer}`, short `bossReaction`

Never returns “choose between…” advice.

## Conventions
- Method flavor required on boss intents
- `fieldSigns` = discovery fuel (⚠ Label (N) + sensory tells)
- Engine owns Body/Resolve numbers
