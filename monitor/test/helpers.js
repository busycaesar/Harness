const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { projectDirectoryName } = require('../lib/claude-paths');

function makeTempDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'monitor-test-'));
}

function removeDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

function assistantLine({ id, requestId = `req-${id}`, usage, model = 'claude-test', stopReason = 'tool_use', blocks = [], timestamp }) {
  return {
    type: 'assistant',
    requestId,
    timestamp,
    message: { id, model, stop_reason: stopReason, usage, content: blocks },
  };
}

function promptLine(timestamp, text = 'do the thing') {
  return { type: 'user', timestamp, message: { role: 'user', content: text } };
}

function toolResultLine(timestamp) {
  return {
    type: 'user',
    timestamp,
    toolUseResult: { stdout: 'ok' },
    message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] },
  };
}

function toolUseBlock(name, input = {}) {
  return { type: 'tool_use', id: `toolu-${name}`, name, input };
}

function usageOf(input, output, cacheRead = 0, cacheCreation = 0) {
  return {
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: cacheCreation,
  };
}

function toJsonl(records) {
  return records.map((record) => JSON.stringify(record)).join('\n') + '\n';
}

function writeTranscript(filePath, records) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, toJsonl(records));
}

function appendToTranscript(filePath, records) {
  fs.appendFileSync(filePath, toJsonl(records));
}

function writeSessionFile(claudeDir, record) {
  const directory = path.join(claudeDir, 'sessions');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `${record.pid}.json`), JSON.stringify(record));
}

function sessionRecord(overrides = {}) {
  return {
    pid: 1001,
    sessionId: 'session-a',
    cwd: path.join(os.tmpdir(), 'demo-project'),
    startedAt: 1000,
    version: '9.9.9',
    kind: 'interactive',
    name: 'demo',
    status: 'busy',
    updatedAt: 2000,
    statusUpdatedAt: 2000,
    ...overrides,
  };
}

function sessionDirectoryFor(claudeDir, record) {
  return path.join(claudeDir, 'projects', projectDirectoryName(record.cwd));
}

function writeSubagent(claudeDir, record, agentId, meta, transcriptRecords) {
  const directory = path.join(sessionDirectoryFor(claudeDir, record), record.sessionId, 'subagents');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `agent-${agentId}.meta.json`), JSON.stringify(meta));
  const transcriptFile = path.join(directory, `agent-${agentId}.jsonl`);
  if (transcriptRecords) writeTranscript(transcriptFile, transcriptRecords);
  return transcriptFile;
}

module.exports = {
  makeTempDirectory,
  removeDirectory,
  assistantLine,
  promptLine,
  toolResultLine,
  toolUseBlock,
  usageOf,
  writeTranscript,
  appendToTranscript,
  writeSessionFile,
  sessionRecord,
  sessionDirectoryFor,
  writeSubagent,
};
