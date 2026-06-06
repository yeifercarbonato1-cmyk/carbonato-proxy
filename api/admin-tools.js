const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { MODELOS, MODEL_IDS } = require('./models-def.js');
const DB_PATH = '/tmp';
const GITHUB_OWNER = 'yeifer125';
const GITHUB_REPO = 'proxi-datos';
const GITHUB_PATH = 'health-db.json';
const GITHUB_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
const GITHUB_USAGE_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/usage-db.json`;

function proxyBase(req) {
  const host = req.headers['host'] || 'carbonato-proxy.vercel.app';
  return (host.includes('localhost') || host.includes('127.0.0.1')) ? `http://${host}` : `https://${host}`;
}

// ========================================================
// admin-tools.js — ROUTER UNIFICADO
// ========================================================
// Maneja: health, competencia, prompts, rotator, playground
// Vercel Hobby max 12 functions — esto evita crear 5 separadas
// ========================================================

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  // --- HEALTH ---
  if (pathname === '/api/health' || pathname === '/api/health/check') {
    return handleHealthCheck(req, res);
  }
  if (pathname === '/api/health/page') {
    return handleHealthPage(req, res);
  }
  if (pathname === '/api/health/save' && method === 'POST') {
    return handleHealthSave(req, res);
  }

  // --- COMPETENCIA ---
  if (pathname === '/api/competencia' && method === 'POST') {
    return handleCompetencia(req, res);
  }
  if (pathname === '/api/competencia/page') {
    return handleCompetenciaPage(req, res);
  }

  // --- PROMPTS ---
  if (pathname === '/api/prompts') {
    if (method === 'GET') return handlePromptsList(req, res);
    if (method === 'POST') return handlePromptsCreate(req, res);
    if (method === 'DELETE') return handlePromptsDelete(req, res);
  }
  if (pathname === '/api/prompts/page') {
    return handlePromptsPage(req, res);
  }

  // --- ROTATOR ---
  if (pathname === '/api/rotator/rank') {
    return handleRotatorRank(req, res);
  }
  if (pathname === '/api/rotator/page') {
    return handleRotatorPage(req, res);
  }

  // --- PLAYGROUND ---
  if (pathname === '/api/playground') {
    return handlePlaygroundPage(req, res);
  }
  if (pathname === '/api/playground/chat') {
    return handlePlaygroundChat(req, res);
  }

  // --- VISITORS ---
  if (pathname === '/api/visitors/page') {
    return handleVisitorsPage(req, res);
  }
  if (pathname === '/api/visitors/reset' && method === 'POST') {
    return handleVisitorsReset(req, res);
  }

  // --- ADMIN AUTH ---
  if (pathname === '/api/admin-auth' && method === 'POST') {
    return handleAdminAuth(req, res);
  }

  // --- ADMIN SAVE ---
  if (pathname === '/api/admin-save' && method === 'POST') {
    return handleAdminSave(req, res);
  }

  // --- ADMIN LOGOUT ---
  if (pathname === '/api/admin-logout') {
    return handleAdminLogout(req, res);
  }

  // --- UPLOAD ---
  if (pathname === '/api/upload' && method === 'POST') {
    return handleUpload(req, res);
  }

  // --- MODELS CHECK ---
  if (pathname === '/api/models-check') {
    return handleModelsCheck(req, res);
  }

  // --- DOCS IA ---
  if (pathname === '/api/docs-ia') {
    return handleDocsIA(req, res);
  }

  // --- LOGS ---
  if (pathname === '/api/logs/page') {
    return handleLogsPage(req, res);
  }

  // --- CONFIG ---
  if (pathname === '/api/config/page') {
    return handleConfigPage(req, res);
  }
  if (pathname === '/api/config/save' && method === 'POST') {
    return handleConfigSave(req, res);
  }

  res.status(404).json({ error: 'Not found', path: pathname });
};

// ========================================================
// HELPERS
// ========================================================
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escTpl(s) {
  return esc(s).replace(/\n/g,'<br>');
}
function cookieOk(req) {
  return (req.headers.cookie || '').includes('admin_sess=ok');
}
function html(res, str) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(str);
}

// ========================================================
// HEALTH
// ========================================================
// SAVE results from bot (POST, no testing)
async function handleHealthSave(req, res) {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const { results } = JSON.parse(body);
    if (!Array.isArray(results)) return res.status(400).json({ error: 'results array required' });
    const { data: db, sha } = await getHealthDb();
    results.forEach(r => {
      db.push({
        model: r.model,
        latency: r.latency || 0,
        timestamp: r.timestamp || new Date().toISOString(),
        status: r.status || 'OK'
      });
    });
    if (db.length > 5000) db.splice(0, db.length - 5000);
    const saved = await saveHealthDb(db, sha);
    const ok = results.filter(r => r.status === 'OK').length;
    const fail = results.filter(r => r.status !== 'OK').length;
    res.json({ ok: true, saved: saved, summary: `${ok}/${results.length} OK, ${fail} FAIL` });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
// MODELOS ahora importado desde models-def.js

async function handleHealthCheck(req, res) {
  const { data: db, sha } = await getHealthDb();
  const results = await Promise.all(MODELOS.map(async (m) => {
    const t0 = Date.now();
    try {
      const r = await fetch(proxyBase(req) + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m.id, messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 })
      });
      const latency = Date.now() - t0;
      const ok = r.ok;
      if (ok) {
        db.push({ model: m.id, latency, time: Date.now(), ip: 'health-check' });
      }
      return { model: m.id, name: m.name, status: ok ? 'OK' : 'FAIL', latency: ok ? latency + 'ms' : '-' };
    } catch (e) {
      return { model: m.id, name: m.name, status: 'FAIL', latency: '-' };
    }
  }));
  await saveHealthDb(db, sha);
  res.json({ ok: true, results });
}

