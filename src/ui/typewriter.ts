const activeIntervals = new Map<Element, number>();
const activeTimeouts = new Set<number>();

/** Type full text into each `[data-full-text]` bubble under root. */
export function runTypewriters(
  root: HTMLElement,
  opts?: { cps?: number; onDone?: () => void },
): void {
  const cps = opts?.cps ?? 56;
  const delay = 1000 / cps;
  const bubbles = [...root.querySelectorAll<HTMLElement>('[data-full-text]')];
  let remaining = bubbles.length;
  if (remaining === 0) {
    opts?.onDone?.();
    return;
  }

  bubbles.forEach((el, index) => {
    const prev = activeIntervals.get(el);
    if (prev != null) window.clearInterval(prev);

    const full = el.dataset.fullText ?? '';
    const textEl = el.querySelector('.speech-bubble-text');
    const cursor = el.querySelector('.speech-cursor');
    if (!textEl) {
      remaining -= 1;
      if (remaining === 0) opts?.onDone?.();
      return;
    }

    // Instant fill if empty string
    if (!full) {
      textEl.textContent = '';
      remaining -= 1;
      if (remaining === 0) opts?.onDone?.();
      return;
    }

    textEl.textContent = '';
    cursor?.classList.add('is-typing');

    const stagger = index * 80;
    const timeoutId = window.setTimeout(() => {
      activeTimeouts.delete(timeoutId);
      let i = 0;
      const id = window.setInterval(() => {
        i += 1;
        textEl.textContent = full.slice(0, i);
        if (i >= full.length) {
          window.clearInterval(id);
          activeIntervals.delete(el);
          cursor?.classList.remove('is-typing');
          remaining -= 1;
          if (remaining === 0) opts?.onDone?.();
        }
      }, delay);
      activeIntervals.set(el, id);
    }, stagger);
    activeTimeouts.add(timeoutId);
  });
}

export function clearTypewriters(): void {
  for (const id of activeIntervals.values()) window.clearInterval(id);
  for (const id of activeTimeouts) window.clearTimeout(id);
  activeIntervals.clear();
  activeTimeouts.clear();
}
