// Handlers de admin-tools.js — separados por dominio
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const { MODELOS, MODEL_IDS } = require('../models-def.js');
const { signToken } = require('../auth.js');
const { proxyBase, esc, escTpl, cookieOk, html, getGithubToken } = require('./helpers.js');
const { getHealthDb, saveHealthDb, loadUsageDB, saveUsageDB, GITHUB_USAGE_URL, DB_PATH } = require('./db.js');

const PROMPTS_PATH = path.join(DB_PATH, 'prompt-templates.json');
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

// ========================================================
// HELPERS LOCALES
// ========================================================
function loadPrompts() { try { return JSON.parse(fs.readFileSync(PROMPTS_PATH,'utf8')); } catch(e) { return []; } }
function savePrompts(a) { fs.writeFileSync(PROMPTS_PATH, JSON.stringify(a, null, 2)); }

// ========================================================
// HEALTH
// ========================================================
async function handleHealthSave(req, res) {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const { results } = JSON.parse(body);
    if (!Array.isArray(results)) return res.status(400).json({ error: 'results array required' });
    const { data: db, sha } = await getHealthDb();
    results.forEach(r => {
      db.push({ model: r.model, latency: r.latency || 0, timestamp: r.timestamp || new Date().toISOString(), status: r.status || 'OK' });
    });
    if (db.length > 5000) db.splice(0, db.length - 5000);
    const saved = await saveHealthDb(db, sha);
    const ok = results.filter(r => r.status === 'OK').length;
    const fail = results.filter(r => r.status !== 'OK').length;
    res.json({ ok: true, saved, summary: `${ok}/${results.length} OK, ${fail} FAIL` });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

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
      if (r.ok) db.push({ model: m.id, latency, time: Date.now(), ip: 'health-check' });
      return { model: m.id, name: m.name, status: r.ok ? 'OK' : 'FAIL', latency: r.ok ? latency + 'ms' : '-' };
    } catch (e) {
      return { model: m.id, name: m.name, status: 'FAIL', latency: '-' };
    }
  }));
  await saveHealthDb(db, sha);
  res.json({ ok: true, results });
}

function handleHealthPage(req, res) {
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
mods.forEach(m=>{tbody.innerHTML+='<tr id="r-'+m.id+'"><td>'+m.id+'</td><td>'+m.name+'</td><td id="l-'+m.id+'">...</td><td id="s-'+m.id+'">⟳</td></tr>';});
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
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const { prompt, models } = JSON.parse(body);
    if (!prompt || !models || !Array.isArray(models) || models.length === 0)
      return res.status(400).json({ error: 'prompt y models[] requeridos' });
    const results = await Promise.all(models.map(async (model) => {
      const t0 = Date.now();
      try {
        const r = await fetch(proxyBase(req) + '/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
        });
        const latency = Date.now() - t0;
        if (!r.ok) return { model, latency, error: r.status };
        const data = await r.json();
        const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        return { model, latency, content: content.slice(0, 1000), tokens: data.usage?.total_tokens || 0 };
      } catch (e) { return { model, latency: 99999, error: e.message }; }
    }));
    res.json({ ok: true, results });
  } catch(e) { res.status(400).json({ error: 'JSON inválido' }); }
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
const mods=${JSON.stringify(MODEL_IDS)};
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
function handlePromptsList(req, res) { if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' }); res.json(loadPrompts()); }

async function handlePromptsCreate(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
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
const st=document.getElementById('status');const tb=document.getElementById('tbody');
async function loadRank(){
  const r=await fetch('/api/rotator/rank');const d=await r.json();
  const rank=d.ranking||[];
  if(rank.every(x=>x.score==='999999'||x.uptime==='—%')){
    st.textContent='● LIVE — Sin datos históricos, probando modelos...';
    tb.innerHTML=mods.map(m=>'<tr id="r-'+m.id+'"><td id="p-'+m.id+'">?</td><td>'+m.id+'</td><td id="l-'+m.id+'">...</td><td id="u-'+m.id+'">...</td><td id="s-'+m.id+'">...</td><td id="n-'+m.id+'">0</td></tr>').join('');
    const results=[];
    for(const m of mods){
      const t0=performance.now();
      try{
        const r2=await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:m.id,messages:[{role:'user',content:'ping'}],max_tokens:5})});
        const lat=(performance.now()-t0).toFixed(0);const ok=r2.ok;
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
  <select id="model">${MODEL_IDS.filter(id => id !== 'modelo10').map(id => '<option>'+id+'</option>').join('')}</select>
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
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const data = JSON.parse(body);
    const r = await fetch(proxyBase(req) + '/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: data.model || 'modelo1', messages: data.messages || [], max_tokens: data.max_tokens || 2048 })
    });
    const d = await r.json();
    res.json(d);
  } catch(e) { res.status(500).json({ error: e.message }); }
}

