// admin-templates.js — HTML templates para el admin panel
// Separado de admin-panel.js para mantener la lógica limpia
const { MODELOS } = require('./models-def.js');

const COLORS = ['#00ff41','#ff003c','#00cfff','#ff6600','#cc00ff','#ffff00','#00ff9f','#ff0090','#0099ff','#ff3300','#00ffcc','#ff9900','#3300ff','#ff00cc','#00ff66','#ff6600','#00ccff','#ff0033'];

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function headHTML(title) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#000;--surface:#050505;--card:rgba(0,5,0,0.85);--border:rgba(0,255,65,0.12);--green:#00ff41;--red:#ff003c;--cyan:#00cfff;--orange:#ff6600;--purple:#cc00ff;--yellow:#ffff00;--text:#ccffcc;--dim:#336633;--dimmer:#1a331a}
body{font-family:'JetBrains Mono',monospace;background:#000;color:var(--text);min-height:100vh}
body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.015) 2px,rgba(0,255,65,0.015) 4px);pointer-events:none;z-index:0}
body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,0.7) 100%);pointer-events:none;z-index:0}
.glow{display:none}
.container{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:20px}
.top-bar{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,255,65,0.03);border:1px solid var(--border);border-top:2px solid var(--green);margin-bottom:20px;flex-wrap:wrap;gap:12px}
.top-bar .brand{font-size:16px;font-weight:700;color:var(--green);letter-spacing:3px;text-transform:uppercase;text-shadow:0 0 10px rgba(0,255,65,0.5)}
.top-bar .meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.top-bar .meta-item{font-size:9px;color:var(--dim);display:flex;align-items:center;gap:6px;letter-spacing:1px}
.top-bar .meta-item .dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse-dot 2s ease-in-out infinite;box-shadow:0 0 6px var(--green)}
.top-bar .meta-item .val{color:var(--green)}
.logout-btn{padding:5px 12px;border:1px solid var(--red);color:var(--red);font-size:9px;text-decoration:none;transition:all 0.2s;letter-spacing:1px}
.logout-btn:hover{background:rgba(255,0,60,0.1);text-shadow:0 0 8px var(--red)}
.overview{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:20px}
.ov-card{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--green);padding:14px;transition:all 0.2s}
.ov-card:hover{border-left-color:var(--cyan);background:rgba(0,255,65,0.04)}
.ov-card .ov-label{font-size:8px;color:var(--dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.ov-card .ov-value{font-size:22px;font-weight:700;color:var(--green);font-family:'JetBrains Mono',monospace;text-shadow:0 0 8px rgba(0,255,65,0.4)}
.ov-card .ov-value span{font-size:11px;color:var(--dim);font-weight:400}
.ov-card:nth-child(1) .ov-value{color:var(--green)}
.ov-card:nth-child(2) .ov-value{color:var(--cyan)}
.ov-card:nth-child(3) .ov-value{color:var(--orange)}
.ov-card:nth-child(4) .ov-value{color:var(--yellow)}
.section-title{font-size:11px;font-weight:700;color:var(--green);margin-bottom:12px;display:flex;align-items:center;gap:8px;letter-spacing:3px;text-transform:uppercase;text-shadow:0 0 8px rgba(0,255,65,0.4)}
.section-title::before{content:'//';font-size:11px;color:var(--dim)}
.m-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px;margin-bottom:24px}
.m-card{background:var(--card);border:1px solid var(--border);border-top:1px solid var(--card-color);padding:14px;position:relative;overflow:hidden;transition:all 0.2s}
.m-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--card-color);opacity:0.5}
.m-card:hover{background:rgba(0,255,65,0.03);border-color:rgba(0,255,65,0.2)}
.m-card:hover::before{opacity:1}
.m-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.m-icon{font-size:14px;color:var(--card-color);text-shadow:0 0 6px var(--card-color)}
.m-name{font-size:12px;font-weight:700;color:var(--card-color);letter-spacing:1px;text-shadow:0 0 6px var(--card-color)}
.m-env-row{display:flex;align-items:baseline;gap:6px;margin-bottom:2px}
.m-env-name{font-size:8px;color:var(--dim);white-space:nowrap;flex-shrink:0;letter-spacing:0.5px}
.m-env-val{font-size:8px;color:rgba(0,255,65,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
.m-env-row+.m-field,.m-env-row:last-of-type{margin-bottom:10px}
.m-field{margin-bottom:7px}
.m-label{display:block;font-size:7px;color:var(--dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:3px}
.m-inp,.m-ta{width:100%;padding:6px 8px;background:rgba(0,0,0,0.6);border:1px solid rgba(0,255,65,0.08);color:var(--green);font-family:'JetBrains Mono',monospace;font-size:10px;outline:none;transition:all 0.2s}
.m-inp:focus,.m-ta:focus{border-color:rgba(0,255,65,0.4);box-shadow:0 0 10px rgba(0,255,65,0.05)}
.m-ta{resize:vertical;min-height:40px}
.m-stats{display:flex;gap:12px;margin:8px 0;font-size:8px;color:var(--dim);flex-wrap:wrap;letter-spacing:0.5px}
.m-btn{padding:6px 14px;border:1px solid rgba(0,255,65,0.2);background:transparent;color:var(--green);font-family:'JetBrains Mono',monospace;font-size:9px;cursor:pointer;transition:all 0.2s;width:100%;letter-spacing:2px;text-transform:uppercase}
.m-btn:hover{background:rgba(0,255,65,0.08);border-color:var(--green);text-shadow:0 0 6px var(--green)}
.m-result{margin-top:6px;padding:6px 8px;font-size:9px;word-break:break-all;display:none;line-height:1.5;border-left:2px solid}
.m-result.ok{display:block;background:rgba(0,255,65,0.04);border-color:var(--green);color:var(--green)}
.m-result.err{display:block;background:rgba(255,0,60,0.04);border-color:var(--red);color:var(--red)}
.api-key-box{background:var(--card);border:1px solid rgba(0,255,65,0.15);border-left:3px solid var(--green);padding:12px 14px;margin:16px 0 20px}
.api-key-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.api-key-row input{flex:1;min-width:260px;padding:7px 10px;background:rgba(0,0,0,0.6);border:1px solid rgba(0,255,65,0.1);color:var(--green);font-family:'JetBrains Mono',monospace;font-size:11px}.api-key-note{font-size:8px;color:var(--dim);margin-top:7px;line-height:1.6;letter-spacing:0.3px}.copy-small{padding:7px 12px;border:1px solid var(--green);background:transparent;color:var(--green);font-family:'JetBrains Mono',monospace;font-size:9px;cursor:pointer;letter-spacing:1px}
.actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:20px 0}
.action-btn{padding:10px 22px;border:none;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:3px;text-transform:uppercase;position:relative;overflow:hidden}
.action-btn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);transition:left 0.4s}
.action-btn:hover::after{left:100%}
.action-btn.save{background:transparent;border:1px solid var(--green);color:var(--green)}
.action-btn.save:hover{background:rgba(0,255,65,0.1);box-shadow:0 0 20px rgba(0,255,65,0.15);text-shadow:0 0 8px var(--green)}
.action-btn.check{background:transparent;border:1px solid var(--cyan);color:var(--cyan)}
.action-btn.check:hover{background:rgba(0,207,255,0.08);box-shadow:0 0 20px rgba(0,207,255,0.12)}
.action-btn.logout{border:1px solid var(--red);color:var(--red);background:transparent}
.action-btn.logout:hover{background:rgba(255,0,60,0.08)}
.nav{display:flex;gap:4px;flex-wrap:wrap;margin:10px 0 18px}
.nav-link{padding:4px 12px;border:1px solid var(--dimmer);font-size:8px;color:var(--dim);text-decoration:none;transition:all 0.2s;letter-spacing:1px;text-transform:uppercase}
.nav-link:hover{color:var(--green);border-color:var(--green);background:rgba(0,255,65,0.04);text-shadow:0 0 6px var(--green)}
.charts-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-bottom:24px}
.chart-card{background:var(--card);border:1px solid var(--border);border-top:1px solid rgba(0,255,65,0.2);padding:14px}
.chart-card h4{font-size:9px;color:var(--green);margin-bottom:10px;letter-spacing:2px;text-transform:uppercase}
.chart-card canvas{max-height:200px;max-width:100%}
.chart-card .c-info{font-size:7px;color:var(--dim);margin-top:8px;text-align:center;letter-spacing:1px}
.csv-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid var(--yellow);background:transparent;color:var(--yellow);font-family:'JetBrains Mono',monospace;font-size:9px;cursor:pointer;transition:all 0.2s;letter-spacing:1px}
.csv-btn:hover{background:rgba(255,255,0,0.06)}
#status{text-align:center;font-size:10px;min-height:24px;margin:10px 0;letter-spacing:1px}
#status .ok{color:var(--green)}#status .err{color:var(--red)}#status .info{color:var(--cyan)}
.stats-section{margin-top:24px}
.s-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:20px}
.env-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:8px;margin-bottom:4px}
.env-card{background:var(--card);border:1px solid var(--border);border-left:2px solid var(--card-color);padding:10px 12px;position:relative;overflow:hidden;transition:all 0.2s}
.env-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:var(--card-color);opacity:0.3}
.env-card:hover{background:rgba(0,255,65,0.03)}
.env-head{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.env-icon{font-size:12px;line-height:1;color:var(--card-color)}
.env-name{font-size:10px;font-weight:700;color:var(--card-color);text-shadow:0 0 5px var(--card-color)}
.env-id{font-size:7px;color:var(--dim);margin-left:auto;letter-spacing:2px;text-transform:uppercase}
.env-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.env-key{font-size:7px;color:var(--dim);letter-spacing:0.5px;background:rgba(0,255,65,0.04);padding:1px 5px;border:1px solid rgba(0,255,65,0.06)}
.env-arrow{font-size:9px;color:var(--dim)}
.env-val{font-size:9px;word-break:break-all;flex:1;color:rgba(0,255,65,0.7)}
.s-card{background:var(--card);border:1px solid var(--border);border-left:2px solid rgba(0,255,65,0.2);padding:14px}
.s-card h4{font-size:10px;margin-bottom:10px;letter-spacing:1px}
.s-row{display:flex;justify-content:space-between;padding:5px 0;font-size:8px;border-bottom:1px solid rgba(0,255,65,0.04)}
.s-row .l{color:var(--dim)}.s-row .r{color:var(--text)}
.s-row .ips{font-size:7px;color:var(--cyan);word-break:break-all;max-width:120px;text-align:right}
.table-wrap{overflow-x:auto;margin-top:10px}
table{width:100%;border-collapse:collapse}
th,td{padding:8px 10px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:9px;border-bottom:1px solid rgba(0,255,65,0.06)}
th{color:var(--green);font-size:8px;letter-spacing:2px;text-transform:uppercase;font-weight:700;border-bottom:1px solid rgba(0,255,65,0.2)}
td{color:var(--dim)}
tr:hover td{background:rgba(0,255,245,0.02);color:var(--text)}
td.ip{color:var(--magenta);font-size:9px}
td.time{color:var(--dim);font-size:9px}
.footer{text-align:center;padding:20px 0;margin-top:30px;border-top:1px solid var(--border)}
.footer p{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--dim)}
@keyframes pulse-dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
@keyframes toastFade{0%{opacity:1;transform:translateY(0)}70%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}
@media(max-width:768px){.top-bar{flex-direction:column;align-items:flex-start}.m-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="container">`;
}

function footHTML() {
  return `<div class="footer">
  <p>CARBONATO PROXY · <span style="color:var(--cyan)">Cofrad.IA</span> · Panel de Control v6.1</p>
  <p style="margin-top:4px;opacity:0.4">⚡ Costa Rica · 100% código libre ⚡</p>
</div>
</div>
</body>
</html>`;
}

function topBarHTML(userIp) {
  return `<div class="top-bar">
  <div class="brand">CARBONATO PROXY</div>
  <div class="meta">
    <span class="meta-item"><span class="dot"></span> SISTEMA ACTIVO</span>
    <span class="meta-item">IP: <span class="val">${esc(userIp)}</span></span>
    <span class="meta-item" id="clock">⏱ <span class="val">${new Date().toLocaleString()}</span></span>
    <a href="/api/admin-logout" class="logout-btn">⛙ SALIR</a>
  </div>
</div>`;
}

function navHTML() {
  return `<nav class="nav">
  <a href="/api/admin-panel" class="nav-link">⟐ DASHBOARD</a>
  <a href="/api/health/page" class="nav-link">⟐ HEALTH</a>
  <a href="/api/competencia/page" class="nav-link">⟐ COMPETENCIA</a>
  <a href="/api/rotator/page" class="nav-link">⟐ ROTADOR</a>
  <a href="/api/modelo17" class="nav-link" style="color:#ff3300">☠ ${process.env.MODELO17_MODEL || 'modelo17'}</a>
  <a href="/api/modelo18" class="nav-link" style="color:#ffaa00">⌖ ${process.env.MODELO18_MODEL || 'modelo18'}</a>
  <a href="/api/modelo19" class="nav-link" style="color:#ffcc00">⟁ ${process.env.MODELO19_MODEL || 'modelo19'}</a>
  <a href="/api/modelo20" class="nav-link" style="color:#44ccff">⬡ ${process.env.MODELO20_MODEL || 'modelo20'}</a>
  <a href="/api/prompts/page" class="nav-link">⟐ TEMPLATES</a>
  <a href="/api/playground" class="nav-link">⟐ PLAYGROUND</a>
  <a href="/api/visitors/page" class="nav-link">⟐ VISITANTES</a>
  <a href="/api/logs/page" class="nav-link">⟐ LOGS</a>
  <a href="/api/config/page" class="nav-link">⟐ CONFIG</a>
  <a href="/api/skynet/page" class="nav-link" style="color:var(--magenta);border:1px solid rgba(255,0,230,0.2);background:rgba(255,0,230,0.04);font-weight:700">⟐ SKYNET</a>
  <a href="/api/see/page" class="nav-link" style="color:var(--cyan);border:1px solid rgba(0,255,245,0.2);background:rgba(0,255,245,0.04);font-weight:700">🧬 SEE</a>
</nav>`;
}

function overviewHTML(totalReq, totalTok, totalIps, modelsActive) {
  return `<div class="overview">
  <div class="ov-card"><div class="ov-label">Total Requests</div><div class="ov-value">${totalReq.toLocaleString()}</div></div>
  <div class="ov-card"><div class="ov-label">Tokens Consumidos</div><div class="ov-value">${totalTok.toLocaleString()}</div></div>
  <div class="ov-card"><div class="ov-label">IPs Únicas</div><div class="ov-value">${totalIps}</div></div>
  <div class="ov-card"><div class="ov-label">Modelos</div><div class="ov-value">${modelsActive}<span> activos</span></div></div>
</div>`;
}

function modelCardHTML(modelo, cfg, stats, idx, env) {
  const m = MODELOS[idx] || {};
  const icon = m.icon || '🔷';
  const color = COLORS[idx] || '#00fff5';
  const s = stats || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
  // Mostrar key fallback explícito si está vacía
  let keyDisplay = cfg.key || '';
  if (!keyDisplay) {
    if (modelo === 'modelo15' || modelo === 'modelo16') keyDisplay = '$MODELVERSE_KEY';
    else if (modelo === 'modelo18' || modelo === 'modelo20') keyDisplay = '$NVIDIA_NIM_KEY';
  }
  // Env vars en vivo
  const envModel = env ? `<span class="m-env-name">${esc(env.modelEnvName)}</span><span class="m-env-val">${esc(env.model || '—')}</span>` : '';
  const envUrl   = env ? `<span class="m-env-name">${esc(env.urlEnvName)}</span><span class="m-env-val">${esc(env.url || '—')}</span>` : '';
  const envBlock = env ? `<div class="m-env-row">${envModel}</div><div class="m-env-row">${envUrl}</div>` : '';
  return `<div class="m-card" style="--card-color:${color}">
    <div class="m-head"><span class="m-icon">${icon}</span><span class="m-name" style="color:${color}">${modelo}</span></div>
    ${envBlock}
    <div class="m-field"><span class="m-label">BASE URL</span><input class="m-inp" id="url${idx+1}" value="${esc(cfg.url||'')}" placeholder="https://..."></div>
    <div class="m-field"><span class="m-label">MODEL ID</span><input class="m-inp" id="id${idx+1}" value="${esc(cfg.model||'')}" placeholder="model-id"></div>
    <div class="m-field"><span class="m-label">API KEY</span><input class="m-inp" id="key${idx+1}" value="${esc(keyDisplay)}" placeholder="vacío = usa key global"></div>
    <div class="m-field"><span class="m-label">SYSTEM PROMPT</span><textarea class="m-ta" id="sp${idx+1}" rows="2">${esc(cfg.system_prompt||'')}</textarea></div>
    <div class="m-stats"><span>📊 ${s.totalRequests}</span><span>🔢 ${(s.totalTokens||0).toLocaleString()}</span><span>🌐 ${(s.uniqueIPs||[]).length}</span></div>
    <button class="m-btn" onclick="test('${modelo}',${idx+1})">⟫ PROBAR</button>
    <div id="r${idx+1}" class="m-result"></div>
  </div>`;
}

function statCardHTML(modelo, stats, idx) {
  const m = MODELOS[idx] || {};
  const icon = m.icon || '🔷';
  const color = COLORS[idx] || '#00fff5';
  const s = stats || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
  const ipsList = (s.uniqueIPs || []).slice(0,5).join(', ');
  return `<div class="s-card"><h4 style="color:${color}">${icon} ${esc(modelo)}</h4>
    <div class="s-row"><span class="l">Tokens</span><span class="r">${(s.totalTokens||0).toLocaleString()}</span></div>
    <div class="s-row"><span class="l">Requests</span><span class="r">${s.totalRequests||0}</span></div>
    <div class="s-row"><span class="l">IPs</span><span class="r">${(s.uniqueIPs||[]).length}</span></div>
    <div class="s-row"><span class="l">IPs</span><span class="r ips">${esc(ipsList) || '-'}</span></div>
  </div>`;
}

function usageTableHTML(usages) {
  const recent = (usages || []).slice(-20).reverse();
  let rows = recent.map(u => {
    const time = new Date(u.timestamp).toLocaleString();
    return `<tr><td>${esc(u.model||'')}</td><td class="ip">${esc(u.ip||'')}</td><td>${u.tokens||0}</td><td class="time">${time}</td></tr>`;
  }).join('');
  if (!rows) rows = '<tr><td colspan="4" style="text-align:center;color:var(--dim)">Sin datos de uso aún</td></tr>';
  return `<div class="stats-section">
    <div class="section-title">USO RECIENTE</div>
    <div class="table-wrap"><table><tr><th>Modelo</th><th>IP</th><th>Tokens</th><th>Fecha</th></tr>${rows}</table></div>
  </div>`;
}

function apiKeyBoxHTML(apiKey) {
  const key = apiKey || '';
  return `<div class="section-title">🔐 CARBONATO API KEY</div>
  <div class="api-key-box">
    <div class="api-key-row">
      <input id="carbonatoApiKey" readonly value="${esc(key)}" placeholder="CARBONATO_API_KEY no configurada en env">
      <button class="copy-small" onclick="navigator.clipboard.writeText(document.getElementById('carbonatoApiKey').value);this.textContent='✓ COPIADA';setTimeout(()=>this.textContent='COPIAR',1500)">COPIAR</button>
    </div>
    <div class="api-key-note">Usar en agents/proyectos como <strong>Authorization: Bearer &lt;CARBONATO_API_KEY&gt;</strong>. modelo1-modelo5 libres; modelo6-modelo22 requieren esta llave.</div>
  </div>`;
}

function actionButtonsHTML() {
  return `<div class="actions">
    <button class="action-btn save" onclick="saveAll()">⟫ GUARDAR CAMBIOS</button>
    <button class="action-btn check" onclick="checkAll()">⟫ VERIFICAR MODELOS</button>
    <button class="csv-btn" onclick="exportCSV()">⬇ EXPORTAR CSV</button>
    <a href="/api/admin-logout" class="action-btn logout">⛙ CERRAR SESIÓN</a>
  </div>
  <div id="status"></div>
  <div id="lastSave" style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,0.15);min-height:16px;margin-bottom:4px;transition:color 0.5s"></div>`;
}