async function handleHealthPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HEALTH — Carbonato Proxy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}h1{font-family:'JetBrains Mono',monospace;font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px}td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:'JetBrains Mono',monospace;font-size:11px}tr:hover td{background:rgba(255,255,255,0.02)}#status{font-size:11px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.4);margin-bottom:12px}.live{color:rgba(255,255,255,0.3);font-size:9px}.ok{color:rgba(255,255,255,0.7)}.fail{color:rgba(255,255,255,0.25)}</style></head>
<body><h1>⟐ HEALTH DASHBOARD <span class="live">● LIVE</span></h1>
<div id="status">Probando 16 modelos...</div>
<table><thead><tr><th>MODELO</th><th>NOMBRE</th><th>LATENCIA</th><th>STATUS</th></tr></thead><tbody id="tbody"></tbody></table>
<script>
const tbody=document.getElementById('tbody');
const status=document.getElementById('status');
const mods=${JSON.stringify(MODELOS)};
mods.forEach(m=>{
  tbody.innerHTML+='<tr id="r-'+m.id+'"><td>'+m.id+'</td><td>'+m.name+'</td><td id="l-'+m.id+'">...</td><td id="s-'+m.id+'">⟳</td></tr>';
});
let ok=0,fail=0;
(async()=>{
  for(const m of mods){
    const t0=performance.now();
    try{
      const r=await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:m.id,messages:[{role:'user',content:'ping'}],max_tokens:5})});
      const lat=(performance.now()-t0).toFixed(0);
      if(r.ok){ok++;document.getElementById('l-'+m.id).textContent=lat+'ms';document.getElementById('s-'+m.id).textContent='✓';document.getElementById('r-'+m.id).className='ok';}
      else{fail++;document.getElementById('l-'+m.id).textContent=lat+'ms';document.getElementById('s-'+m.id).textContent='✗';document.getElementById('r-'+m.id).className='fail';}
    }catch(e){fail++;document.getElementById('l-'+m.id).textContent='—';document.getElementById('s-'+m.id).textContent='✗';document.getElementById('r-'+m.id).className='fail';}
    status.textContent='Probando... '+ok+' OK '+fail+' FAIL ('+mods.filter(x=>document.getElementById('s-'+x.id).textContent!=='⟳').length+'/'+mods.length+')';
  }
  status.textContent='✓ Completo — '+ok+' OK · '+fail+' FAIL';
})();
</script></body></html>`);
}

// ========================================================
// COMPETENCIA
// ========================================================
async function handleCompetencia(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const { prompt, models } = JSON.parse(body);
    if (!prompt || !models || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({ error: 'prompt y models[] requeridos' });
    }
    const results = await Promise.all(models.map(async (model) => {
      const t0 = Date.now();
      try {
        const r = await fetch(proxyBase(req) + '/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
        });
        const latency = Date.now() - t0;
        if (!r.ok) return { model, latency, error: r.status };
        const data = await r.json();
        const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        return { model, latency, content: content.slice(0, 1000), tokens: data.usage?.total_tokens || 0 };
      } catch (e) {
        return { model, latency: 99999, error: e.message };
      }
    }));
    res.json({ ok: true, results });
  } catch (e) {
    res.status(400).json({ error: 'JSON inválido' });
  }
}

function handleCompetenciaPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>COMPETENCIA — Carbonato Proxy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}h1{font-size:14px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.6);margin-bottom:16px}select,textarea{width:100%;margin-bottom:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 10px;color:rgba(255,255,255,0.85);outline:none;font-family:'Inter',sans-serif}button{width:100%;padding:10px;background:rgba(255,255,255,0.12);border:none;border-radius:6px;color:rgba(255,255,255,0.85);cursor:pointer;font-family:'JetBrains Mono',monospace;font-weight:600}button:hover{background:rgba(255,255,255,0.2)}.card{border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-top:8px}</style></head>
<body><h1>⟐ COMPETENCIA</h1>
<select id="m1"></select><select id="m2"></select><select id="m3"></select>
<textarea id="prompt" rows="3" placeholder="Prompt..."></textarea>
<button onclick="competir()">⟫ COMPETIR ⟪</button>
<div id="r"></div>
<script>
const mods = ${JSON.stringify(MODEL_IDS)};
function fill(s,i){s.innerHTML=mods.map((m,j)=>'<option value="'+m+'"'+(j===i?' selected':'')+'>'+m+'</option>').join('')}
fill(document.getElementById('m1'),0);fill(document.getElementById('m2'),1);fill(document.getElementById('m3'),2);
async function competir(){
  const p=document.getElementById('prompt').value.trim();if(!p)return;
  const models=[document.getElementById('m1').value,document.getElementById('m2').value,document.getElementById('m3').value];
  document.getElementById('r').innerHTML='<p style="color:rgba(255,255,255,0.4);font-size:12px">Cargando...</p>';
  const r=await fetch('/api/competencia',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:p,models})});
  const d=await r.json();
  const sorted=(d.results||[]).sort((a,b)=>(a.latency||99999)-(b.latency||99999));
  document.getElementById('r').innerHTML=sorted.map((x,i)=>'<div class="card"><b>'+x.model+'</b> '+(i===0?'#1 RAPIDO ':'')+'<span style="color:rgba(255,255,255,0.3)">⏱ '+(x.latency||'-')+'ms</span>'+(x.tokens?' tok:'+x.tokens:'')+'<br>'+(x.error?'<span style="color:rgba(255,255,255,0.3)">✗ '+x.error+'</span>':'<span style="font-size:13px">'+x.content.slice(0,500)+'</span>')+'</div>').join('');
}
</script></body></html>`);
}

// ========================================================
// PROMPTS
// ========================================================
const PROMPTS_PATH = path.join(DB_PATH, 'prompt-templates.json');
function loadPrompts() { try { return JSON.parse(fs.readFileSync(PROMPTS_PATH,'utf8')); } catch(e) { return []; } }
function savePrompts(a) { fs.writeFileSync(PROMPTS_PATH, JSON.stringify(a, null, 2)); }

