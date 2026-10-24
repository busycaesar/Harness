const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DEFAULT_CLI_PATH = '/opt/homebrew/bin/claude';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_CACHE_FILE = path.join(__dirname, '..', '.session-goals.json');
const DEFAULT_MINIMUM_DESCRIPTIONS = 2;
const AGENTS_BEFORE_REGENERATION = 8;
const AGE_BEFORE_REGENERATION_MS = 600000;
const FAILURE_BACKOFF_MS = 1800000;
const CHILD_TIMEOUT_MS = 60000;
const MAX_DESCRIPTIONS = 40;
const MAX_GOAL_LENGTH = 80;
const CLI_NOISE_PATTERN = /^Client\.\w+\(\) called but server does not advertise/;

function readCacheFile(cacheFile) {
  let text;
  try {
    text = fs.readFileSync(cacheFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function descriptionsOf(agents) {
  return [...agents]
    .sort((left, right) => (left.spawnedAt || 0) - (right.spawnedAt || 0))
    .map((agent) => agent.description);
}

function assertTitleRequest(cacheKey, descriptions, minimumDescriptions) {
  if (typeof cacheKey !== 'string' || cacheKey === '') {
    throw new TypeError(`goal cache key must be a non-empty string, got ${JSON.stringify(cacheKey)}`);
  }
  if (!Array.isArray(descriptions)) {
    throw new TypeError(`descriptions for ${cacheKey} must be an array, got ${typeof descriptions}`);
  }
  if (!Number.isInteger(minimumDescriptions) || minimumDescriptions < 1) {
    throw new RangeError(`minimumDescriptions for ${cacheKey} must be a positive integer, got ${minimumDescriptions}`);
  }
}

function usableDescriptionsOf(descriptions) {
  return descriptions.filter((description) => description !== '').slice(-MAX_DESCRIPTIONS);
}

// entries written by an older monitor, or hand-edited ones, are treated as absent so a stale shape regenerates instead of throwing
function usableEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const titled = typeof entry.goal === 'string' || entry.goal === null;
  if (!titled || typeof entry.agentCount !== 'number' || typeof entry.generatedAt !== 'number') return null;
  return entry;
}

function promptFor(descriptions) {
  const list = descriptions.map((description, index) => `${index + 1}. ${description}`).join('\n');
  return [
    'A coding session has delegated these tasks to subagents, oldest first:',
    '',
    list,
    '',
    'In at most 6 words, state the one overall goal. Reply with the goal only, no punctuation at the end.',
  ].join('\n');
}

// spawned without a terminal the CLI prints its MCP diagnostic on stdout alongside the answer, so that line is dropped before the answer is judged
function answerLinesOf(stdout) {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !CLI_NOISE_PATTERN.test(line));
}

function goalFrom(stdout) {
  const lines = answerLinesOf(stdout);
  if (lines.length === 0) return { ok: false, reason: 'empty answer' };
  if (lines.length > 1) return { ok: false, reason: 'multi-line answer' };
  const [answer] = lines;
  if (answer.length > MAX_GOAL_LENGTH) return { ok: false, reason: `answer longer than ${MAX_GOAL_LENGTH} characters` };
  return { ok: true, goal: answer };
}

function runCli({ cliPath, model, prompt, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(cliPath, ['-p', '--model', model]);
    let stdout = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ ok: false, reason: `no answer within ${timeoutMs}ms` });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.resume();
    child.on('error', (error) => finish({ ok: false, reason: error.message }));
    child.on('close', (code) => finish(code === 0 ? { ok: true, stdout } : { ok: false, reason: `exit code ${code}` }));
    child.stdin.on('error', (error) => finish({ ok: false, reason: error.message }));
    child.stdin.end(prompt);
  });
}

function createGoalResolver({
  cacheFile = DEFAULT_CACHE_FILE,
  cliPath = process.env.MONITOR_GOAL_CLI || DEFAULT_CLI_PATH,
  model = process.env.MONITOR_GOAL_MODEL || DEFAULT_MODEL,
  timeoutMs = CHILD_TIMEOUT_MS,
  nowMs = Date.now,
  log = console.log,
} = {}) {
  let entries;
  try {
    entries = readCacheFile(cacheFile);
  } catch (error) {
    log(`monitor: goal cache unreadable (${error.message}), starting empty`);
    entries = {};
  }

  const queue = [];
  const queuedKeys = new Set();
  let activeKey = null;
  let idleWaiters = [];

  function saveCache() {
    try {
      fs.writeFileSync(cacheFile, `${JSON.stringify(entries, null, 2)}\n`);
    } catch (error) {
      log(`monitor: goal cache not written to ${cacheFile}: ${error.message}`);
    }
  }

  function needsGeneration(entry, descriptionCount) {
    if (!entry) return true;
    const age = nowMs() - entry.generatedAt;
    if (entry.goal === null) return age >= FAILURE_BACKOFF_MS;
    return descriptionCount - entry.agentCount >= AGENTS_BEFORE_REGENERATION && age >= AGE_BEFORE_REGENERATION_MS;
  }

  async function generate(cacheKey, descriptions) {
    const startedAt = nowMs();
    const run = await runCli({ cliPath, model, prompt: promptFor(descriptions), timeoutMs });
    const outcome = run.ok ? goalFrom(run.stdout) : run;
    const durationMs = nowMs() - startedAt;
    entries[cacheKey] = {
      goal: outcome.ok ? outcome.goal : null,
      agentCount: descriptions.length,
      generatedAt: nowMs(),
    };
    saveCache();
    if (outcome.ok) {
      log(`monitor: goal for ${cacheKey} from ${descriptions.length} agents in ${durationMs}ms: ${outcome.goal}`);
      return;
    }
    log(`monitor: goal inference failed for ${cacheKey} after ${durationMs}ms: ${outcome.reason}`);
  }

  async function drainQueue() {
    if (activeKey !== null) return;
    const job = queue.shift();
    if (!job) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters = [];
      return;
    }
    activeKey = job.cacheKey;
    queuedKeys.delete(job.cacheKey);
    try {
      await generate(job.cacheKey, job.descriptions);
    } finally {
      activeKey = null;
    }
    drainQueue();
  }

  function enqueue(cacheKey, descriptions) {
    if (queuedKeys.has(cacheKey) || activeKey === cacheKey) return;
    queuedKeys.add(cacheKey);
    queue.push({ cacheKey, descriptions });
    drainQueue();
  }

  function resolveTitle(cacheKey, descriptions, { minimumDescriptions = DEFAULT_MINIMUM_DESCRIPTIONS } = {}) {
    assertTitleRequest(cacheKey, descriptions, minimumDescriptions);
    const entry = usableEntry(entries[cacheKey]);
    const cached = entry ? entry.goal : null;
    const usable = usableDescriptionsOf(descriptions);
    if (usable.length < minimumDescriptions) return cached;
    if (needsGeneration(entry, usable.length)) enqueue(cacheKey, usable);
    return cached;
  }

  function resolveGoal(sessionId, agents) {
    return resolveTitle(sessionId, descriptionsOf(agents));
  }

  function whenQuiet() {
    if (activeKey === null && queue.length === 0) return Promise.resolve();
    return new Promise((resolve) => idleWaiters.push(resolve));
  }

  return { resolveGoal, resolveTitle, whenQuiet };
}

module.exports = { createGoalResolver };
