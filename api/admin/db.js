const fs = require('fs');
const path = require('path');
const { getGithubToken } = require('./helpers.js');

const DB_PATH = '/tmp';
const GITHUB_URL = 'https://api.github.com/repos/yeifer125/proxi-datos/contents';
const GITHUB_USAGE_URL = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';

// ---------------------------------------------------------------
// HEALTH DB (sin cambios)
// ---------------------------------------------------------------
async function readFromGitHub(file = 'health-db.json') {
  try {
    const token = getGithubToken();
    if (!token) return { data: [], sha: '' };
    const r = await fetch(`${GITHUB_URL}/${file}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!r.ok) return { data: [], sha: '' };
    const d = await r.json();
    const sha = d.sha || '';
    const raw = Buffer.from(d.content, 'base64').toString();
    // Convertir formato legacy (health-db.json plano) a array
    let arr = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) { arr = parsed; }
      else if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([model, v]) => {
          for (let i = 0; i < Math.min(v.count, 10); i++) {
            arr.push({ model, latency: v.avg, time: Date.now() - 60000, ip: 'legacy' });
          }
        });
      }
    } catch(e) {}
    return { data: arr, sha };
  } catch (e) { return { data: [], sha: '' }; }
}

async function writeToGitHub(db, sha, file = 'health-db.json') {
  try {
    const token = getGithubToken();
    if (!token) return;
    const max = 5000;
    if (db.length > max) db = db.slice(db.length - max);
    await fetch(`${GITHUB_URL}/${file}`, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update ${file} - ${db.length} records`,
        content: Buffer.from(JSON.stringify(db, null, 2)).toString('base64'),
        sha
      })
    });
  } catch(e) { console.log('[db] writeToGitHub error:', e.message); }
}

async function getHealthDb() {
  const { data, sha } = await readFromGitHub();
  return { data, sha };
}

async function saveHealthDb(db, sha) {
  const max = 5000;
  if (db.length > max) db = db.slice(db.length - max);
  try { fs.writeFileSync(path.join(DB_PATH, 'health-db.json'), JSON.stringify(db, null, 2)); } catch(e) {}
  await writeToGitHub(db, sha || '');
}

// ---------------------------------------------------------------
// USAGE DB — rediseñado para Vercel serverless
// ---------------------------------------------------------------
// Estrategia:
//   - /tmp/ = cache local rápido (se escribe en cada request)
//   - GitHub = fuente de verdad (se sincroniza cada ~3s)
//   - Escritura async fire-and-forget: el response no espera a GitHub
//   - Admin panel lee de GitHub primero + mergea local

let _lastGithubSync = 0;
let _pendingSync = null;

function shouldSyncToGitHub() {
  const now = Date.now();
  if (now - _lastGithubSync < 3000) return false;
  _lastGithubSync = now;
  return true;
}

// Llamar después de un reset para que el próximo saveUsageDB
// no re-suba datos viejos que estaban en tránsito.
function invalidateSyncState() {
  _lastGithubSync = Date.now(); // bloquea sync por 3s
  _pendingSync = null;
}

function normalizeUsageDB(db) {
  if (!db || typeof db !== 'object') db = {};
  if (!Array.isArray(db.usages)) db.usages = [];
  if (!db.stats || typeof db.stats !== 'object') db.stats = {};
  if (!db.visitors || typeof db.visitors !== 'object' || Array.isArray(db.visitors)) db.visitors = {};
  return db;
}

