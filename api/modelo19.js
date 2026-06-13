// api/modelo19.js — Página de administración para modelo19 Cavernícola
// GET  /api/modelo19          → página HTML (requiere auth)
// POST /api/modelo19/knowledge → actualiza conocimiento
// POST /api/modelo19/config    → actualiza configuración
// GET  /api/modelo19/test?q=   → prueba RAG query

const fs = require('fs');
const path = require('path');
const rag = require('../knowledge/rag.js');
const { cookieOk } = require('./admin/helpers.js');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'knowledge', 'base.md');

function getGithubToken() {
  return process.env.GITHUB_TOKEN || '';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch(e) { return {}; }
}

const HTML = (config, knowledgeText) => `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CAVERNÍCOLA — modelo19</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}
h1{font-family:'JetBrains Mono',monospace;font-size:18px;color:#ffcc00;margin-bottom:4px;letter-spacing:2px}
.sub{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:24px;font-family:'JetBrains Mono',monospace}
.section{border:1px solid rgba(255,255,255,0.08);padding:20px;margin-bottom:20px;border-radius:4px}
.section-title{font-size:11px;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:12px;text-transform:uppercase}
.row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.field{flex:1;min-width:150px}
.field label{display:block;font-size:10px;color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
.field select,.field input{width:100%;padding:8px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);border-radius:3px;font-size:12px;font-family:'JetBrains Mono',monospace}
.field select option{background:#0a0a0f;color:rgba(255,255,255,0.85)}
textarea{width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);border-radius:3px;font-size:12px;font-family:'JetBrains Mono',monospace;resize:vertical;min-height:200px}
button{padding:8px 20px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:rgba(255,255,255,0.85);cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.5px;border-radius:3px;transition:0.2s}
button:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.3)}
button.primary{background:#ffcc00;color:#0a0a0f;border-color:#ffcc00;font-weight:bold}
button.primary:hover{background:#ff5522}
#status{font-size:11px;margin-top:8px;padding:8px 12px;border-radius:3px;font-family:'JetBrains Mono',monospace;display:none}
#status.show{display:block}
#status.ok{background:rgba(0,255,136,0.08);color:#00ff88;border:1px solid rgba(0,255,136,0.2)}
#status.err{background:rgba(255,51,51,0.08);color:#ff3333;border:1px solid rgba(255,51,51,0.2)}
#testResult{margin-top:8px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:3px;font-size:12px;font-family:'JetBrains Mono',monospace;white-space:pre-wrap;min-height:40px;display:none}
#testResult.show{display:block}
.kb-entry{border:1px solid rgba(255,255,255,0.06);padding:12px;margin-bottom:8px;border-radius:3px;position:relative}
.kb-entry .title{font-size:12px;font-weight:bold;color:#ffcc00;margin-bottom:4px}
.kb-entry .content{font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:4px}
.kb-entry .del{position:absolute;top:8px;right:8px;cursor:pointer;font-size:14px;color:rgba(255,255,255,0.2);border:none;background:none;padding:2px 6px}
.kb-entry .del:hover{color:#ff3333}
.note{font-size:10px;color:rgba(255,255,255,0.25);margin-top:4px;font-family:'JetBrains Mono',monospace}
.back{font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:16px;display:block;font-family:'JetBrains Mono',monospace;text-decoration:none}
.back:hover{color:rgba(255,255,255,0.6)}
</style>
</head>
<body>
<a href="/api/admin-panel" class="back">⟵ VOLVER AL PANEL</a>
<h1>🧟 CAVERNÍCOLA SLOP</h1>
<div class="sub">modelo19 — Configuración y base de conocimiento</div>

<!-- Config section -->
<div class="section">
  <div class="section-title">⚙ CONFIGURACIÓN</div>
  <div class="row">
    <div class="field">
      <label>Modo conocimiento</label>
      <select id="mode">${['rag','full','tool'].map(m => `<option value="${m}"${config.modelo19?.knowledge?.mode === m ? ' selected' : ''}>${m.toUpperCase()} — ${m === 'rag' ? 'Inyección inteligente' : m === 'full' ? 'System prompt completo' : 'Endpoint externo'}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>Nivel Caveman</label>
      <select id="cavemanLevel">${['lite','full','ultra'].map(l => `<option value="${l}"${config.modelo19?.caveman?.default_level === l ? ' selected' : ''}>${l.toUpperCase()} — ${l === 'lite' ? 'Ligero' : l === 'full' ? 'Cavernícola' : 'Telegráfico'}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>Límite RAG</label>
      <input type="number" id="ragLimit" min="1" max="10" value="${config.modelo19?.knowledge?.rag_limit || 3}">
    </div>
  </div>
  <button class="primary" onclick="saveConfig()">⟫ GUARDAR CONFIG</button>
</div>

<!-- Knowledge editor -->
<div class="section">
  <div class="section-title">📚 BASE DE CONOCIMIENTO</div>
  <div id="kbEntries"></div>
  <div style="margin-bottom:12px">
    <div class="field" style="margin-bottom:8px">
      <label>Título de sección nueva</label>
      <input type="text" id="newTitle" placeholder="ej: Precios del maíz">
    </div>
    <div class="field" style="margin-bottom:8px">
      <label>Contenido</label>
      <textarea id="newContent" rows="4" placeholder="Punto clave 1&#10;Punto clave 2&#10;..."></textarea>
    </div>
    <button onclick="addEntry()">+ AGREGAR SECCIÓN</button>
  </div>
  <div style="margin-top:12px">
    <button class="primary" onclick="saveKnowledge()">⟫ GUARDAR CONOCIMIENTO</button>
    <button onclick="document.getElementById('rawEditor').classList.toggle('show')">EDITAR RAW</button>
  </div>
  <textarea id="rawEditor" style="margin-top:12px;display:none">${esc(knowledgeText)}</textarea>
</div>

<!-- Query tester -->
<div class="section">
  <div class="section-title">🔍 PROBAR RAG</div>
  <div class="row">
    <div class="field">
      <input type="text" id="testQuery" placeholder="Consulta de prueba..." onkeydown="if(event.key==='Enter')testQuery()">
    </div>
    <button onclick="testQuery()">⟫ BUSCAR</button>
  </div>
  <div id="testResult"></div>
</div>

<div id="status"></div>

<script>
// Load KB entries
const kb = ${JSON.stringify(rag.loadKnowledge().sections).replace(/<\//g, '<\\/')};
function renderKB(){
  let html='';
  kb.forEach((s,i)=>{
    html+='<div class="kb-entry">'+
      '<div class="title">'+esc(s.title)+'</div>'+
      '<div class="content">'+esc(s.content.replace(/^## /,'').slice(0,120))+'</div>'+
      '<button class="del" onclick="deleteEntry('+i+')">✕</button>'+
    '</div>';
  });
  if(!kb.length) html='<div class="note" style="margin-bottom:12px">No hay secciones de conocimiento. Agrega una abajo.</div>';
  document.getElementById('kbEntries').innerHTML=html;
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function showStatus(msg, type){
  const st=document.getElementById('status');
  st.textContent=msg; st.className='show '+type;
  setTimeout(()=>{st.className='';st.style.display='none'},4000);
}

function buildKnowledgeText(){
  return kb.map(s => '## '+s.title+'\\n'+s.content.replace(/^## .+\\n/,'')).join('\\n\\n');
}

async function saveConfig(){
  const mode=document.getElementById('mode').value;
  const level=document.getElementById('cavemanLevel').value;
  const limit=document.getElementById('ragLimit').value;
  const r=await fetch('/api/modelo19/config',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode, cavemanLevel:level, ragLimit:parseInt(limit)})
  });
  const d=await r.json();
  showStatus(d.ok ? '✓ CONFIGURACIÓN GUARDADA' : '⛔ ERROR: '+JSON.stringify(d.error), d.ok?'ok':'err');
}

async function saveKnowledge(){
  const raw=document.getElementById('rawEditor');
  let text;
  if(raw.style.display==='block'){
    text=raw.value;
  } else {
    text='# Base de Conocimiento — modelo19\\n\\n'+buildKnowledgeText();
  }
  const r=await fetch('/api/modelo19/knowledge',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({knowledge:text})
  });
  const d=await r.json();
  showStatus(d.ok ? '✓ CONOCIMIENTO GUARDADO' : '⛔ ERROR: '+JSON.stringify(d.error), d.ok?'ok':'err');
  if(d.ok) kb.length=0; kb.push(...d.sections);
  renderKB();
}

function addEntry(){
  const t=document.getElementById('newTitle').value.trim();
  const c=document.getElementById('newContent').value.trim();
  if(!t||!c){showStatus('Completa título y contenido','err');return;}
  kb.push({title:t,content:'## '+t+'\\n'+c,keywords:[],raw:t+'\\n\\n'+c});
  document.getElementById('newTitle').value='';
  document.getElementById('newContent').value='';
  renderKB();
}

function deleteEntry(i){
  kb.splice(i,1);
  renderKB();
}

async function testQuery(){
  const q=document.getElementById('testQuery').value.trim();
  if(!q) return;
  const tr=document.getElementById('testResult');
  tr.className='show'; tr.textContent='⟫ BUSCANDO...';
  const r=await fetch('/api/modelo19/test?q='+encodeURIComponent(q));
  const d=await r.json();
  if(d.found){
    tr.textContent=d.sections.map(s => s.content).join('\\n\\n---\\n\\n');
  } else {
    tr.textContent='(sin resultados)';
  }
}

renderKB();
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
    const kbText = fs.existsSync(KNOWLEDGE_BASE_PATH)
      ? fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8')
      : rag.loadKnowledge().fullText;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(HTML(config, kbText));
  }

  // GET /api/modelo19/test?q=... → probar RAG
  if (pathname === '/api/modelo19/test' && method === 'GET') {
    if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
    const query = url.searchParams.get('q') || '';
    const result = rag.search(query, 5);
    return res.status(200).json({ ok: true, ...result });
  }

  // POST /api/modelo19/knowledge → actualizar conocimiento
  if (pathname === '/api/modelo19/knowledge' && method === 'POST') {
    if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
    let body = {};
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      if (chunks.length > 0) body = JSON.parse(Buffer.concat(chunks).toString());
    } catch(e) { return res.status(400).json({ error: 'JSON inválido' }); }

    const text = body.knowledge || '';
    if (!text.trim()) return res.status(400).json({ error: 'knowledge requerido' });

    // Guardar local
    try {
      fs.writeFileSync(KNOWLEDGE_BASE_PATH, text, 'utf8');
    } catch(e) { /* fallo local no crítico */ }

    // Actualizar en memoria
    const db = rag.updateKnowledge(text);

    // Persistir a GitHub (proxi-datos)
    const token = getGithubToken();
    if (token) {
      try {
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/knowledge.md';
        const getR = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
        let sha = '';
        if (getR.ok) {
          const fileData = await getR.json();
          sha = fileData.sha || '';
        }
        await fetch(apiUrl, {
          method: 'PUT',
          headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Update knowledge m19 - ${new Date().toISOString().slice(0,10)}`,
            content: Buffer.from(text).toString('base64'),
            sha
          })
        });
      } catch(e) { console.log('[modelo19] Error GitHub knowledge:', e.message); }
    }

    return res.status(200).json({ ok: true, sections: db.sections });
  }

  // POST /api/modelo19/config → actualizar configuración
  if (pathname === '/api/modelo19/config' && method === 'POST') {
    if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
    let body = {};
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      if (chunks.length > 0) body = JSON.parse(Buffer.concat(chunks).toString());
    } catch(e) { return res.status(400).json({ error: 'JSON inválido' }); }

    const { mode, cavemanLevel, ragLimit } = body;
    if (!mode || !cavemanLevel) return res.status(400).json({ error: 'mode y cavemanLevel requeridos' });

    // Leer config actual
    let config = {};
    try { config = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8')); } catch(e) {}
    try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch(e) {}

    // Actualizar modelo19
    if (!config.modelo19) config.modelo19 = {};
    if (!config.modelo19.knowledge) config.modelo19.knowledge = {};
    config.modelo19.knowledge.mode = mode;
    config.modelo19.knowledge.rag_limit = parseInt(ragLimit) || 3;
    config.modelo19.knowledge.enabled = true;
    config.modelo19.knowledge.tool_endpoint = '/api/knowledge';
    config.modelo19.knowledge.available_modes = ['rag', 'tool', 'full'];
    if (!config.modelo19.caveman) config.modelo19.caveman = {};
    config.modelo19.caveman.default_level = cavemanLevel;
    config.modelo19.caveman.enabled = true;
    config.modelo19.caveman.levels = ['lite', 'full', 'ultra'];

    // Guardar local
    try {
      fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(config, null, 2), 'utf8');
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    } catch(e) { return res.status(500).json({ error: 'Error guardando local: ' + e.message }); }

    // Persistir a GitHub
    const token = getGithubToken();
    if (token) {
      try {
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json';
        const getR = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
        if (getR.ok) {
          const fileData = await getR.json();
          const sha = fileData.sha || '';
          await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Update modelo19 config - ${new Date().toISOString().slice(0,10)}`,
              content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'),
              sha
            })
          });
        }
      } catch(e) { console.log('[modelo19] Error GitHub config:', e.message); }
    }

    return res.status(200).json({ ok: true });
  }

  res.status(404).json({ error: 'Not found' });
};
