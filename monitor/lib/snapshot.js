const path = require('node:path');
const { transcriptPath, subagentsDirectory } = require('./claude-paths');
const { readLiveSessions, isPidAlive } = require('./live-sessions');
const { createTranscriptReader, emptyState } = require('./transcript-reader');
const { createSubagentReader } = require('./subagents');
const { summarizeToolUse } = require('./tool-summary');
const { createRepoRootResolver, workspaceOf } = require('./repo-root');
const { resolveTaskTitle } = require('./task-title');
const { buildAgentTree, groupIntoTasks, mainBoxOf } = require('./tasks');

const IDLE_STATUS = 'idle';
const WAITING_STATUS = 'waiting';
const BUSY_STATUS = 'busy';
const SESSION_WORKING_STATUSES = new Set([BUSY_STATUS, WAITING_STATUS]);
const ACTIVE_STATE = 'active';
const FINISHED_STATE = 'finished';
const AGENT_TITLE_SOURCE = 'agent';
const INFERRED_TITLE_SOURCE = 'inferred';
const SOLE_AGENT_TITLE_SOURCE = 'sole-agent';
const FIRST_AGENT_TITLE_SOURCE = 'first-agent';
const NO_TITLE = { title: null, titleSource: null };
const SOLE_AGENT_COUNT = 1;
const TASK_MINIMUM_DESCRIPTIONS = 1;
const FIRST_HELPER_DEPTH = 1;

function reportedStatus(record) {
  if (record.status === IDLE_STATUS) return IDLE_STATUS;
  if (record.status === WAITING_STATUS) return WAITING_STATUS;
  return BUSY_STATUS;
}

// the record can stay busy long after the session's own turn has closed, so a closed turn with no agent
// still working is idle; a missing transcript gives no turn to judge, so the record stands
function sessionStatusOf(record, transcript, agents) {
  const status = reportedStatus(record);
  if (status !== BUSY_STATUS || !transcript || transcript.state.running) return status;
  return agents.some((agent) => agent.state === ACTIVE_STATE) ? BUSY_STATUS : IDLE_STATUS;
}

function summarizeSession(status, transcriptState) {
  if (status === IDLE_STATUS) return 'Idle';
  if (status === WAITING_STATUS) return 'Waiting for input';
  return summarizeToolUse(transcriptState.lastToolUse);
}

function spawnerSetsOf(agents) {
  return new Map(agents.map((agent) => [agent.agentId, agent.spawnedToolUseIds]));
}

// the session works only on the task its latest prompt started, and only while its own turn is open;
// a later prompt that spawned no agent forms no task, yet it still moves the session off the earlier one
function isWorkedOnBySession(taskStartedAt, sessionTurn) {
  return sessionTurn.isOpen && taskStartedAt === sessionTurn.lastPromptAt;
}

function sessionTurnOf(status, transcriptState) {
  return { isOpen: SESSION_WORKING_STATUSES.has(status) && transcriptState.running, lastPromptAt: transcriptState.lastPromptAt };
}

function taskStateOf(task) {
  if (task.isWorkedOnBySession) return ACTIVE_STATE;
  return task.agents.every((agent) => agent.state === FINISHED_STATE) ? FINISHED_STATE : ACTIVE_STATE;
}

// a single-helper task never reaches the goal resolver's old two-description minimum, so without this
// fallback its box would render with no text at all
function describedAgentTitle(task) {
  const described = task.agents.find((agent) => agent.description !== '');
  if (described === undefined) return NO_TITLE;
  const titleSource = task.agents.length === SOLE_AGENT_COUNT ? SOLE_AGENT_TITLE_SOURCE : FIRST_AGENT_TITLE_SOURCE;
  return { title: described.description, titleSource };
}

function titleOf(mainAgent, task, resolveTitle) {
  if (mainAgent !== null) return { title: mainAgent.description, titleSource: AGENT_TITLE_SOURCE };
  const descriptions = task.agents.map((agent) => agent.description);
  const inferred = resolveTitle(task.taskId, descriptions, { minimumDescriptions: TASK_MINIMUM_DESCRIPTIONS });
  if (typeof inferred === 'string' && inferred !== '') return { title: inferred, titleSource: INFERRED_TITLE_SOURCE };
  return describedAgentTitle(task);
}

// a helper whose spawner belongs to an earlier task hangs off the main box, so a task stays self-contained
function placeHelper(agent, parentOf, depthByAgentId) {
  const spawnerAgentId = parentOf.get(agent.agentId);
  const parentAgentId = depthByAgentId.has(spawnerAgentId) ? spawnerAgentId : null;
  const depth = parentAgentId === null ? FIRST_HELPER_DEPTH : depthByAgentId.get(parentAgentId) + 1;
  depthByAgentId.set(agent.agentId, depth);
  return { agentId: agent.agentId, parentAgentId, description: agent.description, state: agent.state, depth };
}

