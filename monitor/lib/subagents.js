const fs = require('node:fs');
const path = require('node:path');
const { parseJsonFile } = require('./live-sessions');
const { summarizeToolUse } = require('./tool-summary');
const { emptyState } = require('./transcript-reader');

const META_FILE_PATTERN = /^agent-(.+)\.meta\.json$/;

function listAgentIds(directory) {
  try {
    return fs.readdirSync(directory)
      .map((name) => META_FILE_PATTERN.exec(name))
      .filter(Boolean)
      .map((match) => match[1]);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// an agent that never reaches a terminal stop reason leaves no trace of its death, so the session
// is asked instead: a turn it ended after the agent fell silent, carrying no pending agents, buries it
function sessionOutlivedAgent(sessionState, lastActivityAt) {
  if (sessionState.pendingBackgroundAgents !== 0) return false;
  if (sessionState.pendingBackgroundAgentsAt === null || lastActivityAt === null) return false;
  return sessionState.pendingBackgroundAgentsAt > lastActivityAt;
}

function agentState(transcript, sessionState) {
  if (!transcript) return 'active';
  if (!transcript.state.running) return 'finished';
  return sessionOutlivedAgent(sessionState, transcript.state.lastActivityAt) ? 'finished' : 'active';
}

function describeAgent(agentId, { meta, spawnedAt }, transcript, sessionState) {
  const state = agentState(transcript, sessionState);
  const transcriptState = transcript ? transcript.state : null;
  return {
    agentId,
    agentType: typeof meta.agentType === 'string' ? meta.agentType : '',
    description: typeof meta.description === 'string' ? meta.description : '',
    toolUseId: typeof meta.toolUseId === 'string' ? meta.toolUseId : '',
    parentAgentId: typeof meta.parentAgentId === 'string' ? meta.parentAgentId : '',
    spawnDepth: Number.isFinite(meta.spawnDepth) ? meta.spawnDepth : 0,
    spawnedAt,
    spawnedToolUseIds: (transcriptState || emptyState()).spawnedToolUseIds,
    model: transcriptState ? transcriptState.model : null,
    state,
    tokens: { ...(transcriptState || emptyState()).tokens },
    summary: state === 'finished' ? 'Finished' : summarizeToolUse(transcriptState && transcriptState.lastToolUse),
    lastActivityAt: transcriptState ? transcriptState.lastActivityAt : null,
  };
}

function compareAgents(left, right) {
  if (left.state !== right.state) return left.state === 'active' ? -1 : 1;
  return (right.lastActivityAt || 0) - (left.lastActivityAt || 0);
}

function spawnTimeOf(metaPath) {
  try {
    return fs.statSync(metaPath).mtimeMs;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function createSubagentReader({ transcriptReader }) {
  const metaByPath = new Map();

  // the meta file is written once, when the agent is spawned, so its mtime is the spawn time
  function metaFor(metaPath) {
    if (metaByPath.has(metaPath)) return metaByPath.get(metaPath);
    const meta = parseJsonFile(metaPath);
    if (!meta || typeof meta !== 'object') return null;
    const entry = { meta, spawnedAt: spawnTimeOf(metaPath) };
    metaByPath.set(metaPath, entry);
    return entry;
  }

  return function readSubagents(directory, sessionState) {
    const agents = [];
    for (const agentId of listAgentIds(directory)) {
      const entry = metaFor(path.join(directory, `agent-${agentId}.meta.json`));
      if (!entry) continue;
      const transcript = transcriptReader.read(path.join(directory, `agent-${agentId}.jsonl`));
      agents.push(describeAgent(agentId, entry, transcript, sessionState));
    }
    return agents.sort(compareAgents);
  };
}

module.exports = { createSubagentReader };
