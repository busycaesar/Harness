const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolvePublicFile } = require('../lib/public-files');
const { makeTempDirectory, removeDirectory } = require('./helpers');

function withSite(run) {
  const root = makeTempDirectory();
  const publicDir = path.join(root, 'public');
  fs.mkdirSync(path.join(publicDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'index.html'), '<html></html>');
  fs.writeFileSync(path.join(publicDir, 'assets', 'app.js'), 'x');
  fs.writeFileSync(path.join(root, 'secret.txt'), 'secret');
  try {
    run({ root, publicDir });
  } finally {
    removeDirectory(root);
  }
}

test('serves index.html at the root and files inside public', () => {
  withSite(({ publicDir }) => {
    assert.equal(path.basename(resolvePublicFile(publicDir, '/')), 'index.html');
    assert.equal(path.basename(resolvePublicFile(publicDir, '/assets/app.js?v=1')), 'app.js');
  });
});

test('rejects path traversal in every encoding', () => {
  withSite(({ publicDir }) => {
    const attempts = [
      '/../secret.txt',
      '/..%2Fsecret.txt',
      '/%2e%2e/secret.txt',
      '/%2e%2e%2fsecret.txt',
      '/assets/../../secret.txt',
      '/assets/..%2F..%2Fsecret.txt',
      '/..\\secret.txt',
      '//../secret.txt',
      '/%00.html',
      '/%E0%A4%A',
    ];
    for (const attempt of attempts) {
      assert.equal(resolvePublicFile(publicDir, attempt), null, attempt);
    }
  });
});

test('rejects an absolute path outside public and directories', () => {
  withSite(({ root, publicDir }) => {
    assert.equal(resolvePublicFile(publicDir, `/${path.join(root, 'secret.txt')}`), null);
    assert.equal(resolvePublicFile(publicDir, '/assets'), null);
    assert.equal(resolvePublicFile(publicDir, '/missing.html'), null);
  });
});

test('rejects a symlink that points outside public', (context) => {
  withSite(({ root, publicDir }) => {
    try {
      fs.symlinkSync(path.join(root, 'secret.txt'), path.join(publicDir, 'link.txt'));
    } catch (error) {
      return context.skip(`symlinks unavailable: ${error.code}`);
    }
    assert.equal(resolvePublicFile(publicDir, '/link.txt'), null);
  });
});
