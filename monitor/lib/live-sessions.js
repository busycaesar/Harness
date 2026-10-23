const fs = require('node:fs');
const path = require('node:path');
const { sessionsDirectory } = require('./claude-paths');

const SESSION_FILE_PATTERN = /^\d+\.json$/;

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function listSessionFileNames(directory) {
  try {
    return fs.readdirSync(directory).filter((name) => SESSION_FILE_PATTERN.test(name));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function parseJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function isValidSessionRecord(record) {
  return Boolean(record)
    && Number.isInteger(record.pid)
    && typeof record.sessionId === 'string'
    && typeof record.cwd === 'string'
    && Number.isFinite(record.startedAt)
    && Number.isFinite(record.statusUpdatedAt);
}

function readLiveSessions(claudeDir, isAlive = isPidAlive) {
  const directory = sessionsDirectory(claudeDir);
  return listSessionFileNames(directory)
    .map((name) => parseJsonFile(path.join(directory, name)))
    .filter((record) => isValidSessionRecord(record) && isAlive(record.pid));
}

module.exports = { readLiveSessions, isPidAlive, parseJsonFile };
