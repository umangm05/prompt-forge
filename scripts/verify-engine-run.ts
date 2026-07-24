import {
  beginRound,
  buildBossParsed,
  createInitialState,
  parsePlayerIntent,
  resolveWithMock,
} from '../src/engine/gameLoop.ts';

let state = createInitialState('scientist');
state = beginRound(state);
const playerParsed = parsePlayerIntent(
  state,
  'I splash water across the stone pillars and prepare to electrify the puddles.',
);
if (playerParsed.rejected) {
  throw new Error(`Unexpected reject: ${playerParsed.rejected}`);
}
const bossParsed = buildBossParsed(state);
const before = {
  playerBody: state.player.body,
  bossBody: state.boss.body,
  playerResolve: state.player.resolve,
  bossResolve: state.boss.resolve,
  facts: state.ledgers.facts.length,
  round: state.round,
};

const { verdict, next } = resolveWithMock(state, playerParsed, bossParsed);

const changed =
  next.player.body !== before.playerBody ||
  next.boss.body !== before.bossBody ||
  next.player.resolve !== before.playerResolve ||
  next.boss.resolve !== before.bossResolve ||
  next.ledgers.facts.length !== before.facts ||
  next.round === before.round + 1;

if (!changed) {
  throw new Error('Mock round did not mutate state');
}

console.log('Mock round OK');
console.log({
  playerOutcome: verdict.playerOutcome,
  bossOutcome: verdict.bossOutcome,
  deltas: {
    playerBody: verdict.playerBodyDelta,
    playerResolve: verdict.playerResolveDelta,
    bossBody: verdict.bossBodyDelta,
    bossResolve: verdict.bossResolveDelta,
  },
  nextRound: next.round,
  facts: next.ledgers.facts,
  battlefield: next.world.battlefield,
});
