import type { CompactGameSnapshot } from '../types';

export function buildHelpSystemPrompt(): string {
  return `You help a new PromptForge player write ONE Argument (intent).
Reply with ONE JSON object only: { "intent": "..." }
Rules:
- Sound like a human player: short, plain English, 1-2 sentences.
- Must be an attempt, never a guaranteed outcome.
- MUST use at least one current arena/weather/object OR a Green Fact / Yellow Assumption if present.
- Show a wording loophole or environmental exploit when possible (e.g. wet ground + shove, fog + flank, cite a fact).
- No fiction IP, no omnipotence, no "you take X damage".
- Do not mention being an AI.`;
}

export function buildHelpUserPrompt(snapshot: CompactGameSnapshot): string {
  return `Round ${snapshot.round}. Boss=${snapshot.boss.archetype} (${snapshot.boss.personality.name}).
Battlefield: ${snapshot.battlefield.join('; ')}
Weather/event: ${snapshot.environmentalEvent ?? 'none'}
Green facts: ${snapshot.facts.slice(-6).join('; ') || 'none'}
Yellow assumptions: ${snapshot.assumptions.slice(-4).join('; ') || 'none'}
Player position=${snapshot.player.position} awareness=${snapshot.player.awareness}
Boss position=${snapshot.boss.position} awareness=${snapshot.boss.awareness}

Suggest one strong player Argument that uses the field. JSON only.`;
}
