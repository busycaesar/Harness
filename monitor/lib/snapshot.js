const path = require('node:path');
const { transcriptPath, subagentsDirectory } = require('./claude-paths');
const { readLiveSessions, isPidAlive } = require('./live-sessions');
const { createTranscriptReader, emptyState } = require('./transcript-reader');
const { createSubagentReader } = require('./subagents');
const { summarizeToolUse } = require('./tool-summary');
const { createRepoRootResolver, workspaceOf } = require('./repo-root');
const { resolveTaskTitle } = require('./task-title');

const IDLE_STATUS = 'idle';
const WAITING_STATUS = 'waiting';

function reportedStatus(record) {
  if (record.status === IDLE_STATUS) return IDLE_STATUS;
  if (record.status === WAITING_STATUS) return WAITING_STATUS;
  return 'busy';
}

function summarizeSession(record, transcriptState) {
  if (record.status === IDLE_STATUS) return 'Idle';
  if (record.status === WAITING_STATUS) return 'Waiting for input';
  return summarizeToolUse(transcriptState.lastToolUse);
}

function describeSession(record, repoRoot, transcriptState, agents) {
  const status = reportedStatus(record);
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
    status,
    waitingFor: record.status === WAITING_STATUS && typeof record.waitingFor === 'string' ? record.waitingFor : null,
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
    summary: summarizeSession(record, transcriptState),
    agents,
  };
}

const STATUS_ORDER = { waiting: 0, busy: 1, idle: 2 };

function compareSessions(left, right) {
  if (left.status !== right.status) return STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  return right.statusUpdatedAt - left.statusUpdatedAt;
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

function createSnapshotBuilder({ claudeDir, isAlive = isPidAlive, nowMs = Date.now }) {
  const transcriptReader = createTranscriptReader();
  const readSubagents = createSubagentReader({ transcriptReader, nowMs });
  const repoRootOf = createRepoRootResolver();

  function describeLiveSession(record) {
    const transcript = transcriptReader.read(transcriptPath(claudeDir, record.cwd, record.sessionId));
    const transcriptState = transcript ? transcript.state : emptyState();
    const agents = readSubagents(subagentsDirectory(claudeDir, record.cwd, record.sessionId));
    return describeSession(record, repoRootOf(record.cwd), transcriptState, agents);
  }

  return function buildSnapshot() {
    transcriptReader.startSweep();
    const sessions = readLiveSessions(claudeDir, isAlive).map(describeLiveSession).sort(compareSessions);
    transcriptReader.finishSweep();
    return { generatedAt: nowMs(), projects: summarizeProjects(sessions, repoRootOf), sessions };
  };
}

module.exports = { createSnapshotBuilder };
