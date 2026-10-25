const fs = require('node:fs');
const { describeToolUse } = require('./tool-summary');

const NEWLINE_BYTE = 0x0a;
const SYNTHETIC_MODEL = '<synthetic>';
const TERMINAL_STOP_REASONS = new Set(['end_turn', 'stop_sequence', 'max_tokens', 'refusal']);
const SPAWN_TOOL_NAME = 'Agent';
const HANDBACK_TOOL_NAME = 'SubagentHandback';
const MAX_PROMPT_TIMESTAMPS = 200;

function emptyState() {
  return {
    tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
    model: null,
    gitBranch: null,
    effort: null,
    pendingBackgroundAgents: null,
    pendingBackgroundAgentsAt: null,
    lastTurnDurationMs: null,
    lastToolUse: null,
    lastPromptAt: null,
    promptAts: [],
    spawnedToolUseIds: new Set(),
    lastActivityAt: null,
    running: false,
    handedBack: false,
    aiTitle: null,
  };
}

function newEntry(inode) {
  return { inode, offset: 0, state: emptyState(), countedMessageKeys: new Set() };
}

function finiteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function parseTimestamp(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
}

function addUsage(tokens, usage) {
  if (!usage || typeof usage !== 'object') return;
  tokens.input += finiteOrZero(usage.input_tokens);
  tokens.output += finiteOrZero(usage.output_tokens);
  tokens.cacheRead += finiteOrZero(usage.cache_read_input_tokens);
  tokens.cacheCreation += finiteOrZero(usage.cache_creation_input_tokens);
}

function contentBlocks(message) {
  return Array.isArray(message.content) ? message.content : [];
}

function applyAssistantLine(entry, record) {
  const message = record.message;
  if (!message || typeof message !== 'object') return;
  const { state } = entry;
  // One API response is split over several lines that each repeat the same usage.
  const messageKey = message.id || record.requestId;
  if (!messageKey || !entry.countedMessageKeys.has(messageKey)) {
    addUsage(state.tokens, message.usage);
    if (messageKey) entry.countedMessageKeys.add(messageKey);
  }
  if (typeof message.model === 'string' && message.model !== SYNTHETIC_MODEL) state.model = message.model;
  const blocks = contentBlocks(message);
  // handing back the report ends the agent's run, though it closes on a tool call rather than a terminal stop
  state.handedBack = blocks.some((block) => block && block.type === 'tool_use' && block.name === HANDBACK_TOOL_NAME);
  state.running = !state.handedBack && !TERMINAL_STOP_REASONS.has(message.stop_reason);
  for (const block of blocks) {
    if (!block || block.type !== 'tool_use') continue;
    state.lastToolUse = describeToolUse(block);
    if (block.name === SPAWN_TOOL_NAME && typeof block.id === 'string' && block.id) {
      state.spawnedToolUseIds.add(block.id);
    }
  }
}

function isPromptLine(record) {
  if (record.isMeta || record.toolUseResult) return false;
  const message = record.message;
  if (!message || typeof message !== 'object') return false;
  return !contentBlocks(message).some((block) => block && block.type === 'tool_result');
}

function recordPromptAt(promptAts, timestamp) {
  if (timestamp === null) return;
  promptAts.push(timestamp);
  if (promptAts.length > MAX_PROMPT_TIMESTAMPS) promptAts.splice(0, promptAts.length - MAX_PROMPT_TIMESTAMPS);
}

function applyUserLine(state, record) {
  const isPrompt = isPromptLine(record);
  // the handback's own tool result keeps the run closed; a new prompt reopens it, as when the agent is continued
  if (isPrompt) state.handedBack = false;
  state.running = !state.handedBack;
  if (!isPrompt) return;
  const promptAt = parseTimestamp(record.timestamp);
  state.lastPromptAt = promptAt;
  recordPromptAt(state.promptAts, promptAt);
  state.lastToolUse = null;
}

// the count is written only while agents are pending, so a turn that ends without it reports none left
function applyTurnDurationLine(state, record) {
  state.lastTurnDurationMs = Number.isFinite(record.durationMs) ? record.durationMs : null;
  const reported = Number.isFinite(record.pendingBackgroundAgentCount) ? record.pendingBackgroundAgentCount : null;
  if (reported === null && state.pendingBackgroundAgents === null) return;
  state.pendingBackgroundAgents = reported === null ? 0 : reported;
  state.pendingBackgroundAgentsAt = parseTimestamp(record.timestamp);
}

function applySharedFields(state, record) {
  if (typeof record.gitBranch === 'string' && record.gitBranch) state.gitBranch = record.gitBranch;
  if (typeof record.effort === 'string' && record.effort) state.effort = record.effort;
  const timestamp = parseTimestamp(record.timestamp);
  if (timestamp !== null) state.lastActivityAt = timestamp;
}

function applyRecord(entry, record) {
  const { state } = entry;
  applySharedFields(state, record);
  if (record.type === 'assistant') applyAssistantLine(entry, record);
  else if (record.type === 'user') applyUserLine(state, record);
  else if (record.type === 'system' && record.subtype === 'turn_duration') applyTurnDurationLine(state, record);
  else if (record.type === 'ai-title' && typeof record.aiTitle === 'string' && record.aiTitle) {
    state.aiTitle = record.aiTitle;
  }
}

function parseLine(line) {
  try {
    const record = JSON.parse(line);
    return record && typeof record === 'object' ? record : null;
  } catch {
    return null;
  }
}

function readBytes(filePath, start, length) {
  const buffer = Buffer.alloc(length);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, buffer, 0, length, start);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(descriptor);
  }
}

function consumeNewLines(filePath, entry, size) {
  const chunk = readBytes(filePath, entry.offset, size - entry.offset);
  const lastNewline = chunk.lastIndexOf(NEWLINE_BYTE);
  if (lastNewline === -1) return;
  entry.offset += lastNewline + 1;
  const completeText = chunk.subarray(0, lastNewline + 1).toString('utf8');
  for (const line of completeText.split('\n')) {
    if (!line) continue;
    const record = parseLine(line);
    if (record) applyRecord(entry, record);
  }
}

function statOrNull(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function createTranscriptReader() {
  const entries = new Map();
  let touchedPaths = new Set();

  function entryFor(filePath, stats) {
    const existing = entries.get(filePath);
    const wasReplacedOrTruncated = existing && (existing.inode !== stats.ino || stats.size < existing.offset);
    if (existing && !wasReplacedOrTruncated) return existing;
    const fresh = newEntry(stats.ino);
    entries.set(filePath, fresh);
    return fresh;
  }

  function read(filePath) {
    touchedPaths.add(filePath);
    const stats = statOrNull(filePath);
    if (!stats) {
      entries.delete(filePath);
      return null;
    }
    const entry = entryFor(filePath, stats);
    try {
      if (stats.size > entry.offset) consumeNewLines(filePath, entry, stats.size);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      entries.delete(filePath);
      return null;
    }
    return { state: entry.state };
  }

  function startSweep() {
    touchedPaths = new Set();
  }

  function finishSweep() {
    for (const filePath of entries.keys()) {
      if (!touchedPaths.has(filePath)) entries.delete(filePath);
    }
  }

  return { read, startSweep, finishSweep };
}

module.exports = { createTranscriptReader, emptyState };
