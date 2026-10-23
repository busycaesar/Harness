const test = require('node:test');
const assert = require('node:assert/strict');
const { describeToolUse, summarizeToolUse } = require('../lib/tool-summary');

function summaryFor(name, input) {
  return summarizeToolUse(describeToolUse({ name, input }));
}

test('maps tool uses to short summaries', () => {
  assert.equal(summaryFor('Read', { file_path: '/very/long/path/app.js' }), 'Reading app.js');
  assert.equal(summaryFor('Edit', { file_path: '/x/y/server.js' }), 'Editing server.js');
  assert.equal(summaryFor('Write', { file_path: '/x/readme.md' }), 'Editing readme.md');
  assert.equal(summaryFor('Bash', { command: 'rm -rf secret' }), 'Running Bash');
  assert.equal(summaryFor('Grep', { pattern: 'password' }), 'Searching code');
  assert.equal(summaryFor('Glob', { pattern: '**/*.js' }), 'Searching code');
  assert.equal(summaryFor('Agent', { prompt: 'secret plan' }), 'Waiting on subagent');
  assert.equal(summaryFor('WebFetch', { url: 'https://example.com' }), 'WebFetch');
});

test('reports Starting before any tool use', () => {
  assert.equal(summarizeToolUse(null), 'Starting');
});

test('never exposes a full path or command', () => {
  const summary = summaryFor('Read', { file_path: '/Users/someone/private/notes.txt' });
  assert.ok(!summary.includes('/'));
  assert.ok(!summaryFor('Bash', { command: 'cat /etc/passwd' }).includes('passwd'));
});

test('falls back to the tool name when a file tool has no file path', () => {
  assert.equal(summaryFor('Read', {}), 'Read');
});