function chartsSectionHTML(dailyLabels, dailyData, topModelsLabels, topModelsData, topIPsLabels, topIPsData, usages) {
  return `<div class="section-title">📈 ANALÍTICA</div>
  <div class="charts-row">
    <div class="chart-card"><h4>Tokens por Día</h4><canvas id="chartDaily"></canvas><div class="c-info">${dailyLabels.length} días registrados</div></div>
    <div class="chart-card"><h4>Modelos Más Usados</h4><canvas id="chartModels"></canvas><div class="c-info">${topModelsLabels.length} modelos</div></div>
    <div class="chart-card"><h4>Top IPs</h4><canvas id="chartIPs"></canvas><div class="c-info">${topIPsLabels.length} IPs principales</div></div>
  </div>
  <script>const CHART_DATA = ${JSON.stringify({dailyLabels,dailyData,topModelsLabels,topModelsData,topIPsLabels,topIPsData, _raw: usages})};</script>`;
}

function chartScriptsHTML() {
  return `<script>
function test(m,n){
  var d=document.getElementById('r'+n);d.className='m-result';d.style.display='block';d.textContent='⟫ CONECTANDO...';
  var h={'Content-Type':'application/json'};var ak=document.getElementById('carbonatoApiKey')?.value||'';if(ak)h['Authorization']='Bearer '+ak;var msgs=[];var sp=document.getElementById('sp'+n).value;
  if(sp) msgs.push({role:'system',content:sp});msgs.push({role:'user',content:'Responde solo OK'});
  fetch('/chat/completions',{method:'POST',headers:h,body:JSON.stringify({model:m,messages:msgs})})
  .then(r=>r.text()).then(x=>{try{var js=JSON.parse(x);if(js.error){d.className='m-result err';d.textContent='⛔ '+(js.error.message||JSON.stringify(js.error)).substring(0,500)}
  else{var cont=js.choices?.[0]?.message?.content||JSON.stringify(js,null,2);d.className='m-result ok';d.textContent='✓ '+cont.substring(0,500);}}catch(e){d.className='m-result ok';d.textContent='✓ '+x.substring(0,500);}})
  .catch(e=>{d.className='m-result err';d.textContent='⛔ Error: '+e.message});
}
function saveAll(){
  for(var i=1;i<=${MODELOS.length};i++){c['modelo'+i]={url:document.getElementById('url'+i).value,model:document.getElementById('id'+i).value,key:document.getElementById('key'+i).value,system_prompt:document.getElementById('sp'+i).value};}
  var st=document.getElementById('status');var ls=document.getElementById('lastSave');
  st.innerHTML='<span class="info">⟫⟫ GUARDANDO CONFIGURACIÓN...</span>';
  fetch('/api/admin-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)})
  .then(r=>r.json()).then(x=>{
    if(x.success){
      var now=new Date();
      var timeStr=now.toLocaleDateString('es-CR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      st.innerHTML='<span class="ok" style="display:inline-block;padding:6px 20px;border:1px solid rgba(0,255,136,0.3);border-radius:6px;background:rgba(0,255,136,0.06);animation:toastFade 3s ease forwards">✓ CONFIGURACIÓN GUARDADA</span>';
      ls.innerHTML='Último guardado: '+timeStr;
      ls.style.color='rgba(0,255,136,0.5)';
      setTimeout(function(){ls.style.color='rgba(255,255,255,0.15)';},3000);
      setTimeout(function(){st.innerHTML='';},3500);
    } else {
      st.innerHTML='<span class="err" style="display:inline-block;padding:6px 20px;border:1px solid rgba(255,0,0,0.3);border-radius:6px;background:rgba(255,0,0,0.06)">⛔ ERROR AL GUARDAR</span>';
      setTimeout(function(){st.innerHTML='';},5000);
    }
  })
  .catch(function(e){st.innerHTML='<span class="err" style="display:inline-block;padding:6px 20px;border:1px solid rgba(255,0,0,0.3);border-radius:6px;background:rgba(255,0,0,0.06)">⛔ '+e.message+'</span>';setTimeout(function(){st.innerHTML='';},5000);});
}
function checkAll(){
  var st=document.getElementById('status');st.innerHTML='<span class="info">⟫ CONSULTANDO MODELOS EN KILO.AI...</span>';
  fetch('/api/models-check').then(r=>r.json()).then(x=>{
    if(x.models){var html='';x.models.forEach(m=>{html+='<div style="font-family:JetBrains Mono,monospace;font-size:9px;margin:2px 0;color:'+(m.status=='active'?'var(--green)':'#ff4444')+'">'+(m.status=='active'?'✓':'⛔')+' '+m.model+' — '+m.status+'</div>';});
    st.innerHTML='<span class="ok">✓ MODELOS ENCONTRADOS: '+x.active+'</span><br>'+html;
    if(x.config_update){for(var i=1;i<=10;i++){if(x.config_update['modelo'+i]){document.getElementById('id'+i).value=x.config_update['modelo'+i].model;}}st.innerHTML+='<br><span class="ok">✓ MODELOS ACTUALIZADOS EN FORMULARIO</span>';}}
    else{st.innerHTML='<span class="err">⛔ ERROR AL CONSULTAR</span>';}setTimeout(()=>st.innerHTML='',8000);
  }).catch(e=>{st.innerHTML='<span class="err">⛔ ERROR: '+e.message+'</span>';});
}
setInterval(()=>{var c=document.getElementById('clock');if(c) c.innerHTML='⏱ <span class="val">'+new Date().toLocaleString()+'</span>';},1000);
Chart.defaults.color='rgba(255,255,255,0.4)';Chart.defaults.font.family='JetBrains Mono,monospace';
const chartOpts=extra=>Object.assign({responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,0.5)',font:{size:9}}}},scales:{x:{ticks:{color:'rgba(255,255,255,0.3)',font:{size:8}},grid:{color:'rgba(0,255,245,0.06)'}},y:{ticks:{color:'rgba(255,255,255,0.3)',font:{size:8}},grid:{color:'rgba(0,255,245,0.06)'}}}},extra);
if(CHART_DATA.dailyLabels.length){new Chart(document.getElementById('chartDaily'),{type:'line',data:{labels:CHART_DATA.dailyLabels,datasets:[{label:'Tokens',data:CHART_DATA.dailyData,borderColor:'#00fff5',backgroundColor:'rgba(0,255,245,0.1)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#00fff5',borderWidth:2}]},options:chartOpts({plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v>=1000?(v/1000).toFixed(1)+'k':v}}}})});}
if(CHART_DATA.topModelsLabels.length){const c=['#00fff5','#ff00e6','#7b2ff7','#00ff88','#ffd700','#ff4500','#00bfff','#ff69b4','#00ffff','#ff8c00'];new Chart(document.getElementById('chartModels'),{type:'doughnut',data:{labels:CHART_DATA.topModelsLabels,datasets:[{data:CHART_DATA.topModelsData,backgroundColor:c,borderColor:'rgba(10,10,15,0.8)',borderWidth:2}]},options:chartOpts({plugins:{legend:{position:'right',labels:{font:{size:8},padding:4}}}})});}
if(CHART_DATA.topIPsLabels.length){new Chart(document.getElementById('chartIPs'),{type:'bar',data:{labels:CHART_DATA.topIPsLabels,datasets:[{label:'Requests',data:CHART_DATA.topIPsData,backgroundColor:'rgba(123,47,247,0.6)',borderColor:'#7b2ff7',borderWidth:1,borderRadius:4}]},options:chartOpts({indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true},y:{ticks:{font:{size:7}}}}})});}
function exportCSV(){const ud=CHART_DATA._raw;if(!ud||!ud.length){alert('Sin datos de uso');return;}let csv='Modelo,IP,Tokens,Fecha\\n';ud.forEach(u=>{csv+='"'+(u.model||'')+'","'+(u.ip||'')+'","'+(u.tokens||0)+'","'+(u.timestamp||'')+'"\\n';});const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='carbonato-usage-'+new Date().toISOString().split('T')[0]+'.csv';a.click();URL.revokeObjectURL(a.href);}
</script>`;
}

