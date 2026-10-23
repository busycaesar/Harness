const fs = require('node:fs');
const http = require('node:http');
const { resolvePublicFile, contentTypeFor } = require('./public-files');
const { createSnapshotFeed } = require('./snapshot-feed');

const LOOPBACK_HOST = '127.0.0.1';

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(text);
}

function serveStaticFile(publicDir, request, response) {
  const filePath = resolvePublicFile(publicDir, request.url);
  if (!filePath) return sendText(response, 404, 'Not found');
  fs.readFile(filePath, (error, content) => {
    if (error) return sendText(response, 404, 'Not found');
    response.writeHead(200, { 'Content-Type': contentTypeFor(filePath), 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
}

function createEventStream() {
  const clients = new Set();

  function send(response, snapshot) {
    response.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  }

  function open(request, response, snapshot) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    clients.add(response);
    request.on('close', () => clients.delete(response));
    if (snapshot) send(response, snapshot);
  }

  function broadcast(snapshot) {
    for (const response of clients) send(response, snapshot);
  }

  function closeAll() {
    for (const response of clients) response.end();
    clients.clear();
  }

  return { open, broadcast, closeAll };
}

function createDashboardServer({ publicDir, buildSnapshot, pollIntervalMs = 1000, onError = () => {} }) {
  const eventStream = createEventStream();
  const feed = createSnapshotFeed({
    buildSnapshot,
    intervalMs: pollIntervalMs,
    onChange: eventStream.broadcast,
    onError,
  });

  function route(request, response) {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (pathname === '/events') return eventStream.open(request, response, feed.latest());
    if (pathname === '/api/state') return serveState(response);
    return serveStaticFile(publicDir, request, response);
  }

  function serveState(response) {
    const snapshot = feed.latest();
    if (!snapshot) return sendJson(response, 503, { error: 'snapshot not ready' });
    return sendJson(response, 200, snapshot);
  }

  function handle(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendText(response, 405, 'Method not allowed');
    try {
      return route(request, response);
    } catch (error) {
      onError(error);
      return sendText(response, 400, 'Bad request');
    }
  }

  const server = http.createServer(handle);

  function start(port) {
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, LOOPBACK_HOST, () => {
        server.off('error', reject);
        feed.start();
        resolve(server.address().port);
      });
    });
  }

  function stop() {
    feed.stop();
    eventStream.closeAll();
    return new Promise((resolve) => server.close(resolve));
  }

  return { start, stop };
}

module.exports = { createDashboardServer, LOOPBACK_HOST };