// Descarta usages/visitors/stats anteriores a resetAt (si existe en el db remoto)
function applyResetFilter(localDb, resetAt) {
  if (!resetAt) return localDb;
  const cutoff = new Date(resetAt).getTime();
  if (!cutoff || isNaN(cutoff)) return localDb;
  const filtered = (localDb.usages || []).filter(u => {
    const t = new Date(u.timestamp || 0).getTime();
    return t >= cutoff;
  });
  if (filtered.length === (localDb.usages || []).length) return localDb;
  // Reconstruir stats y visitors solo con los usages que sobrevivieron
  const stats = {};
  const visitors = {};
  for (const u of filtered) {
    const model = u.model || 'unknown';
    const ip = u.ip || 'unknown';
    if (!stats[model]) stats[model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    stats[model].totalTokens += u.tokens || 0;
    stats[model].totalRequests += 1;
    if (!stats[model].uniqueIPs.includes(ip)) stats[model].uniqueIPs.push(ip);
    if (!visitors[ip]) visitors[ip] = { ip, count: 0, lastSeen: '', models: [], tokens: 0 };
    visitors[ip].count += 1;
    visitors[ip].tokens += u.tokens || 0;
    if ((u.timestamp || '') > (visitors[ip].lastSeen || '')) visitors[ip].lastSeen = u.timestamp;
    if (u.model && !visitors[ip].models.includes(u.model)) visitors[ip].models.push(u.model);
  }
  return { ...localDb, usages: filtered, stats, visitors };
}

function usageKey(u) {
  return [u.timestamp || '', u.model || '', u.ip || '', u.tokens || 0].join('|');
}

function mergeVisitors(target, source) {
  for (const [ip, v] of Object.entries(source || {})) {
    if (!ip) continue;
    if (!target[ip]) target[ip] = { ip, count: 0, lastSeen: '', models: [], tokens: 0 };
    target[ip].count = Math.max(target[ip].count || 0, v.count || 0);
    target[ip].tokens = Math.max(target[ip].tokens || 0, v.tokens || 0);
    if ((v.lastSeen || '') > (target[ip].lastSeen || '')) target[ip].lastSeen = v.lastSeen;
    for (const model of (v.models || [])) {
      if (model && !target[ip].models.includes(model)) target[ip].models.push(model);
    }
  }
  return target;
}

function addUsageToVisitors(visitors, u) {
  const ip = u.ip || 'unknown';
  if (!visitors[ip]) visitors[ip] = { ip, count: 0, lastSeen: '', models: [], tokens: 0 };
  visitors[ip].count += 1;
  visitors[ip].tokens += u.tokens || 0;
  if ((u.timestamp || '') > (visitors[ip].lastSeen || '')) visitors[ip].lastSeen = u.timestamp || '';
  if (u.model && !visitors[ip].models.includes(u.model)) visitors[ip].models.push(u.model);
}

function addUsageToDb(db, usage) {
  db = normalizeUsageDB(db);
  db.usages.push(usage);
  addUsageToVisitors(db.visitors, usage);
  if (!db.stats[usage.model]) db.stats[usage.model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
  db.stats[usage.model].totalTokens += usage.tokens || 0;
  db.stats[usage.model].totalRequests += 1;
  if (!db.stats[usage.model].uniqueIPs.includes(usage.ip || 'unknown')) db.stats[usage.model].uniqueIPs.push(usage.ip || 'unknown');
  if (db.usages.length > 2000) db.usages = db.usages.slice(-2000);
  db.lastUpdated = new Date().toISOString();
  db.lastModel = usage.model;
  db.lastTokens = usage.tokens || 0;
  return db;
}

function rebuildStats(usages, previousStats = {}) {
  const stats = {};

  // Preservar IPs históricas aunque el registro viejo ya no esté en usages.
  for (const [model, s] of Object.entries(previousStats || {})) {
    if (!stats[model]) stats[model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    for (const ip of (s.uniqueIPs || [])) {
      if (ip && !stats[model].uniqueIPs.includes(ip)) stats[model].uniqueIPs.push(ip);
    }
  }

  for (const u of usages || []) {
    const model = u.model || 'unknown';
    const ip = u.ip || 'unknown';
    if (!stats[model]) stats[model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    stats[model].totalTokens += u.tokens || 0;
    stats[model].totalRequests += 1;
    if (!stats[model].uniqueIPs.includes(ip)) stats[model].uniqueIPs.push(ip);
  }

  return stats;
}

function mergeUsageDB(...dbs) {
  const seen = new Set();
  const allUsages = [];
  const previousStats = {};
  const visitors = {};

  for (const raw of dbs) {
    const db = normalizeUsageDB(raw);
    const hasPersistedVisitors = Object.keys(db.visitors || {}).length > 0;
    mergeVisitors(visitors, db.visitors);
    for (const [model, s] of Object.entries(db.stats || {})) {
      if (!previousStats[model]) previousStats[model] = { uniqueIPs: [] };
      for (const ip of (s.uniqueIPs || [])) {
        if (ip && !previousStats[model].uniqueIPs.includes(ip)) previousStats[model].uniqueIPs.push(ip);
        if (ip && !visitors[ip]) visitors[ip] = { ip, count: 0, lastSeen: '', models: [model], tokens: 0 };
        if (ip && visitors[ip] && model && !visitors[ip].models.includes(model)) visitors[ip].models.push(model);
      }
    }
    for (const u of db.usages || []) {
      const k = usageKey(u);
      if (!seen.has(k)) {
        seen.add(k);
        allUsages.push(u);
        if (!hasPersistedVisitors) addUsageToVisitors(visitors, u);
      }
    }
  }

  allUsages.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
  const maxRecords = 2000;
  const trimmedUsages = allUsages.length > maxRecords ? allUsages.slice(-maxRecords) : allUsages;
  return {
    usages: trimmedUsages,
    stats: rebuildStats(trimmedUsages, previousStats),
    visitors,
    lastUpdated: new Date().toISOString()
  };
}

function loadUsageDB() {
  // Hot path: solo /tmp/ (sincrónico, rápido)
  try {
    return normalizeUsageDB(JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8')));
  } catch(e) {}
  return { usages: [], stats: {} };
}

// Admin panel: lee de GitHub + mergea datos locales no sincronizados
async function loadUsageDBAsync() {
  let db = { usages: [], stats: {} };
  let loadedFromGitHub = false;
  const token = getGithubToken();
  if (token) {
    try {
      const r = await fetch(GITHUB_USAGE_URL, {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (r.ok) {
        const d = await r.json();
        db = JSON.parse(Buffer.from(d.content, 'base64').toString());
        loadedFromGitHub = true;
      }
    } catch(e) {}
  }

  // Si GitHub devolvió datos vacíos (reset reciente), NO mergear /tmp —
  // /tmp puede tener datos obsoletos de antes del reset.
  const resetAt = db.resetAt || null;
  const githubEmpty = loadedFromGitHub && (!db.usages || db.usages.length === 0);
  if (!githubEmpty) {
    // Mergear datos locales que GitHub no tenga aún (ventana de ~3s)
    let localDb = null;
    try { localDb = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8')); } catch(e) {}
    if (localDb) {
      const filteredLocal = applyResetFilter(localDb, resetAt);
      db = mergeUsageDB(db, filteredLocal);
      if (resetAt) db.resetAt = resetAt;
    }
  }

  // Actualizar cache local con lo que hay en GitHub (incluso si es vacío)
  try { fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), JSON.stringify(db, null, 2)); } catch(e) {}

  return db;
}

// Guardar: escribe local + sync a GitHub cada ~3s (fire-and-forget)
async function saveUsageDB(localDb) {
  // 1. Siempre escribir a /tmp/ (sincrónico, sin bloqueo)
  try {
    fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), JSON.stringify(localDb, null, 2));
  } catch(e) {}

  // 2. Si pasó la ventana de 3s, disparar sync a GitHub (fire-and-forget)
  if (shouldSyncToGitHub()) {
    _pendingSync = _syncToGitHub(localDb).catch(e => console.log('[db] sync error:', e.message));
  }
}

async function _syncToGitHub(localDb) {
  const token = getGithubToken();
  if (!token) return;

  try {
    // Leer remoto de GitHub
    let remoteDb = { usages: [], stats: {} };
    let sha = '';
    const getRes = await fetch(GITHUB_USAGE_URL, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha || '';
      try { remoteDb = JSON.parse(Buffer.from(fileData.content, 'base64').toString()); } catch(e) {}
    }

    // Si GitHub está vacío (reset reciente), no mergear datos locales viejos.
    // Solo subir localDb si también está vacío, o salir y dejar GitHub limpio.
    const remoteEmpty = !remoteDb.usages || remoteDb.usages.length === 0;
    const resetAt = remoteDb.resetAt || null;
    let mergedDb;
    if (remoteEmpty && !resetAt) {
      // GitHub vacío sin resetAt — primera vez o cold start limpio
      mergedDb = normalizeUsageDB(localDb);
    } else {
      const currentLocal = applyResetFilter(loadUsageDB(), resetAt);
      const filteredLocal = applyResetFilter(localDb, resetAt);
      mergedDb = mergeUsageDB(remoteDb, currentLocal, filteredLocal);
      if (resetAt) mergedDb.resetAt = resetAt; // propagar resetAt
    }

    // Escribir merged a GitHub
    let content = JSON.stringify(mergedDb, null, 2);
    let putRes = await fetch(GITHUB_USAGE_URL, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update usage stats - ${mergedDb.usages.length} records`,
        content: Buffer.from(content).toString('base64'),
        sha
      })
    });

    if (!putRes.ok && putRes.status === 409) {
      const retryRes = await fetch(GITHUB_USAGE_URL, {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const retryRemoteDb = JSON.parse(Buffer.from(retryData.content, 'base64').toString());
        mergedDb = mergeUsageDB(retryRemoteDb, currentLocal, localDb);
        content = JSON.stringify(mergedDb, null, 2);
        putRes = await fetch(GITHUB_USAGE_URL, {
          method: 'PUT',
          headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Update usage stats - ${mergedDb.usages.length} records`,
            content: Buffer.from(content).toString('base64'),
            sha: retryData.sha || ''
          })
        });
      }
    }

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.log('[db] GitHub PUT falló:', putRes.status, errText.substring(0, 200));
      return;
    }

    // Actualizar /tmp/ con datos merged (consistente con GitHub)
    try { fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), content); } catch(e) {}

    console.log('[db] GitHub sync OK:', mergedDb.usages.length, 'registros');
  } catch(e) {
    console.log('[db] _syncToGitHub error:', e.message);
  }
}

module.exports = {
  getHealthDb, saveHealthDb, readFromGitHub, writeToGitHub,
  loadUsageDB, loadUsageDBAsync, saveUsageDB, mergeUsageDB, addUsageToDb,
  invalidateSyncState,
  GITHUB_URL, GITHUB_USAGE_URL, DB_PATH
};
