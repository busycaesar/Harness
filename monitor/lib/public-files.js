const fs = require('node:fs');
const path = require('node:path');

const INDEX_FILE = 'index.html';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function decodeRelativePath(requestUrl) {
  try {
    const decoded = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
    if (decoded.includes('\0')) return null;
    const withIndex = decoded.endsWith('/') ? decoded + INDEX_FILE : decoded;
    return withIndex.replace(/^[/\\]+/, '');
  } catch {
    return null;
  }
}

function realPathOrNull(target) {
  try {
    return fs.realpathSync(target);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function resolvePublicFile(publicDir, requestUrl) {
  const relativePath = decodeRelativePath(requestUrl);
  if (relativePath === null) return null;
  const root = realPathOrNull(publicDir);
  if (root === null) return null;
  const candidate = realPathOrNull(path.resolve(root, relativePath));
  if (candidate === null || !isInside(root, candidate)) return null;
  return fs.statSync(candidate).isFile() ? candidate : null;
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

module.exports = { resolvePublicFile, contentTypeFor };
