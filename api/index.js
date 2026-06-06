module.exports = async (req, res) => {
  // Serve static video from public/
  if (req.url === '/hero-bg.mp4') {
    const fs = require('fs');
    const p = require('path').join(__dirname, '..', 'public', 'hero-bg.mp4');
    if (fs.existsSync(p)) {
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': fs.statSync(p).size });
      fs.createReadStream(p).pipe(res);
      return;
    }
  }
  const modelos = [
    {icon:'🌟',name:'modelo1',desc:'Modelo estrella — alto rendimiento'},
    {icon:'🌙',name:'modelo2',desc:'Razonamiento profundo — tareas complejas'},
    {icon:'🚀',name:'modelo3',desc:'Equilibrio velocidad y calidad'},
    {icon:'⚡',name:'modelo4',desc:'Máxima velocidad — respuestas instantáneas'},
    {icon:'✨',name:'modelo5',desc:'Visión y texto — multimodal'},
    {icon:'🧠',name:'modelo6',desc:'Razonamiento rápido y preciso'},
    {icon:'💻',name:'modelo7',desc:'Código y procesamiento visual'},
    {icon:'🌐',name:'modelo8',desc:'Acceso multi-proveedor'},
    {icon:'🔄',name:'modelo9',desc:'Failover inteligente — siempre activo'},
    {icon:'💎',name:'modelo10',desc:'Generación de imágenes HD'},
    {icon:'🧬',name:'modelo11',desc:'Tool calling avanzado'},
    {icon:'🔮',name:'modelo12',desc:'Ligero y eficiente'},
    {icon:'🔥',name:'modelo13',desc:'Potencia open-source'},
    {icon:'🌀',name:'modelo14',desc:'Alta capacidad de proceso'},
    {icon:'💫',name:'modelo15',desc:'Precisión y confiabilidad'},
    {icon:'⚗️',name:'modelo16',desc:'Arquitectura MoE eficiente'},
  ];
  const cardsJS = JSON.stringify(modelos);
  return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ CARBONATO PROXY ⎈</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.7);--border:rgba(255,255,255,0.08);--text:rgba(255,255,255,0.85)}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
/* Video background */
.hero-video{position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:0;pointer-events:none;opacity:0.4}
.video-overlay{position:fixed;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(10,10,15,0.85) 0%,rgba(10,10,15,0.6) 50%,rgba(10,10,15,0.9) 100%)}

