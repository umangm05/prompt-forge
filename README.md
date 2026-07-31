# PromptForge

**A turn-based battle of arguments where two minds compete to reshape a shared reality — and a neutral Arbiter decides which version becomes true.**

PromptForge is a client-side tactical duel. You do not cast spells or click Attack. You declare **Arguments** (attempts, never guaranteed outcomes). The boss commits first with a visible plan. You answer. An AI **Arbiter** judges the clash; a deterministic engine computes every number.

Language is the controller. Outthinking the opponent matters more than a perfect sentence.

---

## What is PromptForge?

PromptForge is an asymmetric, serverless, browser-based duel:

| Side | Role |
| --- | --- |
| **You (Operator)** | Declare tactical intents in plain English |
| **Boss** | Commits to a field problem with tools and a long-term goal |
| **Arbiter** | Judges the collision qualitatively (no HP invention) |
| **Engine** | Applies Body/Resolve, threads, beliefs, tempo, thresholds |

It is **not** a prompt-engineering contest. It is an **emergent tactics** game and a form of **tactical information warfare**: reshape the battlefield *and* what the boss believes about you.

**One-line pitch:** PromptForge is a courtroom for reality — create dilemmas, plant false signals, trigger signature moments, and break Resolve before Body.

---

## Core fantasy

- **Commitment-first.** The boss’s next move is visible before you type. You collide with a plan — you do not get counter-cheated by an omniscient LLM.
- **Dilemma-first.** Every turn should create or answer a field problem (`⚠ Damaged Railing (3)`), not only nudge numbers.
- **Show, don’t advise.** The UI shows sensory facts and omens. It never says “choose between A or B.”
- **Memorable moments.** Bosses have flaws, greed, and 2–4 signature moves that can rewrite the fight — sometimes irrationally.
- **Causal damage.** “The taut chain whips across your shin” — never unexplained “−4 Body.”

---

## How to play

### 1. Boot / setup

```bash
npm install
npm run dev
```

Open the app, then:

1. Pick an Arbiter provider (**Groq** is recommended for speed).
2. Paste your API key (Ollama can leave it blank). Keys stay in browser `localStorage` only.
3. Optionally click **TEST_CONNECTION**.
4. Pick a boss (or **RANDOM_BOSS**), set your name.
5. Or enable **USE_MOCK** for full offline play with no API.
6. Click **ENTER_ARENA**.

### 2. Read the arena before you type

| Surface | What to look for |
| --- | --- |
| **BOSS_COMMITS** | Their committed Argument + optional signature tell |
| **BATTLEFIELD_SIGNS** | Live threat / thread (`⚠ Label (N)` + foreshadow) |
| **Arena cards** | Terrain, weather, objects (hover for pros/cons) |
| **Named field** | Persistent elements with scars / history |
| **Omens** | Seeded world thresholds about to transform the arena |
| **Tempo** | `LULL` → `PRESSURE` → `RUPTURE` → `AFTERMATH` |
| **Green facts / Yellow assumptions** | Verified evidence vs risky deductions |

### 3. Commit an Argument

Type an **intent**, not an outcome:

| Legal | Illegal |
| --- | --- |
| “I toss a pebble at the tripwire to see what it does.” | “I deal 20 damage.” |
| “I feint retreat so they think I fear close combat.” | “My fireball hits and burns you.” |
| “I cut the smoke line with a short blade from the debris.” | Super Saiyan / instant win / rewrite reality |

Rules of thumb:

- Always answer **with what?** (tool, object, weather, fact).
- **Probes always teach** — even “it does not react.”
- **Feints** plant beliefs; later exploitation can break Resolve.
- Complexity budget is limited (`C_b`); verb-stacking gets scaled down.
- You get **2 HELPs** per duel (`?` tips + sample intents).

### 4. Read the judgment

After **COMMIT**, the Arbiter dossier shows:

1. **What changed** — causal beats
2. **Why it hurt** — narrative cause + Body/Resolve deltas
3. **Battlefield** — signs, omens, named field

Then the boss recommits. Tempo may shift. A prepared thread you ignore will eventually **pay off**.

### 5. How you win

Twin-track vitality:

| Track | Meaning | At 0 |
| --- | --- | --- |
| **Body** | Physical integrity | Critical physical defeat |
| **Resolve** | Belief / grip on reality | Immediate duel loss |

Ways to pressure the boss:

- Break or reverse their prepared thread
- Exploit a wrong belief they formed from your feints
- Trigger world thresholds (earned, not random)
- Bait a signature moment that costs them aftermath

---

## Bosses

Each boss is a puzzle defined by *how they think*, not inflated stats.

