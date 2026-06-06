const fs = require('fs');
const DB_PATH = '/tmp/prompt-templates.json';

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return []; }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function cookieCheck(req) {
  return (req.headers.cookie || '').includes('admin_sess=ok');
}

function escTpl(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  // GET /api/prompts - list all templates
  if (req.method === 'GET' && path === '/api/prompts') {
    if (!cookieCheck(req)) return res.status(401).json({ error: 'No autorizado' });
    return res.json(loadDB());
  }

  // POST /api/prompts - create template
  if (req.method === 'POST' && path === '/api/prompts') {
    if (!cookieCheck(req)) return res.status(401).json({ error: 'No autorizado' });
    let body = '';
    for await (const chunk of req) body += chunk;
    let data;
    try { data = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON inválido' }); }
    if (!data.name || !data.prompt) return res.status(400).json({ error: 'name y prompt requeridos' });

    const db = loadDB();
    const tpl = {
      id: 'tpl_' + Date.now().toString(36),
      name: data.name,
      prompt: data.prompt,
      model: data.model || '',
      createdAt: new Date().toISOString()
    };
    db.unshift(tpl);
    saveDB(db);
    return res.json(tpl);
  }

  // DELETE /api/prompts/:id - delete template
  if (req.method === 'DELETE' && path.startsWith('/api/prompts/')) {
    if (!cookieCheck(req)) return res.status(401).json({ error: 'No autorizado' });
    const id = path.replace('/api/prompts/', '');
    const db = loadDB();
    const idx = db.findIndex(t => t.id === id);
    if (idx < 0) return res.status(404).json({ error: 'No encontrado' });
    db.splice(idx, 1);
    saveDB(db);
    return res.json({ ok: true });
  }

  // GET /api/prompts/page - HTML page
  if (req.method === 'GET' && path === '/api/prompts/page') {
    if (!cookieCheck(req)) return res.writeHead(302, { 'Location': '/api/admin' }).end();

    const db = loadDB();
    const modelos = [];
    for (let i = 1; i <= 16; i++) modelos.push('modelo' + i);

    let tplRows = db.map(t => `
      <div class="tpl-card" data-id="${t.id}">
        <div class="tpl-head">
          <span class="tpl-name">📌 ${esc(t.name)}</span>
          <span class="tpl-model">${t.model ? '→ ' + t.model : '—'}</span>
          <button class="tpl-del" onclick="delTpl('${t.id}')">✕</button>
        </div>
        <div class="tpl-prompt">${escTpl(t.prompt)}</div>
        <button class="tpl-use" onclick="useTpl('${esc(t.prompt)}','${esc(t.model)}')">⟫ USAR EN COMPETENCIA</button>
      </div>
    `).join('') || '<div style="text-align:center;padding:20px;color:var(--dim);font-family:JetBrains Mono,monospace">No hay templates guardados</div>';

    return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ PROMPTS — CARBONATO ⎈</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.6);--border:rgba(0,255,255,0.1);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--text:#e0e0e0;--dim:#6666aa}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);padding:20px}
h1{font-size:24px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:20px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;backdrop-filter:blur(12px)}
input,textarea,select{width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;margin-bottom:10px}
input:focus,textarea:focus,select:focus{border-color:rgba(0,255,245,0.3)}
select{height:40px;cursor:pointer}
.tpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:12px}
.tpl-card{border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--card)}
.tpl-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.tpl-name{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--cyan)}
.tpl-model{font-size:9px;color:var(--dim)}
.tpl-prompt{font-size:11px;color:var(--dim);line-height:1.5;margin-bottom:8px;max-height:60px;overflow:hidden;cursor:pointer}
.tpl-prompt:hover{max-height:300px;overflow-y:auto}
.tpl-del{background:none;border:none;color:#ff4444;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px}
.tpl-del:hover{background:rgba(255,0,0,0.1)}
.tpl-use{padding:6px 12px;border:1px solid var(--cyan);border-radius:4px;background:transparent;color:var(--cyan);font-family:'JetBrains Mono',monospace;font-size:9px;cursor:pointer;transition:all 0.2s}
.tpl-use:hover{background:rgba(0,255,245,0.08)}
.btn{padding:12px 24px;border:none;border-radius:8px;background:linear-gradient(135deg,var(--cyan),var(--purple));color:#000;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;cursor:pointer;width:100%}
.btn:hover{transform:translateY(-1px)}
.form-row{display:grid;grid-template-columns:1fr 200px;gap:10px}
#status{text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;margin-top:8px;color:var(--dim)}
.back{display:inline-block;margin-bottom:16px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none}
.back:hover{color:var(--cyan)}
</style>
</head>
<body>
<a href="/api/admin-panel" class="back">← VOLVER AL PANEL</a>
<h1>⎈ PROMPT TEMPLATES</h1>

<div class="card">
  <h2 style="font-family:JetBrains Mono,monospace;font-size:13px;color:var(--cyan);margin-bottom:10px">+ NUEVO TEMPLATE</h2>
  <input id="tplName" placeholder="Nombre del template (ej: Resumen de noticias)">
  <textarea id="tplPrompt" rows="3" placeholder="Escribí el prompt template..."></textarea>
  <div class="form-row">
    <select id="tplModel">
      <option value="">Sin modelo asignado</option>
      ${modelos.map(m => '<option value="' + m + '">' + m + '</option>').join('')}
    </select>
    <button class="btn" onclick="saveTpl()">⟫ GUARDAR</button>
  </div>
  <div id="status"></div>
</div>

<div class="tpl-grid">${tplRows}</div>

<script>
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escTpl(s){return esc(s).replace(/\n/g,'<br>');}

async function saveTpl(){
  const name = document.getElementById('tplName').value.trim();
  const prompt = document.getElementById('tplPrompt').value.trim();
  if(!name||!prompt){alert('Nombre y prompt requeridos');return;}
  const model = document.getElementById('tplModel').value;
  document.getElementById('status').innerHTML = '⟫ Guardando...';
  try{
    const r = await fetch('/api/prompts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,prompt,model})});
    if(r.ok) { document.getElementById('status').innerHTML = '<span style="color:var(--green)">✓ Guardado!</span>'; setTimeout(()=>location.reload(),800); }
    else document.getElementById('status').innerHTML = '<span style="color:#ff4444">⛔ Error al guardar</span>';
  }catch(e){document.getElementById('status').innerHTML = '<span style="color:#ff4444">⛔ '+e.message+'</span>';}
}

async function delTpl(id){
  if(!confirm('Eliminar este template?')) return;
  try{
    await fetch('/api/prompts/'+id,{method:'DELETE'});
    const card = document.querySelector('[data-id="'+id+'"]');
    if(card) card.remove();
  }catch(e){alert('Error: '+e.message);}
}

function useTpl(prompt, model){
  // Redirect to competencia page with prompt prefilled
  const target = '/api/competencia/page';
  // Store in sessionStorage and redirect
  sessionStorage.setItem('comp_prompt', prompt);
  sessionStorage.setItem('comp_model', model);
  location.href = target;
}
</script>
</body>
</html>`);
  }

  return res.status(404).json({ error: 'Not found' });
};

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