.glow-orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;animation:orbFloat 20s ease-in-out infinite}
.glow-orb-1{width:400px;height:400px;background:rgba(255,255,255,0.03);top:-100px;left:-100px;animation-delay:0s}
.glow-orb-2{width:300px;height:300px;background:rgba(255,255,255,0.02);bottom:-50px;right:-50px;animation-delay:-7s}
.glow-orb-3{width:250px;height:250px;background:rgba(255,255,255,0.015);top:50%;left:60%;animation-delay:-14s}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-30px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}}
.container{position:relative;z-index:1;max-width:800px;margin:0 auto;padding:24px 16px 60px}
/* HERO compacto */
.hero{text-align:center;padding:40px 16px 24px}
.hero-badge{display:inline-block;padding:4px 14px;border:1px solid rgba(255,255,255,0.6);border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:16px;letter-spacing:2px;text-transform:uppercase;animation:glowPulse 3s ease-in-out infinite}
@keyframes glowPulse{0%,100%{box-shadow:0 0 10px rgba(0,255,245,0.2)}50%{box-shadow:0 0 25px rgba(0,255,245,0.5)}}
.hero h1{font-size:clamp(28px,5vw,48px);font-weight:800;background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.6) 40%,rgba(255,255,255,0.5) 70%,rgba(255,255,255,0.4) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px;margin-bottom:8px;line-height:1.1}
.hero .sub{font-family:'JetBrains Mono',monospace;font-size:clamp(11px,1.5vw,14px);color:rgba(255,255,255,0.35);letter-spacing:4px;margin-bottom:4px}
.hero .version{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:1px}
.hero .version span{color:rgba(255,255,255,0.55)}
/* Descripción */
.desc{font-size:14px;line-height:1.7;color:var(--text);opacity:0.7;text-align:center;margin-bottom:24px;padding:0 12px}
.desc strong{color:rgba(255,255,255,0.6);opacity:1}
/* CAROUSEL - linea unica */
.carousel-wrap{position:relative;margin:0 auto 32px;max-width:600px}
.carousel-viewport{position:relative;overflow:hidden;border-radius:12px;height:100px}
.carousel-track{position:relative;height:100%}
.carousel-slide{position:absolute;inset:0;display:flex;align-items:center;gap:16px;padding:16px 20px;background:var(--card);border:1px solid var(--border);border-radius:12px;backdrop-filter:blur(12px);opacity:0;transform:scale(0.92);transition:all 0.6s cubic-bezier(0.16,1,0.3,1);pointer-events:none}
.carousel-slide.active{opacity:1;transform:scale(1);pointer-events:auto}
.carousel-slide.exit{opacity:0;transform:scale(0.92) translateY(-8px)}
.carousel-slide .icon{font-size:28px;flex-shrink:0}
.carousel-slide .info{flex:1;min-width:0}
.carousel-slide .info h4{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;margin-bottom:2px}
.carousel-slide .info p{font-size:12px;opacity:0.6;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Dots */
.carousel-dots{display:flex;justify-content:center;gap:6px;margin-top:10px;flex-wrap:wrap;padding:0 16px}
.carousel-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.35);border:none;cursor:pointer;transition:all 0.3s;padding:0;flex-shrink:0}
.carousel-dot.active{background:rgba(255,255,255,0.6);box-shadow:0 0 8px rgba(0,255,245,0.4);width:20px;border-radius:3px}
.carousel-dot:hover{background:rgba(255,255,255,0.6)}
/* Controles */
.carousel-controls{display:flex;justify-content:center;gap:12px;margin-top:6px}
.carousel-btn{background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;transition:all 0.2s}
.carousel-btn:hover{background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.6);color:rgba(255,255,255,0.6)}
/* Estado */
.status-bar{display:flex;justify-content:center;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:20px}
.status-bar .num{color:rgba(255,255,255,0.6)}
/* Divider */
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:rgba(255,255,255,0.35);font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:3px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)}
/* Secciones compactas */
.section{margin-bottom:28px}
.section-title{font-size:14px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title::before{content:'◆';font-size:10px;color:rgba(255,255,255,0.5)}
.section p{font-size:13px;line-height:1.6;color:var(--text);opacity:0.7}
/* Endpoint */
.endpoint-display{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin:10px 0;font-family:'JetBrains Mono',monospace;font-size:12px}
.endpoint-display .method{color:rgba(255,255,255,0.55);font-weight:700;flex-shrink:0}
.endpoint-display .url{color:rgba(255,255,255,0.6);word-break:break-all;font-size:11px}
.endpoint-display .copy-hint{margin-left:auto;font-size:9px;color:rgba(255,255,255,0.35);cursor:pointer;padding:2px 6px;border-radius:4px;flex-shrink:0;transition:all 0.2s}
.endpoint-display .copy-hint:hover{background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.6)}
/* Code blocks compactos */
.code-block{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin:8px 0;position:relative;font-size:11px}
.code-block .lang{position:absolute;top:6px;right:8px;font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(255,255,255,0.35);letter-spacing:1px}
.code-block code{display:block;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5;color:rgba(255,255,255,0.55);white-space:pre-wrap;word-break:break-all;margin-top:4px}
.code-block .method{color:rgba(255,255,255,0.5);font-weight:700}
.code-block .url{color:rgba(255,255,255,0.6)}
.code-block .prompt-line{color:rgba(255,255,255,0.35)}
.code-block .string{color:rgba(255,255,255,0.5)}
h3{font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,0.6);margin:16px 0 6px;letter-spacing:1px}
/* CTA */
/* Footer */
.footer{text-align:center;padding:24px 0;border-top:1px solid rgba(255,255,255,0.08);margin-top:32px}
.footer-text{font-size:10px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace;margin:2px 0}
.footer-sub{font-size:9px;color:rgba(255,255,255,0.15);font-family:'JetBrains Mono',monospace;margin:2px 0}
.admin-link{color:rgba(255,255,255,0.25);text-decoration:none;transition:all 0.2s;font-size:11px}
.admin-link:hover{color:rgba(255,255,255,0.6)}
.cursor-blink::after{content:'▋';animation:blink 1s step-end infinite;color:rgba(255,255,255,0.6)}
@keyframes blink{50%{opacity:0}}
.cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:24px 0}
.cta-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;text-decoration:none;transition:all 0.3s;letter-spacing:1px}
.cta-btn:first-child{background:linear-gradient(135deg,rgba(255,255,255,0.6),rgba(255,255,255,0.4));color:#000;border:none}
.cta-btn:first-child:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,255,245,0.3)}
.cta-btn:last-child{border:1px solid var(--border);color:var(--text);background:var(--card);backdrop-filter:blur(12px)}
.cta-btn:last-child:hover{border-color:rgba(255,255,255,0.6);color:rgba(255,255,255,0.6);background:rgba(0,255,245,0.04)}
.stat-pulse{display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.55);margin-right:4px;animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
@media(max-width:640px){.container{padding:16px 12px 40px}.hero{padding:24px 12px 16px}.carousel-wrap{max-width:100%}.carousel-viewport{height:90px}.carousel-slide{gap:12px;padding:12px 16px}}
/* COMPETENCIA */
.comp-wrap{max-width:600px;margin:24px auto 0;padding:16px 20px;background:var(--card);border:1px solid var(--border);border-radius:12px;backdrop-filter:blur(12px)}
.comp-label{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:4px;display:block}
.comp-selects{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.comp-select{flex:1;min-width:100px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.8);outline:none}
.comp-select:focus{border-color:rgba(255,255,255,0.3)}
.comp-select option{background:#0a0a0f;color:rgba(255,255,255,0.8)}
.comp-textarea{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:10px 12px;font-family:'Inter',sans-serif;font-size:13px;color:rgba(255,255,255,0.85);resize:vertical;min-height:60px;outline:none;box-sizing:border-box}
.comp-textarea:focus{border-color:rgba(255,255,255,0.3)}
.comp-btn{display:block;width:100%;padding:10px;margin-top:10px;border:none;border-radius:6px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s;letter-spacing:1px}
.comp-btn:hover{background:rgba(255,255,255,0.2)}
.comp-btn:disabled{opacity:0.3;cursor:not-allowed}
.comp-status{text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);margin-top:8px;min-height:18px}
.comp-results{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.comp-card{border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 14px;background:rgba(255,255,255,0.02)}
.comp-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.comp-card-model{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6)}
.comp-card-latency{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,0.3)}
.comp-card-badge{font-size:9px;padding:1px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace}
.comp-card-badge-1{background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.9)}
.comp-card-badge-2{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6)}
.comp-card-badge-3{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.4)}
.comp-card-content{font-size:13px;line-height:1.5;color:rgba(255,255,255,0.75);max-height:200px;overflow-y:auto;word-break:break-word}
.comp-card-error{font-size:11px;color:rgba(255,255,255,0.3);font-style:italic}
.comp-card-fastest{border-color:rgba(255,255,255,0.25)}
</style>
</head>
<body>
<video class="hero-video" autoplay muted loop playsinline poster="/hero-bg.jpg">
  <source src="/hero-bg.mp4" type="video/mp4">