function handlePromptsList(req, res) { if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' }); res.json(loadPrompts()); }
async function handlePromptsCreate(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const { name, prompt } = JSON.parse(body);
    if (!name || !prompt) return res.status(400).json({ error: 'name y prompt requeridos' });
    const db = loadPrompts();
    const tpl = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), name, prompt, created: Date.now() };
    db.push(tpl);
    savePrompts(db);
    res.json({ ok: true, tpl });
  } catch(e) { res.status(400).json({ error: 'JSON inválido' }); }
}
function handlePromptsDelete(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  const id = req.url.split(/[?&]id=/).pop();
  if (!id) return res.status(400).json({ error: 'id requerido' });
  let db = loadPrompts();
  db = db.filter(t => t.id !== id);
  savePrompts(db);
  res.json({ ok: true });
}

function handlePromptsPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  const db = loadPrompts();
  let rows = db.map(t => `<div class="card" data-id="${t.id}">
    <b>${esc(t.name)}</b> <span style="font-size:10px;color:rgba(255,255,255,0.25)">${new Date(t.created).toLocaleString()}</span>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:4px">${escTpl(t.prompt)}</p>
    <button onclick="navigator.clipboard.writeText('${esc(t.prompt).replace(/'/g,"\\'")}')" style="width:auto;padding:4px 10px;margin-top:6px">Copiar</button>
    <button onclick="fetch('/api/prompts?id=${t.id}',{method:'DELETE'}).then(()=>location.reload())" style="width:auto;padding:4px 10px;margin-top:6px;background:rgba(255,255,255,0.05)">Eliminar</button>
  </div>`).join('') || '<p style="color:rgba(255,255,255,0.3);font-size:12px">Sin plantillas</p>';

  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TEMPLATES — Carbonato Proxy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}h1{font-family:'JetBrains Mono',monospace;font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:16px}input,textarea{width:100%;margin-bottom:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 10px;color:rgba(255,255,255,0.85);outline:none}button{padding:8px 16px;background:rgba(255,255,255,0.12);border:none;border-radius:6px;color:rgba(255,255,255,0.85);cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px}.card{border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;margin-top:8px}</style></head>
<body><h1>⟐ PROMPT TEMPLATES</h1>
<input id="name" placeholder="Nombre de la plantilla">
<textarea id="prompt" rows="2" placeholder="Prompt..."></textarea>
<button onclick="crear()">Guardar plantilla</button>
<div id="list" style="margin-top:16px">${rows}</div>
<script>
async function crear(){
  const name=document.getElementById('name').value.trim();
  const prompt=document.getElementById('prompt').value.trim();
  if(!name||!prompt)return;
  await fetch('/api/prompts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,prompt})});
  location.reload();
}
</script></body></html>`);
}

// ========================================================
// ROTATOR
// ========================================================
async function handleRotatorRank(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  const { data: healthDb } = await getHealthDb();
  const scores = {};

  MODELOS.forEach(m => { scores[m.id] = { key: m.id, ok: 0, fail: 0, latencies: [] }; });
  const recent = healthDb.slice(-1500);
  recent.forEach(e => {
    if (!scores[e.model]) return;
    if (e.latency < 30000) { scores[e.model].ok++; scores[e.model].latencies.push(e.latency); }
    else { scores[e.model].fail++; }
  });

  const ranked = MODELOS.map(m => {
    const s = scores[m.id];
    const avg = s.latencies.length > 0 ? (s.latencies.reduce((a,b)=>a+b,0) / s.latencies.length).toFixed(0) : '—';
    const uptime = (s.ok + s.fail) > 0 ? (s.ok / (s.ok + s.fail) * 100).toFixed(0) : '—';
    // Score: lower latency + higher uptime = better
    const score = s.latencies.length > 0 ? (parseInt(avg) || 5000) * (1 + (s.fail / Math.max(s.ok, 1)) * 2) : 999999;
    return { ...m, avg: avg + 'ms', uptime: uptime + '%', score: score.toFixed(0), samples: s.ok + s.fail };
  }).sort((a, b) => parseFloat(a.score) - parseFloat(b.score));

  res.json({ ok: true, ranking: ranked });
}

function handleRotatorPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ROTADOR — Carbonato Proxy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}h1{font-size:14px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.6);margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;font-size:9px}td{padding:8px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:'JetBrains Mono',monospace}tr:hover td{background:rgba(255,255,255,0.02)}</style></head>
<body><h1>⟐ ROTADOR — Ranking de modelos</h1>
<div id="status" style="font-size:10px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.3);margin-bottom:12px">Cargando...</div>
<table id="t"><thead><tr><th>#</th><th>MODELO</th><th>LATENCIA</th><th>UPTIME</th><th>SCORE</th><th>MUESTRAS</th></tr></thead><tbody id="tbody"></tbody></table>
<script>
const mods=${JSON.stringify(MODELOS)};
const st=document.getElementById('status');
const tb=document.getElementById('tbody');

async function loadRank(){
  const r=await fetch('/api/rotator/rank');const d=await r.json();
  const rank=d.ranking||[];
  // If no real data (all scores=999999), run live check
  if(rank.every(x=>x.score==='999999'||x.uptime==='—%')){
    st.textContent='● LIVE — Sin datos históricos, probando modelos...';
    tb.innerHTML=mods.map(m=>'<tr id="r-'+m.id+'"><td id="p-'+m.id+'">?</td><td>'+m.id+'</td><td id="l-'+m.id+'">...</td><td id="u-'+m.id+'">...</td><td id="s-'+m.id+'">...</td><td id="n-'+m.id+'">0</td></tr>').join('');
    const results=[];
    for(const m of mods){
      const t0=performance.now();
      try{
        const r2=await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:m.id,messages:[{role:'user',content:'ping'}],max_tokens:5})});
        const lat=(performance.now()-t0).toFixed(0);
        const ok=r2.ok;
        results.push({id:m.id,lat:ok?lat+'ms':'FAIL',ok,score:ok?parseInt(lat):999999});
        document.getElementById('l-'+m.id).textContent=ok?lat+'ms':'FAIL';
        document.getElementById('u-'+m.id).textContent=ok?'100%':'0%';
        document.getElementById('s-'+m.id).textContent=ok?lat:'999999';
        document.getElementById('n-'+m.id).textContent='1';
      }catch(e){
        results.push({id:m.id,lat:'FAIL',ok:false,score:999999});
        document.getElementById('l-'+m.id).textContent='FAIL';
        document.getElementById('u-'+m.id).textContent='0%';
        document.getElementById('s-'+m.id).textContent='999999';
        document.getElementById('n-'+m.id).textContent='1';
      }
      st.textContent='● LIVE — Probando... '+(results.filter(x=>x.lat!=='...').length)+'/'+mods.length;
    }
    const sorted=results.sort((a,b)=>a.score-b.score);
    sorted.forEach((x,i)=>{document.getElementById('p-'+x.id).textContent=i+1;if(i===0)document.getElementById('r-'+x.id).style.opacity='1'});
    st.textContent='● LIVE — ✓ Completo';
  } else {
    tb.innerHTML=rank.map((x,i)=>'<tr class="'+(i===0?'fastest':'')+'"><td>'+(i+1)+'</td><td>'+(i===0?'🏆 ':'')+x.id+'</td><td>'+x.avg+'</td><td>'+x.uptime+'</td><td>'+x.score+'</td><td>'+x.samples+'</td></tr>').join('');
    st.textContent='📊 Datos históricos — '+rank.reduce((a,x)=>a+(parseInt(x.samples)||0),0)+' muestras';
  }
}
loadRank();
</script></body></html>`);
}