| Boss | Style | Defining flaw | Tools |
| --- | --- | --- | --- |
| **The Lawyer** | Binds rules / precedent | Cannot abandon a stamped rule | chalk, seal, cane |
| **The Scientist** | Arena engineer | Escalates collapse even when it threatens them | plasma cutter, charge, heat glove |
| **The Poet** | Tragic rings | Finishes the ring even if trapped inside | ash, banner, chant |
| **The Historian** | Evidence mastery | Stops to investigate new info under fire | ledger, spike, map |
| **The Trickster** | Misdirection | Charges if their favorite mirror dies | flare, smoke, decoy, mirror |
| **The Child** | Obvious scare | Keeps tipping even when it falls on them | hands, rock, pry bar |
| **The Minimalist** | One clean line | Finishes the cut when resetting would be wiser | short blade, wire, kick |

Every boss has **2–4 signature moments** (readable tells, self-risk, aftermath) — not cooldowns.

---

## Combat loop (tech view)

```
Boss commitment (visible)
  → Player Argument
  → Arbiter judges committed clash (qualitative JSON)
  → Engine resolves numbers from causal events
  → Update beliefs / threads / field / thresholds / tempo
  → Boss adapts (beliefs + emotion + means) and recommits
```

Important guarantees:

- Boss planning never sees your *private* aim mid-clash — only observables and fallible beliefs.
- Keyword-mentioning a threat does **not** clear it; only causal mutation does.
- Experiments always reduce uncertainty.
- World transformations are **seeded thresholds** (e.g. enough fire → roof fire omen), not random mid-fight injections.
- Missing Arbiter outcomes are repaired from plausibility — not forced to `partial`.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Vite + TypeScript SPA |
| UI | HTML + Tailwind CSS v3 (matrix / terminal theme) |
| Arbiter | OpenAI-compatible HTTP API (Groq / OpenAI / OpenRouter / Ollama) |
| Offline | Deterministic **Mock Arbiter** |
| Persistence | API config in `localStorage` only |
| Server | **None** — 100% client-side |

**Thin Arbiter contract:** the LLM returns qualitative judgment only (`ArbiterJudgment`). All Body/Resolve math, initiative, backfire, hardening, and thread payoffs live in `src/engine/resolution.ts` and friends.

WebLLM is **not** used (removed for inconsistent browser inference).

### Scripts

```bash
npm install          # dependencies
npm run dev          # local Vite server
npm run build        # tsc + production build
npm run preview      # preview production build
npm run verify:mock  # engine interaction tests (tsx)
```

### Source layout

```
src/
  config/     # budgets, pools, guardrails
  types/      # GameState, ArbiterJudgment, threads, beliefs, tempo…
  engine/     # game loop, resolution, bosses, field, thresholds…
  arbiter/    # API client, prompts, schema normalize
  ui/         # boot modal, arena render, cards, tips
agentMap/     # detailed design docs (canonical for agents)
AGENTS.md     # entry rules for AI agents working in this repo
```

### Supported Arbiter providers

| Preset | Notes |
| --- | --- |
| **Groq** | Fast default (`llama-3.3-70b-versatile` etc.) |
| **OpenAI** | Standard OpenAI Chat Completions |
| **OpenRouter** | Multi-model gateway |
| **Ollama** | Local; API key optional |
| **Mock** | Offline deterministic judgments |

---

## Design docs

| Doc | Contents |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | Rules for agents + global design constraints |
| [`agentMap/index.md`](./agentMap/index.md) | Registry of detailed docs |
| [`agentMap/BLUEPRINT.MD`](./agentMap/BLUEPRINT.MD) | Full system blueprint |
| [`agentMap/combat-engine.md`](./agentMap/combat-engine.md) | Engine modules + conventions |
| [`agentMap/dilemmas.md`](./agentMap/dilemmas.md) | Dilemma-first / show-don’t-advise |
| [`agentMap/boss-personalities.md`](./agentMap/boss-personalities.md) | Flaws + signature moments |
| [`agentMap/arbiter.md`](./agentMap/arbiter.md) | Arbiter JSON contract |
| [`agentMap/ui.md`](./agentMap/ui.md) | Arena UI surfaces |
| [`agentMap/architecture.md`](./agentMap/architecture.md) | SPA + data flow |

---

## Example opening turn

1. Arena rolls **Ruined Courtyard · Dry Heat · Glass Shards**.
2. **The Trickster** commits: *“I crack a smoke pellet and sprint the blind edge…”*
3. You declare intent (wait, feint, probe the glass, interrupt the smoke…).
4. Arbiter returns outcomes + field signs; engine applies deltas.
5. Smoke may appear as a named element; an omen like **Roof Fire** may start ticking.
6. Boss recommits from what they *observed* — not from your secret plan.

The fights worth remembering sound like:

> “I triggered their tripwire on purpose so the tower collapsed onto their own ritual.”

Not:

> “The boss created another trap.”

---

## License / status

Private project (`v0.1.0`). MVP: single-player vs boss. Multiplayer (friend duel / free-for-all) is deferred.
