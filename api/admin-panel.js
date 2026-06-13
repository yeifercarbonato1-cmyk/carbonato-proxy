const fs = require('fs');
const path = require('path');
const { MODELOS } = require('./models-def.js');
const T = require('./admin-templates.js');
const { verifyCookie } = require('./auth.js');
const { getGithubToken } = require('./admin/helpers.js');
const { GITHUB_USAGE_URL } = require('./admin/db.js');

async function loadDB() {
  let db = { usages: [], stats: {} };
  let loadedFromGitHub = false;
  const token = getGithubToken();
  if (token) {
    try {
      const r = await fetch(GITHUB_USAGE_URL, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
      if (r.ok) { const d = await r.json(); db = JSON.parse(Buffer.from(d.content, 'base64').toString()); loadedFromGitHub = true; }
    } catch(e) {}
  }
  // Si GitHub devolvió datos vacíos (reset), NO mergear local (datos obsoletos de otra instancia)
  if (!loadedFromGitHub || (db.usages && db.usages.length > 0)) {
    let localDb = null;
    try { localDb = JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8')); } catch(e) {}
    if (localDb && localDb.usages && localDb.usages.length > 0) {
      const remoteKeys = new Set(db.usages.map(u => u.timestamp + '|' + u.model + '|' + u.ip));
      const nuevos = localDb.usages.filter(u => !remoteKeys.has(u.timestamp + '|' + u.model + '|' + u.ip));
      if (nuevos.length > 0) {
        db.usages.push(...nuevos);
        db.stats = {};
        for (const u of db.usages) {
          if (!db.stats[u.model]) db.stats[u.model] = { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
          db.stats[u.model].totalTokens += u.tokens || 0;
          db.stats[u.model].totalRequests += 1;
          if (!db.stats[u.model].uniqueIPs.includes(u.ip)) db.stats[u.model].uniqueIPs.push(u.ip);
        }
      }
    }
  }
  try { fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(db, null, 2)); } catch(e) {}
  return db;
}

module.exports = async (req, res) => {
  if (!verifyCookie(req.headers.cookie)) return res.writeHead(302, { 'Location': '/api/admin' }).end();

  const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Desconocida').split(',')[0].trim();

  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8')); } catch(e) {}
  if (Object.keys(cfg).length === 0) { try { cfg = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8')); } catch(e) {} }

  const db = await loadDB();
  const stats = db.stats || {};
  const usages = db.usages || [];

  const modelsCount = MODELOS.length;
  const adminApiKey = (process.env.CARBONATO_API_KEY || String(process.env.CARBONATO_API_KEYS || '').split(',')[0] || '').trim();

  // Generar cards desde MODELOS
  let cards = '';
  for (let i = 1; i <= modelsCount; i++) {
    const name = 'modelo' + i;
    const c = cfg[name] || {};
    const s = stats[name] || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    cards += T.modelCardHTML(name, c, s, i-1);
  }

  // Stats overview
  let totalReq = 0, totalTok = 0;
  const totalIps = new Set();
  Object.values(stats).forEach(s => {
    totalReq += s.totalRequests || 0;
    totalTok += s.totalTokens || 0;
    (s.uniqueIPs || []).forEach(ip => totalIps.add(ip));
  });

  // Charts data
  const dailyMap = {};
  usages.forEach(u => {
    const day = (u.timestamp || '').split('T')[0] || (u.timestamp || '').split(' ')[0];
    if (!day) return;
    if (!dailyMap[day]) dailyMap[day] = 0;
    dailyMap[day] += u.tokens || 0;
  });
  const dailyLabels = Object.keys(dailyMap).sort();
  const dailyData = dailyLabels.map(d => dailyMap[d]);

  const modelRank = Object.entries(stats).map(([m, s]) => ({ model: m, requests: s.totalRequests || 0 })).sort((a, b) => b.requests - a.requests).slice(0, 10);
  const topModelsLabels = modelRank.map(r => r.model);
  const topModelsData = modelRank.map(r => r.requests);

  const ipCount = {};
  usages.forEach(u => { if (u.ip) ipCount[u.ip] = (ipCount[u.ip] || 0) + 1; });
  const topIPs = Object.entries(ipCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topIPsLabels = topIPs.map(r => r[0]);
  const topIPsData = topIPs.map(r => r[1]);

  // Stats cards
  let statsCards = '';
  for (let i = 1; i <= modelsCount; i++) {
    const name = 'modelo' + i;
    const s = stats[name] || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    statsCards += T.statCardHTML(name, s, i-1);
  }

  // Telegram bot status
  let botStatus = 'nodata';
  let hdb = null;
  try { hdb = JSON.parse(fs.readFileSync('/tmp/health-db.json', 'utf8')); } catch(e) {}
  // Fallback a GitHub si /tmp está vacío (cold start)
  if (!hdb || (Array.isArray(hdb) && hdb.length === 0)) {
    try {
      const ghUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/health-db.json';
      const ghToken = getGithubToken();
      if (ghToken) {
        const r = await fetch(ghUrl, { headers: { 'Authorization': `token ${ghToken}`, 'Accept': 'application/vnd.github.v3+json' } });
        if (r.ok) { const d = await r.json(); hdb = JSON.parse(Buffer.from(d.content, 'base64').toString()); }
      }
    } catch(e) {}
  }
  if (hdb) {
    const lastCheck = Array.isArray(hdb) && hdb.length > 0
      ? hdb[hdb.length - 1].time
      : hdb.lastCheck ? new Date(hdb.lastCheck).getTime() : 0;
    if (lastCheck && Date.now() - lastCheck < 3600000) botStatus = 'ok';
    else if (lastCheck) botStatus = 'error';
  }

  // Collect live env vars for display
  const envData = [];
  for (let i = 1; i <= modelsCount; i++) {
    const m = MODELOS[i - 1];
    const idx = i;
    const modelEnv = process.env[`MODELO${idx}_MODEL`] || '';
    const urlEnv = process.env[`MODELO${idx}_URL`] || '';
    const keyEnv = process.env[`MODELO${idx}_KEY`];
    envData.push({
      id: m.id,
      name: m.name,
      icon: m.icon || '🔷',
      model: modelEnv,
      url: urlEnv,
      key: keyEnv,
      modelEnvName: `MODELO${idx}_MODEL`,
      urlEnvName: `MODELO${idx}_URL`,
      keyEnvName: keyEnv !== undefined ? `MODELO${idx}_KEY` : undefined
    });
  }
  // Global env vars
  const globalEnvVars = [
    { key: 'SYSTEM_PROMPT1', label: 'System Prompt Global', val: process.env.SYSTEM_PROMPT1 || '', icon: '📝' },
    { key: 'CARBONATO_API_KEY', label: 'Carbonato API Key', val: process.env.CARBONATO_API_KEY || '(usando lista)', icon: '🔐' },
  ];

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(
    T.headHTML('⎈ CARBONATO — PANEL ⎈') +
    T.topBarHTML(userIp) +
    T.navHTML() +
    T.overviewHTML(totalReq, totalTok, totalIps.size, modelsCount) +
    T.telegramStatusHTML(botStatus) +
    T.chartsSectionHTML(dailyLabels, dailyData, topModelsLabels, topModelsData, topIPsLabels, topIPsData, usages) +
    T.apiKeyBoxHTML(adminApiKey) +
    T.actionButtonsHTML() +
    `<div class="section-title">GESTIÓN DE MODELOS</div><div class="m-grid">${cards}</div>` +
    `<div class="stats-section"><div class="section-title">ESTADÍSTICAS POR MODELO</div><div class="s-grid">${statsCards}</div></div>` +
    T.envSectionHTML(envData, globalEnvVars) +
    T.usageTableHTML(usages) +
    T.footHTML() +
    T.chartScriptsHTML() +
    `<style>#resetBtn{position:fixed;bottom:8px;right:8px;background:none;border:none;color:rgba(255,255,255,0.12);font-size:9px;cursor:pointer;font-family:'JetBrains Mono',monospace;padding:4px 8px;transition:color 0.3s;z-index:999}#resetBtn:hover{color:rgba(255,255,255,0.4)}#resetBtn.confirm{color:#ff4444}</style>
<button id="resetBtn" onclick="if(this.classList.contains('confirm')){fetch('/api/usage/reset',{method:'POST'}).then(r=>r.json()).then(d=>{if(d.ok)location.reload()}).catch(()=>{})}else{this.textContent='¿SEGURO?';this.classList.add('confirm');setTimeout(()=>{this.textContent='●';this.classList.remove('confirm')},4000)}" title="reset stats">●</button>`
  );
};
