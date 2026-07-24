export type CardMotif =
  | 'smoke'
  | 'rain'
  | 'fire'
  | 'water'
  | 'steam'
  | 'fog'
  | 'stone'
  | 'debris'
  | 'electric'
  | 'vacuum'
  | 'gravity'
  | 'eclipse'
  | 'oil'
  | 'metal'
  | 'corridor'
  | 'generic';

/** Inline SVG illustration for the card face (effect motif). */
export function cardIllustration(motif: CardMotif, accent: string): string {
  const common = `viewBox="0 0 64 64" class="w-10 h-10 mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg"`;
  switch (motif) {
    case 'smoke':
      return `<svg ${common}>
        <ellipse cx="22" cy="40" rx="12" ry="8" stroke="${accent}" stroke-width="1.5" opacity="0.7"/>
        <ellipse cx="36" cy="34" rx="14" ry="10" stroke="${accent}" stroke-width="1.5"/>
        <ellipse cx="28" cy="24" rx="10" ry="7" stroke="${accent}" stroke-width="1.5" opacity="0.85"/>
        <path d="M30 48v8" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    case 'rain':
      return `<svg ${common}>
        <path d="M12 22c4-10 16-12 22-4 8-6 22-2 22 10" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M20 34l-3 10M30 32l-3 12M40 34l-3 10M50 36l-2 8" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    case 'fire':
      return `<svg ${common}>
        <path d="M32 52c-10 0-16-8-16-16 0-8 6-14 10-20 2 6 6 8 6 8s2-6 6-12c6 8 10 14 10 22 0 10-6 18-16 18z" stroke="${accent}" stroke-width="1.5" fill="${accent}" fill-opacity="0.12"/>
        <path d="M32 48c-4 0-7-3-7-7 0-4 3-7 5-10 1 3 3 4 3 4s1-3 3-6c3 4 5 7 5 11 0 5-3 8-9 8z" stroke="${accent}" stroke-width="1.2" opacity="0.8"/>
      </svg>`;
    case 'water':
      return `<svg ${common}>
        <path d="M10 40c6 6 14 8 22 8s16-2 22-8" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M14 32c5 4 12 6 18 6s13-2 18-6" stroke="${accent}" stroke-width="1.5" opacity="0.7" stroke-linecap="round"/>
        <ellipse cx="32" cy="22" rx="6" ry="10" stroke="${accent}" stroke-width="1.5"/>
      </svg>`;
    case 'steam':
      return `<svg ${common}>
        <path d="M18 44h28" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M22 36c0-6 4-8 4-14M32 38c0-8 5-10 5-16M42 36c0-6 3-8 3-14" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" opacity="0.85"/>
      </svg>`;
    case 'fog':
      return `<svg ${common}>
        <path d="M10 28h44M14 36h36M18 44h28" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
        <circle cx="24" cy="22" r="3" stroke="${accent}" stroke-width="1.2"/>
        <circle cx="40" cy="20" r="2.5" stroke="${accent}" stroke-width="1.2" opacity="0.7"/>
      </svg>`;
    case 'stone':
      return `<svg ${common}>
        <path d="M16 48V22l16-10 16 10v26z" stroke="${accent}" stroke-width="1.5"/>
        <path d="M16 22l16 10 16-10M32 32v16" stroke="${accent}" stroke-width="1.2" opacity="0.7"/>
      </svg>`;
    case 'debris':
      return `<svg ${common}>
        <path d="M14 40l10-16 12 8 8-12 10 20H14z" stroke="${accent}" stroke-width="1.5"/>
        <circle cx="28" cy="36" r="2" fill="${accent}" opacity="0.5"/>
        <circle cx="42" cy="38" r="1.5" fill="${accent}" opacity="0.5"/>
      </svg>`;
    case 'electric':
      return `<svg ${common}>
        <path d="M34 10L22 34h12l-6 20 18-28H34L40 10z" stroke="${accent}" stroke-width="1.5" fill="${accent}" fill-opacity="0.15"/>
      </svg>`;
    case 'vacuum':
      return `<svg ${common}>
        <circle cx="32" cy="32" r="18" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4 3"/>
        <circle cx="32" cy="32" r="6" stroke="${accent}" stroke-width="1.5"/>
        <path d="M32 14v8M32 42v8M14 32h8M42 32h8" stroke="${accent}" stroke-width="1.2" opacity="0.6"/>
      </svg>`;
    case 'gravity':
      return `<svg ${common}>
        <circle cx="32" cy="28" r="10" stroke="${accent}" stroke-width="1.5"/>
        <path d="M32 40v12M26 46l6 6 6-6" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    case 'eclipse':
      return `<svg ${common}>
        <circle cx="32" cy="32" r="14" stroke="${accent}" stroke-width="1.5"/>
        <path d="M32 18a14 14 0 0 1 0 28 10 10 0 0 0 0-28z" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="1"/>
      </svg>`;
    case 'oil':
      return `<svg ${common}>
        <ellipse cx="32" cy="42" rx="18" ry="8" stroke="${accent}" stroke-width="1.5"/>
        <path d="M20 42c4-10 8-18 12-26 4 8 8 16 12 26" stroke="${accent}" stroke-width="1.5" opacity="0.8"/>
      </svg>`;
    case 'metal':
      return `<svg ${common}>
        <rect x="14" y="22" width="36" height="8" rx="1" stroke="${accent}" stroke-width="1.5"/>
        <path d="M18 30v14M46 30v14M18 44h28" stroke="${accent}" stroke-width="1.5"/>
        <path d="M24 18h16l4 4H20l4-4z" stroke="${accent}" stroke-width="1.2" opacity="0.75"/>
      </svg>`;
    case 'corridor':
      return `<svg ${common}>
        <path d="M12 52L28 12h8l16 40" stroke="${accent}" stroke-width="1.5"/>
        <path d="M22 52V28M42 52V28" stroke="${accent}" stroke-width="1.2" opacity="0.65"/>
      </svg>`;
    default:
      return `<svg ${common}>
        <rect x="16" y="16" width="32" height="32" rx="2" stroke="${accent}" stroke-width="1.5"/>
        <path d="M22 40l8-12 6 8 6-6 4 10H22z" stroke="${accent}" stroke-width="1.2" opacity="0.75"/>
      </svg>`;
  }
}

export function motifAccent(kind: string): string {
  switch (kind) {
    case 'weather':
      return '#39ff14';
    case 'event':
      return '#ffb020';
    case 'fact':
      return '#39ff14';
    case 'mix':
      return '#ff2a6d';
    default:
      return '#9aa4b2';
  }
}
