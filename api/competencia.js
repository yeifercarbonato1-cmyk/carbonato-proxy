const fs = require('fs');

// ========== COMPETENCIA MODELOS ==========
// Accepts prompt + up to 3 model names, sends to all, returns results

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  // POST /api/competencia - run comparison
  if (req.method === 'POST' && path === '/api/competencia') {
    const cookies = req.headers.cookie || '';
    if (!cookies.includes('admin_sess=ok')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    let body = '';
    for await (const chunk of req) body += chunk;
    let data;
    try { data = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON inválido' }); }

    const prompt = data.prompt || '';
    const models = (data.models || []).slice(0, 3);
    if (!prompt || models.length === 0) {
      return res.status(400).json({ error: 'Se requiere prompt y al menos 1 modelo' });
    }
    if (models.length < 2) {
      return res.status(400).json({ error: 'Se requieren al menos 2 modelos para comparar' });
    }

    const BASE = process.env.BASE_URL || 'http://localhost:3456';
    const results = [];

    for (const model of models) {
      const start = Date.now();
      try {
        const r = await fetch(`${BASE}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
          signal: AbortSignal.timeout(30000)
        });
        const json = await r.json();
        const latency = Date.now() - start;
        results.push({
          model,
          ok: r.ok,
          latency,
          content: r.ok ? (json.choices?.[0]?.message?.content || '(sin contenido)') : (json.error?.message || 'Error'),
          tokens: r.ok ? (json.usage?.total_tokens || 0) : 0
        });
      } catch(e) {
        results.push({ model, ok: false, latency: Date.now() - start, content: 'Error: ' + e.message, tokens: 0 });
      }
    }

    return res.json({ prompt, results });
  }

  // GET /api/competencia/page - HTML page
  if (req.method === 'GET' && path === '/api/competencia/page') {
    const cookies = req.headers.cookie || '';
    if (!cookies.includes('admin_sess=ok')) {
      return res.writeHead(302, { 'Location': '/api/admin' }).end();
    }

    const modelos = [];
    for (let i = 1; i <= 16; i++) modelos.push('modelo' + i);

    return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ COMPETENCIA — CARBONATO ⎈</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.6);--border:rgba(0,255,255,0.1);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--gold:#ffd700;--text:#e0e0e0;--dim:#6666aa}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);padding:20px}
h1{font-size:24px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:20px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;backdrop-filter:blur(12px)}
textarea,select{width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;margin-bottom:10px}
textarea:focus,select:focus{border-color:rgba(0,255,245,0.3)}
select{height:40px;cursor:pointer}
.model-select{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
.model-select select{width:100%}
.btn{padding:12px 24px;border:none;border-radius:8px;background:linear-gradient(135deg,var(--cyan),var(--purple));color:#000;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.3s;width:100%}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,255,245,0.2)}
.btn:disabled{opacity:0.5;cursor:wait}
.results{margin-top:16px}
.r-card{border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;background:var(--card)}
.r-card .r-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-family:'JetBrains Mono',monospace;font-size:11px}
.r-card .r-head .name{font-weight:700}
.r-card .r-head .latency{color:var(--dim)}
.r-card .r-head .speed{font-size:10px;padding:2px 8px;border-radius:4px}
.speed-fast{color:var(--green);background:rgba(0,255,136,0.1)}
.speed-mid{color:var(--gold);background:rgba(255,215,0,0.1)}
.speed-slow{color:#ff4444;background:rgba(255,0,0,0.1)}
.r-card .r-content{font-size:13px;line-height:1.6;color:var(--text);max-height:200px;overflow-y:auto;white-space:pre-wrap}
.loading{text-align:center;padding:20px;font-family:'JetBrains Mono',monospace;color:var(--dim);animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
.back{display:inline-block;margin-bottom:16px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none}
.back:hover{color:var(--cyan)}
</style>
</head>
<body>
<a href="/api/admin-panel" class="back">← VOLVER AL PANEL</a>
<h1>⎈ COMPETENCIA DE MODELOS</h1>
<div class="card">
  <p style="font-size:12px;color:var(--dim);margin-bottom:12px">Misma consulta a hasta 3 modelos. Compará velocidad y calidad de respuesta.</p>
  <div class="model-select">
    <select id="m1">
      ${modelos.map(m => '<option value="' + m + '">' + m + '</option>').join('')}
    </select>
    <select id="m2">
      ${modelos.map(m => '<option value="' + m + '" ' + (m === 'modelo2' ? 'selected' : '') + '>' + m + '</option>').join('')}
    </select>
    <select id="m3">
      <option value="">— Ninguno —</option>
      ${modelos.map(m => '<option value="' + m + '">' + m + '</option>').join('')}
    </select>
  </div>
  <textarea id="prompt" rows="4" placeholder="Escribí tu prompt aquí..."></textarea>
  <button class="btn" id="runBtn" onclick="runComp()">⟫ EJECUTAR COMPETENCIA</button>
</div>
<div id="results" class="results"></div>
<script>
async function runComp(){
  const m1 = document.getElementById('m1').value;
  const m2 = document.getElementById('m2').value;
  const m3 = document.getElementById('m3').value;
  const prompt = document.getElementById('prompt').value.trim();
  if(!prompt){alert('Escribí un prompt');return;}
  const models = [m1, m2].concat(m3 ? [m3] : []);
  document.getElementById('runBtn').disabled = true;
  document.getElementById('results').innerHTML = '<div class="loading">⟫ CONSULTANDO MODELOS...</div>';
  try {
    const r = await fetch('/api/competencia', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,models})});
    const d = await r.json();
    if(d.error){document.getElementById('results').innerHTML = '<div class="card" style="color:#ff4444">⛔ '+d.error+'</div>';return;}
    const speeds = d.results.map(r => r.latency);
    const fastest = Math.min(...speeds);
    let html = '<div class="section-title" style="color:var(--cyan);font-family:JetBrains Mono,monospace;font-size:13px;margin-bottom:12px">📊 RESULTADOS</div>';
    d.results.forEach((r, i) => {
      const speedClass = r.latency === fastest ? 'speed-fast' : (r.latency < fastest * 2 ? 'speed-mid' : 'speed-slow');
      const speedLabel = r.latency === fastest ? '🚀 MÁS RÁPIDO' : (r.latency < fastest * 2 ? '⚡ RÁPIDO' : '🐢 LENTO');
      html += '<div class="r-card" style="border-left:3px solid '+(r.ok?'var(--cyan)':'#ff4444')+'">';
      html += '<div class="r-head"><span class="name" style="color:'+['#00fff5','#ff00e6','#7b2ff7'][i]+'">'+r.model+'</span>';
      html += '<span class="latency">⏱ '+r.latency+'ms · Tokens: '+r.tokens+' <span class="speed '+speedClass+'">'+speedLabel+'</span></span></div>';
      html += '<div class="r-content">'+escHtml(r.content)+'</div></div>';
    });
    document.getElementById('results').innerHTML = html;
  } catch(e) {
    document.getElementById('results').innerHTML = '<div class="card" style="color:#ff4444">⛔ Error: '+e.message+'</div>';
  }
  document.getElementById('runBtn').disabled = false;
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');}
</script>
</body>
</html>`);
  }

  return res.status(404).json({ error: 'Not found' });
};
