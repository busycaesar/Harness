const fs = require('node:fs');
const path = require('node:path');
const { parseJsonFile } = require('./live-sessions');
const { summarizeToolUse } = require('./tool-summary');
const { emptyState } = require('./transcript-reader');

const META_FILE_PATTERN = /^agent-(.+)\.meta\.json$/;
const FINISHED_AFTER_IDLE_MS = 60000;
const END_TURN = 'end_turn';

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

function agentState(transcript, nowMs) {
  if (!transcript) return 'active';
  const endedTurn = transcript.state.lastStopReason === END_TURN;
  const idleTooLong = nowMs - transcript.modifiedAtMs > FINISHED_AFTER_IDLE_MS;
  return endedTurn || idleTooLong ? 'finished' : 'active';
}

function describeAgent(agentId, { meta, spawnedAt }, transcript, nowMs) {
  const state = agentState(transcript, nowMs);
  const transcriptState = transcript ? transcript.state : null;
  return {
    agentId,
    agentType: typeof meta.agentType === 'string' ? meta.agentType : '',
    description: typeof meta.description === 'string' ? meta.description : '',
    spawnDepth: Number.isFinite(meta.spawnDepth) ? meta.spawnDepth : 0,
    spawnedAt,
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

function createSubagentReader({ transcriptReader, nowMs }) {
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

  return function readSubagents(directory) {
    const agents = [];
    for (const agentId of listAgentIds(directory)) {
      const entry = metaFor(path.join(directory, `agent-${agentId}.meta.json`));
      if (!entry) continue;
      const transcript = transcriptReader.read(path.join(directory, `agent-${agentId}.jsonl`));
      agents.push(describeAgent(agentId, entry, transcript, nowMs()));
    }
    return agents.sort(compareAgents);
  };
}

module.exports = { createSubagentReader };