</video>
<div class="video-overlay"></div>
<div class="glow-orb glow-orb-1"></div>
<div class="glow-orb glow-orb-2"></div>
<div class="glow-orb glow-orb-3"></div>
<div class="container">

<div class="hero">
  <div class="hero-badge">⚡ v6.0 — Multi-Provider Gateway</div>
  <h1>CARBONATO<br>PROXY</h1>
  <div class="sub">⎈ AI GATEWAY UNIFIED ⎈</div>
  <div class="version"><span>●</span> 16 modelos <span>●</span></div>
</div>

<p class="desc">
  Gateway unificado para <strong>16 modelos de IA</strong> desde una <strong style="color:rgba(255,255,255,0.5)">sola URL</strong> compatible con OpenAI.
  <span class="cursor-blink"></span>
</p>

<!-- CAROUSEL -->
<div class="carousel-wrap">
  <div class="carousel-viewport" id="viewport">
    <div class="carousel-track" id="track"></div>
  </div>
  <div class="carousel-dots" id="dots"></div>
  <div class="carousel-controls">
    <button class="carousel-btn" id="prevBtn">◀ Anterior</button>
    <button class="carousel-btn" id="nextBtn">Siguiente ▶</button>
  </div>
</div>

<div class="divider">ENDPOINT</div>