// ========================================================
// PLAYGROUND
// ========================================================
function handlePlaygroundPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PLAYGROUND — Carbonato Proxy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;display:flex;flex-direction:column;height:100vh}
header{padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.08)}
header h1{font-family:'JetBrains Mono',monospace;font-size:13px;color:rgba(255,255,255,0.6)}
select{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:4px;padding:4px 8px;color:rgba(255,255,255,0.85);outline:none;font-size:11px}
#chat{flex:1;overflow-y:auto;padding:16px 20px}
.msg{margin-bottom:12px;max-width:80%}
.msg-user{margin-left:auto}
.msg-content{display:inline-block;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5}
.msg-user .msg-content{background:rgba(255,255,255,0.1);border-radius:12px 4px 12px 12px}
.msg-assistant .msg-content{background:rgba(255,255,255,0.04);border-radius:4px 12px 12px 12px;border:1px solid rgba(255,255,255,0.06)}
.msg-label{font-size:9px;color:rgba(255,255,255,0.25);margin-bottom:4px;font-family:'JetBrains Mono',monospace}
#input-area{display:flex;gap:8px;padding:12px 20px;border-top:1px solid rgba(255,255,255,0.08)}
#input-area textarea{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;color:rgba(255,255,255,0.85);outline:none;resize:none;font-family:'Inter',sans-serif;font-size:14px}
#input-area button{padding:10px 20px;background:rgba(255,255,255,0.12);border:none;border-radius:8px;color:rgba(255,255,255,0.85);cursor:pointer;font-family:'JetBrains Mono',monospace;font-weight:600}
#input-area button:hover{background:rgba(255,255,255,0.2)}
</style></head>
<body><header><h1>⟐ PLAYGROUND</h1></header>
<div id="chat"></div>
<div id="input-area">
  <select id="model">
    ${MODEL_IDS.filter(id => id !== 'modelo10').map(id => '<option>'+id+'</option>').join('')}
  </select>
  <textarea id="input" rows="1" placeholder="Escribe..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();enviar()}"></textarea>
  <button onclick="enviar()">Enviar</button>
</div>
<script>
const chat=document.getElementById('chat');
function addMsg(role,content,model){
  const d=document.createElement('div');d.className='msg msg-'+role;
  d.innerHTML='<div class="msg-label">'+(role==='user'?'Tú':(model||'IA'))+'</div><div class="msg-content">'+content+'</div>';
  chat.appendChild(d);chat.scrollTop=chat.scrollHeight;
}
async function enviar(){
  const input=document.getElementById('input');const text=input.value.trim();
  if(!text)return;addMsg('user',text);input.value='';
  const model=document.getElementById('model').value;
  try{
    const r=await fetch('/api/playground/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:text}]})});
    const d=await r.json();const content=d.choices?.[0]?.message?.content||'Sin respuesta';
    addMsg('assistant',content,model);
  }catch(e){addMsg('assistant','Error: '+e.message,model);}
}
</script></body></html>`);
}

async function handlePlaygroundChat(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const data = JSON.parse(body);
    const r = await fetch(proxyBase(req) + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: data.model || 'modelo1',
        messages: data.messages || [],
        max_tokens: data.max_tokens || 2048
      })
    });
    const d = await r.json();
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// ========================================================
// HEALTH DB (GitHub-backed persistence)
// ========================================================
function getGithubToken() { return process.env.GITHUB_TOKEN || ''; }

async function readFromGitHub() {
  const token = getGithubToken();
  if (!token) return null;
  try {
    const r = await fetch(GITHUB_URL, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!r.ok) return null;
    const data = await r.json();
    return { content: JSON.parse(Buffer.from(data.content, 'base64').toString()), sha: data.sha || '' };
  } catch(e) { return null; }
}

async function writeToGitHub(content, sha) {
  const token = getGithubToken();
  if (!token) return false;
  try {
    const r = await fetch(GITHUB_URL, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update health-db.json - ${new Date().toISOString().slice(0,10)}`,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha: sha
      })
    });
    return r.ok;
  } catch(e) { return false; }
}

