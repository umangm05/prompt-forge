import type { BossArchetype } from '../types';
import { BOSS_META } from './bossMeta';

export type AvatarKind = 'player' | 'boss' | 'arbiter' | 'unknown';

/** Tail points toward the avatar. */
export type BubblePointer = 'left' | 'right' | 'down' | 'up';

/** CSS-drawn matrix avatars (no external art assets). */
export function avatarPlate(
  kind: AvatarKind,
  opts?: { bossId?: BossArchetype; size?: 'sm' | 'md' | 'lg' },
): string {
  const size = opts?.size ?? 'md';
  const dim =
    size === 'lg' ? 'w-24 h-24 text-4xl' : size === 'sm' ? 'w-14 h-14 text-xl' : 'w-20 h-20 text-3xl';

  if (kind === 'unknown') {
    return `
      <div class="avatar-plate ${dim} border-2 border-dashed border-crimson/50 text-crimson/70 bg-terminal-bg flex items-center justify-center font-mono" title="Unknown boss">
        ?
      </div>`;
  }

  if (kind === 'arbiter') {
    return `
      <div class="avatar-plate ${dim} border-2 border-amber text-amber bg-terminal-panel flex items-center justify-center font-mono shadow-[0_0_20px_#ffb02033]" title="The Arbiter">
        <span class="leading-none">⚖</span>
      </div>`;
  }

  if (kind === 'player') {
    return `
      <div class="avatar-plate ${dim} border-2 border-neon text-neon bg-terminal-panel flex items-center justify-center font-mono shadow-neon" title="Player">
        <span class="leading-none">⚔</span>
      </div>`;
  }

  const meta = opts?.bossId ? BOSS_META[opts.bossId] : undefined;
  const glyph = meta?.glyph ?? '!';
  return `
    <div class="avatar-plate ${dim} border-2 border-crimson text-crimson bg-terminal-panel flex items-center justify-center font-mono shadow-crimson" title="${meta?.name ?? 'Boss'}">
      <span class="leading-none">${glyph}</span>
    </div>`;
}

/**
 * Speech bubble shell. Text starts empty; `runTypewriters` fills it with a typing effect.
 * `pointer` = direction of the tail (toward the avatar).
 */
export function speechBubble(
  fullText: string,
  accent: 'neon' | 'crimson' | 'amber',
  pointer: BubblePointer,
  role: 'player' | 'boss' | 'arbiter',
): string {
  if (!fullText.trim()) return '';
  const border =
    accent === 'neon'
      ? 'border-neon text-neon'
      : accent === 'crimson'
        ? 'border-crimson text-crimson'
        : 'border-amber text-amber';

  const wide =
    role === 'boss'
      ? 'max-w-[320px] whitespace-pre-wrap'
      : role === 'arbiter'
        ? 'max-w-[240px]'
        : 'max-w-[200px]';

  return `
    <div
      class="speech-bubble bubble-point-${pointer} relative ${wide} border ${border} bg-terminal-bg/95 px-3 py-2 text-[11px] font-mono leading-snug shadow-lg animate-bubble-in"
      data-speech-role="${role}"
      data-full-text="${escapeAttr(fullText)}"
    >
      <span class="speech-bubble-text">${escapeHtml(fullText)}</span><span class="speech-cursor">▋</span>
    </div>`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
