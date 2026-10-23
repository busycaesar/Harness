const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readLiveSessions, isPidAlive } = require('../lib/live-sessions');
const { makeTempDirectory, removeDirectory, writeSessionFile, sessionRecord } = require('./helpers');

test('keeps only sessions whose pid is alive', () => {
  const claudeDir = makeTempDirectory();
  try {
    writeSessionFile(claudeDir, sessionRecord({ pid: 111, sessionId: 'alive' }));
    writeSessionFile(claudeDir, sessionRecord({ pid: 222, sessionId: 'dead' }));
    const live = readLiveSessions(claudeDir, (pid) => pid === 111);
    assert.deepEqual(live.map((record) => record.sessionId), ['alive']);
  } finally {
    removeDirectory(claudeDir);
  }
});

test('ignores key files, corrupt files and records missing required fields', () => {
  const claudeDir = makeTempDirectory();
  try {
    writeSessionFile(claudeDir, sessionRecord({ pid: 111 }));
    const directory = path.join(claudeDir, 'sessions');
    fs.writeFileSync(path.join(directory, '111.abcdef.key'), 'secret');
    fs.writeFileSync(path.join(directory, '333.json'), '{"pid": 333, "sessi');
    fs.writeFileSync(path.join(directory, '444.json'), JSON.stringify({ pid: 444 }));
    const live = readLiveSessions(claudeDir, () => true);
    assert.deepEqual(live.map((record) => record.pid), [111]);
  } finally {
    removeDirectory(claudeDir);
  }
});

test('returns nothing when the sessions directory does not exist', () => {
  const claudeDir = makeTempDirectory();
  try {
    assert.deepEqual(readLiveSessions(claudeDir, () => true), []);
  } finally {
    removeDirectory(claudeDir);
  }
});

test('isPidAlive is true for this process and false for an unused pid', () => {
  assert.equal(isPidAlive(process.pid), true);
  assert.equal(isPidAlive(2 ** 22 + 12345), false);
});
