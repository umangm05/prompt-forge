# AGENTS.md — prompt-forge

This file is the entry point for any AI agent working in this repo. Read it first, follow it always, and keep it (and the docs it points to) in sync with reality.

---

## Knowledge Loop (MANDATORY)

The purpose of this loop is simple: the project's documentation must always reflect how the project actually works and how the owner intends to structure it. Every prompt is a chance to learn something and record it, so future agents never have to re-discover it.

Run this loop on **every** prompt:

### 1. Read before acting
- Read this `AGENTS.md`.
- Read the relevant detailed docs under [`agentMap/`](./agentMap) for the area you're about to touch (start from [`agentMap/index.md`](./agentMap/index.md)).

### 2. Detect learnable information
While handling the prompt, watch for any of the following signals:
- **A new rule** — the owner states a convention, constraint, preference, or "always/never do X".
- **An updated rule** — the owner changes or overrides something previously documented.
- **A design/plan statement** — the owner says "I am planning to build this section like this…" or explains the intended logic, architecture, or structure of a part of the project.
- **A discovery** — you learn something non-obvious about how the project is structured, wired, or reasoned about while doing the work.

### 3. Do the work AND record it (in the same turn)
When any signal above is present:
1. Make the requested code/change.
2. **Immediately** update the docs so the reasoning is captured:
   - Update this `AGENTS.md` if it's a global rule or high-level structural decision.
   - Create or update the matching detailed doc under `agentMap/` (see rules below) for section-specific logic, plans, or conventions.
   - Register any new doc in [`agentMap/index.md`](./agentMap/index.md).
3. Keep everything consistent — if a change contradicts existing docs, update those docs rather than leaving them stale.

> The rule of thumb: **if a future agent would need to know it to work here, write it down now.** Never let code and docs drift apart.

### 4. Confirm sync
Before finishing a turn, ask yourself: "Did I learn a rule, plan, or structural detail that isn't yet in the docs?" If yes, you are not done — record it first.

---

## `agentMap/` — the documentation home

- **All detailed markdown docs live under `agentMap/`.** Do not scatter detailed docs elsewhere.
- `AGENTS.md` (this file) stays high-level: the loop, global rules, and a pointer to the map.
- Each area/section/module of the project gets its own doc, e.g. `agentMap/<section-name>.md`.
- Each section doc should capture:
  - **What** the section is.
  - **How** it's intended to be built (the owner's plan/logic).
  - **Why** — the reasoning and constraints behind the approach.
  - **Conventions/rules** specific to that section.
  - **Status** — planned / in progress / built.
- [`agentMap/index.md`](./agentMap/index.md) is the registry: every detailed doc must be listed there with a one-line summary. Keep it current.

### Naming
- Use lowercase, hyphenated filenames: `agentMap/user-auth.md`, `agentMap/prompt-editor.md`.
- One section/concern per file. Split when a file grows too broad.

---

## Global rules

_(This list grows over time via the Knowledge Loop. Add new global rules here as they are learned.)_

- Keep all detailed documentation under `agentMap/`.
- Keep docs in sync with code on every change — no stale docs.
- **Emergent tactics:** Language is the controller. Outthinking each other matters more than “best sentence.”
- **Tactical information warfare:** Combat reshapes both the battlefield and the opponent’s beliefs. Bosses adapt from observables + fallible beliefs — never from private player text mid-clash.
- **Commitment-first:** Boss commits before player input; Arbiter judges that committed clash.
- **Dilemma-first:** Every turn creates or solves a field problem. Bosses advance a goal with visible tools/methods — never soft-loop observation, never “I cut X” with no *with what*.
- **Memorable moments:** Bosses have defining flaws and 2–4 signature moments; emotion and greed may override optimal play. Tempo varies (lull/pressure/rupture/aftermath).
- **Show, don’t advise:** Foreshadow with battlefield signs (`⚠ Damaged Railing (3)` + groans). Never “choose between…”. Expose decision space; never enumerate decisions.
- Damage must be narratively obvious (“beam clips your shoulder”), not unexplained numbers. Keyword mention does not clear a threat — only causal mutation does.
- Experiments always teach; world thresholds are earned/deterministic (no random mid-fight injection).
- Stack: Vite + TypeScript + Tailwind CSS (v3). Client-side SPA; no game server.
- **Thin Arbiter via OpenAI-compatible API** (Groq / OpenAI / OpenRouter / Ollama / custom). WebLLM is **not** used. API config in `localStorage`. Mock Arbiter for offline.
- **Thin Arbiter:** the LLM returns qualitative `ArbiterJudgment` only; `src/engine/resolution.ts` computes all numeric deltas. Never let the model invent body/resolve numbers.
- **UI:** Boot modal (API config + boss + how-to-play); arena = boss top-left, player bottom-right, Arbiter mid-left with speech bubbles, env/facts mid-right, chat bottom-center, **arena cards** table (matrix theme).
- Source layout: `src/config`, `src/types`, `src/engine`, `src/arbiter`, `src/ui`. Detailed design lives in `agentMap/BLUEPRINT.MD`.
