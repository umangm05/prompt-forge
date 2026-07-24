# Arbiter (OpenAI-compatible API)

**Status:** built — commitment-first judgment

## What
One JSON response that:
1. **Copies** the already-committed boss Argument (`bossIntent` = `committedBossIntent`)
2. Judges the collision sparsely
3. Returns `causalEvents`, `damageWhy`, `fieldSigns`, `discoveries`, `observableSignals`, `activeThreat` / thread fields, `bossReaction`

Never invents a cleverer boss counter after reading the player.
Never returns “choose between…” advice.

## Conventions
- Method flavor required on boss intents (authored at commitment time)
- `fieldSigns` = discovery fuel (⚠ Label (N) + sensory tells)
- `clearThreat` only when a causal mutation broke/reversed/transferred the thread
- Investigations must emit `discoveries[]` (non-reaction counts)
- Missing outcomes repair from plausibility — not automatic `partial`
- Engine owns Body/Resolve numbers
