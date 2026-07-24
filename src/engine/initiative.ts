import type { Awareness, InitiativeHolder, ResolutionOutcome } from '../types';

export function shouldGainInitiative(
  attackerOutcome: ResolutionOutcome,
  defenderAwarenessAfter: Awareness,
): boolean {
  if (defenderAwarenessAfter === 'LOST' || defenderAwarenessAfter === 'FALSE_INFO') {
    return true;
  }
  return attackerOutcome === 'success';
}

export function nextInitiative(
  current: InitiativeHolder,
  playerGains: boolean,
  bossGains: boolean,
): InitiativeHolder | 'none' {
  if (playerGains && !bossGains) return 'player';
  if (bossGains && !playerGains) return 'boss';
  if (playerGains && bossGains) return current;
  return 'none';
}