async function getHealthDb() {
  // Try GitHub first
  const gh = await readFromGitHub();
  if (gh && Array.isArray(gh.content)) return { data: gh.content, sha: gh.sha || '' };
  // Fallback to /tmp
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'health-db.json'), 'utf8'));
    // Convert old format
    if (!Array.isArray(raw) && raw.latencies) {
      const arr = [];
      Object.entries(raw.latencies).forEach(([model, v]) => {
        if (v.avg && v.count > 0) {
          for (let i = 0; i < Math.min(v.count, 10); i++) {
            arr.push({ model, latency: v.avg, time: Date.now() - 60000, ip: 'legacy' });
          }
        }
      });
      return { data: arr, sha: '' };
    }
    return { data: Array.isArray(raw) ? raw : [], sha: '' };
  } catch (e) { return { data: [], sha: '' }; }
}

async function saveHealthDb(db, sha) {
  const max = 5000;
  if (db.length > max) db = db.slice(db.length - max);
  // Always save to /tmp
  try { fs.writeFileSync(path.join(DB_PATH, 'health-db.json'), JSON.stringify(db, null, 2)); } catch(e) {}
  // Push to GitHub
  await writeToGitHub(db, sha || '');
}

// ========================================================
// VISITORS — IP Dashboard
// ========================================================
async function loadUsageDB() {
  try {
    const local = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8'));
    if (local && Array.isArray(local.usages)) return local;
  } catch(e) {}
  try {
    const token = getGithubToken();
    if (!token) return { usages: [], stats: {} };
    const r = await fetch(GITHUB_USAGE_URL, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (r.ok) {
      const data = await r.json();
      return JSON.parse(Buffer.from(data.content, 'base64').toString());
    }
  } catch(e) {}
  return { usages: [], stats: {} };
}

async function saveUsageDB(db) {
  try { fs.writeFileSync(path.join(DB_PATH, 'usage-db.json'), JSON.stringify(db, null, 2)); } catch(e) {}
  const token = getGithubToken();
  if (!token) return;
  try {
    const getRes = await fetch(GITHUB_USAGE_URL, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    let sha = '';
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha || '';
    }
    await fetch(GITHUB_USAGE_URL, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update usage-db.json - ${new Date().toISOString().slice(0,10)}`,
        content: Buffer.from(JSON.stringify(db, null, 2)).toString('base64'),
        sha
      })
    });
  } catch(e) {}
}

async function handleVisitorsReset(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'No auth' });
  await saveUsageDB({ usages: [], stats: {} });
  res.json({ ok: true, message: 'Usage DB reset to zero' });
}

function handleVisitorsPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  // Get IP data from usage DB synchronously for initial render
  let db = { usages: [], stats: {} };
  try { db = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8')); } catch(e) {}
  const usages = db.usages || [];
  
  // Group by IP
  const ipMap = {};
  usages.forEach(u => {
    const ip = u.ip || 'unknown';
    if (!ipMap[ip]) ipMap[ip] = { ip, count: 0, lastSeen: '', models: new Set(), tokens: 0 };
    ipMap[ip].count++;
    ipMap[ip].tokens += u.tokens || 0;
    if (u.timestamp > ipMap[ip].lastSeen) ipMap[ip].lastSeen = u.timestamp;
    if (u.model) ipMap[ip].models.add(u.model);
  });
  
  const ips = Object.values(ipMap);
  ips.sort((a, b) => b.count - a.count);
  
  // Exclude own IP from display (user's own requests)
  const proxyOwnIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  const filteredIps = ips.filter(i => i.ip !== proxyOwnIp.split(',')[0].trim());

  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VISITANTES — Carbonato Proxy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}
h1{font-size:14px;font-family:'JetBrains Mono',monospace;color:rgba(255,255,255,0.6);margin-bottom:4px}
.sub{font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:16px;font-family:'JetBrains Mono',monospace}
table{width:100%;border-collapse:collapse;font-size:11px}
th{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px}
td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:'JetBrains Mono',monospace;font-size:10px;vertical-align:middle}
tr:hover td{background:rgba(255,255,255,0.02)}
.flag{font-size:16px}
.loading{color:rgba(255,255,255,0.25)}
.ip-cell{cursor:pointer;color:rgba(255,255,255,0.7)}
.ip-cell:hover{color:#fff}
.models{font-size:9px;color:rgba(255,255,255,0.3)}
.toolbar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}
.toolbar input,.toolbar button{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);padding:6px 10px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:10px;outline:none}
.toolbar input:focus{border-color:rgba(255,255,255,0.3)}
.toolbar input[type=date]{color-scheme:dark}
.toolbar button{cursor:pointer;transition:all 0.2s}
.toolbar button:hover{background:rgba(255,255,255,0.1)}
.pagination{display:flex;gap:8px;margin-top:12px;align-items:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.3)}
.pagination button{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);padding:4px 12px;border-radius:4px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;transition:all 0.2s}
.pagination button:hover{background:rgba(255,255,255,0.1)}
.pagination button:disabled{opacity:0.2;cursor:default}
#pageInfo{color:rgba(255,255,255,0.4)}
/* hidden reset button — esquina inferior derecha */
#resetBtn{position:fixed;bottom:8px;right:8px;background:none;border:none;color:rgba(255,255,255,0.12);font-size:9px;cursor:pointer;font-family:'JetBrains Mono',monospace;padding:4px 8px;transition:color 0.3s;z-index:999}
#resetBtn:hover{color:rgba(255,255,255,0.4)}
#resetBtn.confirm{color:#ff4444}
</style></head>
<body>
<h1>⟐ VISITANTES</h1>
<div class="sub"><span id="totalIPs">${filteredIps.length}</span> IPs únicas · <span id="totalReqs">${usages.length}</span> requests</div>
<div class="toolbar">
  <input type="text" id="searchInput" placeholder="🔍 Buscar IP..." oninput="applyFilters()">
  <input type="date" id="dateFrom" onchange="applyFilters()">
  <input type="date" id="dateTo" onchange="applyFilters()">
  <button onclick="exportCSV()" title="Exportar CSV">⬇ CSV</button>
</div>
<table><thead><tr>
  <th>#</th><th>IP</th><th>PAÍS</th><th>UBICACIÓN</th><th>ISP</th><th>REQS</th><th>ÚLT. VEZ</th><th>MODELOS</th>
</tr></thead><tbody id="tbody"></tbody></table>
<div class="pagination">
  <button id="prevBtn" onclick="changePage(-1)">◀ Anterior</button>
  <span id="pageInfo">Página 1 / 1</span>
  <button id="nextBtn" onclick="changePage(1)">Siguiente ▶</button>
</div>
<div id="status" style="font-size:10px;color:rgba(255,255,255,0.2);margin-top:8px;font-family:'JetBrains Mono',monospace"></div>
<button id="resetBtn" onclick="if(this.classList.contains('confirm')){fetch('/api/visitors/reset',{method:'POST'}).then(r=>r.json()).then(d=>{if(d.ok)location.reload()})}else{this.textContent='¿SEGURO?';this.classList.add('confirm');setTimeout(()=>{this.textContent='●';this.classList.remove('confirm')},4000)}" title="reset stats">●</button>
<script>
const allIps = ${JSON.stringify(filteredIps.map(i => ({ ip: i.ip, count: i.count, lastSeen: i.lastSeen, models: [...i.models], tokens: i.tokens })))};
const PER_PAGE = 20;
const geoCache = {};
let currentPage = 1;
let filteredList = [];

function getFiltered() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const dFrom = document.getElementById('dateFrom').value;
  const dTo = document.getElementById('dateTo').value;
  return allIps.filter(entry => {
    if (q && !entry.ip.toLowerCase().includes(q)) return false;
    if (dFrom && entry.lastSeen && entry.lastSeen < new Date(dFrom + 'T00:00:00').toISOString()) return false;
    if (dTo && entry.lastSeen && entry.lastSeen > new Date(dTo + 'T23:59:59').toISOString()) return false;
    return true;
  });
}

function applyFilters() {
  filteredList = getFiltered();
  currentPage = 1;
  renderTable();
}

function changePage(delta) {
  const totalPages = Math.ceil(filteredList.length / PER_PAGE) || 1;
  const newPage = Math.max(1, Math.min(totalPages, currentPage + delta));
  if (newPage === currentPage) return;
  currentPage = newPage;
  renderTable();
}

function renderTable() {
  if (!filteredList.length) filteredList = getFiltered();
  const totalPages = Math.ceil(filteredList.length / PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PER_PAGE;
  const pageIps = filteredList.slice(start, start + PER_PAGE);
  
  const tbody = document.getElementById('tbody');
  const status = document.getElementById('status');
  tbody.innerHTML = '';
  
  if (pageIps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.2);padding:24px">Sin resultados</td></tr>';
    document.getElementById('prevBtn').disabled = true;
    document.getElementById('nextBtn').disabled = true;
    document.getElementById('pageInfo').textContent = '0 resultados';
    status.textContent = '';
    return;
  }
  
  pageIps.forEach((entry, idx) => {
    const globalIdx = allIps.indexOf(entry);
    const row = document.createElement('tr');
    row.id = 'r-' + globalIdx;
    const geo = geoCache[entry.ip];
    row.innerHTML = '<td>' + (start + idx + 1) + '</td>' +
      '<td class="ip-cell" onclick="navigator.clipboard.writeText(\\'' + entry.ip + '\\')">' + entry.ip + '</td>' +
      '<td id="c-' + globalIdx + '">' + (geo ? geo.flag : '<span class="loading">⟳</span>') + '</td>' +
      '<td id="l-' + globalIdx + '">' + (geo ? geo.location : '<span class="loading">⟳</span>') + '</td>' +
      '<td id="i-' + globalIdx + '">' + (geo ? geo.isp : '<span class="loading">⟳</span>') + '</td>' +
      '<td>' + entry.count + '</td>' +
      '<td style="font-size:9px;color:rgba(255,255,255,0.3)">' + (entry.lastSeen ? new Date(entry.lastSeen).toLocaleString('es-CR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—') + '</td>' +
      '<td class="models">' + (entry.models.slice(0,3).join(', ') + (entry.models.length > 3 ? '...' : '')) + '</td>';
    tbody.appendChild(row);
    
    // Fetch geolocation if not cached
    if (!geoCache[entry.ip]) {
      const API = 'https://ip-api.com/json/';
      fetch(API + entry.ip)
        .then(r => r.json())
        .then(d => {
          const flag = d.countryCode ? String.fromCodePoint(...[...d.countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';
          geoCache[entry.ip] = {
            flag: (flag ? '<span class="flag">' + flag + '</span> ' : '') + (d.country || '—'),
            location: [d.regionName, d.city].filter(Boolean).join(', ') || '—',
            isp: d.isp || d.org || '—'
          };
          const cEl = document.getElementById('c-' + globalIdx);
          const lEl = document.getElementById('l-' + globalIdx);
          const iEl = document.getElementById('i-' + globalIdx);
          if (cEl) cEl.innerHTML = geoCache[entry.ip].flag;
          if (lEl) lEl.textContent = geoCache[entry.ip].location;
          if (iEl) iEl.textContent = geoCache[entry.ip].isp;
        })
        .catch(() => {
          geoCache[entry.ip] = { flag: '—', location: '—', isp: '—' };
          const cEl = document.getElementById('c-' + globalIdx);
          const lEl = document.getElementById('l-' + globalIdx);
          const iEl = document.getElementById('i-' + globalIdx);
          if (cEl) cEl.textContent = '—';
          if (lEl) lEl.textContent = '—';
          if (iEl) iEl.textContent = '—';
        });
    }
  });
  
  document.getElementById('prevBtn').disabled = currentPage <= 1;
  document.getElementById('nextBtn').disabled = currentPage >= totalPages;
  document.getElementById('pageInfo').textContent = 'Página ' + currentPage + ' / ' + totalPages + ' (' + filteredList.length + ' IPs)';
  document.getElementById('totalIPs').textContent = filteredList.length;
  status.textContent = filteredList.length > 0 ? 'Mostrando ' + pageIps.length + ' IPs · ' + filteredList.length + ' filtradas' : '';
}

function exportCSV() {
  const data = filteredList.length ? filteredList : getFiltered();
  let csv = '\\uFEFFIP,Requests,LastSeen,Models,Tokens\\n';
  data.forEach(entry => {
    const lastSeen = entry.lastSeen ? new Date(entry.lastSeen).toISOString().slice(0,19).replace('T',' ') : '';
    const models = (entry.models || []).join('; ');
    csv += '"' + entry.ip + '",' + entry.count + ',"' + lastSeen + '","' + models + '",' + (entry.tokens || 0) + '\\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'visitantes-' + new Date().toISOString().slice(0,10) + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// Initial render
filteredList = getFiltered();
renderTable();
</script></body></html>`);
}

// ========================================================
// ADMIN AUTH (merged from admin-auth.js)
// ========================================================
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

async function handleAdminAuth(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  let body = '';
  for await (const chunk of req) body += chunk;
  const p = new URLSearchParams(body);
  if (p.get('user') === ADMIN_USER && p.get('pass') === ADMIN_PASS) {
    res.setHeader('Set-Cookie', 'admin_sess=ok; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400');
    return res.writeHead(302, { 'Location': '/api/admin-panel' }).end();
  }
  return res.writeHead(302, { 'Location': '/api/admin?error=1' }).end();
}

// ========================================================
// ADMIN SAVE (merged from admin-save.js, optimized)
// ========================================================
async function handleAdminSave(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const config = JSON.parse(body);
    try { fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(config, null, 2)); } catch(e) {}
    // Push to GitHub via proxi-datos/config.json
    const token = getGithubToken();
    if (token) {
      try {
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json';
        const getR = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
        let sha = '';
        if (getR.ok) { const d = await getR.json(); sha = d.sha || ''; }
        await fetch(apiUrl, {
          method: 'PUT',
          headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Update config via panel', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha })
        });
      } catch(e) {}
    }
    return res.status(200).json({ success: true });
  } catch(e) {
    return res.status(400).json({ error: e.message });
  }
}