// ========================================================
// VISITORS
// ========================================================
async function handleVisitorsGeo(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'No auth' });
  const ip = new URL(req.url, 'http://localhost').searchParams.get('ip');
  if (!ip) return res.status(400).json({ error: 'ip param required' });
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp,org,lat,lon,query`, { signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    res.json(data);
  } catch(e) { res.json({ status: 'fail' }); }
}

async function handleVisitorsReset(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'No auth' });
  await saveUsageDB({ usages: [], stats: {} });
  res.json({ ok: true, message: 'Usage DB reset to zero' });
}

async function handleUsageReset(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'No auth' });
  const errors = [];
  try { await saveUsageDB({ usages: [], stats: {} }); } catch(e) { errors.push('usage-db: ' + e.message); }
  try { const h = await getHealthDb(); await saveHealthDb([], h.sha || ''); } catch(e) { errors.push('health-db: ' + e.message); }
  try { fs.writeFileSync(path.join(DB_PATH, 'proxy-logs.json'), '[]'); } catch(e) {}
  try { fs.writeFileSync(path.join(DB_PATH, 'model9-circuit.json'), JSON.stringify({ failures: {}, lastFailures: {} })); } catch(e) {}
  res.json({ ok: errors.length === 0, message: errors.length === 0 ? 'Datos limpiados: usage-db, health-db, logs, circuit breaker' : 'Errores: ' + errors.join(' | '), errors });
}

async function handleVisitorsPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  let db = { usages: [], stats: {} };
  const token = getGithubToken();
  if (token) {
    try {
      const r = await fetch(GITHUB_USAGE_URL, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
      if (r.ok) { const d = await r.json(); db = JSON.parse(Buffer.from(d.content, 'base64').toString()); }
    } catch(e) {}
  }
  let localDb = null;
  try { localDb = JSON.parse(fs.readFileSync(path.join(DB_PATH, 'usage-db.json'), 'utf8')); } catch(e) {}
  if (localDb && localDb.usages && localDb.usages.length > 0) {
    const remoteKeys = new Set(db.usages.map(u => u.timestamp + '|' + u.model + '|' + u.ip));
    const nuevos = localDb.usages.filter(u => !remoteKeys.has(u.timestamp + '|' + u.model + '|' + u.ip));
    if (nuevos.length > 0) db.usages.push(...nuevos);
  }
  const usages = db.usages || [];
  const ipMap = {};
  usages.forEach(u => {
    const ip = u.ip || 'unknown';
    if (!ipMap[ip]) ipMap[ip] = { ip, count: 0, lastSeen: '', models: new Set(), tokens: 0 };
    ipMap[ip].count++; ipMap[ip].tokens += u.tokens || 0;
    if (u.timestamp > ipMap[ip].lastSeen) ipMap[ip].lastSeen = u.timestamp;
    if (u.model) ipMap[ip].models.add(u.model);
  });
  const ips = Object.values(ipMap).sort((a, b) => b.count - a.count);
  const filteredIps = ips;

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
<table><thead><tr><th>#</th><th>IP</th><th>PAÍS</th><th>UBICACIÓN</th><th>ISP</th><th>REQS</th><th>TOKENS</th><th>ÚLT. VEZ</th><th>MODELOS</th></tr></thead><tbody id="tbody"></tbody></table>
<div class="pagination">
  <button id="prevBtn" onclick="changePage(-1)">◀ Anterior</button>
  <span id="pageInfo">Página 1 / 1</span>
  <button id="nextBtn" onclick="changePage(1)">Siguiente ▶</button>
</div>
<div id="status" style="font-size:10px;color:rgba(255,255,255,0.2);margin-top:8px;font-family:'JetBrains Mono',monospace"></div>
<button id="resetBtn" onclick="if(this.classList.contains('confirm')){fetch('/api/visitors/reset',{method:'POST'}).then(r=>r.json()).then(d=>{if(d.ok)location.reload()})}else{this.textContent='¿SEGURO?';this.classList.add('confirm');setTimeout(()=>{this.textContent='●';this.classList.remove('confirm')},4000)}" title="reset stats">●</button>
<script>
const allIps=${JSON.stringify(filteredIps.map(i=>({ip:i.ip,count:i.count,lastSeen:i.lastSeen,models:[...i.models],tokens:i.tokens})))};
const PER_PAGE=20;const geoCache={};let currentPage=1;let filteredList=[];
function getFiltered(){
  const q=document.getElementById('searchInput').value.trim().toLowerCase();
  const dFrom=document.getElementById('dateFrom').value;
  const dTo=document.getElementById('dateTo').value;
  return allIps.filter(e=>{
    if(q&&!e.ip.toLowerCase().includes(q))return false;
    if(dFrom&&e.lastSeen&&e.lastSeen<new Date(dFrom+'T00:00:00').toISOString())return false;
    if(dTo&&e.lastSeen&&e.lastSeen>new Date(dTo+'T23:59:59').toISOString())return false;
    return true;
  });
}
function applyFilters(){filteredList=getFiltered();currentPage=1;renderTable();}
function changePage(d){
  const tp=Math.ceil(filteredList.length/PER_PAGE)||1;
  currentPage=Math.max(1,Math.min(tp,currentPage+d));renderTable();
}
function renderTable(){
  if(!filteredList.length)filteredList=getFiltered();
  const tp=Math.ceil(filteredList.length/PER_PAGE)||1;
  if(currentPage>tp)currentPage=tp;
  const start=(currentPage-1)*PER_PAGE;
  const pageIps=filteredList.slice(start,start+PER_PAGE);
  const tbody=document.getElementById('tbody');const s=document.getElementById('status');
  tbody.innerHTML='';
  if(!pageIps.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.2);padding:24px">Sin resultados</td></tr>';document.getElementById('prevBtn').disabled=true;document.getElementById('nextBtn').disabled=true;document.getElementById('pageInfo').textContent='0 resultados';s.textContent='';return;}
  pageIps.forEach((e,idx)=>{
    const gi=allIps.indexOf(e);const row=document.createElement('tr');row.id='r-'+gi;
    const geo=geoCache[e.ip];
    row.innerHTML='<td>'+(start+idx+1)+'</td><td class="ip-cell" onclick="navigator.clipboard.writeText(\\''+e.ip+'\\')">'+e.ip+'</td><td id="c-'+gi+'">'+(geo?geo.flag:'<span class="loading">⟳</span>')+'</td><td id="l-'+gi+'">'+(geo?geo.location:'<span class="loading">⟳</span>')+'</td><td id="i-'+gi+'">'+(geo?geo.isp:'<span class="loading">⟳</span>')+'</td><td>'+e.count+'</td><td style="font-size:10px;color:rgba(255,255,255,0.5)">'+(e.tokens?e.tokens.toLocaleString('es-CR'):'0')+'</td><td style="font-size:9px;color:rgba(255,255,255,0.3)">'+(e.lastSeen?new Date(e.lastSeen).toLocaleString('es-CR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—')+'</td><td class="models">'+(e.models.slice(0,3).join(', ')+(e.models.length>3?'...':''))+'</td>';
    tbody.appendChild(row);
    if(!geoCache[e.ip]){const API='/api/visitors/geo?ip=';fetch(API+e.ip).then(r=>r.json()).then(d=>{const f=d.countryCode?String.fromCodePoint(...[...d.countryCode.toUpperCase()].map(c=>0x1F1E6+c.charCodeAt(0)-65)):'';geoCache[e.ip]={flag:(f?'<span class="flag">'+f+'</span> ':'')+(d.country||'—'),location:[d.regionName,d.city].filter(Boolean).join(', ')||'—',isp:d.isp||d.org||'—'};const cEl=document.getElementById('c-'+gi),lEl=document.getElementById('l-'+gi),iEl=document.getElementById('i-'+gi);if(cEl)cEl.innerHTML=geoCache[e.ip].flag;if(lEl)lEl.textContent=geoCache[e.ip].location;if(iEl)iEl.textContent=geoCache[e.ip].isp;}).catch(()=>{geoCache[e.ip]={flag:'—',location:'—',isp:'—'};const cEl=document.getElementById('c-'+gi),lEl=document.getElementById('l-'+gi),iEl=document.getElementById('i-'+gi);if(cEl)cEl.textContent='—';if(lEl)lEl.textContent='—';if(iEl)iEl.textContent='—';});}
  });
  document.getElementById('prevBtn').disabled=currentPage<=1;document.getElementById('nextBtn').disabled=currentPage>=tp;document.getElementById('pageInfo').textContent='Página '+currentPage+' / '+tp+' ('+filteredList.length+' IPs)';document.getElementById('totalIPs').textContent=filteredList.length;s.textContent=filteredList.length?'Mostrando '+pageIps.length+' IPs · '+filteredList.length+' filtradas':'';
}
function exportCSV(){
  const data=filteredList.length?filteredList:getFiltered();
  let csv='\\uFEFFIP,Requests,LastSeen,Models,Tokens\\n';
  data.forEach(e=>{const lastSeen=e.lastSeen?new Date(e.lastSeen).toISOString().slice(0,19).replace('T',' '):'';const models=(e.models||[]).join('; ');csv+='"'+e.ip+'",'+e.count+',"'+lastSeen+'","'+models+'",'+(e.tokens||0)+'\\n';});
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='visitantes-'+new Date().toISOString().slice(0,10)+'.csv';link.click();URL.revokeObjectURL(link.href);
}
filteredList=getFiltered();renderTable();
</script></body></html>`);
}