function envSectionHTML(envData, globalVars) {
  if (!envData || envData.length === 0) return '';
  let cards = '';
  for (const ed of envData) {
    const color = COLORS[envData.indexOf(ed) % COLORS.length] || '#00fff5';
    const hasModel = ed.model ? 'color:var(--green);font-weight:600' : 'color:rgba(255,255,255,0.3)';
    const hasUrl = ed.url ? 'color:var(--cyan)' : 'color:rgba(255,255,255,0.3)';
    cards += `<div class="env-card" style="--card-color:${color}">
      <div class="env-head">
        <span class="env-icon">${ed.icon}</span>
        <span class="env-id">${esc(ed.id)}</span>
      </div>
      <div class="env-row">
        <span class="env-key">${esc(ed.modelEnvName)}</span>
        <span class="env-arrow">→</span>
        <span class="env-val" style="${hasModel}">${esc(ed.model || '(❌ vacío)')}</span>
      </div>
      <div class="env-row" style="margin-top:3px">
        <span class="env-key">${esc(ed.urlEnvName)}</span>
        <span class="env-arrow">→</span>
        <span class="env-val" style="${hasUrl};font-size:9px;word-break:break-all">${esc(ed.url || '(❌ vacío)')}</span>
      </div>
      ${ed.key !== undefined ? `<div class="env-row" style="margin-top:3px">
        <span class="env-key">${esc(ed.keyEnvName)}</span>
        <span class="env-arrow">→</span>
        <span class="env-val" style="font-size:9px;color:${ed.key ? 'var(--gold)' : 'rgba(255,255,255,0.3)'}">${ed.key ? '🔑 (configurada)' : '🔒 (vacía)'}</span>
      </div>` : ''}
    </div>`;
  }
  // Global vars section
  let globalCards = '';
  if (globalVars && globalVars.length > 0) {
    for (const g of globalVars) {
      const hasVal = g.val ? 'color:var(--green);font-weight:600' : 'color:rgba(255,255,255,0.3)';
      globalCards += `<div class="env-card" style="--card-color:var(--purple)">
        <div class="env-head">
          <span class="env-icon">${g.icon}</span>
          <span class="env-name" style="color:var(--purple)">${esc(g.label)}</span>
          <span class="env-id">GLOBAL</span>
        </div>
        <div class="env-row">
          <span class="env-key">${esc(g.key)}</span>
          <span class="env-arrow">→</span>
          <span class="env-val" style="${hasVal};word-break:break-all">${esc(g.val || '(❌ vacío)')}</span>
        </div>
      </div>`;
    }
  }
  return `<div class="section-title" style="margin-top:32px">📦 VARIABLES DE ENTORNO EN VIVO</div>
  ${globalCards ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${globalCards}</div>` : ''}
  <div class="env-grid">${cards}</div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,0.15);text-align:center;margin-top:8px;margin-bottom:4px">
    ↻ Los valores se leen de <code>process.env</code> al cargar la página · se actualizan al recargar
  </div>`;
}

function telegramStatusHTML(botStatus) {
  const cl = botStatus === 'ok' ? 'var(--green)' : 'rgba(255,255,255,0.3)';
  const icon = botStatus === 'ok' ? '✓' : '⟳';
  const txt = botStatus === 'ok' ? 'ACTIVO' : (botStatus === 'error' ? 'ERROR' : 'SIN DATOS');
  return `<div class="ov-card" style="grid-column:span 1">
    <div class="ov-label">🤖 BOT TELEGRAM</div>
    <div style="font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${cl}">${icon} ${txt}</div>
  </div>`;
}

function costSectionHTML(stats) {
  const PRICE_MAP = {};
  MODELOS.forEach((m, idx) => {
    const realModel = process.env[`MODELO${idx+1}_MODEL`] || m.id;
    PRICE_MAP[m.id] = { price_in: m.price_in || 0, price_out: m.price_out || 0, name: realModel, icon: m.icon };
  });

  let totalCost = 0;
  let rows = '';
  const entries = Object.entries(stats).sort((a, b) => {
    const pa = PRICE_MAP[a[0]];
    const pb = PRICE_MAP[b[0]];
    const ca = pa ? ((a[1].totalTokens || 0) / 1e6) * ((pa.price_in + pa.price_out) / 2) : 0;
    const cb = pb ? ((b[1].totalTokens || 0) / 1e6) * ((pb.price_in + pb.price_out) / 2) : 0;
    return cb - ca;
  });

  for (const [modelId, s] of entries) {
    const p = PRICE_MAP[modelId];
    if (!p) continue;
    const tokens = s.totalTokens || 0;
    const avgPrice = (p.price_in + p.price_out) / 2;
    const cost = (tokens / 1e6) * avgPrice;
    totalCost += cost;
    const isFree = p.price_in === 0 && p.price_out === 0;
    const costStr = isFree ? '<span style="color:var(--dim)">FREE</span>' : `<span style="color:var(--yellow)">$${cost.toFixed(4)}</span>`;
    const priceStr = isFree ? 'FREE' : `$${p.price_in}/$${p.price_out}`;
    rows += `<tr>
      <td style="color:var(--green)">${p.icon} ${modelId}</td>
      <td style="color:var(--text)">${p.name.substring(0,22)}</td>
      <td style="color:var(--cyan);text-align:right">${tokens.toLocaleString()}</td>
      <td style="color:var(--dim);text-align:center">${priceStr}</td>
      <td style="text-align:right">${costStr}</td>
    </tr>`;
  }

  const totalColor = totalCost === 0 ? 'var(--green)' : totalCost < 0.01 ? 'var(--cyan)' : totalCost < 0.1 ? 'var(--yellow)' : 'var(--red)';
  return `<div class="section-title" style="margin-top:32px">// METRICAS DE COSTO ESTIMADO</div>
  <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <div class="ov-card" style="min-width:180px;border-left-color:${totalColor}">
      <div class="ov-label">COSTO TOTAL ACUMULADO</div>
      <div class="ov-value" style="color:${totalColor};font-size:28px">$${totalCost.toFixed(4)}</div>
    </div>
    <div class="ov-card" style="min-width:180px">
      <div class="ov-label">MODELOS DE PAGO</div>
      <div class="ov-value" style="color:var(--yellow)">${MODELOS.filter(m => m.price_in > 0 || m.price_out > 0).length}<span> activos</span></div>
    </div>
    <div class="ov-card" style="min-width:180px">
      <div class="ov-label">MODELOS FREE</div>
      <div class="ov-value" style="color:var(--green)">${MODELOS.filter(m => m.price_in === 0 && m.price_out === 0).length}<span> gratis</span></div>
    </div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>MODELO</th><th>NOMBRE</th>
        <th style="text-align:right">TOKENS</th>
        <th style="text-align:center">$/1M IN/OUT</th>
        <th style="text-align:right">COSTO EST.</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="font-size:7px;color:var(--dim);margin-top:6px;letter-spacing:1px">
    * ESTIMADO — asume 50% input / 50% output tokens · precios aproximados · FREE = tier gratuito sin costo real
  </div>`;
}

module.exports = {
  COLORS, esc, headHTML, footHTML, topBarHTML, navHTML, overviewHTML,
  modelCardHTML, statCardHTML, usageTableHTML, actionButtonsHTML,
  chartsSectionHTML, chartScriptsHTML, envSectionHTML, telegramStatusHTML, apiKeyBoxHTML,
  costSectionHTML
};