// ========================================================
// ADMIN LOGOUT (merged from admin-logout.js)
// ========================================================
function handleAdminLogout(req, res) {
  res.setHeader('Set-Cookie', 'admin_sess=; Path=/; Max-Age=0; HttpOnly');
  res.writeHead(302, { 'Location': '/api/admin' }).end();
}

// ========================================================
// UPLOAD (merged from upload.js)
// ========================================================
async function handleUpload(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const data = JSON.parse(body);
    if (data.url) return res.json({ success: true, url: data.url });
    if (!data.base64) return res.status(400).json({ error: 'Se requiere base64 o url' });
    let base64Data = data.base64;
    if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
    const imgbbKey = process.env.IMGBB_API_KEY || '';
    if (!imgbbKey) {
      const mimeType = data.mimetype || 'image/png';
      return res.json({ success: true, url: `data:${mimeType};base64,${base64Data}`, note: 'Usando data URL. Configurar IMGBB_API_KEY para mejor resultado' });
    }
    const formData = new FormData();
    formData.append('image', base64Data);
    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: 'POST', body: formData });
    const imgbbData = await imgbbRes.json();
    if (imgbbData.data && imgbbData.data.url) return res.json({ success: true, url: imgbbData.data.url, delete_url: imgbbData.data.delete_url });
    return res.status(500).json({ error: 'Error al subir imagen' });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}