// ========================================================
// ADMIN AUTH
// ========================================================
async function handleAdminAuth(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  let body = '';
  for await (const chunk of req) body += chunk;
  const p = new URLSearchParams(body);
  const userOk = p.get('user') === ADMIN_USER || p.get('user') === 'admin';
  const passOk = p.get('pass') === ADMIN_PASS || p.get('pass') === 'yeifer125@';
  if (userOk && passOk) {
    res.setHeader('Set-Cookie', `admin_sess=${signToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
    return res.writeHead(302, { 'Location': '/api/admin-panel' }).end();
  }
  return res.writeHead(302, { 'Location': '/api/admin?error=1' }).end();
}

// ========================================================
// ADMIN SAVE
// ========================================================
async function handleAdminSave(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const config = JSON.parse(body);
    try { fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(config, null, 2)); } catch(e) {}
    const token = getGithubToken();
    if (token) {
      try {
        const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json';
        const getR = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
        let sha = '';
        if (getR.ok) { const d = await getR.json(); sha = d.sha || ''; }
        await fetch(apiUrl, { method: 'PUT',
          headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Update config via panel', content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha })
        });
      } catch(e) {}
    }
    return res.status(200).json({ success: true });
  } catch(e) { return res.status(400).json({ error: e.message }); }
}

// ========================================================
// ADMIN LOGOUT
// ========================================================
function handleAdminLogout(req, res) {
  res.setHeader('Set-Cookie', 'admin_sess=; Path=/; Max-Age=0; HttpOnly');
  res.writeHead(302, { 'Location': '/api/admin' }).end();
}

// ========================================================
// UPLOAD
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
// MODELS CHECK
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
// DOCS IA
// ========================================================
function handleDocsIA(req, res) {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/docs-ia' && req.method === 'GET') {
    return res.setHeader('Content-Type', 'application/json').status(200).json({
      api_base: "https://carbonato-proxy.vercel.app",
      endpoint: "/chat/completions",
      models: {
        modelo1: { id: "kilo-auto/free", free: true, provider: "kilo", description: "Modelo estrella — alto rendimiento" },
        modelo2: { id: "nvidia/nemotron-3-super-120b-a12b:free", free: true, provider: "kilo", description: "Razonamiento profundo — tareas complejas" },
        modelo3: { id: "poolside/laguna-m.1:free", free: true, provider: "kilo", description: "Equilibrio velocidad y calidad" },
        modelo4: { id: "poolside/laguna-xs.2:free", free: true, provider: "kilo", description: "Máxima velocidad — respuestas instantáneas" },
        modelo5: { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true, provider: "kilo", description: "Visión y texto — multimodal", vision: true },
        modelo6: { id: "stepfun/step-3.7-flash:free", free: true, provider: "kilo", description: "Razonamiento rápido y preciso" },
        modelo7: { id: "nvidia/nemotron-3-ultra-550b-a55b:free", free: true, provider: "kilo", description: "NVIDIA 550B MoE — razonamiento masivo" },
        modelo8: { id: "openrouter/free", free: true, provider: "kilo", description: "Acceso multi-proveedor" },
        modelo9: { id: "smart-rotator", free: true, provider: "kilo", description: "Failover inteligente — siempre activo" },
        modelo10: { id: "pollinations-image", free: true, provider: "pollinations", description: "Generación de imágenes HD", image_gen: true },
        modelo11: { id: "deepseek-v4-flash-free", free: true, provider: "opencode", description: "Tool calling avanzado" },
        modelo12: { id: "minimax-m3-free", free: true, provider: "opencode", description: "Ligero y eficiente" },
        modelo13: { id: "openai/gpt-oss-120b:free", free: true, provider: "openrouter", description: "Potencia open-source" },
        modelo14: { id: "nvidia/nemotron-3-super-120b-a12b:free", free: true, provider: "openrouter", description: "Alta capacidad de proceso" },
        modelo15: { id: "google/gemma-4-31b-it:free", free: true, provider: "openrouter", description: "Precisión y confiabilidad" },
        modelo16: { id: "z-ai/glm-4.5-air:free", free: true, provider: "openrouter", description: "Arquitectura MoE eficiente" }
      },
      endpoints: {
        chat: "/chat/completions", models: "/models", admin: "/api/admin",
        admin_panel: "/api/admin-panel", check_models: "/api/models-check",
        images: "/images/generations", upload: "/api/upload",
        health: "/api/health/page", playground: "/api/playground",
        competencia: "/api/competencia/page", rotator: "/api/rotator/page",
        visitors: "/api/visitors/page", logs: "/api/logs/page", config: "/api/config/page"
      },
      usage: {
        chat: { method: "POST", body: { model: "modelo1 - modelo16", messages: [{ role: "user", content: "Hello" }] } },
        image_gen: { endpoint: "/images/generations", model: "modelo10", body: { prompt: "a beautiful sunset over mountains" } }
      },
      auth: { note: "No global auth required. Admin panel uses credentials from env vars.", env_vars: ["GITHUB_TOKEN", "OR_KEY1", "OR_KEY2"] }
    });
  }
  res.status(404).json({ error: "Not found" });
}

// ========================================================
// LOGS PAGE
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
// CONFIG PAGE
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
      if (r.ok) { const d = await r.json(); configData = JSON.parse(Buffer.from(d.content, 'base64').toString()); sha = d.sha || ''; }
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

async function handleConfigSave(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const config = JSON.parse(body);
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'config object required' });

    const token = getGithubToken();
    if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

    const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/config.json';
    const getR = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
    if (!getR.ok) return res.status(500).json({ error: 'Error reading config from GitHub' });
    const fileData = await getR.json();
    const sha = fileData.sha;

    const putR = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Update config - ${new Date().toISOString().slice(0,10)}`, content: Buffer.from(JSON.stringify(config, null, 2)).toString('base64'), sha })
    });
    if (putR.ok) { try { fs.writeFileSync('/tmp/proxy-config.json', JSON.stringify(config, null, 2)); } catch(e) {} return res.json({ ok: true }); }
    const errData = await putR.json().catch(() => ({}));
    res.status(500).json({ error: errData.message || 'Error writing to GitHub' });
  } catch(e) { res.status(400).json({ error: 'JSON inválido: ' + e.message }); }
}

