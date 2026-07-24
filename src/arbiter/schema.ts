/** Soft-parse model JSON; tolerate truncation and missing optional fields. */
export function parseJudgmentJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty Arbiter response');

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  let candidate = (fenced?.[1] ?? trimmed).trim();

  const start = candidate.indexOf('{');
  if (start === -1) throw new Error('No JSON object in Arbiter response');
  candidate = candidate.slice(start);

  try {
    return JSON.parse(candidate);
  } catch {
    // Truncation repair: close open strings/brackets best-effort
    const repaired = repairTruncatedJson(candidate);
    return JSON.parse(repaired);
  }
}

function repairTruncatedJson(src: string): string {
  let s = src.replace(/,\s*$/, '');
  // Close an open string if odd unescaped quotes
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') inString = !inString;
  }
  if (inString) s += '"';

  const opens = (s.match(/\[/g) ?? []).length;
  const closes = (s.match(/\]/g) ?? []).length;
  const oBraces = (s.match(/\{/g) ?? []).length;
  const cBraces = (s.match(/\}/g) ?? []).length;
  s += ']'.repeat(Math.max(0, opens - closes));
  s += '}'.repeat(Math.max(0, oBraces - cBraces));
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}
