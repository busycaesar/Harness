const test = require('node:test');
const assert = require('node:assert/strict');
const { createTokenHistory } = require('../lib/token-history');

test('records the first sample for a box', () => {
  const history = createTokenHistory();
  assert.deepEqual(history.sample('s:task-1', 100, 1000), [[1000, 100]]);
});

test('ignores a sample whose total has not moved', () => {
  const history = createTokenHistory();
  history.sample('s:task-1', 100, 1000);
  assert.deepEqual(history.sample('s:task-1', 100, 2000), [[1000, 100]]);
});

test('appends a sample when the total moves', () => {
  const history = createTokenHistory();
  history.sample('s:task-1', 100, 1000);
  assert.deepEqual(history.sample('s:task-1', 180, 2000), [[1000, 100], [2000, 180]]);
});

test('keeps series apart per box', () => {
  const history = createTokenHistory();
  history.sample('s:task-1', 100, 1000);
  history.sample('s:task-2', 7, 1000);
  assert.deepEqual(history.sample('s:task-2', 9, 2000), [[1000, 7], [2000, 9]]);
});

test('keeps only the most recent samples', () => {
  const history = createTokenHistory({ maxSamples: 3 });
  for (let i = 1; i <= 5; i += 1) history.sample('s:task-1', i * 10, i * 1000);
  assert.deepEqual(history.sample('s:task-1', 60, 6000), [[4000, 40], [5000, 50], [6000, 60]]);
});

test('returns a copy, so a later sample cannot change a snapshot already built', () => {
  const history = createTokenHistory();
  const taken = history.sample('s:task-1', 100, 1000);
  history.sample('s:task-1', 200, 2000);
  assert.deepEqual(taken, [[1000, 100]]);
});

test('forgets a box that no longer appears, and keeps one that does', () => {
  const history = createTokenHistory();
  history.sample('s:gone', 100, 1000);
  history.sample('s:stays', 100, 1000);
  history.forgetUnseen();

  history.sample('s:stays', 150, 2000);
  history.forgetUnseen();

  assert.deepEqual(history.sample('s:stays', 170, 3000), [[1000, 100], [2000, 150], [3000, 170]]);
  assert.deepEqual(history.sample('s:gone', 100, 4000), [[4000, 100]]);
});