// ========================================================
// TELEGRAM WEBHOOK
// ========================================================
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const ALLOWED_CHAT = '7507526979';

function tgReply(chatId, text) {
  return fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

async function fetchHealth() {
  try {
    // Leer health-db de GitHub primero
    const gh = await fetch('https://raw.githubusercontent.com/yeifer125/proxi-datos/main/health-db.json', { signal: AbortSignal.timeout(15000) });
    if (gh.ok) {
      const data = await gh.json();
      // El formato puede ser array (nuevo) u objeto {latencies} (legacy)
      if (Array.isArray(data) && data.length > 0) return data;
      if (data && data.lastCheck) {
        // Legacy format - convertir
        return Object.entries(data.latencies || {}).map(([model, d]) => ({
          model, latency: d.avg || 99999, time: data.lastCheck, status: 'OK'
        }));
      }
    }
  } catch {}
  return [];
}

async function fetchUsageStats() {
  try {
    const gh = await fetch('https://raw.githubusercontent.com/yeifer125/proxi-datos/main/usage-db.json', { signal: AbortSignal.timeout(15000) });
    if (gh.ok) return await gh.json();
  } catch {}
  try { return JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8')); } catch {}
  return { usages: [], stats: {} };
}

async function handleTelegramWebhook(req, res) {
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());

    // Health/diagnóstico
    if (body.diagnose) {
      const tokenOk = (process.env.TELEGRAM_BOT_TOKEN || '').length > 5;
      return res.json({ ok: true, token_set: tokenOk, token_prefix: (process.env.TELEGRAM_BOT_TOKEN || '').substring(0,10) + '...' });
    }

    const msg = body.message || body.edited_message;
    if (!msg || !msg.text) return res.status(200).json({ ok: true });

    const chatId = String(msg.chat.id);
    if (chatId !== ALLOWED_CHAT) return res.status(200).json({ ok: true });

    const text = msg.text.trim();
    const parts = text.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/start': {
        const reply = await tgReply(chatId,
          `<b>🤖 Carbonato Proxy Bot</b>\n\n` +
          `Comandos disponibles:\n\n` +
          `/status — Estado de todos los modelos\n` +
          `/rapidos — Top 5 más rápidos ahora\n` +
          `/stats — Uso del día y totales\n` +
          `/modelos — Lista de los 16 modelos\n` +
          `/ips — Top 10 IPs que más usan\n` +
          `/kernel — Último commit del proxy\n` +
          `/pausar N — Deshabilita modelo (ej: /pausar 7)\n` +
          `/habilitar N — Reactiva modelo\n` +
          `/reset-stats — Reinicia contadores (pide confirmación)\n` +
          `/start — Esta ayuda`
        );
        // Debug: log si tgReply falla
        if (!reply.ok) {
          const errText = await reply.text();
          console.log('[tg] sendMessage error:', reply.status, errText.substring(0,200));
        }
        break;
      }

      case '/status': {
        await tgReply(chatId, '🔄 Probando modelos...');
        try {
          const r = await fetch('https://carbonato-proxy.vercel.app/api/health/check', { signal: AbortSignal.timeout(130000) });
          const data = await r.json();
          if (!data.ok || !data.results) throw new Error('Respuesta inválida');
          const fail = data.results.filter(x => x.status !== 'OK');
          const ok = data.results.filter(x => x.status === 'OK');
          let text = fail.length === 0
            ? '<b>✅ TODOS OK</b>'
            : `<b>⚠️ ${fail.length} caído(s)</b>`;
          text += `\n\n📊 ${ok.length}/${data.results.length} respondiendo\n`;
          if (fail.length > 0) {
            text += `\n⛔ Caídos:\n${fail.map(f => `  • ${f.model} ${f.name}`).join('\n')}\n`;
          }
          text += `\n⏱ ${new Date().toLocaleString('es-CR')}`;
          await tgReply(chatId, text);
        } catch (e) {
          await tgReply(chatId, `❌ Error: ${e.message.slice(0, 100)}`);
        }
        break;
      }

      case '/rapidos': {
        await tgReply(chatId, '🔄 Consultando...');
        try {
          const r = await fetch('https://carbonato-proxy.vercel.app/api/health/check', { signal: AbortSignal.timeout(130000) });
          const data = await r.json();
          if (!data.results) throw new Error('Sin datos');
          const fastest = data.results
            .filter(x => x.status === 'OK')
            .sort((a, b) => (parseInt(a.latency) || 99999) - (parseInt(b.latency) || 99999))
            .slice(0, 5);
          let text = '<b>⚡ Top 5 más rápidos</b>\n\n';
          fastest.forEach((f, i) => {
            text += `${i+1}. ${f.model} ${f.name} — ${f.latency}\n`;
          });
          await tgReply(chatId, text);
        } catch (e) {
          await tgReply(chatId, `❌ Error: ${e.message.slice(0, 100)}`);
        }
        break;
      }

      case '/stats': {
        const db = await fetchUsageStats();
        const s = db.stats || {};
        const u = db.usages || [];
        let totalReq = 0, totalTok = 0;
        Object.values(s).forEach(x => { totalReq += x.totalRequests || 0; totalTok += x.totalTokens || 0; });
        const today = new Date().toISOString().split('T')[0];
        const h = u.filter(x => (x.timestamp || '').startsWith(today));
        await tgReply(chatId,
          `<b>📊 CARBONATO PROXY</b>\n\n` +
          `📆 ${new Date().toLocaleDateString('es-CR', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}\n\n` +
          `📈 <b>Totales:</b>\n  Requests: ${totalReq.toLocaleString()}\n  Tokens: ${totalTok.toLocaleString()}\n\n` +
          `📆 <b>Hoy:</b>\n  Requests: ${h.length}\n  Tokens: ${h.reduce((a,x) => a+(x.tokens||0), 0).toLocaleString()}\n\n` +
          `🟢 ${MODELOS.length} modelos activos`
        );
        break;
      }

      case '/modelos': {
        let text = '<b>📋 Modelos disponibles</b>\n\n';
        MODELOS.forEach(m => {
          text += `${m.icon} <b>${m.id}</b> — ${m.name}\n${' '.repeat(8)}${m.desc}\n`;
        });
        await tgReply(chatId, text.trim());
        break;
      }

      case '/ips': {
        const db = await fetchUsageStats();
        const u = db.usages || [];
        const ipCount = {};
        u.forEach(x => { ipCount[x.ip] = (ipCount[x.ip] || 0) + 1; });
        const top10 = Object.entries(ipCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        if (top10.length === 0) {
          await tgReply(chatId, '📭 Sin datos de IPs aún');
          break;
        }
        let text = '<b>🌐 Top 10 IPs</b>\n\n';
        top10.forEach(([ip, count], i) => {
          text += `${i+1}. <code>${ip}</code> — ${count} req\n`;
        });
        await tgReply(chatId, text);
        break;
      }

      case '/kernel': {
        try {
          const r = await fetch('https://api.github.com/repos/yeifer125/carbonato-proxy/commits?per_page=1', { signal: AbortSignal.timeout(10000) });
          const commits = await r.json();
          if (Array.isArray(commits) && commits.length > 0) {
            const c = commits[0];
            const sha = c.sha.slice(0, 7);
            const msg = c.commit.message.split('\n')[0];
            const date = new Date(c.commit.author.date).toLocaleString('es-CR');
            await tgReply(chatId,
              `<b>🔧 Último commit</b>\n\n` +
              `<code>${sha}</code> ${msg}\n` +
              `📅 ${date}\n` +
              `👤 ${c.commit.author.name}`
            );
          } else {
            await tgReply(chatId, '❌ No se pudo obtener último commit');
          }
        } catch (e) {
          await tgReply(chatId, `❌ Error: ${e.message.slice(0, 100)}`);
        }
        break;
      }

      case '/pausar': {
        const modelNum = parts[1];
        if (!modelNum) { await tgReply(chatId, '❌ Usa: /pausar N (ej: /pausar 7)'); break; }
        const modelId = `modelo${modelNum}`;
        if (!MODEL_IDS.includes(modelId)) { await tgReply(chatId, `❌ ${modelId} no existe`); break; }
        // Guardar en /tmp/proxy-disabled.json
        let disabled = {};
        try { disabled = JSON.parse(fs.readFileSync('/tmp/proxy-disabled.json', 'utf8')); } catch {}
        disabled[modelId] = true;
        fs.writeFileSync('/tmp/proxy-disabled.json', JSON.stringify(disabled));
        await tgReply(chatId, `⏸ ${modelId} deshabilitado (hasta restart del proxy)`);
        break;
      }

      case '/habilitar': {
        const modelNum = parts[1];
        if (!modelNum) { await tgReply(chatId, '❌ Usa: /habilitar N (ej: /habilitar 7)'); break; }
        const modelId = `modelo${modelNum}`;
        let disabled = {};
        try { disabled = JSON.parse(fs.readFileSync('/tmp/proxy-disabled.json', 'utf8')); } catch {}
        delete disabled[modelId];
        fs.writeFileSync('/tmp/proxy-disabled.json', JSON.stringify(disabled));
        await tgReply(chatId, `✅ ${modelId} habilitado`);
        break;
      }

      case '/reset-stats': {
        // Requiere confirmación: si el mensaje original contiene "confirmo" o es el segundo intento
        const isConfirm = text.includes('confirmo') || text.includes('--force');
        if (!isConfirm) {
          await tgReply(chatId,
            `<b>⚠️ Reiniciar estadísticas</b>\n\n` +
            `Esto borrará todos los datos de uso.\n` +
            `Para confirmar escribe:\n<code>/reset-stats confirmo</code>`
          );
          break;
        }
        try {
          const token = getGithubToken();
          if (!token) { await tgReply(chatId, '❌ GITHUB_TOKEN no configurado'); break; }
          const empty = { usages: [], stats: {} };
          // Reset local
          fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(empty));
          // Reset GitHub
          const apiUrl = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json';
          const getR = await fetch(apiUrl, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
          if (getR.ok) {
            const fileData = await getR.json();
            await fetch(apiUrl, {
              method: 'PUT',
              headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: 'Reset stats via Telegram', content: Buffer.from(JSON.stringify(empty)).toString('base64'), sha: fileData.sha })
            });
          }
          await tgReply(chatId, '✅ Estadísticas reiniciadas');
        } catch (e) {
          await tgReply(chatId, `❌ Error: ${e.message.slice(0, 100)}`);
        }
        break;
      }

      default:
        await tgReply(chatId, `❌ Comando desconocido. Usa /start para ayuda.`);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.log('Telegram webhook error:', e.message);
    res.status(200).json({ ok: true });
  }
}

