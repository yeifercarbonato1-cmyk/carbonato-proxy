// admin-templates.js — HTML templates para el admin panel
// Separado de admin-panel.js para mantener la lógica limpia
const { MODELOS } = require('./models-def.js');

const COLORS = ['#00fff5','#ff00e6','#7b2ff7','#00ff88','#ffd700','#ff4500','#00bfff','#ff69b4','#00ffff','#ff8c00','#8a2be2','#ff1493','#00ff7f','#da70d6','#ff6347','#7fff00','#ff3300','#ffaa00'];

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
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.6);--border:rgba(0,255,255,0.1);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--gold:#ffd700;--text:#e0e0e0;--dim:#6666aa}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.025) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none}
.glow{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;z-index:0;animation:orb 25s ease-in-out infinite}
.g1{width:500px;height:500px;background:radial-gradient(circle,rgba(123,47,247,0.12),transparent);top:-200px;left:-200px}
.g2{width:400px;height:400px;background:radial-gradient(circle,rgba(0,255,245,0.08),transparent);bottom:-150px;right:-150px;animation-delay:-10s}
@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-40px) scale(1.1)}66%{transform:translate(-30px,30px) scale(0.9)}}
.container{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:20px}
.top-bar{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:var(--card);border:1px solid var(--border);border-radius:12px;backdrop-filter:blur(12px);margin-bottom:20px;flex-wrap:wrap;gap:12px}
.top-bar .brand{font-size:18px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.top-bar .meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.top-bar .meta-item{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);display:flex;align-items:center;gap:6px}
.top-bar .meta-item .dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse-dot 2s ease-in-out infinite;display:inline-block}
.top-bar .meta-item .val{color:var(--cyan)}
.logout-btn{padding:6px 14px;border:1px solid rgba(255,0,0,0.3);border-radius:6px;color:#ff4444;font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none;transition:all 0.2s;background:rgba(255,0,0,0.05)}
.logout-btn:hover{background:rgba(255,0,0,0.15);border-color:#ff4444}
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
.section-title{font-size:14px;font-weight:700;color:var(--cyan);margin-bottom:14px;display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;letter-spacing:1px}
.section-title::before{content:'◆';font-size:10px;color:var(--magenta)}
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
.charts-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:24px}
.chart-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;backdrop-filter:blur(12px)}
.chart-card h4{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--cyan);margin-bottom:10px}
.chart-card canvas{max-height:200px;max-width:100%}
.chart-card .c-info{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--dim);margin-top:8px;text-align:center}
.csv-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:1px solid var(--gold);border-radius:6px;background:transparent;color:var(--gold);font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;transition:all 0.2s}
.csv-btn:hover{background:rgba(255,215,0,0.08);transform:translateY(-1px)}
#status{text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;min-height:24px;margin:10px 0}
#status .ok{color:var(--green)}#status .err{color:#ff4444}#status .info{color:var(--cyan)}
.stats-section{margin-top:24px}
.s-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:20px}
.s-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;backdrop-filter:blur(12px)}
.s-card h4{font-family:'JetBrains Mono',monospace;font-size:11px;margin-bottom:10px}
.s-row{display:flex;justify-content:space-between;padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:9px;border-bottom:1px solid rgba(255,255,255,0.03)}
.s-row .l{color:var(--dim)}.s-row .r{color:var(--text)}
.s-row .ips{font-size:8px;color:var(--cyan);word-break:break-all;max-width:120px;text-align:right}
.table-wrap{overflow-x:auto;margin-top:10px}
table{width:100%;border-collapse:collapse}
th,td{padding:10px 12px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;border-bottom:1px solid var(--border)}
th{color:var(--cyan);font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700}
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
  <a href="/api/modelo17" class="nav-link" style="color:#ff3300">🦴 CAVERNÍCOLA</a>
  <a href="/api/modelo18" class="nav-link" style="color:#ffaa00">🦖 CAVERNÍCOLA X</a>
  <a href="/api/modelo19" class="nav-link" style="color:#ffcc00">🧟 CAVERNÍCOLA SLOP</a>
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
  <div class="ov-card"><div class="ov-label">Modelos</div><div class="ov-value">${modelsActive}<span> / 18 activos</span></div></div>
</div>`;
}

function modelCardHTML(modelo, cfg, stats, idx) {
  const m = MODELOS[idx] || {};
  const icon = m.icon || '🔷';
  const name = m.name || modelo;
  const color = COLORS[idx] || '#00fff5';
  const s = stats || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
  return `<div class="m-card" style="--card-color:${color}">
    <div class="m-head"><span class="m-icon">${icon}</span><span class="m-name" style="color:${color}">${modelo}</span></div>
    <div class="m-field"><span class="m-label">BASE URL</span><input class="m-inp" id="url${idx+1}" value="${esc(cfg.url||'')}"></div>
    <div class="m-field"><span class="m-label">MODEL ID</span><input class="m-inp" id="id${idx+1}" value="${esc(cfg.model||'')}"></div>
    <div class="m-field"><span class="m-label">API KEY</span><input class="m-inp" id="key${idx+1}" value="${esc(cfg.key||'')}"></div>
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
  var h={'Content-Type':'application/json'};var msgs=[];var sp=document.getElementById('sp'+n).value;
  if(sp) msgs.push({role:'system',content:sp});msgs.push({role:'user',content:'Responde solo OK'});
  fetch('/chat/completions',{method:'POST',headers:h,body:JSON.stringify({model:m,messages:msgs})})
  .then(r=>r.text()).then(x=>{try{var js=JSON.parse(x);if(js.error){d.className='m-result err';d.textContent='⛔ '+(js.error.message||JSON.stringify(js.error)).substring(0,500)}
  else{var cont=js.choices?.[0]?.message?.content||JSON.stringify(js,null,2);d.className='m-result ok';d.textContent='✓ '+cont.substring(0,500);}}catch(e){d.className='m-result ok';d.textContent='✓ '+x.substring(0,500);}})
  .catch(e=>{d.className='m-result err';d.textContent='⛔ Error: '+e.message});
}
function saveAll(){
  for(var i=1;i<=19;i++){c['modelo'+i]={url:document.getElementById('url'+i).value,model:document.getElementById('id'+i).value,key:document.getElementById('key'+i).value,system_prompt:document.getElementById('sp'+i).value};}
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

function telegramStatusHTML(botStatus) {
  const cl = botStatus === 'ok' ? 'var(--green)' : 'rgba(255,255,255,0.3)';
  const icon = botStatus === 'ok' ? '✓' : '⟳';
  const txt = botStatus === 'ok' ? 'ACTIVO' : (botStatus === 'error' ? 'ERROR' : 'SIN DATOS');
  return `<div class="ov-card" style="grid-column:span 1">
    <div class="ov-label">🤖 BOT TELEGRAM</div>
    <div style="font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${cl}">${icon} ${txt}</div>
  </div>`;
}

module.exports = {
  COLORS, esc, headHTML, footHTML, topBarHTML, navHTML, overviewHTML,
  modelCardHTML, statCardHTML, usageTableHTML, actionButtonsHTML,
  chartsSectionHTML, chartScriptsHTML, telegramStatusHTML
};