<div class="section">
  <div class="endpoint-display">
    <span class="method">POST</span>
    <span class="url">https://carbonato-proxy.vercel.app/chat/completions</span>
    <span class="copy-hint" onclick="navigator.clipboard.writeText('https://carbonato-proxy.vercel.app/chat/completions')">📋</span>
  </div>

  <h3>⟫ Conversación</h3>
  <div class="code-block"><span class="lang">BASH</span><code>
<span class="prompt-line">curl -s -X POST https://carbonato-proxy.vercel.app/chat/completions \\</span>
  -H <span class="string">"Content-Type: application/json"</span> \\<br>  -d '{<span class="string">"model"</span>:<span class="string">"modelo1"</span>,<span class="string">"messages"</span>:[{<span class="string">"role"</span>:<span class="string">"user"</span>,<span class="string">"content"</span>:<span class="string">"Hola"</span>}]}'
  </code></div>

  <h3>⟫ Streaming</h3>
  <div class="code-block"><span class="lang">BASH</span><code>
<span class="prompt-line">curl -s -N -X POST https://carbonato-proxy.vercel.app/chat/completions \\</span>
  -H <span class="string">"Content-Type: application/json"</span> \\<br>  -d '{<span class="string">"model"</span>:<span class="string">"modelo1"</span>,<span class="string">"stream"</span>:<span class="string" style="color:rgba(255,255,255,0.6)">true</span>,<span class="string">"messages"</span>:[{<span class="string">"role"</span>:<span class="string">"user"</span>,<span class="string">"content"</span>:<span class="string">"Cuento"</span>}]}'
  </code></div>

  <h3>⟫ Modelos disponibles</h3>
  <div class="code-block"><span class="lang">HTTP</span><code><span class="method">GET</span> <span class="url">https://carbonato-proxy.vercel.app/models</span></code></div>
</div>

<div class="divider">COMPETENCIA</div>

<div class="comp-wrap">
  <label class="comp-label">SELECCIONAR 3 MODELOS</label>
  <div class="comp-selects">
    <select class="comp-select" id="comp1"></select>
    <select class="comp-select" id="comp2"></select>
    <select class="comp-select" id="comp3"></select>
  </div>
  <label class="comp-label">PROMPT</label>
  <textarea class="comp-textarea" id="compPrompt" placeholder="Escribe tu prompt aquí..."></textarea>
  <button class="comp-btn" id="compBtn">⟫ COMPETIR ⟪</button>
  <div class="comp-status" id="compStatus"></div>
  <div class="comp-results" id="compResults"></div>
</div>
<div class="cta-row">
  <a href="/api/playground" class="cta-btn cta-playground">⟫ CHAT IA ⟪</a>
</div>

<div class="footer">
  <p class="footer-text">CARBONATO PROXY · Cofrad.IA · 16 modelos · <a href="/api/admin" class="admin-link">⚙</a></p>
  <p class="footer-sub">100% código libre</p>
</div>

</div>

<script>
const modelos = ${cardsJS};
let current = 0;
let autoplay = null;
const INTERVALO = 3000; // 3s

const track = document.getElementById('track');
const dotsEl = document.getElementById('dots');