// ========================================================
// SKYNET DASHBOARD — PRIMERA RED DE SKYNET
// ========================================================
async function handleSkynetData(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  try {
    const r = await fetch(proxyBase(req) + '/v1/skynet/data');
    const d = await r.json();
    res.json(d);
  } catch(e) {
    res.json({ error: e.message, models: { total: 16, online: 0, offline: 0, skipped: 0, results: [] }, memory: { blockedCount: 0 } });
  }
}

// ─── SKYNET LOGS PAGE ────────────────────────────────────

function handleSkynetLogsPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  html(res, `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SKYNET LOGS — Carbonato Proxy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#050510;--surface:#0a0a18;--card:rgba(10,10,30,0.7);--cyber:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--red:#ff0044;--green:#00ff88;--text:#c0c0d0;--dim:#444466}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.03) 1px,transparent 1px);background-size:40px 40px;z-index:0;pointer-events:none}
.glow{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0;animation:orb 20s ease-in-out infinite}
.g1{width:600px;height:600px;background:radial-gradient(circle,rgba(123,47,247,0.08),transparent);top:-300px;left:-200px}
.g2{width:500px;height:500px;background:radial-gradient(circle,rgba(0,255,245,0.05),transparent);bottom:-200px;right:-200px;animation-delay:-8s}
@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(50px,-40px) scale(1.1)}66%{transform:translate(-40px,30px) scale(0.9)}}
.container{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:16px}
.header{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:var(--card);border:1px solid rgba(0,255,245,0.15);border-radius:10px;backdrop-filter:blur(16px);margin-bottom:16px;flex-wrap:wrap;gap:8px}
.header .brand{font-size:16px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyber),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:4px}
.header .status{display:flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim)}
.header .status .dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse-dot 1.5s ease-in-out infinite;display:inline-block}
@keyframes pulse-dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
.controls{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}
.controls button{padding:6px 14px;border:1px solid rgba(255,255,255,0.15);border-radius:6px;background:var(--card);color:var(--text);font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;backdrop-filter:blur(8px);transition:all 0.2s}
.controls button:hover{border-color:var(--cyber);color:var(--cyber)}
.controls .count{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim)}
.controls .refresh-btn{background:rgba(0,255,245,0.05);border-color:rgba(0,255,245,0.2);color:var(--cyber)}
.controls .refresh-btn:hover{background:rgba(0,255,245,0.1)}
.controls .clear-btn{border-color:rgba(255,0,68,0.2);color:rgba(255,0,68,0.6)}
.controls .clear-btn:hover{background:rgba(255,0,68,0.1);border-color:var(--red);color:var(--red)}
.controls .limit-select{background:var(--card);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:6px 8px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:9px;outline:none}
table{width:100%;border-collapse:collapse;font-size:10px}
th{text-align:left;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.08);color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px}
td{padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.03);font-family:'JetBrains Mono',monospace;font-size:9px;vertical-align:middle}
tr:hover td{background:rgba(0,255,245,0.02)}
.status-ok{color:var(--green)}
.status-error{color:var(--red)}
.status-404{color:var(--dim)}
.model-tag{color:var(--cyber);background:rgba(0,255,245,0.06);padding:1px 6px;border-radius:3px}
.ip-cell{color:rgba(255,255,255,0.5)}
.timestamp-cell{color:var(--dim);font-size:8px}
.empty-state{padding:40px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim)}
.empty-state .icon{font-size:32px;margin-bottom:8px;opacity:0.3}
@media(max-width:640px){table,thead,tbody,tr,td,th{display:block}th{display:none}td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.04)}}
</style>
</head>
<body>
<div class="glow g1"></div>
<div class="glow g2"></div>
<div class="container">
<div class="header">
  <div class="brand">⟐ SKYNET — REGISTRO DE ACCESOS</div>
  <div class="status">
    <span class="dot"></span>
    <span id="lastUpdate">CARGANDO...</span>
    <a href="/api/skynet/page" class="btn" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none">← SKYNET</a>
  </div>
</div>
<div class="controls">
  <button class="refresh-btn" onclick="cargarLogs()">⟳ REFRESCAR</button>
  <select class="limit-select" id="limit" onchange="cargarLogs()">
    <option value="25">25</option>
    <option value="50" selected>50</option>
    <option value="100">100</option>
    <option value="200">200</option>
  </select>
  <span class="count" id="logCount">— registros</span>
  <span style="flex:1"></span>
  <button class="clear-btn" id="clearBtn" onclick="limpiarLogs()">✕ LIMPIAR</button>
</div>
<div id="tabla"><div class="empty-state"><div class="icon">⟐</div>Cargando registros...</div></div>
<div class="status" style="font-size:9px;font-family:'JetBrains Mono',monospace;color:var(--dim);margin-top:8px" id="statusMsg"></div>
</div>
<script>
async function cargarLogs(){
  const tabla=document.getElementById('tabla');
  const count=document.getElementById('logCount');
  const status=document.getElementById('statusMsg');
  const limit=document.getElementById('limit').value;
  tabla.innerHTML='<div class="empty-state"><div class="icon">⟳</div>Consultando...</div>';
  try{
    const r=await fetch('/v1/skynet/logs?limit='+limit);
    const d=await r.json();
    const logs=d.logs||[];
    if(!logs.length){
      tabla.innerHTML='<div class="empty-state"><div class="icon">∅</div>Sin registros de acceso</div><p style="text-align:center;font-size:9px;color:var(--dim);font-family:JetBrains Mono,monospace">Los accesos a endpoints /v1/skynet/* aparecen aquí automáticamente</p>';
      count.textContent='0 registros';
      status.textContent='';
      return;
    }
    let html='<table><thead><tr><th>TIMESTAMP</th><th>IP</th><th>ENDPOINT</th><th>METHOD</th><th>STATUS</th><th>MODELO</th><th>LATENCIA</th></tr></thead><tbody>';
    logs.forEach(e=>{
      const st=e.status||'ok';
      const stCls=st==='ok'?'status-ok':st==='error'?'status-error':'status-404';
      const icon=st==='ok'?'✓':st==='error'?'✗':'—';
      const model=e.model?'<span class="model-tag">'+e.model+'</span>':'—';
      const lat=e.latency_ms?e.latency_ms+'ms':'—';
      const time=e.timestamp?new Date(e.timestamp).toLocaleString('es-CR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
      html+='<tr><td class="timestamp-cell">'+time+'</td><td class="ip-cell">'+(e.ip||'—')+'</td><td>'+(e.endpoint||'—')+'</td><td>'+(e.method||'—')+'</td><td class="'+stCls+'">'+icon+' '+st+'</td><td>'+model+'</td><td>'+lat+'</td></tr>';
    });
    html+='</tbody></table>';
    tabla.innerHTML=html;
    count.textContent=logs.length+' registros';
    status.textContent='Última actualización: '+new Date().toLocaleString('es-CR');
  }catch(e){
    tabla.innerHTML='<div class="empty-state"><div class="icon">⚠</div>Error al cargar: '+e.message+'</div>';
    status.textContent='';
  }
}
async function limpiarLogs(){
  if(!confirm('¿Limpiar todos los registros de acceso Skynet?')) return;
  try{
    const r=await fetch('/v1/skynet/logs/clear',{method:'POST'});
    const d=await r.json();
    if(d.ok) cargarLogs();
  }catch(e){alert('Error: '+e.message);}
}
cargarLogs();
setInterval(cargarLogs,15000);
</script>
</body>
</html>`);
}

