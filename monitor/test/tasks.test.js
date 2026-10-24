const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAgentTree, groupIntoTasks, mainBoxOf } = require('../lib/tasks');

function agent(agentId, spawnedAt) {
  return { agentId, toolUseId: `toolu-${agentId}`, spawnedAt, state: 'active', description: `work of ${agentId}` };
}

function spawnerSets(spawnedIdsBySpawner) {
  return new Map(Object.entries(spawnedIdsBySpawner).map(([spawnerAgentId, childAgentIds]) => [
    spawnerAgentId,
    new Set(childAgentIds.map((childAgentId) => `toolu-${childAgentId}`)),
  ]));
}

function taskIdsOf(tasks) {
  return tasks.map((task) => task.taskId);
}

test('the worked example: a delegated agent owns its task, several session helpers leave the session driving', () => {
  const agents = [
    agent('dev', 1100),
    agent('implementer', 1200),
    agent('tester', 1300),
    agent('clean-code-scan', 2100),
    agent('rule-scan', 2200),
  ];
  const promptAts = [1000, 2000];
  const parentOf = buildAgentTree(agents, spawnerSets({ dev: ['implementer', 'tester'] }));

  const tasks = groupIntoTasks(agents, promptAts, parentOf);

  assert.deepEqual(tasks, [
    { taskId: 'task-1000', startedAt: 1000, rootAgentId: 'dev', agentIds: ['dev', 'implementer', 'tester'] },
    { taskId: 'task-2000', startedAt: 2000, rootAgentId: null, agentIds: ['clean-code-scan', 'rule-scan'] },
  ]);
  assert.deepEqual(mainBoxOf(tasks[0], parentOf), { kind: 'agent', agentId: 'dev' });
  assert.deepEqual(mainBoxOf(tasks[1], parentOf), { kind: 'session', agentId: null });
});

test('a three-level tree resolves every agent to the spawner that issued its tool use', () => {
  const agents = [agent('planner', 1100), agent('builder', 1200), agent('reviewer', 1300)];

  const parentOf = buildAgentTree(agents, spawnerSets({ planner: ['builder'], builder: ['reviewer'] }));

  assert.deepEqual([...parentOf], [['planner', null], ['builder', 'planner'], ['reviewer', 'builder']]);
});

test('a task whose only agent was spawned by an agent of an earlier task falls to the session', () => {
  const agents = [agent('owner', 1100), agent('late-helper', 2100)];
  const parentOf = buildAgentTree(agents, spawnerSets({ owner: ['late-helper'] }));

  const tasks = groupIntoTasks(agents, [1000, 2000], parentOf);

  assert.equal(tasks[1].rootAgentId, null);
  assert.deepEqual(mainBoxOf(tasks[1], parentOf), { kind: 'session', agentId: null });
});

test('an agent spawned before any prompt belongs to no task', () => {
  const agents = [agent('leftover', 900), agent('asked-for', 2100)];
  const parentOf = buildAgentTree(agents, spawnerSets({}));

  const tasks = groupIntoTasks(agents, [2000], parentOf);

  assert.deepEqual(tasks, [
    { taskId: 'task-2000', startedAt: 2000, rootAgentId: 'asked-for', agentIds: ['asked-for'] },
  ]);
});

test('an agent whose spawn time is unknown belongs to no task', () => {
  const agents = [agent('undated', null), agent('dated', 2100)];
  const parentOf = buildAgentTree(agents, spawnerSets({}));

  const tasks = groupIntoTasks(agents, [2000], parentOf);

  assert.deepEqual(tasks[0].agentIds, ['dated']);
  assert.equal(tasks.length, 1);
});

test('a prompt that produced no agents produces no task', () => {
  const agents = [agent('first', 1100), agent('third', 3100)];
  const parentOf = buildAgentTree(agents, spawnerSets({}));

  const tasks = groupIntoTasks(agents, [1000, 2000, 3000], parentOf);

  assert.deepEqual(taskIdsOf(tasks), ['task-1000', 'task-3000']);
});

test('tasks run oldest first, whatever order the agents arrive in', () => {
  const agents = [agent('newest', 3100), agent('oldest', 1100), agent('middle', 2100)];
  const parentOf = buildAgentTree(agents, spawnerSets({}));

  const tasks = groupIntoTasks(agents, [1000, 2000, 3000], parentOf);

  assert.deepEqual(tasks.map((task) => task.startedAt), [1000, 2000, 3000]);
  assert.deepEqual(taskIdsOf(tasks), ['task-1000', 'task-2000', 'task-3000']);
});

test('agents keep their spawn order inside a task', () => {
  const agents = [agent('third', 1300), agent('first', 1100), agent('second', 1200)];
  const parentOf = buildAgentTree(agents, spawnerSets({}));

  const tasks = groupIntoTasks(agents, [1000], parentOf);

  assert.deepEqual(tasks[0].agentIds, ['first', 'second', 'third']);
});

test('a finished agent stays in its task', () => {
  const finished = { ...agent('done', 1100), state: 'finished' };
  const parentOf = buildAgentTree([finished], spawnerSets({}));

  const tasks = groupIntoTasks([finished], [1000], parentOf);

  assert.deepEqual(tasks[0].agentIds, ['done']);
  assert.deepEqual(mainBoxOf(tasks[0], parentOf), { kind: 'agent', agentId: 'done' });
});

test('an agent that names its parent outright is attached to it without any tool-use matching', () => {
  const skillLaunched = { agentId: 'checklist', parentAgentId: 'dev', spawnedAt: 1100, state: 'active', description: 'work' };

  const parentOf = buildAgentTree([agent('dev', 1100), skillLaunched], spawnerSets({}));

  assert.equal(parentOf.get('checklist'), 'dev');
});

test('the named parent wins over a tool use that would match another spawner', () => {
  const claimed = { ...agent('implementer', 1200), parentAgentId: 'planner' };

  const parentOf = buildAgentTree([agent('dev', 1100), claimed], spawnerSets({ dev: ['implementer'] }));

  assert.equal(parentOf.get('implementer'), 'planner');
});

test('an agent carrying neither link falls to the session instead of breaking the tree', () => {
  const linkless = { agentId: 'nameless', spawnedAt: 1100, state: 'active', description: 'work' };

  const parentOf = buildAgentTree([linkless], spawnerSets({}));

  assert.equal(parentOf.get('nameless'), null);
});

test('refuses a task agent that is missing from the spawn tree', () => {
  const task = { taskId: 'task-1000', startedAt: 1000, rootAgentId: null, agentIds: ['stranger'] };

  assert.throws(() => mainBoxOf(task, new Map()), { message: /agent stranger is missing from the spawn tree/ });
});
