const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createGoalResolver } = require('../lib/session-goal');
const { makeTempDirectory, removeDirectory } = require('./helpers');

const FAKE_CLI = path.join(__dirname, 'fake-cli');
const NOW = 1_000_000_000;
const MINUTE_MS = 60000;
const FAKE_CLI_VARIABLES = ['FAKE_CLI_REPLY', 'FAKE_CLI_EXIT', 'FAKE_CLI_DELAY_MS', 'FAKE_CLI_CALLS_FILE', 'MONITOR_GOAL_CLI'];

function agentsNamed(count, prefix = 'task') {
  return Array.from({ length: count }, (unused, index) => ({
    description: `${prefix} ${index + 1}`,
    spawnedAt: NOW - (count - index) * 1000,
  }));
}

function callsIn(callsFile) {
  if (!fs.existsSync(callsFile)) return [];
  return fs.readFileSync(callsFile, 'utf8').split('\n').filter((line) => line !== '');
}

function startsIn(callsFile) {
  return callsIn(callsFile).filter((line) => line.startsWith('start '));
}

function withHarness(run, fakeCliEnvironment = {}) {
  const directory = makeTempDirectory();
  const saved = Object.fromEntries(FAKE_CLI_VARIABLES.map((name) => [name, process.env[name]]));
  const callsFile = path.join(directory, 'calls.txt');
  process.env.FAKE_CLI_CALLS_FILE = callsFile;
  for (const [name, value] of Object.entries(fakeCliEnvironment)) process.env[name] = value;
  const logLines = [];
  let clock = NOW;
  const resolverWith = (overrides = {}) => createGoalResolver({
    cacheFile: path.join(directory, 'goals.json'),
    cliPath: FAKE_CLI,
    nowMs: () => clock,
    log: (line) => logLines.push(line),
    ...overrides,
  });
  const harness = {
    callsFile,
    logLines,
    cacheFile: path.join(directory, 'goals.json'),
    resolverWith,
    advanceMs: (milliseconds) => { clock += milliseconds; },
  };
  return Promise.resolve(run(harness)).finally(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    removeDirectory(directory);
  });
}

test('infers a goal once and then serves it from cache without spawning again', () => withHarness(
  async ({ resolverWith, callsFile, logLines }) => {
    const resolver = resolverWith();
    const agents = agentsNamed(4);
    assert.equal(resolver.resolveGoal('s1', agents), null);
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agents), 'Build a task monitoring dashboard');
    assert.equal(resolver.resolveGoal('s1', agents), 'Build a task monitoring dashboard');
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 1);
    assert.equal(logLines.length, 1);
    assert.match(logLines[0], /goal for s1 from 4 agents in \d+ms: Build a task monitoring dashboard/);
  },
));

test('sends only agent descriptions, oldest first, capped at the 40 most recent', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(45));
    await resolver.whenQuiet();
    const [call] = startsIn(callsFile);
    assert.match(call, /^start -p --model claude-haiku-4-5-20251001 :: /);
    assert.ok(!call.includes('task 5\\n'));
    assert.ok(call.includes('1. task 6'));
    assert.ok(call.includes('40. task 45'));
    assert.ok(call.indexOf('task 6') < call.indexOf('task 45'));
  },
));

test('regenerates only once both 8 new agents and 10 minutes have passed', () => withHarness(
  async ({ resolverWith, callsFile, advanceMs }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(4));
    await resolver.whenQuiet();

    advanceMs(11 * MINUTE_MS);
    resolver.resolveGoal('s1', agentsNamed(11));
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 1, 'enough time but only 7 new agents');

    resolver.resolveGoal('s1', agentsNamed(12));
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 2, 'eight new agents and enough time');

    advanceMs(9 * MINUTE_MS);
    resolver.resolveGoal('s1', agentsNamed(40));
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 2, 'many new agents but not yet 10 minutes');

    advanceMs(MINUTE_MS);
    resolver.resolveGoal('s1', agentsNamed(40));
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 3);
  },
));

test('keeps the cached goal verbatim while it is not due for regeneration', () => withHarness(
  async ({ resolverWith, advanceMs }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(4));
    await resolver.whenQuiet();
    process.env.FAKE_CLI_REPLY = 'A completely different goal';
    advanceMs(60 * MINUTE_MS);
    assert.equal(resolver.resolveGoal('s1', agentsNamed(11)), 'Build a task monitoring dashboard');
  },
));

test('a failing CLI leaves the goal null and backs off for thirty minutes', () => withHarness(
  async ({ resolverWith, callsFile, advanceMs, logLines }) => {
    const resolver = resolverWith();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    assert.match(logLines[0], /goal inference failed for s1 after \d+ms: exit code 3/);

    advanceMs(29 * MINUTE_MS);
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 1, 'still inside the backoff window');

    advanceMs(MINUTE_MS);
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 2);
  },
  { FAKE_CLI_EXIT: '3' },
));

test('ignores the MCP diagnostic the CLI prints on stdout beside the answer', () => withHarness(
  async ({ resolverWith }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), 'Keep the heading still');
  },
  { FAKE_CLI_REPLY: 'Keep the heading still' },
));

test('rejects an answer longer than eighty characters', () => withHarness(
  async ({ resolverWith, logLines }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    assert.match(logLines[0], /answer longer than 80 characters/);
  },
  { FAKE_CLI_REPLY: 'x'.repeat(81) },
));

test('rejects a multi-line answer', () => withHarness(
  async ({ resolverWith, logLines }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    assert.match(logLines[0], /multi-line answer/);
  },
  { FAKE_CLI_REPLY: 'Here is the goal:\nBuild a dashboard' },
));

