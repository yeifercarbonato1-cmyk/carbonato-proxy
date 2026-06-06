const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const DB_PATH = '/tmp';
const GITHUB_OWNER = 'yeifer125';
const GITHUB_REPO = 'proxi-datos';
const GITHUB_PATH = 'health-db.json';
const GITHUB_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

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
const MODELOS = [
  {id:'modelo1',name:'Kilo Auto'},
  {id:'modelo2',name:'Nemotron 3 Super 120B'},
  {id:'modelo3',name:'Laguna M.1'},
  {id:'modelo4',name:'Laguna XS.2'},
  {id:'modelo5',name:'Nemotron Nano Omni 30B'},
  {id:'modelo6',name:'Step-3.7-Flash'},
  {id:'modelo7',name:'Nemotron Nano Omni 30B'},
  {id:'modelo8',name:'OpenRouter'},
  {id:'modelo9',name:'Smart Rotator'},
  {id:'modelo10',name:'Pollinations HD'},
  {id:'modelo11',name:'DeepSeek V4 Flash'},
  {id:'modelo12',name:'MiniMax M3'},
  {id:'modelo13',name:'OpenAI GPT OSS'},
  {id:'modelo14',name:'Nemotron Super 120B'},
  {id:'modelo15',name:'Gemma 4'},
  {id:'modelo16',name:'GLM 4.5 Air MoE'},
];

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
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
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
  });
}

function handleCompetenciaPage(req, res) {
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
const mods = ['modelo1','modelo2','modelo3','modelo4','modelo5','modelo6','modelo7','modelo8','modelo9','modelo10','modelo11','modelo12','modelo13','modelo14','modelo15','modelo16'];
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

function handlePromptsList(req, res) { res.json(loadPrompts()); }
function handlePromptsCreate(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const { name, prompt } = JSON.parse(body);
      if (!name || !prompt) return res.status(400).json({ error: 'name y prompt requeridos' });
      const db = loadPrompts();
      const tpl = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), name, prompt, created: Date.now() };
      db.push(tpl);
      savePrompts(db);
      res.json({ ok: true, tpl });
    } catch(e) { res.status(400).json({ error: 'JSON inválido' }); }
  });
}
function handlePromptsDelete(req, res) {
  const id = req.url.split(/[?&]id=/).pop();
  if (!id) return res.status(400).json({ error: 'id requerido' });
  let db = loadPrompts();
  db = db.filter(t => t.id !== id);
  savePrompts(db);
  res.json({ ok: true });
}

function handlePromptsPage(req, res) {
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
    <option>modelo1</option><option>modelo2</option><option>modelo3</option><option>modelo4</option><option>modelo5</option><option>modelo6</option><option>modelo7</option><option>modelo8</option><option>modelo9</option><option>modelo11</option><option>modelo12</option><option>modelo13</option><option>modelo14</option><option>modelo15</option><option>modelo16</option>
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
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
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
  });
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
