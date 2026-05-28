const fs = require('fs');

// DB functions - lee desde /tmp o GitHub
async function loadDB() {
  try { return JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8')); } catch(e) {}
  try {
    const res = await fetch('https://api.github.com/repos/yeifer125/proxi-datos/contents/usage-db.json');
    if (res.ok) {
      const data = await res.json();
      const db = JSON.parse(Buffer.from(data.content, 'base64').toString());
      if (db) {
        try { fs.writeFileSync('/tmp/usage-db.json', JSON.stringify(db)); } catch(e) {}
        return db;
      }
    }
  } catch(e) {}
  return { usages: [], stats: {} };
}

module.exports = async (req, res) => {
  const cookies = req.headers.cookie || '';
  if (!cookies.includes('admin_sess=ok')) {
    return res.writeHead(302, { 'Location': '/api/admin' }).end();
  }

  const userIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Desconocida').split(',')[0].trim();

  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync('/home/fsociety/tmp/api/config.json', 'utf8')); } catch(e) {}
  if (!cfg || Object.keys(cfg).length === 0) {
    try { cfg = JSON.parse(fs.readFileSync('/tmp/proxy-config.json', 'utf8')); } catch(e) {}
  }
 const def = {
      modelo1: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "openrouter/owl-alpha", key: "", system_prompt: "" },
      modelo2: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "poolside/laguna-xs.2-20260421:free", key: "", system_prompt: "" },
      modelo3: { url: "https://api.kilo.ai/api/gateway/chat/completions", model: "nvidia/nemotron-3-super-120b-a12b:free", key: "", system_prompt: "" },
      modelo4: { url: "https://api.zydit.in/v1/chat/completions", model: "meta/llama-3.2-11b-vision-instruct", key: "zyd_live_mCWYk5_LnIoDSrt1Ac-jwpjnlz3SI85--FrKjg0RFRk", system_prompt: "Eres un modelo de visión. Analiza las imágenes que te envíen y describe todo lo que ves con detalle en español." },
      modelo5: { url: "https://image.pollinations.ai/prompt/", model: "pollinations-image", key: "", system_prompt: "" },
      modelo6: { url: "https://api.zydit.in/v1/chat/completions", model: "moonshotai/kimi-k2.6", key: "", system_prompt: "" },
      modelo7: { url: "https://api.zydit.in/v1/chat/completions", model: "openai/gpt-oss-120b", key: "", system_prompt: "" },
      modelo8: { url: "https://api.zydit.in/v1/chat/completions", model: "qwen/qwen3.5-397b-a17b", key: "", system_prompt: "" },
      modelo9: { url: "https://api.zydit.in/v4/chat/completions", model: "gemini-2.5-flash", key: "zyd_live_mCWYk5_LnIoDSrt1Ac-jwpjnlz3SI85--FrKjg0RFRk", system_prompt: "Eres un modelo de visión. Analiza las imágenes que te envíen y describe todo lo que ves con detalle en español." }
    };
