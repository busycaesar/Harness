const path = require('node:path');

const SEARCH_TOOLS = new Set(['Grep', 'Glob']);
const EDIT_TOOLS = new Set(['Edit', 'Write']);

function basenameOfFilePath(input) {
  const filePath = input && input.file_path;
  return typeof filePath === 'string' && filePath ? path.basename(filePath) : null;
}

function describeToolUse(block) {
  return { name: block.name, fileBasename: basenameOfFilePath(block.input) };
}

function summarizeToolUse(toolUse) {
  if (!toolUse) return 'Starting';
  const { name, fileBasename } = toolUse;
  if (name === 'Read' && fileBasename) return `Reading ${fileBasename}`;
  if (EDIT_TOOLS.has(name) && fileBasename) return `Editing ${fileBasename}`;
  if (name === 'Bash') return 'Running Bash';
  if (SEARCH_TOOLS.has(name)) return 'Searching code';
  if (name === 'Agent') return 'Waiting on subagent';
  return name;
}

module.exports = { describeToolUse, summarizeToolUse };
