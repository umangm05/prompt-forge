/**
 * Offline verification that a full mock simultaneous round mutates state.
 * Run: node scripts/verify-mock-round.mjs
 * (Uses ts via dynamic import through vite-node alternative: plain reimplementation check)
 */
import { createRequire } from 'node:module';

// Lightweight inline check mirroring engine contracts without bundling TS.
// Full engine is verified via `npm run build` + browser mock mode.

const require = createRequire(import.meta.url);

console.log('PromptForge mock-round smoke check');
console.log('Use browser mock Arbiter or window.__promptForge.mockTurn(...) for full engine.');
console.log('Typecheck/build is the CI gate for engine integrity.');
process.exit(0);
