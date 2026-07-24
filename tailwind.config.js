/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0b0f19',
          panel: '#0e1420',
          border: '#1e2a3a',
          dim: '#5a6a7a',
          text: '#c8d0d8',
        },
        neon: {
          DEFAULT: '#39ff14',
          dim: '#1a8f0a',
          glow: '#39ff1440',
        },
        crimson: {
          DEFAULT: '#ff2a4a',
          dim: '#8f1528',
          glow: '#ff2a4a40',
        },
        amber: {
          DEFAULT: '#ffb020',
          dim: '#8f6010',
        },
      },
      boxShadow: {
        neon: '0 0 12px #39ff1440',
        crimson: '0 0 12px #ff2a4a40',
      },
    },
  },
  plugins: [],
};
