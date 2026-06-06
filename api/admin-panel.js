const fs = require('fs');

async function loadDB() {
  const githubToken = process.env.GITHUB_TOKEN || '';
  let db = { usages: [], stats: {} };
  if (githubToken) {
    try {
      const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
      const getRes = await fetch(apiUrl, { headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' } });
      if (getRes.ok) {
        const data = await getRes.json();
        db = JSON.parse(Buffer.from(data.content, 'base64').toString());
      }
    } catch(e) {}
  }
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
  try { fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(db, null, 2)); } catch(e) {}
  return db;
}

module.exports = async (req, res) => {
  const cookies = req.headers.cookie || '';
  if (!cookies.includes('admin_sess=ok')) {
    return res.writeHead(302, { 'Location': '/api/admin' }).end();
  }

  const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Desconocida').split(',')[0].trim();

  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8')); } catch(e) {}
  if (Object.keys(cfg).length === 0) {
    try { cfg = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8')); } catch(e) {}
  }

  const db = await loadDB();
  const stats = db.stats || {};
  const usages = db.usages || [];

  // Build model cards HTML
  const colors = ['#00fff5','#ff00e6','#7b2ff7','#00ff88','#ffd700','#ff4500','#00bfff','#ff69b4','#00ffff','#ff8c00','#8a2be2','#ff1493','#00ff7f','#da70d6','#ff6347','#7fff00'];
  let cards = '';
  for (let i = 1; i <= 16; i++) {
    const name = 'modelo' + i;
    const c = cfg[name] || {};
    const s = stats[name] || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    const color = colors[i-1];
    cards += `<div class="m-card" style="--card-color:${color}">
      <div class="m-head"><span class="m-icon">${['🌟','🌙','🚀','⚡','✨','🧠','💻','🌐','🔄','💎','🧬','🔮','🔥','🌀','💫','⚗️'][i-1]}</span><span class="m-name" style="color:${color}">${name}</span></div>
      <div class="m-field"><span class="m-label">BASE URL</span><input class="m-inp" id="url${i}" value="${(c.url||'').replace(/"/g,'&quot;')}"></div>
      <div class="m-field"><span class="m-label">MODEL ID</span><input class="m-inp" id="id${i}" value="${(c.model||'').replace(/"/g,'&quot;')}"></div>
      <div class="m-field"><span class="m-label">API KEY</span><input class="m-inp" id="key${i}" value="${(c.key||'').replace(/"/g,'&quot;')}"></div>
      <div class="m-field"><span class="m-label">SYSTEM PROMPT</span><textarea class="m-ta" id="sp${i}" rows="2">${(c.system_prompt||'').replace(/"/g,'&quot;')}</textarea></div>
      <div class="m-stats"><span>📊 ${s.totalRequests}</span><span>🔢 ${s.totalTokens.toLocaleString()}</span><span>🌐 ${s.uniqueIPs.length}</span></div>
      <button class="m-btn" onclick="test('${name}',${i})">⟫ PROBAR</button>
      <div id="r${i}" class="m-result"></div>
    </div>`;
  }

  // Usage table
  const recentUsages = usages.slice(-20).reverse();
  let usageRows = '';
  recentUsages.forEach(u => {
    const time = new Date(u.timestamp).toLocaleString();
    usageRows += `<tr><td>${u.model}</td><td class="ip">${u.ip}</td><td>${u.tokens}</td><td class="time">${time}</td></tr>`;
  });

  // Chart data: daily tokens
  const dailyMap = {};
  usages.forEach(u => {
    const day = (u.timestamp || '').split('T')[0] || (u.timestamp || '').split(' ')[0];
    if (!day) return;
    if (!dailyMap[day]) dailyMap[day] = 0;
    dailyMap[day] += u.tokens || 0;
  });
  const dailyLabels = Object.keys(dailyMap).sort();
  const dailyData = dailyLabels.map(d => dailyMap[d]);

  // Chart data: top models
  const modelRank = Object.entries(stats)
    .map(([m, s]) => ({ model: m, requests: s.totalRequests || 0 }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);
  const topModelsLabels = modelRank.map(r => r.model);
  const topModelsData = modelRank.map(r => r.requests);

  // Chart data: top IPs
  const ipCount = {};
  usages.forEach(u => { if (u.ip) ipCount[u.ip] = (ipCount[u.ip] || 0) + 1; });
  const topIPs = Object.entries(ipCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topIPsLabels = topIPs.map(r => r[0]);
  const topIPsData = topIPs.map(r => r[1]);

  // Stats overview
  let totalReq = 0, totalTok = 0, totalIps = new Set();
  Object.values(stats).forEach(s => {
    totalReq += s.totalRequests || 0;
    totalTok += s.totalTokens || 0;
    (s.uniqueIPs || []).forEach(ip => totalIps.add(ip));
  });

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ CARBONATO — PANEL ⎈</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.6);--border:rgba(0,255,255,0.1);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--gold:#ffd700;--text:#e0e0e0;--dim:#6666aa}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.025) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none}
.glow{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;z-index:0;animation:orb 25s ease-in-out infinite}
.g1{width:500px;height:500px;background:radial-gradient(circle,rgba(123,47,247,0.12),transparent);top:-200px;left:-200px}
.g2{width:400px;height:400px;background:radial-gradient(circle,rgba(0,255,245,0.08),transparent);bottom:-150px;right:-150px;animation-delay:-10s}
@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-40px) scale(1.1)}66%{transform:translate(-30px,30px) scale(0.9)}}
.container{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:20px}
/* TOP BAR */
.top-bar{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:var(--card);border:1px solid var(--border);border-radius:12px;backdrop-filter:blur(12px);margin-bottom:20px;flex-wrap:wrap;gap:12px}
.top-bar .brand{font-size:18px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.top-bar .meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.top-bar .meta-item{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);display:flex;align-items:center;gap:6px}
.top-bar .meta-item .dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse-dot 2s ease-in-out infinite;display:inline-block}
.top-bar .meta-item .val{color:var(--cyan)}
.logout-btn{padding:6px 14px;border:1px solid rgba(255,0,0,0.3);border-radius:6px;color:#ff4444;font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none;transition:all 0.2s;background:rgba(255,0,0,0.05)}
.logout-btn:hover{background:rgba(255,0,0,0.15);border-color:#ff4444}
/* STATS OVERVIEW */
.overview{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px}
.ov-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;backdrop-filter:blur(12px);transition:all 0.3s}
.ov-card:hover{border-color:rgba(0,255,245,0.25);transform:translateY(-1px)}
.ov-card .ov-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.ov-card .ov-value{font-size:24px;font-weight:700;color:#fff;font-family:'JetBrains Mono',monospace}
.ov-card .ov-value span{font-size:14px;color:var(--dim);font-weight:400}
.ov-card:nth-child(1) .ov-value{color:var(--cyan)}
.ov-card:nth-child(2) .ov-value{color:var(--magenta)}
.ov-card:nth-child(3) .ov-value{color:var(--green)}
.ov-card:nth-child(4) .ov-value{color:var(--gold)}
/* SECTION */
.section-title{font-size:14px;font-weight:700;color:var(--cyan);margin-bottom:14px;display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;letter-spacing:1px}
.section-title::before{content:'◆';font-size:10px;color:var(--magenta)}
/* MODEL GRID */
.m-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:24px}
.m-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;backdrop-filter:blur(12px);position:relative;overflow:hidden;transition:all 0.3s}
.m-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--card-color),transparent);opacity:0;transition:opacity 0.3s}
.m-card:hover{border-color:rgba(0,255,245,0.2);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,255,245,0.05)}
.m-card:hover::before{opacity:1}
.m-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.m-icon{font-size:20px}
.m-name{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700}
.m-field{margin-bottom:8px}
.m-label{display:block;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
.m-inp,.m-ta{width:100%;padding:8px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;transition:all 0.2s}
.m-inp:focus,.m-ta:focus{border-color:rgba(0,255,245,0.3);box-shadow:0 0 15px rgba(0,255,245,0.04);background:rgba(0,0,0,0.5)}
.m-ta{resize:vertical;min-height:40px}
.m-stats{display:flex;gap:12px;margin:10px 0;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--dim);flex-wrap:wrap}
.m-btn{padding:7px 16px;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--cyan);font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;transition:all 0.2s;width:100%}
.m-btn:hover{background:rgba(0,255,245,0.08);border-color:rgba(0,255,245,0.3)}
.m-result{margin-top:8px;padding:8px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:9px;word-break:break-all;display:none;line-height:1.5}
.m-result.ok{display:block;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.15);color:var(--green)}
.m-result.err{display:block;background:rgba(255,0,0,0.05);border:1px solid rgba(255,0,0,0.15);color:#ff4444}
/* ACTIONS */
.actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:20px 0}
.action-btn{padding:12px 24px;border:none;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.3s;letter-spacing:2px;text-transform:uppercase;position:relative;overflow:hidden}
.action-btn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);transition:left 0.5s}
.action-btn:hover::after{left:100%}
.action-btn.save{background:linear-gradient(135deg,var(--cyan),var(--purple));color:#000}
.action-btn.save:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,255,245,0.2)}
.action-btn.check{background:transparent;border:1px solid var(--green);color:var(--green)}
.action-btn.check:hover{background:rgba(0,255,136,0.08);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,255,136,0.1)}
.action-btn.logout{border:1px solid rgba(255,0,0,0.3);color:#ff4444;background:transparent}
.action-btn.logout:hover{background:rgba(255,0,0,0.08)}
.nav{display:flex;gap:4px;flex-wrap:wrap;margin:12px 0 20px}
.nav-link{padding:6px 14px;border:1px solid var(--border);border-radius:6px;font-family:JetBrains Mono,monospace;font-size:9px;color:var(--dim);text-decoration:none;transition:all 0.2s}
.nav-link:hover{color:var(--cyan);border-color:var(--cyan);background:rgba(0,255,245,0.04)}
/* CHARTS */
.charts-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:24px}
.chart-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;backdrop-filter:blur(12px)}
.chart-card h4{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--cyan);margin-bottom:10px}
.chart-card canvas{max-height:200px;max-width:100%}
.chart-card .c-info{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--dim);margin-top:8px;text-align:center}
.csv-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:1px solid var(--gold);border-radius:6px;background:transparent;color:var(--gold);font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;transition:all 0.2s}
.csv-btn:hover{background:rgba(255,215,0,0.08);transform:translateY(-1px)}
/* STATUS */
#status{text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;min-height:24px;margin:10px 0}
#status .ok{color:var(--green)}
#status .err{color:#ff4444}
#status .info{color:var(--cyan)}
/* STATS SECTION */
.stats-section{margin-top:24px}
.s-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:20px}
.s-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;backdrop-filter:blur(12px)}
.s-card h4{font-family:'JetBrains Mono',monospace;font-size:11px;margin-bottom:10px}
.s-row{display:flex;justify-content:space-between;padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:9px;border-bottom:1px solid rgba(255,255,255,0.03)}
.s-row .l{color:var(--dim)}
.s-row .r{color:var(--text)}
.s-row .ips{font-size:8px;color:var(--cyan);word-break:break-all;max-width:120px;text-align:right}
/* TABLE */
.table-wrap{overflow-x:auto;margin-top:10px}
table{width:100%;border-collapse:collapse}
th,td{padding:10px 12px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;border-bottom:1px solid var(--border)}
th{color:var(--cyan);font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700}
td{color:var(--dim)}
tr:hover td{background:rgba(0,255,245,0.02);color:var(--text)}
td.ip{color:var(--magenta);font-size:9px}
td.time{color:var(--dim);font-size:9px}
/* FOOTER */
.footer{text-align:center;padding:20px 0;margin-top:30px;border-top:1px solid var(--border)}
.footer p{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--dim)}
@keyframes pulse-dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
@media(max-width:768px){.top-bar{flex-direction:column;align-items:flex-start}.m-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="container">

<!-- TOP BAR -->
<div class="top-bar">
  <div class="brand">CARBONATO PROXY</div>
  <div class="meta">
    <span class="meta-item"><span class="dot"></span> SISTEMA ACTIVO</span>
    <span class="meta-item">IP: <span class="val">${userIp}</span></span>
    <span class="meta-item" id="clock">⏱ <span class="val">${new Date().toLocaleString()}</span></span>
    <a href="/api/admin-logout" class="logout-btn">⛙ SALIR</a>
  </div>
</div>

<!-- NAV -->
<nav class="nav">
  <a href="/api/admin-panel" class="nav-link">⟐ DASHBOARD</a>
  <a href="/api/health/page" class="nav-link">⟐ HEALTH</a>
  <a href="/api/competencia/page" class="nav-link">⟐ COMPETENCIA</a>
  <a href="/api/rotator/page" class="nav-link">⟐ ROTADOR</a>
  <a href="/api/prompts/page" class="nav-link">⟐ TEMPLATES</a>
  <a href="/api/playground" class="nav-link">⟐ PLAYGROUND</a>
</nav>

<!-- OVERVIEW -->
<div class="overview">
  <div class="ov-card"><div class="ov-label">Total Requests</div><div class="ov-value">${totalReq.toLocaleString()}<span></span></div></div>
  <div class="ov-card"><div class="ov-label">Tokens Consumidos</div><div class="ov-value">${totalTok.toLocaleString()}<span></span></div></div>
  <div class="ov-card"><div class="ov-label">IPs Únicas</div><div class="ov-value">${totalIps.size}<span></span></div></div>
  <div class="ov-card"><div class="ov-label">Modelos</div><div class="ov-value">16<span> / 16 activos</span></div></div>
</div>

<!-- CHARTS -->
<div class="section-title">📈 ANALÍTICA</div>
<div class="charts-row">
  <div class="chart-card">
    <h4>Tokens por Día</h4>
    <canvas id="chartDaily"></canvas>
    <div class="c-info">${dailyLabels.length} días registrados</div>
  </div>
  <div class="chart-card">
    <h4>Modelos Más Usados</h4>
    <canvas id="chartModels"></canvas>
    <div class="c-info">${topModelsLabels.length} modelos</div>
  </div>
  <div class="chart-card">
    <h4>Top IPs</h4>
    <canvas id="chartIPs"></canvas>
    <div class="c-info">${topIPsLabels.length} IPs principales</div>
  </div>
</div>

<script>
const CHART_DATA = ${JSON.stringify({dailyLabels,dailyData,topModelsLabels,topModelsData,topIPsLabels,topIPsData, _raw: usages})};
</script>

<!-- ACTION BUTTONS -->

<!-- ACTION BUTTONS -->
<div class="actions">
  <button class="action-btn save" onclick="saveAll()">⟫ GUARDAR CAMBIOS</button>
  <button class="action-btn check" onclick="checkAll()">⟫ VERIFICAR MODELOS</button>
  <button class="csv-btn" onclick="exportCSV()">⬇ EXPORTAR CSV</button>
  
  <a href="/api/admin-logout" class="action-btn logout">⛙ CERRAR SESIÓN</a>
</div>

<div id="status"></div>

<!-- MODELS -->
<div class="section-title">GESTIÓN DE MODELOS</div>
<div class="m-grid">${cards}</div>

<!-- STATS -->
<div class="stats-section">
  <div class="section-title">ESTADÍSTICAS POR MODELO</div>
  <div class="s-grid">
    ${(() => {
      let sc = '';
      for (let i = 1; i <= 16; i++) {
        const name = 'modelo' + i;
        const s = stats[name] || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
        const ipsList = (s.uniqueIPs || []).slice(0,5).join(', ');
        const color = colors[i-1];
        sc += `<div class="s-card"><h4 style="color:${color}">${['🌟','🌙','🚀','⚡','✨','🧠','💻','🌐','🔄','💎','🧬','🔮','🔥','🌀','💫','⚗️'][i-1]} ${name}</h4><div class="s-row"><span class="l">Tokens</span><span class="r">${s.totalTokens.toLocaleString()}</span></div><div class="s-row"><span class="l">Requests</span><span class="r">${s.totalRequests}</span></div><div class="s-row"><span class="l">IPs</span><span class="r">${s.uniqueIPs.length}</span></div><div class="s-row"><span class="l">IPs</span><span class="r ips">${ipsList || '-'}</span></div></div>`;
      }
      return sc;
    })()}
  </div>
</div>

<!-- USAGE TABLE -->
<div class="stats-section">
  <div class="section-title">USO RECIENTE</div>
  <div class="table-wrap">
    <table>
      <tr><th>Modelo</th><th>IP</th><th>Tokens</th><th>Fecha</th></tr>
      ${usageRows || '<tr><td colspan="4" style="text-align:center;color:var(--dim)">Sin datos de uso aún</td></tr>'}
    </table>
  </div>
</div>

<div class="footer">
  <p>CARBONATO PROXY · <span style="color:var(--cyan)">Cofrad.IA</span> · Panel de Control v6.0</p>
  <p style="margin-top:4px;opacity:0.4">⚡ Costa Rica · 100% código libre ⚡</p>
</div>

</div>

<script>
function test(m,n){
  var d=document.getElementById('r'+n);
  d.className='m-result';
  d.style.display='block';
  d.textContent='⟫ CONECTANDO...';
  var h={'Content-Type':'application/json'};
  var msgs=[];
  var sp=document.getElementById('sp'+n).value;
  if(sp) msgs.push({role:'system',content:sp});
  msgs.push({role:'user',content:'Responde solo OK'});
  fetch('/chat/completions',{method:'POST',headers:h,body:JSON.stringify({model:m,messages:msgs})})
  .then(r=>r.text())
  .then(x=>{
    try{
      var js=JSON.parse(x);
      if(js.error){d.className='m-result err';d.textContent='⛔ '+(js.error.message||JSON.stringify(js.error)).substring(0,500)}
      else{
        var cont=js.choices?.[0]?.message?.content||JSON.stringify(js,null,2);
        d.className='m-result ok';
        d.textContent='✓ '+cont.substring(0,500);
      }
    }catch(e){
      d.className='m-result ok';
      d.textContent='✓ '+x.substring(0,500);
    }
  })
  .catch(e=>{d.className='m-result err';d.textContent='⛔ Error: '+e.message});
}

function saveAll(){
  var c={};
  for(var i=1;i<=16;i++){
    c['modelo'+i]={
      url:document.getElementById('url'+i).value,
      model:document.getElementById('id'+i).value,
      key:document.getElementById('key'+i).value,
      system_prompt:document.getElementById('sp'+i).value
    };
  }
  var st=document.getElementById('status');
  st.innerHTML='<span class="info">⟫ GUARDANDO CONFIGURACIÓN...</span>';
  fetch('/api/admin-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)})
  .then(r=>r.json())
  .then(x=>{
    st.innerHTML=x.success
      ? '<span class="ok">✓ CONFIGURACIÓN GUARDADA</span>'
      : '<span class="err">⛔ ERROR AL GUARDAR</span>';
    setTimeout(()=>st.innerHTML='',3000);
  })
  .catch(e=>{st.innerHTML='<span class="err">⛔ '+e.message+'</span>';});
}

function checkAll(){
  var st=document.getElementById('status');
  st.innerHTML='<span class="info">⟫ CONSULTANDO MODELOS EN KILO.AI...</span>';
  fetch('/api/models-check')
  .then(r=>r.json())
  .then(x=>{
    if(x.models){
      var html='';
      x.models.forEach(m=>{
        html+='<div style="font-family:JetBrains Mono,monospace;font-size:9px;margin:2px 0;color:'+(m.status=='active'?'var(--green)':'#ff4444')+'">'+(m.status=='active'?'✓':'⛔')+' '+m.model+' — '+m.status+'</div>';
      });
      st.innerHTML='<span class="ok">✓ MODELOS ENCONTRADOS: '+x.active+'</span><br>'+html;
      if(x.config_update){
        for(var i=1;i<=10;i++){
          if(x.config_update['modelo'+i]){
            document.getElementById('id'+i).value=x.config_update['modelo'+i].model;
          }
        }
        st.innerHTML+='<br><span class="ok">✓ MODELOS ACTUALIZADOS EN FORMULARIO</span>';
      }
    } else {
      st.innerHTML='<span class="err">⛔ ERROR AL CONSULTAR</span>';
    }
    setTimeout(()=>st.innerHTML='',8000);
  })
  .catch(e=>{st.innerHTML='<span class="err">⛔ ERROR: '+e.message+'</span>';});
}

// Clock
setInterval(()=>{
  var c=document.getElementById('clock');
  if(c) c.innerHTML='⏱ <span class="val">'+new Date().toLocaleString()+'</span>';
},1000);

// Charts
Chart.defaults.color='rgba(255,255,255,0.4)';
Chart.defaults.font.family='JetBrains Mono,monospace';
const chartOpts=extra=>Object.assign({
  responsive:true,maintainAspectRatio:false,
  plugins:{legend:{labels:{color:'rgba(255,255,255,0.5)',font:{size:9}}}},
  scales:{x:{ticks:{color:'rgba(255,255,255,0.3)',font:{size:8}},grid:{color:'rgba(0,255,245,0.06)'}},y:{ticks:{color:'rgba(255,255,255,0.3)',font:{size:8}},grid:{color:'rgba(0,255,245,0.06)'}}}
},extra);

if(CHART_DATA.dailyLabels.length){
  new Chart(document.getElementById('chartDaily'),{
    type:'line',
    data:{labels:CHART_DATA.dailyLabels,datasets:[{label:'Tokens',data:CHART_DATA.dailyData,borderColor:'#00fff5',backgroundColor:'rgba(0,255,245,0.1)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#00fff5',borderWidth:2}]},
    options:chartOpts({plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v>=1000?(v/1000).toFixed(1)+'k':v}}}})
  });
}

