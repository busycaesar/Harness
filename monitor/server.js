#!/usr/bin/env node
const path = require('node:path');
const { claudeHome } = require('./lib/claude-paths');
const { createSnapshotBuilder } = require('./lib/snapshot');
const { createDashboardServer, LOOPBACK_HOST } = require('./lib/dashboard-server');
const { createGoalResolver } = require('./lib/session-goal');

const DEFAULT_PORT = 4747;
const MAX_PORT = 65535;

function parsePort(argv) {
  const flagIndex = argv.indexOf('--port');
  if (flagIndex === -1) return DEFAULT_PORT;
  const port = Number(argv[flagIndex + 1]);
  if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
    throw new Error(`--port needs an integer between 0 and ${MAX_PORT}, got "${argv[flagIndex + 1]}"`);
  }
  return port;
}

async function main() {
  const port = parsePort(process.argv.slice(2));
  const { resolveGoal, resolveTitle } = createGoalResolver();
  const dashboard = createDashboardServer({
    publicDir: path.join(__dirname, 'public'),
    buildSnapshot: createSnapshotBuilder({ claudeDir: claudeHome(), resolveGoal, resolveTitle }),
    onError: (error) => console.error(`monitor: ${error.message}`),
  });
  const listeningPort = await dashboard.start(port);
  console.log(`Claude Code monitor on http://${LOOPBACK_HOST}:${listeningPort}`);
  process.on('SIGINT', () => dashboard.stop().then(() => process.exit(0)));
  process.on('SIGTERM', () => dashboard.stop().then(() => process.exit(0)));
}

main().catch((error) => {
  console.error(`monitor: ${error.message}`);
  process.exit(1);
});
