const STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'to',
  'and',
  'due',
  'with',
  'from',
  'into',
  'our',
  'your',
  'this',
  'that',
  'for',
  'on',
  'in',
  'is',
  'are',
  'as',
  'by',
  'its',
  'has',
  'have',
  'been',
  'than',
  'rather',
  'constant',
  'variable',
  'effects',
  'effect',
  'making',
  'using',
  'use',
  'history',
]);

/** Meaningful tokens for near-duplicate detection. */
export function significantTokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
}

/** True if candidate restates an existing label (paraphrase / substring). */
export function isNearDuplicateLabel(
  candidate: string,
  existing: string[],
): boolean {
  const cKey = candidate.toLowerCase().trim();
  if (!cKey) return true;
  const cTokens = significantTokens(candidate);

  for (const e of existing) {
    const eKey = e.toLowerCase().trim();
    if (!eKey) continue;
    if (eKey === cKey) return true;
    if (eKey.includes(cKey) || cKey.includes(eKey)) return true;

    const eTokens = significantTokens(e);
    if (!cTokens.size || !eTokens.size) continue;
    let overlap = 0;
    for (const t of cTokens) if (eTokens.has(t)) overlap++;
    const denom = Math.min(cTokens.size, eTokens.size);
    if (overlap >= 2 && overlap / denom >= 0.5) return true;
  }
  return false;
}

/** Keep first occurrence; drop near-duplicates. */
export function uniqueLabels(labels: string[]): string[] {
  const out: string[] = [];
  for (const l of labels) {
    if (!isNearDuplicateLabel(l, out)) out.push(l);
  }
  return out;
}
