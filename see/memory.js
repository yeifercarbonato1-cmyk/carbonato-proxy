// SEE Memory — Base de conocimiento persistente del Evolution Engine
// Persiste a proxi-datos/see-memory.json via GitHub API
// Similar a usage-db: dual /tmp/ + GitHub

const fs = require('fs');
const path = require('path');
const MEMORY_FILE = '/tmp/see-memory.json';

const DEFAULT_MEMORY = {
  version: 1,
  cycles: 0,
  lastCycleTime: null,
  improvements: [],
  knownBugs: [],
  failedAttempts: [],
  modelHistory: {},   // modeloX → { swaps: [], avgLatency: [], lastFail: null }
  performance: {      // tendencias semanales
    weeklyAvgLatency: [],
    weeklyFailRate: [],
    weeklyTokens: []
  }
};

function getGithubToken() {
  const t = process.env.GITHUB_TOKEN;
  if (t) return t;
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const m = env.match(/^export GITHUB_TOKEN=(.+)$/m);
    if (m) return m[1].trim();
  } catch(e) {}
  try {
    const { execSync } = require('child_process');
    return execSync('git config --global github.token', { encoding: 'utf8' }).trim();
  } catch(e) {}
  return '';
}

const GITHUB_RAW = 'https://raw.githubusercontent.com/yeifer125/proxi-datos/main/see-memory.json';
const GITHUB_API = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/see-memory.json';

function loadLocal() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch(e) {
    return null;
  }
}

async function loadFromGitHub() {
  const token = getGithubToken();
  if (!token) return null;
  try {
    const r = await fetch(GITHUB_API, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.content) return null;
    const decoded = JSON.parse(Buffer.from(d.content, 'base64').toString());
    return { data: decoded, sha: d.sha || '' };
  } catch(e) {
    return null;
  }
}

async function load() {
  // Try GitHub first (multi-instancia safe)
  const gh = await loadFromGitHub();
  if (gh && gh.data) {
    // Merge con local si tiene ciclos más recientes
    const local = loadLocal();
    if (local && local.lastCycleTime && gh.data.lastCycleTime) {
      if (new Date(local.lastCycleTime) > new Date(gh.data.lastCycleTime)) {
        gh.data.cycles = local.cycles;
        gh.data.lastCycleTime = local.lastCycleTime;
      }
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(gh.data, null, 2));
    return { memory: gh.data, sha: gh.sha };
  }
  // Fallback local
  const local = loadLocal();
  if (local) return { memory: local, sha: '' };
  // Nuevo
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(DEFAULT_MEMORY, null, 2));
  return { memory: { ...DEFAULT_MEMORY }, sha: '' };
}

async function save(memory, sha) {
  // Siempre a local
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  } catch(e) {}

  // Async a GitHub
  const token = getGithubToken();
  if (!token) return { ok: false, error: 'no token' };

  try {
    const content = Buffer.from(JSON.stringify(memory, null, 2)).toString('base64');
    const body = { message: `see: cycle ${memory.cycles}`, content };
    if (sha) body.sha = sha;

    const r = await fetch(GITHUB_API, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    const result = await r.json();
    if (r.ok) return { ok: true, sha: result.content?.sha || sha };
    return { ok: false, error: result.message };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── API de memoria ───

function recordImprovement(memory, entry) {
  memory.improvements.push({
    ...entry,
    cycle: memory.cycles,
    timestamp: new Date().toISOString()
  });
  if (memory.improvements.length > 200) memory.improvements = memory.improvements.slice(-200);
}

function recordFailedAttempt(memory, entry) {
  memory.failedAttempts.push({
    ...entry,
    cycle: memory.cycles,
    timestamp: new Date().toISOString()
  });
  if (memory.failedAttempts.length > 100) memory.failedAttempts = memory.failedAttempts.slice(-100);
}

function updateModelHistory(memory, modelKey, data) {
  if (!memory.modelHistory[modelKey]) {
    memory.modelHistory[modelKey] = { swaps: [], latencies: [], fails: 0, lastFail: null, lastOk: null };
  }
  const h = memory.modelHistory[modelKey];
  if (data.latency !== undefined) {
    h.latencies.push({ time: Date.now(), latency: data.latency });
    if (h.latencies.length > 100) h.latencies = h.latencies.slice(-100);
  }
  if (data.fail) {
    h.fails++;
    h.lastFail = new Date().toISOString();
  }
  if (data.ok) h.lastOk = new Date().toISOString();
  if (data.swap) h.swaps.push({ from: data.swap.from, to: data.swap.to, time: new Date().toISOString() });
}

function hasFailedRecently(memory, action, hours = 48) {
  const cutoff = Date.now() - hours * 3600 * 1000;
  return memory.failedAttempts.some(a =>
    a.action === action && new Date(a.timestamp).getTime() > cutoff
  );
}

function getModelAvgLatency(memory, modelKey) {
  const h = memory.modelHistory[modelKey];
  if (!h || h.latencies.length < 3) return null;
  const recent = h.latencies.slice(-20);
  const sum = recent.reduce((a, b) => a + b.latency, 0);
  return sum / recent.length;
}

module.exports = {
  load, save, DEFAULT_MEMORY,
  recordImprovement, recordFailedAttempt, updateModelHistory,
  hasFailedRecently, getModelAvgLatency
};
