# PromptForge

A client-side tactical duel: two minds present **Arguments**, and an **Arbiter** (OpenAI-compatible API) decides what reality accepts.

## Quick start

```bash
npm install
npm run dev
```

On boot:

1. Pick a provider (**Groq** is a good default for speed).
2. Paste your API key (Ollama can leave it blank).
3. Optionally **Test Connection**, pick a boss, enter your name.
4. Or enable **USE_MOCK** for offline play with no API.

```bash
npm run build
npm run verify:mock
```

## Docs

Start at [`AGENTS.md`](./AGENTS.md) and [`agentMap/index.md`](./agentMap/index.md).
