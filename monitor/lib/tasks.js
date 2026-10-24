const SESSION_SPAWNED = null;
const NO_TASK = -1;
const TASK_ID_PREFIX = 'task-';
const AGENT_BOX = 'agent';
const SESSION_BOX = 'session';

function matchedSpawnerOf(toolUseId, spawnerSets) {
  if (typeof toolUseId !== 'string' || toolUseId === '') return SESSION_SPAWNED;
  for (const [spawnerAgentId, spawnedToolUseIds] of spawnerSets) {
    if (spawnedToolUseIds.has(toolUseId)) return spawnerAgentId;
  }
  return SESSION_SPAWNED;
}

// a meta that names its spawner outright is authoritative and needs no matching; a meta that carries
// neither link leaves the agent on the session, because one unreadable record must not cost the snapshot
function spawnerOf(agent, spawnerSets) {
  const namedParentAgentId = agent.parentAgentId;
  if (typeof namedParentAgentId === 'string' && namedParentAgentId !== '') return namedParentAgentId;
  return matchedSpawnerOf(agent.toolUseId, spawnerSets);
}

function buildAgentTree(agents, spawnerSets) {
  const parentOf = new Map();
  for (const agent of agents) {
    parentOf.set(agent.agentId, spawnerOf(agent, spawnerSets));
  }
  return parentOf;
}

function promptIndexOf(spawnedAt, promptAts) {
  if (!Number.isFinite(spawnedAt)) return NO_TASK;
  let latest = NO_TASK;
  for (const [index, promptAt] of promptAts.entries()) {
    if (promptAt > spawnedAt) break;
    latest = index;
  }
  return latest;
}

function agentIdsByPromptIndex(agents, promptAts) {
  const idsByIndex = new Map();
  const dated = agents
    .map((agent) => ({ agentId: agent.agentId, spawnedAt: agent.spawnedAt, promptIndex: promptIndexOf(agent.spawnedAt, promptAts) }))
    .filter((entry) => entry.promptIndex !== NO_TASK)
    .sort((left, right) => left.spawnedAt - right.spawnedAt);
  for (const entry of dated) {
    const agentIds = idsByIndex.get(entry.promptIndex) || [];
    agentIds.push(entry.agentId);
    idsByIndex.set(entry.promptIndex, agentIds);
  }
  return idsByIndex;
}

function parentAgentIdOf(agentId, parentOf) {
  if (!parentOf.has(agentId)) throw new Error(`agent ${agentId} is missing from the spawn tree`);
  return parentOf.get(agentId);
}

// the session delegated the whole task only when exactly one agent answers to it directly; several
// of them mean the session is driving the task itself and those agents are its helpers
function soleSessionSpawnedAgentId(agentIds, parentOf) {
  const sessionSpawned = agentIds.filter((agentId) => parentAgentIdOf(agentId, parentOf) === SESSION_SPAWNED);
  return sessionSpawned.length === 1 ? sessionSpawned[0] : null;
}

function groupIntoTasks(agents, promptAts, parentOf) {
  const idsByIndex = agentIdsByPromptIndex(agents, promptAts);
  const tasks = [];
  for (const [promptIndex, startedAt] of promptAts.entries()) {
    const agentIds = idsByIndex.get(promptIndex);
    if (!agentIds) continue;
    tasks.push({
      taskId: `${TASK_ID_PREFIX}${startedAt}`,
      startedAt,
      rootAgentId: soleSessionSpawnedAgentId(agentIds, parentOf),
      agentIds,
    });
  }
  return tasks;
}

function mainBoxOf(task, parentOf) {
  const agentId = soleSessionSpawnedAgentId(task.agentIds, parentOf);
  return agentId === null ? { kind: SESSION_BOX, agentId: null } : { kind: AGENT_BOX, agentId };
}

module.exports = { buildAgentTree, groupIntoTasks, mainBoxOf };
