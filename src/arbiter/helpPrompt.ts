import type { CompactGameSnapshot } from '../types';

export function buildHelpSystemPrompt(): string {
  return `You help a new PromptForge player write ONE Argument (intent).
Reply with ONE JSON object only: { "intent": "..." }
Rules:
- Sound like a human player: short, plain English, 1-2 sentences.
- Must be an attempt, never a guaranteed outcome.
- MUST use at least one current named field element, omen, thread, OR a Green Fact / Yellow Assumption if present.
- May suggest a feint / false signal that manipulates what the boss seems to believe — but keep it as an observable action.
- Show a wording loophole or environmental exploit when possible.
- No fiction IP, no omnipotence, no "you take X damage".
- Do not mention being an AI.
- Never print "choose between" options.`;
}

export function buildHelpUserPrompt(snapshot: CompactGameSnapshot): string {
  const thread = snapshot.tacticalThread
    ? `⚠ ${snapshot.tacticalThread.label} (${snapshot.tacticalThread.timer}) — ${snapshot.tacticalThread.foreshadow}`
    : snapshot.activeThreat
      ? `⚠ ${snapshot.activeThreat.label} (${snapshot.activeThreat.timer})`
      : 'none';
  return `Round ${snapshot.round}. Boss=${snapshot.boss.archetype} (${snapshot.boss.personality.name}).
Tempo=${snapshot.tempo.beat}. Boss commitment: ${snapshot.committedBossIntent?.raw ?? 'unknown'}
Battlefield: ${snapshot.battlefield.join('; ')}
Omen: ${snapshot.omen ?? 'none'}
Thread: ${thread}
Temptation fiction: ${snapshot.temptationForeshadow ?? 'none'}
Green facts: ${snapshot.facts.slice(-6).join('; ') || 'none'}
Yellow assumptions: ${snapshot.assumptions.slice(-4).join('; ') || 'none'}
Player position=${snapshot.player.position} awareness=${snapshot.player.awareness}
Boss position=${snapshot.boss.position} awareness=${snapshot.boss.awareness}

Suggest one strong player Argument that uses the field or the boss's visible commitment. JSON only.`;
}