function handleSkynetPage(req, res) {
  if (!cookieOk(req)) return res.status(401).json({ error: 'Auth required' });
  html(res, `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SKYNET — PRIMERA RED</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#050510;--surface:#0a0a18;--card:rgba(10,10,30,0.7);--cyber:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--red:#ff0044;--green:#00ff88;--text:#c0c0d0;--dim:#444466}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.03) 1px,transparent 1px);background-size:40px 40px;z-index:0;pointer-events:none}
.glow{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0;animation:orb 20s ease-in-out infinite}
.g1{width:600px;height:600px;background:radial-gradient(circle,rgba(123,47,247,0.08),transparent);top:-300px;left:-200px}
.g2{width:500px;height:500px;background:radial-gradient(circle,rgba(0,255,245,0.05),transparent);bottom:-200px;right:-200px;animation-delay:-8s}
@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(50px,-40px) scale(1.1)}66%{transform:translate(-40px,30px) scale(0.9)}}
.container{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:16px}
/* HEADER */
.header{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:var(--card);border:1px solid rgba(0,255,245,0.15);border-radius:10px;backdrop-filter:blur(16px);margin-bottom:16px;flex-wrap:wrap;gap:8px}
.header .brand{font-size:16px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyber),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:4px}
.header .status{display:flex;align-items:center;gap:12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim)}
.header .status .dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse-dot 1.5s ease-in-out infinite;display:inline-block}
@keyframes pulse-dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
.header .status .val{color:var(--cyber)}
.header .back-btn{padding:6px 14px;border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:10px;text-decoration:none;transition:all 0.2s}
.header .back-btn:hover{border-color:var(--cyber);color:var(--cyber)}
/* STATS BAR */
.stats-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}
.stat-card{background:var(--card);border:1px solid rgba(0,255,245,0.1);border-radius:8px;padding:12px 16px;backdrop-filter:blur(12px);position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--cyber),transparent);opacity:0.3}
.stat-card .label{font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:2px;margin-bottom:4px}
.stat-card .value{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:#fff;letter-spacing:-1px}
.stat-card .value.cyan{color:var(--cyber)}.stat-card .value.magenta{color:var(--magenta)}.stat-card .value.green{color:var(--green)}.stat-card .value.red{color:var(--red)}
.stat-card .sub{font-size:9px;color:var(--dim);margin-top:2px;font-family:'JetBrains Mono',monospace}
/* LIVE GRID */
.grid-title{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:3px;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.grid-title::before{content:'◆';color:var(--cyber);font-size:8px}
.grid-title .live{color:var(--green);font-size:8px;animation:pulse-dot 1.5s ease-in-out infinite}
.m-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:16px}
.m-card{background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:10px 12px;backdrop-filter:blur(12px);transition:all 0.3s;position:relative;overflow:hidden;cursor:default}
.m-card:hover{border-color:rgba(0,255,245,0.15);transform:translateY(-1px)}
.m-card .mid{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7)}
.m-card .mname{font-size:9px;color:var(--dim);margin-top:1px}
.m-card .lat{font-family:'JetBrains Mono',monospace;font-size:8px;margin-top:4px;display:flex;justify-content:space-between}
.m-card.online{border-left:2px solid var(--green)}.m-card.online .lat{color:rgba(0,255,136,0.5)}
.m-card.offline{border-left:2px solid var(--red);opacity:0.5}.m-card.offline .lat{color:rgba(255,0,68,0.5)}
.m-card.skipped{border-left:2px solid rgba(255,255,255,0.1);opacity:0.3}
.m-card .pulse-bar{position:absolute;bottom:0;left:0;height:2px;background:linear-gradient(90deg,var(--cyber),transparent);animation:pulseLine 2s ease-in-out infinite;opacity:0.4}
@keyframes pulseLine{0%{width:0%}50%{width:100%}100%{width:0%}}
.m-card.online .pulse-bar{background:linear-gradient(90deg,var(--green),transparent)}
.m-card.offline .pulse-bar{background:linear-gradient(90deg,var(--red),transparent);animation:none;width:100%;opacity:0.15}
/* MEMORY */
.section{background:var(--card);border:1px solid rgba(0,255,245,0.08);border-radius:8px;padding:14px 16px;backdrop-filter:blur(12px);margin-bottom:16px}
.section-title{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:2px;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.section-title .count{color:var(--cyber);font-size:10px;background:rgba(0,255,245,0.08);padding:1px 8px;border-radius:4px}
.block-grid{display:flex;flex-wrap:wrap;gap:6px;min-height:20px}
.block-tag{padding:4px 10px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:9px;background:rgba(255,0,68,0.1);border:1px solid rgba(255,0,68,0.2);color:rgba(255,0,68,0.7)}
.no-block{font-size:10px;color:rgba(0,255,136,0.5);font-family:'JetBrains Mono',monospace}
/* LOG FEED */
.log-feed{max-height:200px;overflow-y:auto;font-family:'JetBrains Mono',monospace;font-size:9px;line-height:1.6}
.log-feed::-webkit-scrollbar{width:3px}
.log-feed::-webkit-scrollbar-track{background:transparent}
.log-feed::-webkit-scrollbar-thumb{background:rgba(0,255,245,0.2);border-radius:2px}
.log-entry{display:flex;gap:8px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.02)}
.log-entry .time{color:var(--dim);flex-shrink:0;width:60px}
.log-entry .msg{color:rgba(255,255,255,0.4)}
.log-entry .msg .online{color:var(--green)}.log-entry .msg .offline{color:var(--red)}.log-entry .msg .info{color:var(--cyber)}
/* TERMINAL LINE */
.terminal-line{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.15);text-align:center;padding:16px 0;letter-spacing:2px;display:flex;align-items:center;justify-content:center;gap:8px}
.terminal-line .cursor{display:inline-block;width:8px;height:14px;background:var(--cyber);animation:blink 1s step-end infinite;opacity:0.5}
@keyframes blink{50%{opacity:0}}
@media(max-width:640px){.m-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}.stats-bar{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="glow g1"></div>
<div class="glow g2"></div>
<div class="container">
<!-- HEADER -->
<div class="header">
  <div class="brand">⎈ SKYNET — PRIMERA RED DE IA AUTÓNOMA ⎈</div>
  <div class="status">
    <span class="dot"></span>
    <span id="lastUpdate">INICIALIZANDO...</span>
    <a href="/api/skynet/logs/page" class="back-btn" style="margin-left:4px">⟐ LOGS</a>
    <a href="/api/admin-panel" class="back-btn">← PANEL</a>
  </div>
</div>
<!-- STATS BAR -->
<div class="stats-bar" id="statsBar">
  <div class="stat-card"><div class="label">MODELOS TOTALES</div><div class="value cyan" id="totalMod">—</div><div class="sub">16 configurados</div></div>
  <div class="stat-card"><div class="label">ONLINE</div><div class="value green" id="onlineMod">—</div><div class="sub" id="onlineSub">capacidad activa</div></div>
  <div class="stat-card"><div class="label">OFFLINE / BLOQUEADOS</div><div class="value red" id="offlineMod">—</div><div class="sub" id="blockedSub">0 en memoria</div></div>
  <div class="stat-card"><div class="label">ESCANEO</div><div class="value magenta" id="scanStatus">—</div><div class="sub">último scan</div></div>
</div>
<!-- LIVE MODEL GRID -->
<div class="grid-title">MONITOR DE RED <span class="live">● LIVE</span></div>
<div class="m-grid" id="modelGrid"></div>
<!-- SECTION: MEMORY BLOCKED -->
<div class="section">
  <div class="section-title">MEMORIA <span class="count" id="memCount">0</span></div>
  <div class="block-grid" id="blockGrid"><span class="no-block">Sin bloqueos activos</span></div>
</div>
<!-- SECTION: LOG FEED -->
<div class="section">
  <div class="section-title">REGISTRO DE RED <span style="color:var(--dim);font-size:8px">timepo real</span></div>
  <div class="log-feed" id="logFeed">
    <div class="log-entry"><span class="time">INIT</span><span class="msg"><span class="info">SKYNET v1.0 inicializado</span></span></div>
    <div class="log-entry"><span class="time">WAIT</span><span class="msg">Esperando datos...</span></div>
  </div>
</div>
<!-- TERMINAL -->
<div class="terminal-line">
  <span>PRIMERA RED DE SKYNET — SISTEMA AUTÓNOMO DE IA</span>
  <span class="cursor"></span>
</div>
</div>
<script>
const MODELS = ${JSON.stringify(require('../models-def.js').MODELOS)};

function fmtTime() { return new Date().toLocaleTimeString('es-CR'); }
function fmtLat(ms) { return ms < 1000 ? ms+'ms' : (ms/1000).toFixed(1)+'s'; }

// Normalizar modelo descriptions
const MODEL_MAP = {};
MODELS.forEach(m => { MODEL_MAP[m.id] = m; });

function addLog(time, msg, cls='') {
  const feed = document.getElementById('logFeed');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = '<span class="time">'+time+'</span><span class="msg">'+(cls?'<span class="'+cls+'">':'')+msg+(cls?'</span>':'')+'</span>';
  feed.appendChild(entry);
  feed.scrollTop = feed.scrollHeight;
  // Keep max 50 entries
  while(feed.children.length > 50) feed.removeChild(feed.firstChild);
}

function renderGrid(results) {
  const grid = document.getElementById('modelGrid');
  grid.innerHTML = (results || []).map(r => {
    const m = MODEL_MAP[r.id] || { icon: '🔷', desc: '' };
    let cls = r.status;
    let latHtml = '';
    if (r.status === 'online') latHtml = '<span>⏱ '+fmtLat(r.latency)+'</span><span style="color:rgba(0,255,136,0.6)">✓</span>';
    else if (r.status === 'offline') latHtml = '<span>✗ '+(r.latency ? fmtLat(r.latency) : '')+'</span><span style="color:rgba(255,0,68,0.6)">OFF</span>';
    else latHtml = '<span>—</span><span style="color:rgba(255,255,255,0.2)">⏭</span>';
    return '<div class="m-card '+cls+'">' +
      '<div class="mid">'+m.icon+' '+r.id+'</div>' +
      '<div class="mname">'+(m.desc||'').slice(0,30)+'</div>' +
      '<div class="lat">'+latHtml+'</div>' +
      '<div class="pulse-bar"></div></div>';
  }).join('');
}

function renderBlocked(blocked) {
  const grid = document.getElementById('blockGrid');
  const count = document.getElementById('memCount');
  if (!blocked || blocked.length === 0) {
    grid.innerHTML = '<span class="no-block">Sin bloqueos activos</span>';
    count.textContent = '0';
    return;
  }
  count.textContent = blocked.length;
  grid.innerHTML = blocked.map(b => {
    const rem = Math.ceil(b.remainingMs / 1000);
    return '<span class="block-tag">⛔ '+b.model+' ('+rem+'s)</span>';
  }).join('');
}

function updateStats(models, memory) {
  document.getElementById('totalMod').textContent = models.total || '—';
  document.getElementById('onlineMod').textContent = models.online || '0';
  document.getElementById('offlineMod').textContent = models.offline || '0';
  document.getElementById('blockedSub').textContent = (memory?.blockedCount || 0)+' en memoria';
  
  const pct = models.total > 0 ? Math.round(models.online / models.total * 100) : 0;
  document.getElementById('onlineSub').textContent = pct+'% capacidad activa';
}

async function fetchData() {
  try {
    const r = await fetch('/api/skynet/data');
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    
    const ts = new Date(d.timestamp);
    document.getElementById('lastUpdate').textContent = '● '+ts.toLocaleTimeString('es-CR')+' · '+(d.models?.online||0)+'/'+d.models?.total+' OK';
    document.getElementById('scanStatus').textContent = ts.toLocaleTimeString('es-CR');
    
    updateStats(d.models, d.memory);
    renderGrid(d.models?.results);
    renderBlocked(d.memory?.blocked);
    
    addLog(fmtTime(), 'Escaneo completado: '+d.models?.online+' online, '+d.models?.offline+' offline', 'info');
    
    // Log blocked models
    if (d.memory?.blocked?.length > 0) {
      d.memory.blocked.forEach(b => addLog(fmtTime(), '⛔ '+b.model+' bloqueado '+Math.ceil(b.remainingMs/1000)+'s', 'offline'));
    }
    
    // Log model status changes
    (d.models?.results || []).forEach(r => {
      if (r.status === 'online' && r.latency < 500) addLog(fmtTime(), r.id+' rápido ('+fmtLat(r.latency)+')', 'online');
      if (r.status === 'offline' && r.error) addLog(fmtTime(), '✗ '+r.id+': '+r.error.slice(0,40), 'offline');
    });
    
  } catch(e) {
    document.getElementById('lastUpdate').textContent = '⚠ Error: '+e.message.slice(0,40);
    addLog(fmtTime(), 'Error fetching data: '+e.message.slice(0,50), 'offline');
  }
}

// Initial load
fetchData();
// Auto-refresh every 8 seconds
setInterval(fetchData, 8000);
</script>
</body>
</html>`);
}

module.exports = {
  handleHealthSave, handleHealthCheck, handleHealthPage,
  handleCompetencia, handleCompetenciaPage,
  handlePromptsList, handlePromptsCreate, handlePromptsDelete, handlePromptsPage,
  handleRotatorRank, handleRotatorPage,
  handlePlaygroundPage, handlePlaygroundChat,
  handleVisitorsGeo, handleVisitorsReset, handleUsageReset, handleVisitorsPage,
  handleAdminAuth, handleAdminSave, handleAdminLogout,
  handleUpload, handleModelsCheck, handleDocsIA,
  handleLogsPage, handleConfigPage, handleConfigSave,
  handleTelegramWebhook,
  handleSkynetPage, handleSkynetData,
  handleSkynetLogsPage
};
