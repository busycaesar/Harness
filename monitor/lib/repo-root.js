const fs = require('node:fs');
const path = require('node:path');

const GIT_ENTRY = '.git';

function findRepoRoot(cwd) {
  const start = path.resolve(cwd);
  let directory = start;
  for (;;) {
    // a worktree checkout stores .git as a file, so any entry counts
    if (fs.existsSync(path.join(directory, GIT_ENTRY))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return start;
    directory = parent;
  }
}

function createRepoRootResolver() {
  const rootByCwd = new Map();
  return function repoRootOf(cwd) {
    if (rootByCwd.has(cwd)) return rootByCwd.get(cwd);
    const root = findRepoRoot(cwd);
    rootByCwd.set(cwd, root);
    return root;
  };
}

function workspaceOf(cwd, repoRoot) {
  const relative = path.relative(repoRoot, path.resolve(cwd));
  return relative === '' ? null : relative;
}

module.exports = { createRepoRootResolver, workspaceOf };
