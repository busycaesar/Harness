const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createDashboardServer } = require('../lib/dashboard-server');
const { makeTempDirectory, removeDirectory } = require('./helpers');

function request(port, requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: requestPath, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

function firstEvent(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: requestPath }, (res) => {
      res.setEncoding('utf8');
      res.once('data', (chunk) => {
        req.destroy();
        resolve({ headers: res.headers, chunk });
      });
    });
    req.on('error', (error) => (error.code === 'ECONNRESET' ? undefined : reject(error)));
  });
}

async function withServer(run) {
  const root = makeTempDirectory();
  const publicDir = path.join(root, 'public');
  fs.mkdirSync(publicDir);
  fs.writeFileSync(path.join(publicDir, 'index.html'), '<h1>dashboard</h1>');
  fs.writeFileSync(path.join(root, 'secret.txt'), 'top secret');
  const snapshot = { generatedAt: 1, projects: [], sessions: [] };
  const dashboard = createDashboardServer({ publicDir, buildSnapshot: () => snapshot, pollIntervalMs: 20 });
  const port = await dashboard.start(0);
  try {
    await run(port);
  } finally {
    await dashboard.stop();
    removeDirectory(root);
  }
}

test('serves index.html at / and the snapshot at /api/state', () => withServer(async (port) => {
  const page = await request(port, '/');
  assert.equal(page.status, 200);
  assert.match(page.body, /dashboard/);
  const state = await request(port, '/api/state');
  assert.equal(state.status, 200);
  assert.deepEqual(JSON.parse(state.body), { generatedAt: 1, projects: [], sessions: [] });
}));

test('streams a full snapshot immediately on /events', () => withServer(async (port) => {
  const { headers, chunk } = await firstEvent(port, '/events');
  assert.match(headers['content-type'], /text\/event-stream/);
  assert.match(chunk, /^data: \{"generatedAt":1/);
}));

test('refuses to serve files outside public', () => withServer(async (port) => {
  for (const attempt of ['/../secret.txt', '/..%2Fsecret.txt', '/%2e%2e/secret.txt']) {
    const response = await request(port, attempt);
    assert.equal(response.status, 404, attempt);
    assert.ok(!response.body.includes('top secret'));
  }
}));

test('rejects non-GET methods', () => withServer(async (port) => {
  assert.equal((await request(port, '/api/state', 'POST')).status, 405);
}));
