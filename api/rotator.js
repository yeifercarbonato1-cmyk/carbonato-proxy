const fs = require('fs');
const HEALTH_DB = '/tmp/health-db.json';

function getLatencyRank() {
  try {
    const db = JSON.parse(fs.readFileSync(HEALTH_DB, 'utf8'));
    const latencies = db.latencies || {};
    const models = [];
    for (let i = 1; i <= 16; i++) {
      const name = 'modelo' + i;
      const l = latencies[name] || { avg: 0, count: 0, fails: 0 };
      // Score: lower avg = better, fewer fails = better, more checks = better
      const score = l.count > 0 ? l.avg + (l.fails / Math.max(l.count, 1)) * 5000 : 99999;
      models.push({ name, avg: l.avg || 0, fails: l.fails || 0, count: l.count || 0, score });
    }
    models.sort((a, b) => a.score - b.score);
    return models;
  } catch {
    return [];
  }
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  // GET /api/rotator/rank - return model ranking by speed
  if (req.method === 'GET' && path === '/api/rotator/rank') {
    return res.json({ ranking: getLatencyRank(), timestamp: new Date().toISOString() });
  }

  // GET /api/rotator/page - HTML page showing ranking
  if (req.method === 'GET' && path === '/api/rotator/page') {
    const cookies = req.headers.cookie || '';
    if (!cookies.includes('admin_sess=ok')) {
      return res.writeHead(302, { 'Location': '/api/admin' }).end();
    }
    const ranking = getLatencyRank();
    let rows = '';
    const speedColors = ['#00ff88','#00fff5','#7b2ff7','#ff00e6','#ffa500','#ff6347','#ff4500','#ff0000'];
    ranking.forEach((m, i) => {
      const status = m.count > 0 ? (m.avg > 0 ? '🟢' : '⚪') : '⚫';
      rows += `<tr>
        <td style="color:var(--cyan);font-weight:700">#${i+1}</td>
        <td style="color:${speedColors[Math.min(i, speedColors.length-1)]}">${m.name}</td>
        <td>${status}</td>
        <td>${Math.round(m.avg) > 0 ? Math.round(m.avg) + 'ms' : '-'}</td>
        <td>${m.count}</td>
        <td style="color:${m.fails > 0 ? '#ff4444' : 'var(--dim)'}">${m.fails}</td>
        <td style="color:${m.score >= 99999 ? 'var(--dim)' : (m.score < 5000 ? 'var(--green)' : 'var(--gold)')}">${m.score >= 99999 ? '-' : m.score.toFixed(0)}</td>
      </tr>`;
    });

    return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ ROTADOR — CARBONATO ⎈</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.6);--border:rgba(0,255,255,0.1);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--text:#e0e0e0;--dim:#6666aa}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);padding:20px}
h1{font-size:24px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}
p{font-size:12px;color:var(--dim);margin-bottom:16px;line-height:1.5}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;backdrop-filter:blur(12px)}
table{width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:11px}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)}
th{color:var(--cyan);font-size:9px;letter-spacing:1px;text-transform:uppercase}
td{color:var(--dim)}
tr:hover td{color:var(--text);background:rgba(0,255,245,0.02)}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-family:'JetBrains Mono',monospace}
.badge-green{color:var(--green);background:rgba(0,255,136,0.1)}
.badge-yellow{color:var(--gold);background:rgba(255,215,0,0.1)}
.badge-red{color:#ff4444;background:rgba(255,0,0,0.1)}
.back{display:inline-block;margin-bottom:16px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none}
.back:hover{color:var(--cyan)}
</style>
</head>
<body>
<a href="/api/admin-panel" class="back">← VOLVER AL PANEL</a>
<h1>⎈ AUTO ROTADOR INTELIGENTE</h1>
<p>Modelo9 (Smart Rotator) ordena los 16 modelos por velocidad. Cuando un usuario usa <strong>modelo9</strong>, el proxy prueba modelos del más rápido al más lento hasta encontrar uno que responda. Score bajo = mejor velocidad + menor tasa de fallos.</p>
<div class="card">
  <table>
    <tr><th>Rank</th><th>Modelo</th><th>Status</th><th>Latencia</th><th>Checks</th><th>Fallos</th><th>Score</th></tr>
    ${rows}
  </table>
</div>
</body>
</html>`);
  }

  return res.status(404).json({ error: 'Not found' });
};
