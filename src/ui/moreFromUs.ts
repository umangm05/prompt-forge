// Shared "More from us" links (decision D-HELPER-SITES-CROSSLINK): every helper
// site links to the others.
export const MORE_FROM_US: ReadonlyArray<{ name: string; url: string; blurb: string }> = [
  { name: 'Utility Helpers', url: 'https://utility-helpers.netlify.app/', blurb: 'free private browser tools' },
  { name: 'Auto Crash Chase', url: 'https://auto-crash-chase.netlify.app/', blurb: 'top-down AI car-chase game' },
  { name: 'Tiny Worlds 3D', url: 'https://3d-world.umangmittal.me/', blurb: 'tiny 3D worlds you can play in your browser' },
];

export function renderMoreFromUs(): string {
  const links = MORE_FROM_US.map(
    (s) =>
      `<a href="${s.url}" target="_blank" rel="noopener" class="text-neon underline hover:text-terminal-text">${s.name}</a> <span class="text-terminal-dim">— ${s.blurb}</span>`,
  ).join('<span class="text-terminal-border mx-2">·</span>');
  return `<nav aria-label="More from us" class="border-t border-terminal-border px-4 py-3 text-[11px] font-mono leading-relaxed">
      <span class="text-terminal-dim tracking-widest mr-2">MORE_FROM_US</span>${links}
    </nav>`;
}
