// SkynetMemory — Sistema de memoria persistente para el rotador
// Aprende de fallos pasados y evita modelos caídos automáticamente
// Vercel-safe: usa /tmp/ (se pierde en cold starts)
const fs = require('fs');
const MEMORY_PATH = '/tmp/skynet-memory.json';
const ACTIVITY_PATH = '/tmp/skynet-activity.json';
const ACCESS_LOG_PATH = '/tmp/skynet-access-log.json';
const LAST_SYNC_PATH = '/tmp/skynet-last-sync';

// GitHub persistence (same pattern as admin/db.js)
const GITHUB_OWNER = 'yeifer125';
const GITHUB_REPO = 'proxi-datos';
const GITHUB_ACCESS_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/skynet-access-log.json`;

// Sync timestamp helpers (persiste en /tmp/ para sobrevivir cold starts)
function getLastSync() {
  try { return parseInt(fs.readFileSync(LAST_SYNC_PATH, 'utf8'), 10) || 0; } catch(e) { return 0; }
}
function setLastSync(ts) {
  try { fs.writeFileSync(LAST_SYNC_PATH, String(ts)); } catch(e) {}
}

function getMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
  } catch (e) {
    return { failures: {}, blockedUntil: {}, lastReset: null };
  }
}

function saveMemory(mem) {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2));
  } catch (e) { /* Vercel serverless, /tmp/ puede no estar disponible */ }
}

// Registra un fallo y bloquea el modelo por 5 minutos
function recordFailure(modelKey) {
  const mem = getMemory();
  if (!mem.failures[modelKey]) mem.failures[modelKey] = [];
  mem.failures[modelKey].push({ time: Date.now(), count: mem.failures[modelKey].length + 1 });
  mem.blockedUntil[modelKey] = Date.now() + 300000; // 5 min
  saveMemory(mem);
}

// Registra éxito — desbloquea el modelo
function recordSuccess(modelKey) {
  const mem = getMemory();
  mem.failures[modelKey] = [];
  delete mem.blockedUntil[modelKey];
  saveMemory(mem);
}

// Verifica si un modelo está bloqueado
function isModelBlocked(modelKey) {
  const mem = getMemory();
  const until = mem.blockedUntil[modelKey];
  if (!until) return false;
  if (Date.now() > until) {
    // Bloqueo expiró, limpiar
    delete mem.blockedUntil[modelKey];
    mem.failures[modelKey] = [];
    saveMemory(mem);
    return false;
  }
  return true;
}

// Si TODOS los modelos están bloqueados, resetea la memoria
function resetIfAllBlocked(modelKeys) {
  const mem = getMemory();
  const now = Date.now();
  const allBlocked = modelKeys.every(k => {
    const until = mem.blockedUntil[k];
    return until && now < until;
  });
  if (allBlocked && modelKeys.length > 0) {
    mem.blockedUntil = {};
    mem.failures = {};
    mem.lastReset = now;
    mem.resetReason = 'Todos los modelos bloqueados — reset automático';
    saveMemory(mem);
    return true;
  }
  return false;
}

// Stats de memoria para monitoreo
function getMemoryStats() {
  const mem = getMemory();
  const now = Date.now();
  const blocked = Object.entries(mem.blockedUntil || {})
    .filter(([_, until]) => now < until)
    .map(([key, until]) => ({ model: key, remainingMs: until - now }));
  return {
    blockedCount: blocked.length,
    blocked,
    totalFailures: Object.values(mem.failures || {}).reduce((a, b) => a + b.length, 0),
    lastReset: mem.lastReset,
    resetReason: mem.resetReason
  };
}

// Health stats específicas para el bot/scanner
function getModelHealth(modelKey) {
  const mem = getMemory();
  const failures = mem.failures[modelKey] || [];
  const blocked = isModelBlocked(modelKey);
  return { blocked, failures: failures.length, lastFailure: failures.length > 0 ? failures[failures.length - 1] : null };
}

// ─── Activity Log ────────────────────────────────────────
function logActivity(type, data) {
  try {
    let log = [];
    try {
      log = JSON.parse(fs.readFileSync(ACTIVITY_PATH, 'utf8'));
    } catch (e) { /* archivo no existe aún */ }
    log.push({ type, data, timestamp: Date.now() });
    if (log.length > 200) log = log.slice(-200);
    fs.writeFileSync(ACTIVITY_PATH, JSON.stringify(log, null, 2));
  } catch (e) { /* Vercel cold start o permisos */ }
}

function getActivity(limit = 50) {
  try {
    const log = JSON.parse(fs.readFileSync(ACTIVITY_PATH, 'utf8'));
    return log.slice(-limit).reverse();
  } catch (e) {
    return [];
  }
}

function clearActivity() {
  try {
    fs.writeFileSync(ACTIVITY_PATH, JSON.stringify([]));
  } catch (e) {}
}

// ─── Access Log — registro de quién usa Skynet ────────
// Persiste a GitHub con merge dedup (mismo patrón que usage-db)

async function readAccessLogFromGitHub() {
  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return null;
  try {
    const r = await fetch(GITHUB_ACCESS_URL, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!r.ok) return null;
    const data = await r.json();
    return { entries: JSON.parse(Buffer.from(data.content, 'base64').toString()), sha: data.sha || '' };
  } catch(e) { return null; }
}

async function writeAccessLogToGitHub(entries, sha) {
  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return false;
  try {
    const r = await fetch(GITHUB_ACCESS_URL, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update skynet-access-log - ${new Date().toISOString().slice(0,10)}`,
        content: Buffer.from(JSON.stringify(entries, null, 2)).toString('base64'),
        sha
      })
    });
    return r.ok;
  } catch(e) { return false; }
}