function renderSlide(i, className) {
  const m = modelos[i];
  return \`<div class="carousel-slide \${className}">
    <span class="icon">\${m.icon}</span>
    <div class="info">
      <h4>\${m.name}</h4>
      <p>\${m.desc}</p>
    </div>
  </div>\`;
}

function render() {
  // Always render 3 slides: prev, current, next for smooth transitions
  const prev = (current - 1 + modelos.length) % modelos.length;
  const next = (current + 1) % modelos.length;
  track.innerHTML = renderSlide(prev, 'exit') + renderSlide(current, 'active') + renderSlide(next, '');
  
  // Update dots
  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === current);
  });
}

function goTo(idx) {
  if (idx === current) return;
  current = idx;
  render();
  resetAutoplay();
}

function goNext() {
  current = (current + 1) % modelos.length;
  render();
  resetAutoplay();
}

function goPrev() {
  current = (current - 1 + modelos.length) % modelos.length;
  render();
  resetAutoplay();
}

function resetAutoplay() {
  if (autoplay) clearInterval(autoplay);
  autoplay = setInterval(goNext, INTERVALO);
}

// Build dots
for (let i = 0; i < modelos.length; i++) {
  const dot = document.createElement('button');
  dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
  dot.onclick = () => goTo(i);
  dotsEl.appendChild(dot);
}

// Initial render
render();

// Autoplay start
autoplay = setInterval(goNext, INTERVALO);

// Controls
document.getElementById('prevBtn').onclick = goPrev;
document.getElementById('nextBtn').onclick = goNext;

// Pause on hover
document.querySelector('.carousel-wrap').addEventListener('mouseenter', () => {
  if (autoplay) clearInterval(autoplay);
  autoplay = null;
});
document.querySelector('.carousel-wrap').addEventListener('mouseleave', () => {
  if (!autoplay) autoplay = setInterval(goNext, INTERVALO);
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') goPrev();
  if (e.key === 'ArrowRight') goNext();
});

// === COMPETENCIA ===
function fillSelects() {
  for (let i = 1; i <= 3; i++) {
    const sel = document.getElementById('comp' + i);
    if (!sel) return;
    sel.innerHTML = modelos.map((m, j) => '<option value="' + j + '">' + m.icon + ' ' + m.name + ' — ' + m.desc + '</option>').join('');
    sel.selectedIndex = i - 1;
  }
}
fillSelects();

document.getElementById('compBtn').onclick = async function() {
  const btn = this;
  const status = document.getElementById('compStatus');
  const results = document.getElementById('compResults');
  const prompt = document.getElementById('compPrompt').value.trim();
  if (!prompt) { status.textContent = '✗ Escribe un prompt'; return; }
  
  const idxs = [1,2,3].map(i => parseInt(document.getElementById('comp' + i).value));
  const models = idxs.map(i => modelos[i].name);
  
  btn.disabled = true;
  btn.textContent = '⟫ COMPITIENDO... ⟪';
  status.textContent = 'Enviando a ' + models.join(', ') + '...';
  results.innerHTML = '';
  
  const promises = models.map(async (model) => {
    const t0 = performance.now();
    try {
      const r = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model, messages: [{role:'user',content:prompt}]})
      });
      const t1 = performance.now();
      const latency = (t1 - t0).toFixed(0);
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        return {model, latency, error: r.status + ' ' + errText.slice(0,100)};
      }
      const data = await r.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || JSON.stringify(data).slice(0,200);
      return {model, latency, content, tokens: data.usage?.total_tokens || 0};
    } catch(e) {
      return {model, latency: '-', error: e.message};
    }
  });
  
  const compResults = await Promise.all(promises);
  
  // Sort by latency (fastest first)
  const sorted = [...compResults].sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return (parseInt(a.latency) || 99999) - (parseInt(b.latency) || 99999);
  });
  
  const labels = ['#1 MÁS RÁPIDO', '#2', '#3'];
  const badgeCls = ['comp-card-badge-1 comp-card-fastest', 'comp-card-badge-2', 'comp-card-badge-3'];
  
  results.innerHTML = sorted.map((r, i) => {
    const m = modelos.find(m => m.name === r.model) || {icon:'⚡',name:r.model};
    const fastestCls = i === 0 ? ' comp-card-fastest' : '';
    return '<div class="comp-card' + fastestCls + '">' +
      '<div class="comp-card-head">' +
        '<span class="comp-card-model">' + m.icon + ' ' + r.model + '</span>' +
        '<span class="comp-card-badge ' + badgeCls[i] + '">' + labels[i] + '</span>' +
      '</div>' +
      '<div class="comp-card-head" style="margin-bottom:8px">' +
        '<span class="comp-card-latency">⏱ ' + (r.error ? '-' : r.latency + 'ms') + (r.tokens ? '  · ' + r.tokens + ' tokens' : '') + '</span>' +
      '</div>' +
      (r.error ? '<div class="comp-card-error">✗ ' + r.error + '</div>' : '<div class="comp-card-content">' + r.content.slice(0,500) + '</div>') +
    '</div>';
  }).join('');
  
  status.textContent = '✅ Competencia completa — ' + sorted.length + ' resultados';
  btn.disabled = false;
  btn.textContent = '⟫ COMPETIR ⟪';
};

// Enter key to start
document.getElementById('compPrompt').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('compBtn').click();
  }
});

</script>
</body>
</html>`);
};
