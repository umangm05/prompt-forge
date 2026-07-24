import type { EpistemicMatrix, ResolvedVerdict } from '../types';

export function createEmptyLedgers(): EpistemicMatrix {
  return { facts: [], assumptions: [] };
}

export function applyLedgerMutations(
  ledgers: EpistemicMatrix,
  mutations: ResolvedVerdict['ledgerMutations'],
): EpistemicMatrix {
  let facts = [...ledgers.facts];
  let assumptions = [...ledgers.assumptions];

  for (const a of mutations.removeAssumptions) {
    assumptions = assumptions.filter((x) => x !== a);
  }

  for (const a of mutations.hardenAssumptions) {
    assumptions = assumptions.filter((x) => x !== a);
    if (!facts.includes(a)) facts.push(a);
  }

  for (const f of mutations.addFacts) {
    if (!facts.includes(f)) facts.push(f);
  }

  for (const a of mutations.addAssumptions) {
    if (!assumptions.includes(a) && !facts.includes(a)) assumptions.push(a);
  }

  return { facts, assumptions };
}

export function isAnchoredOnFacts(raw: string, facts: string[]): boolean {
  if (facts.length === 0) return false;
  const lower = raw.toLowerCase();
  return facts.some((f) => {
    const key = f.replace(/^✔\s*/, '').toLowerCase();
    return key.length > 3 && lower.includes(key.slice(0, Math.min(key.length, 24)));
  });
}
