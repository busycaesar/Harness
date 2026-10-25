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
  turnDurationLine,
} = require('./helpers');

const FIRST_PROMPT_AT = Date.parse('2026-01-01T00:00:00.000Z');
const ONE_SECOND_MS = 1000;

function promptTimestampAt(index) {
  return new Date(FIRST_PROMPT_AT + index * ONE_SECOND_MS).toISOString();
}

function agentToolUseBlock(id) {
  return { type: 'tool_use', id, name: 'Agent', input: { description: 'do the subtask' } };
}

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

test('records every prompt timestamp in ascending order', () => {
  withTranscript((file, reader) => {
    const stamps = ['2026-01-01T00:00:10.000Z', '2026-01-01T00:00:20.000Z', '2026-01-01T00:00:30.000Z'];
    writeTranscript(file, stamps.map((stamp) => promptLine(stamp)));
    const { state } = reader.read(file);
    assert.deepEqual(state.promptAts, stamps.map((stamp) => Date.parse(stamp)));
  });
});

test('keeps only the most recent 200 prompt timestamps', () => {
  withTranscript((file, reader) => {
    const stamps = Array.from({ length: 205 }, (_, index) => promptTimestampAt(index));
    writeTranscript(file, stamps.map((stamp) => promptLine(stamp)));
    const { state } = reader.read(file);
    assert.equal(state.promptAts.length, 200);
    assert.equal(state.promptAts[0], Date.parse(stamps[5]));
    assert.equal(state.promptAts.at(-1), Date.parse(stamps.at(-1)));
  });
});

test('records the tool use id of a spawned agent', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      assistantLine({ id: 'm1', usage: usageOf(1, 1), blocks: [agentToolUseBlock('toolu_spawn_one')] }),
    ]);
    assert.deepEqual([...reader.read(file).state.spawnedToolUseIds], ['toolu_spawn_one']);
  });
});

test('ignores tool uses that do not spawn an agent', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      assistantLine({ id: 'm1', usage: usageOf(1, 1), blocks: [toolUseBlock('Bash'), toolUseBlock('Read')] }),
    ]);
    assert.equal(reader.read(file).state.spawnedToolUseIds.size, 0);
  });
});

test('accumulates prompt timestamps and spawned ids across incremental reads', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      promptLine('2026-01-01T00:00:10.000Z'),
      assistantLine({ id: 'm1', usage: usageOf(1, 1), blocks: [agentToolUseBlock('toolu_spawn_one')] }),
    ]);
    reader.read(file);
    appendToTranscript(file, [
      promptLine('2026-01-01T00:00:40.000Z'),
      assistantLine({ id: 'm2', usage: usageOf(1, 1), blocks: [agentToolUseBlock('toolu_spawn_two')] }),
    ]);
    const { state } = reader.read(file);
    assert.deepEqual(state.promptAts, [
      Date.parse('2026-01-01T00:00:10.000Z'),
      Date.parse('2026-01-01T00:00:40.000Z'),
    ]);
    assert.deepEqual([...state.spawnedToolUseIds], ['toolu_spawn_one', 'toolu_spawn_two']);
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

test('pending background agents fall back to none when a later turn omits the count', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [turnDurationLine('2026-01-01T00:01:00.000Z', { pendingBackgroundAgentCount: 3 })]);
    assert.equal(reader.read(file).state.pendingBackgroundAgents, 3);
    appendToTranscript(file, [turnDurationLine('2026-01-01T00:02:00.000Z')]);
    const { state } = reader.read(file);
    assert.equal(state.pendingBackgroundAgents, 0);
    assert.equal(state.pendingBackgroundAgentsAt, Date.parse('2026-01-01T00:02:00.000Z'));
  });
});

test('a turn is open until an assistant line reaches a terminal stop reason, and reopens on new input', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [assistantLine({ id: 'm1', usage: usageOf(1, 1), blocks: [toolUseBlock('Bash')] })]);
    assert.equal(reader.read(file).state.running, true);
    appendToTranscript(file, [assistantLine({ id: 'm2', usage: usageOf(1, 1), stopReason: 'end_turn' })]);
    assert.equal(reader.read(file).state.running, false);
    appendToTranscript(file, [promptLine('2026-01-01T00:03:00.000Z')]);
    assert.equal(reader.read(file).state.running, true);
  });
});

test('a turn that hands back its report is closed, and its tool result does not reopen it', () => {
  withTranscript((file, reader) => {
    writeTranscript(file, [
      assistantLine({ id: 'm1', usage: usageOf(1, 1), blocks: [toolUseBlock('SubagentHandback', { message: 'done' })] }),
    ]);
    assert.equal(reader.read(file).state.running, false);
    appendToTranscript(file, [toolResultLine('2026-01-01T00:02:00.000Z')]);
    assert.equal(reader.read(file).state.running, false);
  });
});

test('a handed-back turn reopens on a new prompt or on further output', () => {
  withTranscript((file, reader) => {
    const handback = assistantLine({ id: 'm1', usage: usageOf(1, 1), blocks: [toolUseBlock('SubagentHandback')] });
    writeTranscript(file, [handback, toolResultLine('2026-01-01T00:02:00.000Z')]);
    appendToTranscript(file, [promptLine('2026-01-01T00:03:00.000Z', 'one more thing')]);
    assert.equal(reader.read(file).state.running, true);
    appendToTranscript(file, [handback, assistantLine({ id: 'm2', usage: usageOf(1, 1), blocks: [toolUseBlock('Bash')] })]);
    assert.equal(reader.read(file).state.running, true);
  });
});
