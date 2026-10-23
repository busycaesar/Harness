const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRepoRootResolver, workspaceOf } = require('../lib/repo-root');
const { makeTempDirectory, removeDirectory } = require('./helpers');

function withTempDirectory(run) {
  const directory = makeTempDirectory();
  try {
    run(fs.realpathSync(directory));
  } finally {
    removeDirectory(directory);
  }
}

function makeDirectory(...segments) {
  const directory = path.join(...segments);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

test('resolves a nested working directory to the directory holding .git', () => {
  withTempDirectory((root) => {
    const repo = makeDirectory(root, 'genesis-on-prem');
    makeDirectory(repo, '.git');
    const nested = makeDirectory(repo, 'link-classification', 'src');
    assert.equal(createRepoRootResolver()(nested), repo);
  });
});

test('treats .git as a repo root when it is a file, as worktrees write it', () => {
  withTempDirectory((root) => {
    const repo = makeDirectory(root, 'worktree-checkout');
    fs.writeFileSync(path.join(repo, '.git'), 'gitdir: /elsewhere/.git/worktrees/wt\n');
    const nested = makeDirectory(repo, 'monitor');
    assert.equal(createRepoRootResolver()(nested), repo);
  });
});

test('falls back to the working directory when no .git exists above it', () => {
  withTempDirectory((root) => {
    const loose = makeDirectory(root, 'not-a-repo', 'deep');
    assert.equal(createRepoRootResolver()(loose), loose);
  });
});

test('caches the resolution per working directory', () => {
  withTempDirectory((root) => {
    const repo = makeDirectory(root, 'cached-repo');
    const gitEntry = makeDirectory(repo, '.git');
    const nested = makeDirectory(repo, 'service');
    const repoRootOf = createRepoRootResolver();
    assert.equal(repoRootOf(nested), repo);
    fs.rmSync(gitEntry, { recursive: true });
    assert.equal(repoRootOf(nested), repo);
  });
});

test('workspace is the path below the repo root, or null at the root itself', () => {
  withTempDirectory((root) => {
    const repo = path.join(root, 'genesis-on-prem');
    assert.equal(workspaceOf(path.join(repo, 'link-classification'), repo), 'link-classification');
    assert.equal(workspaceOf(path.join(repo, 'link-ui', 'src'), repo), path.join('link-ui', 'src'));
    assert.equal(workspaceOf(repo, repo), null);
  });
});
