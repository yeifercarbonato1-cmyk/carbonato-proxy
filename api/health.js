// Health Dashboard API - latency tracking
const fs = require('fs');
const DB_PATH = '/tmp/health-db.json';

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { latencies: {}, history: [], lastCheck: null }; }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  
  // POST /api/health/check - run health check now
  if (req.method === 'POST' && path === '/api/health/check') {
    const BASE = process.env.BASE_URL || 'http://localhost:3456';
    const db = loadDB();
    const results = [];
    const now = Date.now();
    
    for (let i = 1; i <= 16; i++) {
      const name = 'modelo' + i;
      const start = Date.now();
      let ok = false, latency = 0, error = null;
      try {
        const res2 = await fetch(`${BASE}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: name, messages: [{ role: 'user', content: 'OK' }], max_tokens: 5 }),
          signal: AbortSignal.timeout(15000)
        });
        ok = res2.ok;
        latency = Date.now() - start;
      } catch(e) {
        ok = false;
        error = e.message;
        latency = Date.now() - start;
      }
      results.push({ name, ok, latency, error, timestamp: new Date().toISOString() });
      // Update rolling avg
      if (!db.latencies[name]) db.latencies[name] = { avg: 0, count: 0, lastOk: null, lastFail: null, fails: 0 };
      const l = db.latencies[name];
      if (ok) {
        l.avg = l.count > 0 ? ((l.avg * l.count) + latency) / (l.count + 1) : latency;
        l.count++;
        l.lastOk = new Date().toISOString();
      } else {
        l.fails++;
        l.lastFail = new Date().toISOString();
      }
    }
    
    db.history.push({ timestamp: new Date().toISOString(), results });
    // Keep last 7 days of history
    const cutoff = Date.now() - 7 * 86400000;
    db.history = db.history.filter(h => new Date(h.timestamp).getTime() > cutoff);
    db.lastCheck = new Date().toISOString();
    saveDB(db);
    
    return res.json({ ok: true, results, latencies: db.latencies });
  }
  
  // GET /api/health - return current health data
  if (req.method === 'GET' && path === '/api/health') {
    const db = loadDB();
    return res.json(db);
  }
  
  // GET /api/health/page - HTML dashboard
  if (req.method === 'GET' && path === '/api/health/page') {
    const cookies = req.headers.cookie || '';
    if (!cookies.includes('admin_sess=ok')) {
      return res.writeHead(302, { 'Location': '/api/admin' }).end();
    }
    const db = loadDB();
    const latencies = db.latencies || {};
    
    let rows = '';
    const colors = ['#00fff5','#ff00e6','#7b2ff7','#00ff88','#ffd700','#ff4500','#00bfff','#ff69b4','#00ffff','#ff8c00','#8a2be2','#ff1493','#00ff7f','#da70d6','#ff6347','#7fff00'];
    for (let i = 1; i <= 16; i++) {
      const name = 'modelo' + i;
      const l = latencies[name] || { avg: 0, count: 0, lastOk: null, lastFail: null, fails: 0 };
      const avgMs = Math.round(l.avg || 0);
      const status = l.count > 0 ? '🟢' : '⚫';
      const fails = l.fails || 0;
      rows += `<tr>
        <td style="color:${colors[i-1]}">${name}</td>
        <td>${status}</td>
        <td>${avgMs > 0 ? avgMs + 'ms' : '-'}</td>
        <td>${l.count || 0}</td>
        <td style="color:${fails > 0 ? '#ff4444' : 'var(--dim)'}">${fails}</td>
        <td style="font-size:9px;color:var(--dim)">${l.lastOk ? new Date(l.lastOk).toLocaleString() : '-'}</td>
        <td style="font-size:9px;color:var(--dim)">${l.lastFail ? new Date(l.lastFail).toLocaleString() : '-'}</td>
      </tr>`;
    }
    
    // History chart data
    const history = db.history || [];
    const recentHistory = history.slice(-50);
    const histLabels = JSON.stringify(recentHistory.map(h => { const d = new Date(h.timestamp); return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'); }));
    const modelHistData = {};
    for (let i = 1; i <= 16; i++) {
      const name = 'modelo' + i;
      modelHistData[name] = recentHistory.map(h => {
        const r = h.results.find(r => r.name === name);
        return r ? r.latency : 0;
      });
    }
    const histDataJson = JSON.stringify(modelHistData);
    
    return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ HEALTH — CARBONATO ⎈</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.6);--border:rgba(0,255,255,0.1);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--text:#e0e0e0;--dim:#6666aa}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);padding:20px}
h1{font-size:24px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:20px}
h2{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--cyan);margin:16px 0 10px}
table{width:100%;border-collapse:collapse;margin:10px 0 20px;font-family:'JetBrains Mono',monospace;font-size:11px}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)}
th{color:var(--cyan);font-size:9px;letter-spacing:1px;text-transform:uppercase}
td{color:var(--dim)}
tr:hover td{background:rgba(0,255,245,0.02);color:var(--text)}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;backdrop-filter:blur(12px)}
.chart-wrap{max-height:250px;margin:10px 0 20px}
.btn{padding:10px 20px;border:1px solid var(--cyan);border-radius:6px;background:transparent;color:var(--cyan);font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;transition:all 0.2s}
.btn:hover{background:rgba(0,255,245,0.08);transform:translateY(-1px)}
.back{display:inline-block;margin-bottom:16px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none}
.back:hover{color:var(--cyan)}
.ok{color:var(--green)}.err{color:#ff4444}
</style>
</head>
<body>
<a href="/api/admin-panel" class="back">← VOLVER AL PANEL</a>
<h1>⎈ HEALTH DASHBOARD</h1>
<div class="card">
  <h2>⟫ LATENCIA PROMEDIO POR MODELO</h2>
  <table>
    <tr><th>Modelo</th><th>Status</th><th>Latencia</th><th>Checks</th><th>Fallos</th><th>Último OK</th><th>Último Fallo</th></tr>
    ${rows}
  </table>
</div>
<div class="card">
  <h2>⟫ HISTORIAL DE LATENCIA</h2>
  <div class="chart-wrap">
    <canvas id="latencyChart"></canvas>
  </div>
</div>
<div style="text-align:center;margin-top:10px">
  <button class="btn" onclick="runCheck()">⟫ EJECUTAR CHECK AHORA</button>
</div>
<div id="status" style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;margin-top:8px;color:var(--dim)"></div>
<script>
const histData = ${histDataJson};
const histLabels = ${histLabels};
const colors = ['#00fff5','#ff00e6','#7b2ff7','#00ff88','#ffd700','#ff4500','#00bfff','#ff69b4','#00ffff','#ff8c00','#8a2be2','#ff1493','#00ff7f','#da70d6','#ff6347','#7fff00'];

if (histLabels.length > 0) {
  const datasets = Object.entries(histData).map(([model, data], i) => ({
    label: model,
    data: data,
    borderColor: colors[i % colors.length],
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    pointRadius: 1,
    tension: 0.3
  }));
  new Chart(document.getElementById('latencyChart'), {
    type: 'line',
    data: { labels: histLabels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: 'rgba(255,255,255,0.5)', font: { size: 8, family: 'JetBrains Mono,monospace' } } } },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 8 } }, grid: { color: 'rgba(0,255,245,0.06)' } },
        y: { ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 8 } }, grid: { color: 'rgba(0,255,245,0.06)' } }
      }
    }
  });
}

function runCheck() {
  const st = document.getElementById('status');
  st.innerHTML = '<span class="ok">⟫ EJECUTANDO CHECK...</span>';
  fetch('/api/health/check', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
      const ok = d.results.filter(r => r.ok).length;
      st.innerHTML = '<span class="ok">✓ CHECK COMPLETADO: ' + ok + '/16 OK</span>';
      setTimeout(() => location.reload(), 1500);
    })
    .catch(e => { st.innerHTML = '<span class="err">⛔ ERROR: ' + e.message + '</span>'; });
}
</script>
</body>
</html>`);
  }
  
  return res.status(404).json({ error: 'Not found' });
};
