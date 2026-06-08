// Database layer unificada — health-db + usage-db con persistencia GitHub + /tmp
const fs = require('fs');
const path = require('path');
const { getGithubToken } = require('./helpers.js');

const DB_PATH = '/tmp';
const GITHUB_OWNER = 'yeifer125';
const GITHUB_REPO = 'proxi-datos';
const GITHUB_PATH = 'health-db.json';
const GITHUB_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
const GITHUB_USAGE_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/usage-db.json`;

// ========================================================
// HEALTH DB
// ========================================================

async function readFromGitHub() {
  const token = getGithubToken();
  if (!token) return null;
  try {
    const r = await fetch(GITHUB_URL, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!r.ok) return null;
    const data = await r.json();
    return { content: JSON.parse(Buffer.from(data.content, 'base64').toString()), sha: data.sha || '' };
  } catch(e) { return null; }
}

async function writeToGitHub(content, sha) {
  const token = getGithubToken();
  if (!token) return false;
  try {
    const r = await fetch(GITHUB_URL, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update health-db.json - ${new Date().toISOString().slice(0,10)}`,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha
      })
    });
    return r.ok;
  } catch(e) { return false; }
}

async function getHealthDb() {
  const gh = await readFromGitHub();
  let sha = gh ? gh.sha || '' : '';
  if (gh && Array.isArray(gh.content)) return { data: gh.content, sha: gh.sha || '' };
  // Convertir formato object {latencies, history} → array
  if (gh && gh.content && typeof gh.content === 'object' && gh.content.latencies) {
    const arr = [];
    Object.entries(gh.content.latencies).forEach(([model, v]) => {
      if (v.avg && v.count > 0) {
        for (let i = 0; i < Math.min(v.count, 10); i++) {
          arr.push({ model, latency: v.avg, time: Date.now() - 60000, ip: 'legacy' });
        }
      }
    });
    return { data: arr, sha: gh.sha || '' };
  }
  // Fallback a /tmp
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'health-db.json'), 'utf8'));
    if (!Array.isArray(raw) && raw.latencies) {
      const arr = [];
      Object.entries(raw.latencies).forEach(([model, v]) => {
        if (v.avg && v.count > 0) {
          for (let i = 0; i < Math.min(v.count, 10); i++) {
            arr.push({ model, latency: v.avg, time: Date.now() - 60000, ip: 'legacy' });
          }
        }
      });
      return { data: arr, sha };
    }
    return { data: Array.isArray(raw) ? raw : [], sha };
  } catch (e) { return { data: [], sha }; }
}

async function saveHealthDb(db, sha) {
  const max = 5000;
  if (db.length > max) db = db.slice(db.length - max);
  try { fs.writeFileSync(path.join(DB_PATH, 'health-db.json'), JSON.stringify(db, null, 2)); } catch(e) {}
  await writeToGitHub(db, sha || '');
}

// ========================================================
// USAGE DB
// ========================================================

// Rate limiter para GitHub writes
let _lastGithubSync = 0;
function shouldSyncToGitHub() {
  return false; // DESACTIVADO TEMPORALMENTE para reset
  const now = Date.now();
  if (now - _lastGithubSync < 30000) return false;
  _lastGithubSync = now;
  return true;
}

function loadUsageDB() {
  // Solo sincrónico desde /tmp (hot path de cada request)
  try {
    return JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8'));
  } catch(e) {}
  return { usages: [], stats: {} };
}

// Versión async con GitHub fallback (para admin-panel.js que sí necesita merge remoto)
async function loadUsageDBAsync() {
  const local = loadUsageDB();
  if (local && Array.isArray(local.usages) && local.usages.length > 0) return local;
  // Fallback a GitHub
  try {
    const token = getGithubToken();
    if (token) {
      const r = await fetch(GITHUB_USAGE_URL, {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (r.ok) {
        const data = await r.json();
        return JSON.parse(Buffer.from(data.content, 'base64').toString());
      }
    }
  } catch(e) {}
  return { usages: [], stats: {} };
}

async function saveUsageDB(localDb) {
  // Siempre guardar local
  try { fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), JSON.stringify(localDb, null, 2)); } catch(e) {}
  if (!shouldSyncToGitHub()) return;
  const token = getGithubToken();
  if (!token) return;
  try {
    // Fetch remote + merge (evita race conditions entre instancias)
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
    const mergedDb = { usages: [], stats: {} };
    const seen = new Set();
    for (const u of (remoteDb.usages || [])) {
      const k = u.timestamp + '|' + u.model + '|' + u.ip;
      if (!seen.has(k)) { seen.add(k); mergedDb.usages.push(u); }
    }
    for (const u of (localDb.usages || [])) {
      const k = u.timestamp + '|' + u.model + '|' + u.ip;
      if (!seen.has(k)) { seen.add(k); mergedDb.usages.push(u); }
    }
    // Rebuild stats
    for (const u of mergedDb.usages) {
      if (!mergedDb.stats[u.model]) mergedDb.stats[u.model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
      mergedDb.stats[u.model].totalTokens += u.tokens || 0;
      mergedDb.stats[u.model].totalRequests += 1;
      if (!mergedDb.stats[u.model].uniqueIPs.includes(u.ip)) mergedDb.stats[u.model].uniqueIPs.push(u.ip);
    }
    if (mergedDb.usages.length > 1000) mergedDb.usages = mergedDb.usages.slice(-1000);
    // Write merged a GitHub
    const content = JSON.stringify(mergedDb, null, 2);
    const putRes = await fetch(GITHUB_USAGE_URL, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Update usage stats - ${mergedDb.usages.length} records`, content: Buffer.from(content).toString('base64'), sha })
    });
    if (!putRes.ok) { const e = await putRes.text(); console.log('[db] GitHub PUT falló:', putRes.status, e.substring(0,200)); }
    // Actualizar /tmp con merged
    try { fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), content); } catch(e) {}
  } catch(e) { console.log('[db] saveUsageDB error:', e.message); }
}

module.exports = {
  getHealthDb, saveHealthDb, readFromGitHub, writeToGitHub,
  loadUsageDB, loadUsageDBAsync, saveUsageDB,
  GITHUB_URL, GITHUB_USAGE_URL, DB_PATH
};