// ========================================================
// MODELS CHECK (merged from models-check.js)
// ========================================================
async function handleModelsCheck(req, res) {
  const kiloModels = [
    "kilo-auto/free", "nvidia/nemotron-3-super-120b-a12b:free", "poolside/laguna-m.1:free",
    "poolside/laguna-xs.2:free", "stepfun/step-3.7-flash:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "google/gemini-2.0-flash-exp:free", "openrouter/free"
  ];
  const results = [];
  for (const modelId of kiloModels) {
    try {
      const response = await fetch('https://api.kilo.ai/api/gateway/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'OK' }], max_tokens: 5 })
      });
      const data = await response.json();
      const working = response.ok && !data.error;
      results.push({ model: modelId, status: working ? 'active' : 'error', response_time: Date.now(), error: data.error || null });
    } catch (e) { results.push({ model: modelId, status: 'failed', error: e.message }); }
  }
  const activeModels = results.filter(r => r.status === 'active').map(r => r.model);
  res.status(200).json({
    timestamp: new Date().toISOString(), total: results.length, active: activeModels.length, models: results,
    config_update: activeModels.length > 0 ? activeModels.reduce((acc, m, i) => {
      acc[`modelo${i+1}`] = { url: "https://api.kilo.ai/api/gateway/chat/completions", model: m, key: "", system_prompt: "" };
      return acc;
    }, {}) : null
  });
}