function getLocalAccessLog() {
  try { return JSON.parse(fs.readFileSync(ACCESS_LOG_PATH, 'utf8')); } catch(e) { return []; }
}

function saveLocalAccessLog(entries) {
  try { fs.writeFileSync(ACCESS_LOG_PATH, JSON.stringify(entries, null, 2)); } catch(e) {}
}

// Registra un acceso a Skynet
// entry: { timestamp, ip, endpoint, method, status, model, latency_ms, error? }
async function logAccess(entry) {
  // Siempre guardar local primero
  const local = getLocalAccessLog();
  local.push(entry);
  if (local.length > 1000) local.splice(0, local.length - 1000);
  saveLocalAccessLog(local);
  
  // Sync a GitHub cada 30s (rate limit) — persistente en /tmp/
  const now = Date.now();
  const lastSync = getLastSync();
  if (now - lastSync < 30000) return;
  setLastSync(now);
  
  const gh = await readAccessLogFromGitHub();
  let merged = [];
  let sha = '';
  if (gh && Array.isArray(gh.entries)) { merged = gh.entries; sha = gh.sha || ''; }
  
  // Merge dedup por timestamp+ip+endpoint
  const seen = new Set(merged.map(e => e.timestamp + '|' + e.ip + '|' + e.endpoint));
  for (const e of local) {
    const k = e.timestamp + '|' + e.ip + '|' + e.endpoint;
    if (!seen.has(k)) { seen.add(k); merged.push(e); }
  }
  if (merged.length > 2000) merged = merged.slice(-2000);
  
  // Guardar merged local + GitHub
  saveLocalAccessLog(merged);
  await writeAccessLogToGitHub(merged, sha);
}

// Obtiene los accesos (GitHub source of truth, fallback /tmp)
async function getAccessLogs(limit = 50) {
  const gh = await readAccessLogFromGitHub();
  if (gh && Array.isArray(gh.entries) && gh.entries.length > 0) {
    saveLocalAccessLog(gh.entries);
    return gh.entries.slice(-limit).reverse();
  }
  return getLocalAccessLog().slice(-limit).reverse();
}

// Clear local
function clearAccessLogs() {
  try { fs.writeFileSync(ACCESS_LOG_PATH, JSON.stringify([])); } catch(e) {}
}

module.exports = {
  recordFailure,
  recordSuccess,
  isModelBlocked,
  resetIfAllBlocked,
  getMemoryStats,
  getModelHealth,
  getMemory,
  logActivity,
  getActivity,
  clearActivity,
  logAccess,
  getAccessLogs,
  clearAccessLogs
};