test('rejects an empty answer', () => withHarness(
  async ({ resolverWith, logLines }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.match(logLines[0], /empty answer/);
  },
  { FAKE_CLI_REPLY: '   ' },
));

test('kills a child that overruns its timeout and records the failure', () => withHarness(
  async ({ resolverWith, logLines }) => {
    const resolver = resolverWith({ timeoutMs: 120 });
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    assert.match(logLines[0], /no answer within 120ms/);
  },
  { FAKE_CLI_DELAY_MS: '5000' },
));

test('a missing CLI fails without crashing the resolver', () => withHarness(
  async ({ resolverWith, logLines }) => {
    const resolver = resolverWith({ cliPath: path.join(__dirname, 'no-such-cli') });
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    assert.match(logLines[0], /goal inference failed for s1/);
  },
));

test('a session with fewer than two described agents is never inferred', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    const resolver = resolverWith();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(1)), null);
    assert.equal(resolver.resolveGoal('s2', []), null);
    assert.equal(resolver.resolveGoal('s3', [{ description: '', spawnedAt: NOW }, { description: '', spawnedAt: NOW }]), null);
    await resolver.whenQuiet();
    assert.deepEqual(startsIn(callsFile), []);
  },
));

test('runs one CLI child at a time across sessions', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    const resolver = resolverWith();
    resolver.resolveGoal('s1', agentsNamed(3, 'one'));
    resolver.resolveGoal('s2', agentsNamed(3, 'two'));
    resolver.resolveGoal('s3', agentsNamed(3, 'three'));
    await resolver.whenQuiet();
    const kinds = callsIn(callsFile).map((line) => (line.startsWith('start ') ? 'start' : 'end'));
    assert.deepEqual(kinds, ['start', 'end', 'start', 'end', 'start', 'end']);
  },
  { FAKE_CLI_DELAY_MS: '40' },
));

test('a second resolver reuses the goal on disk without spawning', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    const first = resolverWith();
    first.resolveGoal('s1', agentsNamed(4));
    await first.whenQuiet();

    const restarted = resolverWith();
    assert.equal(restarted.resolveGoal('s1', agentsNamed(4)), 'Build a task monitoring dashboard');
    await restarted.whenQuiet();
    assert.equal(startsIn(callsFile).length, 1);
  },
));

test('a corrupt cache file is tolerated and replaced', () => withHarness(
  async ({ resolverWith, cacheFile }) => {
    fs.writeFileSync(cacheFile, '{not json at all');
    const resolver = resolverWith();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), 'Build a task monitoring dashboard');
    assert.equal(JSON.parse(fs.readFileSync(cacheFile, 'utf8')).s1.agentCount, 3);
  },
));

test('two cache keys keep their own titles without colliding', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    const resolver = resolverWith();
    assert.equal(resolver.resolveTitle('task-1', ['write the parser', 'write its tests']), null);
    await resolver.whenQuiet();
    process.env.FAKE_CLI_REPLY = 'Render the second task';
    assert.equal(resolver.resolveTitle('task-2', ['draw the boxes', 'connect the helpers']), null);
    await resolver.whenQuiet();

    assert.equal(resolver.resolveTitle('task-1', ['write the parser', 'write its tests']), 'Build a task monitoring dashboard');
    assert.equal(resolver.resolveTitle('task-2', ['draw the boxes', 'connect the helpers']), 'Render the second task');
    assert.equal(startsIn(callsFile).length, 2);
  },
));

test('minimumDescriptions of one infers a title from a single description', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    const resolver = resolverWith();
    assert.equal(resolver.resolveTitle('task-1', ['write the parser'], { minimumDescriptions: 1 }), null);
    await resolver.whenQuiet();
    assert.equal(resolver.resolveTitle('task-1', ['write the parser'], { minimumDescriptions: 1 }), 'Build a task monitoring dashboard');
    const [call] = startsIn(callsFile);
    assert.ok(call.includes('1. write the parser'));
  },
));

test('a single description is skipped under the default minimum', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    const resolver = resolverWith();
    assert.equal(resolver.resolveTitle('task-1', ['write the parser']), null);
    await resolver.whenQuiet();
    assert.deepEqual(startsIn(callsFile), []);
  },
));

test('an entry written in an older shape is regenerated rather than crashing', () => withHarness(
  async ({ resolverWith, cacheFile }) => {
    fs.writeFileSync(cacheFile, JSON.stringify({ s1: 'Build a task monitoring dashboard', s2: { goal: 7 } }));
    const resolver = resolverWith();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), null);
    assert.equal(resolver.resolveTitle('s2', ['write the parser', 'write its tests']), null);
    await resolver.whenQuiet();
    assert.equal(resolver.resolveGoal('s1', agentsNamed(3)), 'Build a task monitoring dashboard');
    assert.equal(resolver.resolveTitle('s2', ['write the parser', 'write its tests']), 'Build a task monitoring dashboard');
    assert.equal(JSON.parse(fs.readFileSync(cacheFile, 'utf8')).s1.agentCount, 3);
  },
));

test('an empty cache key is rejected instead of being written to the cache', () => withHarness(
  async ({ resolverWith }) => {
    const resolver = resolverWith();
    assert.throws(() => resolver.resolveTitle('', ['one', 'two']), /non-empty string/);
    await resolver.whenQuiet();
  },
));

test('the CLI path comes from MONITOR_GOAL_CLI when no path is given', () => withHarness(
  async ({ resolverWith, callsFile }) => {
    process.env.MONITOR_GOAL_CLI = FAKE_CLI;
    const resolver = resolverWith({ cliPath: undefined });
    resolver.resolveGoal('s1', agentsNamed(3));
    await resolver.whenQuiet();
    assert.equal(startsIn(callsFile).length, 1);
  },
));
