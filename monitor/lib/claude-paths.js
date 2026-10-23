const os = require('node:os');
const path = require('node:path');

function claudeHome() {
  return path.join(os.homedir(), '.claude');
}

function projectDirectoryName(cwd) {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

function sessionsDirectory(claudeDir) {
  return path.join(claudeDir, 'sessions');
}

function projectDirectory(claudeDir, cwd) {
  return path.join(claudeDir, 'projects', projectDirectoryName(cwd));
}

function transcriptPath(claudeDir, cwd, sessionId) {
  return path.join(projectDirectory(claudeDir, cwd), `${sessionId}.jsonl`);
}

function subagentsDirectory(claudeDir, cwd, sessionId) {
  return path.join(projectDirectory(claudeDir, cwd), sessionId, 'subagents');
}

module.exports = {
  claudeHome,
  projectDirectoryName,
  sessionsDirectory,
  transcriptPath,
  subagentsDirectory,
};
