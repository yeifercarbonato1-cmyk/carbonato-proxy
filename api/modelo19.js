// api/modelo19.js — Página de administración para modelo19 Cavernícola Slop
// GET  /api/modelo19          → página HTML (requiere auth)
// POST /api/modelo19/config   → actualiza system prompt

const fs = require('fs');
const path = require('path');
const { cookieOk } = require('./admin/helpers.js');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch(e) { return {}; }
}

const HTML = (config) => `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CAVERNÍCOLA SLOP — modelo19</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}
h1{font-family:'JetBrains Mono',monospace;font-size:18px;color:#ffaa00;margin-bottom:4px;letter-spacing:2px}
.sub{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:24px;font-family:'JetBrains Mono',monospace}
.section{border:1px solid rgba(255,255,255,0.08);padding:20px;margin-bottom:20px;border-radius:4px}
.section-title{font-size:11px;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:12px;text-transform:uppercase}
.field{margin-bottom:12px}
.field label{display:block;font-size:10px;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
.field input{width:100%;padding:8px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);border-radius:3px;font-size:12px;font-family:'JetBrains Mono',monospace}
textarea{width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);border-radius:3px;font-size:12px;font-family:'JetBrains Mono',monospace;resize:vertical;min-height:200px}
button{padding:8px 20px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:rgba(255,255,255,0.85);cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.5px;border-radius:3px;transition:0.2s}
button:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.3)}
button.primary{background:#ffaa00;color:#0a0a0f;border-color:#ffaa00;font-weight:bold}
button.primary:hover{background:#ffcc44}
#status{font-size:11px;margin-top:8px;padding:8px 12px;border-radius:3px;font-family:'JetBrains Mono',monospace;display:none}
#status.show{display:block}
#status.ok{background:rgba(0,255,136,0.08);color:#00ff88;border:1px solid rgba(0,255,136,0.2)}
#status.err{background:rgba(255,51,51,0.08);color:#ff3333;border:1px solid rgba(255,51,51,0.2)}
.info-row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.5)}
.back{font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:16px;display:block;font-family:'JetBrains Mono',monospace;text-decoration:none}
.back:hover{color:rgba(255,255,255,0.6)}
</style>
</head>
<body>
<a href="/api/admin-panel" class="back">⟵ VOLVER AL PANEL</a>
<h1>🧟 CAVERNÍCOLA SLOP</h1>
<div class="sub">modelo19 — Claude Sonnet 4-6 · Sin base de conocimiento · System prompt Cavernícola</div>

<div class="info-row">
  <span>🔗 ${esc(config.modelo19?.url || '')}</span>
  <span>🧠 ${esc(config.modelo19?.model || '')}</span>
</div>

<!-- System Prompt Editor -->
<div class="section">
  <div class="section-title">⚙ SYSTEM PROMPT</div>
  <div class="field">
    <textarea id="sp" rows="12">${esc(config.modelo19?.system_prompt || '')}</textarea>
  </div>
  <button class="primary" onclick="saveConfig()">⟫ GUARDAR</button>
</div>

<div id="status"></div>

<script>
async function saveConfig(){
  const sp=document.getElementById('sp').value;
  const r=await fetch('/api/modelo19/config',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({system_prompt:sp})
  });
  const d=await r.json();
  const st=document.getElementById('status');
  st.textContent=d.ok ? '✓ SYSTEM PROMPT GUARDADO' : '⛔ ERROR: '+JSON.stringify(d.error);
  st.className='show '+(d.ok?'ok':'err');
  setTimeout(()=>{st.className='';st.style.display='none'},4000);
}
</script>
</body>
</html>`;

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  // GET /api/modelo19 → página HTML
  if (pathname === '/api/modelo19' && method === 'GET') {
    if (!cookieOk(req)) {
      res.statusCode = 302;
      res.setHeader('Location', '/api/admin');
      return res.end();
    }
    const config = getConfig();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(HTML(config));
  }

  // POST /api/modelo19/config → actualizar system prompt
  if (pathname === '/api/modelo19/config' && method === 'POST') {
    if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
    let body = {};
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      if (chunks.length > 0) body = JSON.parse(Buffer.concat(chunks).toString());
    } catch(e) { return res.status(400).json({ error: 'JSON inválido' }); }

    const { system_prompt } = body;

    // Leer config actual
    let config = {};
    try { config = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8')); } catch(e) {}
    try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch(e) {}

    // Actualizar modelo19
    if (!config.modelo19) config.modelo19 = {};
    config.modelo19.system_prompt = system_prompt || '';

    // Guardar local
    try {
      fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(config, null, 2), 'utf8');
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    } catch(e) { return res.status(500).json({ error: 'Error guardando local: ' + e.message }); }

    return res.status(200).json({ ok: true });
  }

  res.status(404).json({ error: 'Not found' });
};
