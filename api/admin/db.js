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

function loadUsageDB() {
  // Hot path: solo /tmp/ (sincrónico, rápido)
  try {
    return JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8'));
  } catch(e) {}
  return { usages: [], stats: {} };
}

// Admin panel: lee de GitHub + mergea datos locales no sincronizados
async function loadUsageDBAsync() {
  let db = { usages: [], stats: {} };
  const token = getGithubToken();
  if (token) {
    try {
      const r = await fetch(GITHUB_USAGE_URL, {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (r.ok) {
        const d = await r.json();
        db = JSON.parse(Buffer.from(d.content, 'base64').toString());
      }
    } catch(e) {}
  }

  // Mergear datos locales que GitHub no tenga aún (ventana de ~3s)
  let localDb = null;
  try { localDb = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8')); } catch(e) {}
  if (localDb && localDb.usages && localDb.usages.length > 0) {
    const remoteKeys = new Set((db.usages || []).map(u => u.timestamp + '|' + u.model + '|' + u.ip));
    const nuevos = (localDb.usages || []).filter(u => !remoteKeys.has(u.timestamp + '|' + u.model + '|' + u.ip));
    if (nuevos.length > 0) {
      db.usages = [...(db.usages || []), ...nuevos];
      // Reconstruir stats
      db.stats = {};
      for (const u of (db.usages || [])) {
        if (!db.stats[u.model]) db.stats[u.model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
        db.stats[u.model].totalTokens += u.tokens || 0;
        db.stats[u.model].totalRequests += 1;
        if (!db.stats[u.model].uniqueIPs.includes(u.ip)) db.stats[u.model].uniqueIPs.push(u.ip);
      }
    }
  }

  // Actualizar cache local
  if (db.usages && db.usages.length > 0) {
    try { fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), JSON.stringify(db, null, 2)); } catch(e) {}
  }

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

    // Merge dedup por timestamp+model+ip
    const seen = new Set();
    const allUsages = [];

    for (const u of (remoteDb.usages || [])) {
      const k = u.timestamp + '|' + u.model + '|' + u.ip;
      if (!seen.has(k)) { seen.add(k); allUsages.push(u); }
    }
    for (const u of (localDb.usages || [])) {
      const k = u.timestamp + '|' + u.model + '|' + u.ip;
      if (!seen.has(k)) { seen.add(k); allUsages.push(u); }
    }

    // Limitar a últimos 2000 registros (antes 1000)
    const maxRecords = 2000;
    const trimmedUsages = allUsages.length > maxRecords ? allUsages.slice(-maxRecords) : allUsages;

    // Reconstruir stats desde los registros completos (antes de truncar, para no perder IPs)
    const mergedDb = { usages: trimmedUsages, stats: {} };
    for (const u of allUsages) {
      if (!mergedDb.stats[u.model]) mergedDb.stats[u.model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
      mergedDb.stats[u.model].totalTokens += u.tokens || 0;
      mergedDb.stats[u.model].totalRequests += 1;
      if (!mergedDb.stats[u.model].uniqueIPs.includes(u.ip)) mergedDb.stats[u.model].uniqueIPs.push(u.ip);
    }

    // Escribir merged a GitHub
    const content = JSON.stringify(mergedDb, null, 2);
    const putRes = await fetch(GITHUB_USAGE_URL, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update usage stats - ${trimmedUsages.length} records`,
        content: Buffer.from(content).toString('base64'),
        sha
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.log('[db] GitHub PUT falló:', putRes.status, errText.substring(0, 200));
      return;
    }

    // Actualizar /tmp/ con datos merged (consistente con GitHub)
    try { fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), content); } catch(e) {}

    console.log('[db] GitHub sync OK:', trimmedUsages.length, 'registros');
  } catch(e) {
    console.log('[db] _syncToGitHub error:', e.message);
  }
}

module.exports = {
  getHealthDb, saveHealthDb, readFromGitHub, writeToGitHub,
  loadUsageDB, loadUsageDBAsync, saveUsageDB,
  GITHUB_URL, GITHUB_USAGE_URL, DB_PATH
};
