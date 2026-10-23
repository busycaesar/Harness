const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTranscriptReader } = require('../lib/transcript-reader');
const {
  makeTempDirectory,
  removeDirectory,
  assistantLine,
  promptLine,
  toolResultLine,
  toolUseBlock,
  usageOf,
  writeTranscript,
  appendToTranscript,
} = require('./helpers');

function withTranscript(run) {
  const directory = makeTempDirectory();
  try {
    run(path.join(directory, 'session.jsonl'), createTranscriptReader());
  } finally {
    removeDirectory(directory);
  }
}

test('sums usage once per message id even when a response spans several lines', () => {
  withTranscript((file, reader) => {
    const first = usageOf(10, 20, 100, 5);
    writeTranscript(file, [
      assistantLine({ id: 'm1', usage: first, blocks: [{ type: 'thinking' }] }),
      assistantLine({ id: 'm1', usage: first, blocks: [toolUseBlock('Bash')] }),
      assistantLine({ id: 'm2', usage: usageOf(1, 2, 3, 4), stopReason: 'end_turn' }),
    ]);
    const { state } = reader.read(file);
    assert.deepEqual(state.tokens, { input: 11, output: 22, cacheRead: 103, cacheCreation: 9 });
  });
});

test('falls back to requestId when a line has no message id', () => {
  withTranscript((file, reader) => {
    const line = assistantLine({ id: undefined, requestId: 'req-x', usage: usageOf(7, 7) });
    writeTranscript(file, [line, line]);
    assert.equal(reader.read(file).state.tokens.input, 7);
  });
});

test('keeps tool_use from a later duplicate line of the same message', () => {
  withTranscript((file, reader) => {
    const usage = usageOf(1, 1);
    writeTranscript(file, [
      assistantLine({ id: 'm1', usage, blocks: [{ type: 'text' }] }),
      assistantLine({ id: 'm1', usage, blocks: [toolUseBlock('Read', { file_path: '/a/b/notes.md' })] }),
    ]);
    assert.deepEqual(reader.read(file).state.lastToolUse, { name: 'Read', fileBasename: 'notes.md' });
  });
});

test('ignores the synthetic model and records the latest real one', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      assistantLine({ id: 'm1', usage: usageOf(1, 1), model: 'claude-real' }),
      assistantLine({ id: 'm2', usage: usageOf(0, 0), model: '<synthetic>' }),
    ]);
    assert.equal(reader.read(file).state.model, 'claude-real');
  });
});

test('reads only appended bytes and accumulates onto earlier state', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [assistantLine({ id: 'm1', usage: usageOf(5, 5) })]);
    reader.read(file);
    appendToTranscript(file, [
      assistantLine({ id: 'm1', usage: usageOf(5, 5) }),
      assistantLine({ id: 'm2', usage: usageOf(2, 3) }),
    ]);
    assert.deepEqual(reader.read(file).state.tokens, { input: 7, output: 8, cacheRead: 0, cacheCreation: 0 });
  });
});

test('waits for the newline of a half-written line before parsing it', () => {
  withTranscript((file, reader) => {
    const full = JSON.stringify(assistantLine({ id: 'm1', usage: usageOf(4, 4) }));
    fs.writeFileSync(file, full.slice(0, 30));
    assert.equal(reader.read(file).state.tokens.input, 0);
    fs.appendFileSync(file, full.slice(30) + '\n');
    assert.equal(reader.read(file).state.tokens.input, 4);
  });
});

test('skips corrupt lines and keeps going', () => {
  withTranscript((file, reader) => {
    const good = JSON.stringify(assistantLine({ id: 'm1', usage: usageOf(3, 3) }));
    fs.writeFileSync(file, `{not json\n${good}\n[1,2]\n`);
    assert.equal(reader.read(file).state.tokens.input, 3);
  });
});

test('restarts from scratch when the file is truncated', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      assistantLine({ id: 'm1', usage: usageOf(50, 50) }),
      assistantLine({ id: 'm2', usage: usageOf(50, 50) }),
    ]);
    reader.read(file);
    writeTranscript(file, [assistantLine({ id: 'm3', usage: usageOf(1, 1) })]);
    assert.equal(reader.read(file).state.tokens.input, 1);
  });
});

test('restarts when the file is replaced by a different one of larger size', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [assistantLine({ id: 'm1', usage: usageOf(2, 2) })]);
    reader.read(file);
    fs.rmSync(file);
    writeTranscript(file, [
      assistantLine({ id: 'm9', usage: usageOf(9, 9) }),
      assistantLine({ id: 'm10', usage: usageOf(9, 9) }),
    ]);
    assert.equal(reader.read(file).state.tokens.input, 18);
  });
});

test('returns null for a missing file', () => {
  withTranscript((file, reader) => {
    assert.equal(reader.read(file), null);
  });
});

test('tracks the latest prompt, and a tool result does not start a new turn', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      promptLine('2026-01-01T00:00:10.000Z'),
      assistantLine({ id: 'm1', usage: usageOf(1, 1), blocks: [toolUseBlock('Bash')] }),
      toolResultLine('2026-01-01T00:00:20.000Z'),
    ]);
    const { state } = reader.read(file);
    assert.equal(state.lastPromptAt, Date.parse('2026-01-01T00:00:10.000Z'));
    assert.equal(state.lastToolUse.name, 'Bash');
  });
});

test('records turn duration, pending background agents, branch and effort', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      { type: 'system', subtype: 'turn_duration', durationMs: 4321, pendingBackgroundAgentCount: 2, gitBranch: 'main', effort: 'high' },
    ]);
    const { state } = reader.read(file);
    assert.equal(state.lastTurnDurationMs, 4321);
    assert.equal(state.pendingBackgroundAgents, 2);
    assert.equal(state.gitBranch, 'main');
    assert.equal(state.effort, 'high');
  });
});