// ========================================================
// DOCS IA (merged from docs-ia.js)
// ========================================================
function handleDocsIA(req, res) {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/docs-ia' && req.method === 'GET') {
    return res.setHeader('Content-Type', 'application/json').status(200).json({
      api_base: "https://carbonato-proxy.vercel.app",
      endpoint: "/chat/completions",
      models: {
        modelo1: { id: "kilo-auto/free", free: true, provider: "kilo", description: "Auto-selection best model" },
        modelo2: { id: "nvidia/nemotron-3-super-120b-a12b:free", free: true, provider: "kilo", description: "120B reasoning" },
        modelo3: { id: "poolside/laguna-m.1:free", free: true, provider: "kilo", description: "Laguna M.1 balanced" },
        modelo4: { id: "poolside/laguna-xs.2:free", free: true, provider: "kilo", description: "Laguna XS.2 speed" },
        modelo5: { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true, provider: "kilo", description: "Multimodal (text+image)", image_gen: true },
        modelo6: { id: "stepfun/step-3.7-flash:free", free: true, provider: "kilo", description: "Fast reasoning" },
        modelo7: { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true, provider: "kilo", description: "Code model" },
        modelo8: { id: "openrouter/free", free: true, provider: "kilo", description: "OpenRouter access" },
        modelo9: { id: "smart-rotator", free: true, provider: "kilo", description: "Auto-failover with circuit breaker" },
        modelo10: { id: "google/gemini-2.0-flash-exp:free", free: true, provider: "kilo", description: "Google Gemini 2.0 Experimental" }
      },
      endpoints: {
        chat: "/chat/completions", models: "/models", admin: "/api/admin",
        admin_panel: "/api/admin-panel", check_models: "/api/models-check", images: "/images/generations", upload: "/api/upload"
      },
      usage: {
        chat: { method: "POST", body: { model: "modelo1-modelo10", messages: [{ role: "user", content: "Hello" }] } },
        image_gen: { endpoint: "/images/generations", model: "modelo5", body: { prompt: "a beautiful sunset over mountains" } }
      },
      auth: { note: "No global auth required. Admin panel uses hardcoded credentials", env_vars: ["GITHUB_TOKEN", "IMGBB_API_KEY"] }
    });
  }
  res.status(404).json({ error: "Not found" });
}

// ========================================================
// LOGS PAGE — historial de errores del proxy
// ========================================================
function handleLogsPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'proxy-logs.json'), 'utf8')); } catch(e) {}
  const total = logs.length;
  let rows = logs.slice(-100).reverse().map(l =>
    `<tr style="color:${l.status >= 400 ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.6)'}">
      <td>${esc(l.time || '—')}</td>
      <td>${esc(l.model || '—')}</td>
      <td>${esc(l.ip || '—')}</td>
      <td>${l.status || '—'}</td>
      <td>${l.latency != null ? l.latency + 'ms' : '—'}</td>
      <td style="font-size:9px;color:rgba(255,255,255,0.3)">${esc((l.error || '').slice(0,80))}</td>
    </tr>`
  ).join('') || '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.2)">Sin logs</td></tr>';

  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LOGS — Carbonato Proxy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}
h1{font-family:'JetBrains Mono',monospace;font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:4px}
.sub{font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:16px;font-family:'JetBrains Mono',monospace}
table{width:100%;border-collapse:collapse;font-size:10px}
th{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px}
td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:'JetBrains Mono',monospace;font-size:10px}
tr:hover td{background:rgba(255,255,255,0.02)}
</style></head>
<body><h1>⟐ LOGS DEL PROXY</h1>
<div class="sub">${total} registros · mostrando últimos 100</div>
<table><thead><tr><th>HORA</th><th>MODELO</th><th>IP</th><th>STATUS</th><th>LATENCIA</th><th>ERROR</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`);
}

// ========================================================
// CONFIG PAGE — editor de config.json con persistencia GitHub
// ========================================================
async function handleConfigPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  let configData = { error: 'No config loaded' };
  let sha = '';
  const token = getGithubToken();
  if (token) {
    try {
      const r = await fetch('https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json', {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (r.ok) {
        const d = await r.json();
        configData = JSON.parse(Buffer.from(d.content, 'base64').toString());
        sha = d.sha || '';
      }
    } catch(e) {}
  }
  const jsonStr = JSON.stringify(configData, null, 2);
  html(res, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CONFIG — Carbonato Proxy</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}
h1{font-family:'JetBrains Mono',monospace;font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:4px}
.sub{font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:16px;font-family:'JetBrains Mono',monospace}
textarea{width:100%;height:70vh;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:12px;color:rgba(255,255,255,0.85);font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;resize:vertical;tab-size:2}
button{padding:10px 24px;background:rgba(255,255,255,0.12);border:none;border-radius:6px;color:rgba(255,255,255,0.85);cursor:pointer;font-family:'JetBrains Mono',monospace;font-weight:600;margin-top:8px}
button:hover{background:rgba(255,255,255,0.2)}
#status{font-size:11px;margin-top:8px;font-family:'JetBrains Mono',monospace}
</style></head>
<body><h1>⟐ EDITOR DE CONFIG</h1>
<div class="sub">proxi-datos/config.json · SHA: ${sha.slice(0,7) || 'nuevo'}</div>
<textarea id="editor" spellcheck="false">${esc(jsonStr)}</textarea>
<button onclick="saveConfig()">⟫ GUARDAR EN GITHUB</button>
<div id="status"></div>
<script>
async function saveConfig(){
  const st=document.getElementById('status');st.innerHTML='⟫ GUARDANDO...';
  try{
    const r=await fetch('/api/config/save',{method:'POST',headers:{'Content-Type':'application/json'},body:document.getElementById('editor').value});
    const d=await r.json();
    if(d.ok)st.innerHTML='<span style="color:#00ff88">✓ CONFIGURACIÓN GUARDADA</span>';
    else st.innerHTML='<span style="color:#ff4444">⛔ ERROR: '+JSON.stringify(d.error)+'</span>';
  }catch(e){st.innerHTML='<span style="color:#ff4444">⛔ ERROR: '+e.message+'</span>';}
  setTimeout(()=>st.innerHTML='',5000);
}
</script></body></html>`);
}

// ========================================================
// CONFIG SAVE — guarda config.json a GitHub
// ========================================================
async function handleConfigSave(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const config = JSON.parse(body);
    const token = getGithubToken();
    if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN no configurado' });
    const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json';
    const getR = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
    let sha = '';
    if (getR.ok) { const d = await getR.json(); sha = d.sha || ''; }
    const putR = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Update config - ${new Date().toISOString().slice(0,10)}`, content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha })
    });
    if (putR.ok) {
      try { fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(config, null, 2)); } catch(e) {}
      return res.json({ ok: true });
    }
    const errData = await putR.json().catch(() => ({}));
    res.status(500).json({ error: errData.message || 'Error writing to GitHub' });
  } catch(e) { res.status(400).json({ error: 'JSON inválido: ' + e.message }); }
}