function helpersOf(task, parentOf) {
  const depthByAgentId = new Map();
  return task.agents
    .filter((agent) => agent.agentId !== task.main.agentId)
    .map((agent) => placeHelper(agent, parentOf, depthByAgentId));
}

function describeTask(task, parentOf, resolveTitle) {
  const mainAgent = task.agents.find((agent) => agent.agentId === task.main.agentId) || null;
  return {
    taskId: task.taskId,
    startedAt: task.startedAt,
    ...titleOf(mainAgent, task, resolveTitle),
    main: { ...task.main, state: taskStateOf(task) },
    agents: helpersOf(task, parentOf),
  };
}

function describeTasks(agents, promptAts, resolveTitle, sessionTurn) {
  const parentOf = buildAgentTree(agents, spawnerSetsOf(agents));
  const agentById = new Map(agents.map((agent) => [agent.agentId, agent]));
  const grouped = groupIntoTasks(agents, promptAts, parentOf);
  return grouped.map((task) => describeTask({
    taskId: task.taskId,
    startedAt: task.startedAt,
    main: mainBoxOf(task, parentOf),
    agents: task.agentIds.map((agentId) => agentById.get(agentId)),
    isWorkedOnBySession: isWorkedOnBySession(task.startedAt, sessionTurn),
  }, parentOf, resolveTitle));
}

function describeSession(record, status, repoRoot, transcriptState, agents, goal, tasks) {
  const { taskTitle, taskTitleSource } = resolveTaskTitle(agents, transcriptState);
  return {
    sessionId: record.sessionId,
    pid: record.pid,
    cwd: record.cwd,
    project: path.basename(repoRoot),
    workspace: workspaceOf(record.cwd, repoRoot),
    name: typeof record.name === 'string' ? record.name : '',
    taskTitle,
    taskTitleSource,
    goal,
    goalSource: goal === null ? taskTitleSource : 'inferred',
    status,
    waitingFor: status === WAITING_STATUS && typeof record.waitingFor === 'string' ? record.waitingFor : null,
    statusUpdatedAt: record.statusUpdatedAt,
    startedAt: record.startedAt,
    model: transcriptState.model,
    version: typeof record.version === 'string' ? record.version : '',
    effort: transcriptState.effort,
    gitBranch: transcriptState.gitBranch,
    pendingBackgroundAgents: transcriptState.pendingBackgroundAgents,
    tokens: { ...transcriptState.tokens },
    lastTurnDurationMs: transcriptState.lastTurnDurationMs,
    currentTurnStartedAt: status === IDLE_STATUS ? null : transcriptState.lastPromptAt,
    summary: summarizeSession(status, transcriptState),
    agents,
    tasks,
  };
}

// sessions keep the order they started in, so a session's region never moves when its status changes
function compareSessions(left, right) {
  if (left.startedAt !== right.startedAt) return left.startedAt - right.startedAt;
  return left.sessionId.localeCompare(right.sessionId);
}

function summarizeProjects(sessions, repoRootOf) {
  const projectsByRoot = new Map();
  for (const session of sessions) {
    const root = repoRootOf(session.cwd);
    const project = projectsByRoot.get(root)
      || { cwd: root, name: path.basename(root), liveSessions: 0, workspaces: [] };
    project.liveSessions += 1;
    if (session.workspace !== null && !project.workspaces.includes(session.workspace)) {
      project.workspaces.push(session.workspace);
    }
    projectsByRoot.set(root, project);
  }
  const projects = [...projectsByRoot.values()];
  for (const project of projects) project.workspaces.sort((left, right) => left.localeCompare(right));
  return projects.sort((left, right) => left.name.localeCompare(right.name));
}

function createSnapshotBuilder({
  claudeDir,
  isAlive = isPidAlive,
  nowMs = Date.now,
  resolveGoal = () => null,
  resolveTitle = () => null,
}) {
  const transcriptReader = createTranscriptReader();
  const readSubagents = createSubagentReader({ transcriptReader });
  const repoRootOf = createRepoRootResolver();

  function describeLiveSession(record) {
    const transcript = transcriptReader.read(transcriptPath(claudeDir, record.cwd, record.sessionId));
    const transcriptState = transcript ? transcript.state : emptyState();
    const agents = readSubagents(subagentsDirectory(claudeDir, record.cwd, record.sessionId), transcriptState);
    const goal = resolveGoal(record.sessionId, agents);
    const status = sessionStatusOf(record, transcript, agents);
    const tasks = describeTasks(agents, transcriptState.promptAts, resolveTitle, sessionTurnOf(status, transcriptState));
    return describeSession(record, status, repoRootOf(record.cwd), transcriptState, agents, goal, tasks);
  }

  return function buildSnapshot() {
    transcriptReader.startSweep();
    const sessions = readLiveSessions(claudeDir, isAlive).map(describeLiveSession).sort(compareSessions);
    transcriptReader.finishSweep();
    return { generatedAt: nowMs(), projects: summarizeProjects(sessions, repoRootOf), sessions };
  };
}

module.exports = { createSnapshotBuilder };
