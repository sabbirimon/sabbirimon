import test from 'node:test';
import assert from 'node:assert/strict';
import { advance2048, canMove2048, create2048State, move2048, spawn2048Tile, valid2048Board } from '../docs/puzzle.js';

const board = first => [...first, ...Array(16 - first.length).fill(0)];
const state = tiles => ({ board: tiles, score: 0, won: false, continued: false, over: false });

test('a new game has two distinct tiles and no score', () => {
  const game = create2048State(() => 0);
  assert.deepEqual(game.board.slice(0, 4), [2, 2, 0, 0]);
  assert.equal(game.board.filter(Boolean).length, 2);
  assert.equal(game.score, 0);
  assert.equal(game.over, false);
});

test('a tile can merge only once in a move, even with four matching tiles', () => {
  const input = board([2, 2, 2, 2]);
  const result = move2048(input, 'left');
  assert.deepEqual(result.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(result.gained, 8);
  assert.deepEqual(input.slice(0, 4), [2, 2, 2, 2], 'input remains unchanged');
  assert.deepEqual(move2048(board([2, 2, 4, 0]), 'left').board.slice(0, 4), [4, 4, 0, 0]);
});

test('merge order follows the movement direction', () => {
  assert.deepEqual(move2048(board([2, 2, 2, 0]), 'left').board.slice(0, 4), [4, 2, 0, 0]);
  assert.deepEqual(move2048(board([2, 2, 2, 0]), 'right').board.slice(0, 4), [0, 0, 2, 4]);
  const vertical = [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0];
  assert.deepEqual([0, 4, 8, 12].map(i => move2048(vertical, 'up').board[i]), [4, 2, 0, 0]);
  assert.deepEqual([0, 4, 8, 12].map(i => move2048(vertical, 'down').board[i]), [0, 0, 2, 4]);
});

test('gaps compress before merging and different tiles do not merge', () => {
  const result = move2048(board([2, 0, 2, 4]), 'left');
  assert.deepEqual(result.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(result.gained, 4);
  assert.deepEqual(move2048(board([2, 4, 8, 16]), 'left').board.slice(0, 4), [2, 4, 8, 16]);
});

test('unchanged moves do not spawn tiles, change score, or consume randomness', () => {
  const game = state(board([2, 4, 8, 16]));
  game.score = 28;
  const result = advance2048(game, 'left', () => { throw new Error('Unexpected random call'); });
  assert.equal(result.changed, false);
  assert.equal(result.state, game);
  assert.equal(result.spawned, null);
  assert.equal(result.state.score, 28);
});

test('a changed move spawns exactly one tile and awards the merged values', () => {
  const game = state(board([2, 2, 4, 4]));
  const result = advance2048(game, 'left', () => 0);
  assert.equal(result.changed, true);
  assert.equal(result.state.score, 12);
  assert.deepEqual(result.state.board.slice(0, 4), [4, 8, 2, 0]);
  assert.equal(result.spawned, 2);
  assert.deepEqual(game.board.slice(0, 4), [2, 2, 4, 4]);
});

test('spawn chooses an empty square and supports both 2 and 4', () => {
  const input = board([2, 4, 8, 16]);
  let draws = [0.9999, 0.95];
  const result = spawn2048Tile(input, () => draws.shift());
  assert.equal(result.index, 15);
  assert.equal(result.value, 4);
  assert.equal(result.board[15], 4);
  assert.equal(input[15], 0);
  const full = Array(16).fill(2);
  assert.equal(spawn2048Tile(full, () => { throw new Error('No empty cells'); }).index, null);
});

test('a full alternating board is over but matching neighbors permit movement', () => {
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(canMove2048(full), false);
  const horizontal = [...full]; horizontal[1] = 2;
  assert.equal(canMove2048(horizontal), true);
  const vertical = [...full]; vertical[4] = 2;
  assert.equal(canMove2048(vertical), true);
  const empty = [...full]; empty[15] = 0;
  assert.equal(canMove2048(empty), true);
});

test('a final legal move can fill the board and end the game after spawning', () => {
  const game = state([0, 2, 4, 2, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
  const result = advance2048(game, 'left', () => 0.95);
  assert.equal(result.changed, true);
  assert.equal(result.state.over, true);
  assert.equal(canMove2048(result.state.board), false);
});

test('2048 wins once and the board remains playable beyond the target', () => {
  const game = state(board([1024, 1024, 0, 0]));
  const result = advance2048(game, 'left', () => 0);
  assert.equal(result.firstWin, true);
  assert.equal(result.state.won, true);
  assert.equal(result.state.score, 2048);
  assert.equal(result.state.over, false);
  const continued = { ...result.state, continued: true };
  const another = advance2048(continued, 'down', () => 0);
  assert.equal(another.firstWin, false);
  assert.equal(another.state.won, true);
  assert.equal(another.state.continued, true);
  assert.equal(move2048(board([2048, 2048]), 'left').board[0], 4096);
});

test('an ended game cannot move or spawn and snapshots support exact one-step undo', () => {
  const game = state(board([2, 2]));
  const snapshot = structuredClone(game);
  const moved = advance2048(game, 'left', () => 0);
  assert.notDeepEqual(moved.state.board, snapshot.board);
  assert.deepEqual(game, snapshot);
  const over = { ...moved.state, over: true };
  assert.equal(advance2048(over, 'right', () => { throw new Error('Ended game'); }).state, over);
});

test('saved board validation rejects malformed and non-power-of-two tiles', () => {
  assert.equal(valid2048Board(board([2, 4, 1024, 4096])), true);
  for (const invalid of [null, [], Array(16).fill(-2), Array(16).fill(3), Array(16).fill(Infinity), Array(16).fill('2'), Array(16).fill(2 ** 52 - 1)]) assert.equal(valid2048Board(invalid), false);
});