if(CHART_DATA.topModelsLabels.length){
  const c=['#00fff5','#ff00e6','#7b2ff7','#00ff88','#ffd700','#ff4500','#00bfff','#ff69b4','#00ffff','#ff8c00'];
  new Chart(document.getElementById('chartModels'),{
    type:'doughnut',
    data:{labels:CHART_DATA.topModelsLabels,datasets:[{data:CHART_DATA.topModelsData,backgroundColor:c,borderColor:'rgba(10,10,15,0.8)',borderWidth:2}]},
    options:chartOpts({plugins:{legend:{position:'right',labels:{font:{size:8},padding:4}}}})
  });
}

if(CHART_DATA.topIPsLabels.length){
  new Chart(document.getElementById('chartIPs'),{
    type:'bar',
    data:{labels:CHART_DATA.topIPsLabels,datasets:[{label:'Requests',data:CHART_DATA.topIPsData,backgroundColor:'rgba(123,47,247,0.6)',borderColor:'#7b2ff7',borderWidth:1,borderRadius:4}]},
    options:chartOpts({indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true},y:{ticks:{font:{size:7}}}}})
  });
}

// Export CSV
function exportCSV(){
  const usageData = CHART_DATA._raw;
  if(!usageData||!usageData.length){alert('Sin datos de uso');return;}
  let csv='Modelo,IP,Tokens,Fecha\
';
  usageData.forEach(u=>{
    csv+='"'+(u.model||'')+'","'+(u.ip||'')+'","'+(u.tokens||0)+'","'+(u.timestamp||'')+'"\
';
  });
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download='carbonato-usage-'+new Date().toISOString().split('T')[0]+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>
</body>
</html>`);
};