if (!cfg || Object.keys(cfg).length === 0) cfg = def;

  const db = loadDB();
  const stats = db.stats || {};
  const usages = db.usages || [];

  let cards = '';
  const colors = ['#ffd700','#ff69b4','#00d4ff','#9400d3','#ff4500','#00ff7f','#ff1493','#00ced1','#ba55d3'];
  for (let i = 1; i <= 9; i++) {
    const name = 'modelo' + i;
    const c = cfg[name] || def[name];
    const s = stats[name] || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    cards += `<div class="card" style="border-color:${colors[i-1]}"><h3 style="color:${colors[i-1]}">[ ${name} ]</h3><label>BASE URL</label><input id="url${i}" value="${c.url||''}"><label>MODEL ID</label><input id="id${i}" value="${c.model||''}"><label>API KEY</label><input id="key${i}" value="${c.key||''}"><label>SYSTEM PROMPT</label><textarea id="sp${i}" rows="3">${c.system_prompt||''}</textarea><div class="stats-mini"><span>📊 ${s.totalRequests} req</span><span>🔢 ${s.totalTokens.toLocaleString()} tokens</span><span>🌐 ${s.uniqueIPs.length} IPs</span></div><button class="btn-test" onclick="test('${name}',${i})">[ PROBAR ]</button><div id="r${i}" class="result"></div></div>`;
  }

  const recentUsages = usages.slice(-20).reverse();
  let usageRows = '';
  recentUsages.forEach(u => {
    const time = new Date(u.timestamp).toLocaleString();
    usageRows += `<tr><td>${u.model}</td><td>${u.ip}</td><td>${u.tokens}</td><td>${time}</td></tr>`;
  });

  let statsCards = '';
  for (let i = 1; i <= 9; i++) {
    const name = 'modelo' + i;
    const s = stats[name] || { totalTokens: 0, totalRequests: 0, uniqueIPs: [] };
    const ipsList = s.uniqueIPs.slice(0,5).join(', ');
    statsCards += `<div class="stat-card"><h4 style="color:${colors[i-1]}">${name}</h4><div class="stat-row"><span>Tokens</span><span class="val">${s.totalTokens.toLocaleString()}</span></div><div class="stat-row"><span>Requests</span><span class="val">${s.totalRequests}</span></div><div class="stat-row"><span>IPs</span><span class="val">${s.uniqueIPs.length}</span></div><div class="stat-row"><span>IPs list</span><span class="val ips">${ipsList||'-'}</span></div></div>`;
  }

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>🌟 ADMIN CASTLE 🌟</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:'Press Start 2P',monospace;
  background:#5c94fc;
  color:#fff;
  min-height:100vh;
  padding:20px;
  image-rendering:pixelated;
  background-image:
    radial-gradient(circle at 10% 20%, #fff 2px, transparent 3px),
    radial-gradient(circle at 90% 80%, #fff 2px, transparent 3px),
    linear-gradient(180deg, #5c94fc 0%, #87ceeb 40%, #228b22 40%, #228b22 100%);
  background-size: 200px 200px, 300px 300px, 100% 100%;
}
.clouds{
  position:absolute;
  width:100%;
  height:150px;
  top:10px;
  z-index:0;
}
.cloud{
  position:absolute;
  background:#fff;
  border-radius:50%;
  opacity:0.9;
}
.cloud1{width:100px;height:40px;top:20px;left:10%;border-radius:50% 50% 0 0}
.cloud2{width:80px;height:35px;top:40px;left:25%;}
.cloud3{width:120px;height:45px;top:10px;left:40%;}
.cloud4{width:90px;height:38px;top:30px;left:60%;}
.cloud5{width:110px;height:42px;top:15px;left:75%;}
.ground{
  position:fixed;
  bottom:0;
  left:0;
  right:0;
  height:60px;
  background:#8b4513;
  border-top:4px solid #d2691e;
  z-index:0;
}
.header{position:relative;z-index:1;text-align:center;margin-bottom:20px;padding:20px;border:3px double #ffd700;background:#8b451380}
h1{font-size:14px;color:#ffd700;text-shadow:3px 3px 0 #b8860b;letter-spacing:4px}
.sub{font-size:6px;color:#fff;margin-top:8px;text-shadow:1px 1px 0 #000}
.info-bar{position:relative;z-index:1;display:flex;justify-content:space-between;padding:10px 15px;background:#8b4513;border:2px solid #d2691e;margin-bottom:20px;font-size:6px;color:#ffd700}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;position:relative;z-index:1}
.card{background:#8b4513cc;border:3px solid #d2691e;padding:20px;box-shadow:5px 5px 0 #5d2906}
.card::before{content:"🧱";position:absolute;top:-15px;left:10px;background:#8b4513;padding:0 8px;font-size:12px}
h3{font-size:9px;margin-bottom:15px}
label{display:block;font-size:6px;color:#ffd700;margin:8px 0 4px;text-shadow:1px 1px 0 #000}
input,textarea{width:100%;padding:8px;background:#000;border:2px solid #d2691e;color:#ffd700;font-family:'Press Start 2P',monospace;font-size:7px;outline:none}
textarea{resize:vertical;min-height:50px}
.stats-mini{display:flex;gap:10px;margin-top:8px;font-size:5px;color:#ffd700;flex-wrap:wrap}
.btn-test{width:100%;padding:8px;background:#8b4513;border:2px solid #ffd700;color:#ffd700;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;margin-top:10px}
.btn-test:hover{background:#ffd700;color:#000}
.result{margin-top:8px;padding:8px;font-size:6px;word-break:break-all;display:none}
.result.ok{display:block;background:#8b4513;border:1px solid #ffd700;color:#ffd700}
.result.err{display:block;background:#2a0a0a;border:1px solid #ff4444;color:#ff4444}
.save-btn{position:relative;z-index:1;display:block;width:100%;max-width:400px;margin:30px auto;padding:14px;background:#ffd700;border:4px solid #8b4513;color:#8b4513;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;text-shadow:1px 1px 0 #fff;box-shadow:6px 6px 0 #5d2906}
.save-btn:hover{background:#8b4513;color:#ffd700;box-shadow:0 0 15px #ffd700}
.logout{position:fixed;top:15px;right:15px;z-index:10;padding:8px 12px;background:#8b4513;border:2px solid #ff4444;color:#ff4444;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;text-decoration:none}
.logout:hover{background:#ff4444;color:#fff}
#status{position:relative;z-index:1;text-align:center;margin-top:15px;font-size:7px;min-height:20px}
.ok-msg{color:#00ff00}
.footer{position:relative;z-index:1;text-align:center;margin-top:30px;padding:15px;font-size:6px;color:#ffd700;border-top:1px solid #d2691e}
.stats-section{position:relative;z-index:1;margin-top:30px}
.stats-section h2{font-size:10px;color:#ffd700;margin-bottom:15px;text-shadow:1px 1px 0 #000}
.stat-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}
.stat-card{background:#8b4513cc;border:2px solid #d2691e;padding:15px;box-shadow:3px 3px 0 #5d2906}
.stat-card h4{font-size:8px;margin-bottom:10px}
.stat-row{display:flex;justify-content:space-between;font-size:6px;padding:5px 0;border-bottom:1px solid #000}
.stat-row span{color:#ffd700}
.stat-row .val{color:#00ff00}
.stat-row .ips{font-size:5px;color:#00d4ff;word-break:break-all}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{border:2px solid #d2691e;padding:8px;font-size:6px;text-align:left}
th{background:#8b4513;color:#ffd700}
td{color:#ffd700}
</style></head><body>
<div class="clouds">
  <div class="cloud cloud1"></div>
  <div class="cloud cloud2"></div>
  <div class="cloud cloud3"></div>
  <div class="cloud cloud4"></div>
  <div class="cloud cloud5"></div>
</div>
<div class="ground"></div>
<a href="/api/admin-logout" class="logout">[ SALIR CASTLE ]</a>
<div class="header"><h1>🌟 ADMIN CASTLE 🌟</h1><div class="sub">/// MUSHROOM KINGDOM CONTROL /// v4.20</div></div>
<div class="info-bar"><span>📡 TU IP: ${userIp}</span><span>🕐 ${new Date().toLocaleString()}</span></div>
<div class="cards">${cards}</div>
<button class="save-btn" onclick="save()">[ GUARDAR CAMBIOS ]</button>
<div id="status"></div>
<div class="stats-section"><h2>📊 ESTADISTICAS</h2><div class="stat-cards">${statsCards}</div></div>
<div class="stats-section"><h2>📋 USO RECIENTE</h2><table><tr><th>Modelo</th><th>IP</th><th>Tokens</th><th>Fecha</th></tr>${usageRows||'<tr><td colspan="4" style="text-align:center">Sin datos</td></tr>'}</table></div>
<div class="footer">CARBONATO NET // MUSHROOM KINGDOM // 100% CODIGO LIBRE</div>
<script>
function test(m,n){
var d=document.getElementById('r'+n);
d.className='result';
d.style.display='block';
d.textContent='PROBANDO...';
var h={'Content-Type':'application/json'};
var msgs=[];
var sp=document.getElementById('sp'+n).value;
if(sp)msgs.push({role:'system',content:sp});
msgs.push({role:'user',content:'Responde solo OK'});
fetch('/chat/completions',{method:'POST',headers:h,body:JSON.stringify({model:m,messages:msgs})})
.then(r=>r.text())
.then(x=>{
try{var js=JSON.parse(x);
if(js.error){d.className='result err';d.textContent=JSON.stringify(js.error,null,2)}
else{var cont=js.choices?.[0]?.message?.content||JSON.stringify(js,null,2);d.className='result ok';d.textContent=cont.substring(0,500)}
}catch(e){d.className='result ok';d.textContent=x.substring(0,500)}
})
.catch(e=>{d.className='result err';d.textContent='Error: '+e.message})}
function save(){
var c={};
for(var i=1;i<=9;i++){
c['modelo'+i]={url:document.getElementById('url'+i).value,model:document.getElementById('id'+i).value,key:document.getElementById('key'+i).value,system_prompt:document.getElementById('sp'+i).value}
}
fetch('/api/admin-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)})
.then(r=>r.json())
.then(x=>{
document.getElementById('status').innerHTML=x.success?'<span class="ok-msg">GUARDADO EN EL CASTILLO</span>':'<span style="color:#ff4444">ERROR</span>';
setTimeout(()=>document.getElementById('status').innerHTML='',3000)
})}
</script></body></html>`);
};