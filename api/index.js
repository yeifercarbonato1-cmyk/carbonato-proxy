module.exports = async (req, res) => {
  const modelos = [
    {icon:'🌟',name:'modelo1',desc:'Auto-selection Kilo.ai — mejor modelo disponible',tag:'KILO',cls:'tag-kilo'},
    {icon:'🌙',name:'modelo2',desc:'Nemotron 3 Super 120B — razonamiento pesado',tag:'KILO',cls:'tag-kilo'},
    {icon:'🚀',name:'modelo3',desc:'Laguna M.1 — equilibrio velocidad/calidad',tag:'KILO',cls:'tag-kilo'},
    {icon:'⚡',name:'modelo4',desc:'Laguna XS.2 — velocidad relámpago',tag:'KILO',cls:'tag-kilo'},
    {icon:'✨',name:'modelo5',desc:'Nemotron Nano Omni 30B — visión + texto multimodal',tag:'KILO',cls:'tag-kilo'},
    {icon:'🧠',name:'modelo6',desc:'Step-3.7-Flash — razonamiento rápido',tag:'KILO',cls:'tag-kilo'},
    {icon:'💻',name:'modelo7',desc:'Nemotron Nano Omni 30B — código y visión',tag:'KILO',cls:'tag-kilo'},
    {icon:'🌐',name:'modelo8',desc:'OpenRouter — acceso multi-modelo',tag:'OPENROUTER',cls:'tag-openrouter'},
    {icon:'🔄',name:'modelo9',desc:'Smart Rotator auto-failover 15 modelos',tag:'ROTATOR',cls:'tag-rotator'},
    {icon:'💎',name:'modelo10',desc:'Pollinations HD — imágenes ilimitadas',tag:'POLLINATIONS',cls:'tag-pollinations'},
    {icon:'🧬',name:'modelo11',desc:'DeepSeek V4 Flash — tool calling avanzado',tag:'ZEN',cls:'tag-zen'},
    {icon:'🔮',name:'modelo12',desc:'MiniMax M3 — ligero y rápido',tag:'ZEN',cls:'tag-zen'},
    {icon:'🔥',name:'modelo13',desc:'OpenAI GPT OSS 120B — potencia open-source',tag:'OPENROUTER',cls:'tag-openrouter'},
    {icon:'🌀',name:'modelo14',desc:'Nemotron Super 120B — segunda ruta',tag:'OPENROUTER',cls:'tag-openrouter'},
    {icon:'💫',name:'modelo15',desc:'Gemma 4 31B — Google precisión',tag:'OPENROUTER',cls:'tag-openrouter'},
    {icon:'⚗️',name:'modelo16',desc:'GLM 4.5 Air MoE — Z.ai arquitectura MoE',tag:'OPENROUTER',cls:'tag-openrouter'},
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
:root{--bg:#0a0a0f;--surface:#12121a;--card:rgba(18,18,30,0.7);--border:rgba(0,255,255,0.15);--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--gold:#ffd700;--text:#e0e0e0;--dim:#6666aa}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.03) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none}
.glow-orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;animation:orbFloat 20s ease-in-out infinite}
.glow-orb-1{width:400px;height:400px;background:rgba(123,47,247,0.15);top:-100px;left:-100px;animation-delay:0s}
.glow-orb-2{width:300px;height:300px;background:rgba(0,255,245,0.1);bottom:-50px;right:-50px;animation-delay:-7s}
.glow-orb-3{width:250px;height:250px;background:rgba(255,0,230,0.08);top:50%;left:60%;animation-delay:-14s}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-30px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}}
.container{position:relative;z-index:1;max-width:800px;margin:0 auto;padding:24px 16px 60px}
/* HERO compacto */
.hero{text-align:center;padding:40px 16px 24px}
.hero-badge{display:inline-block;padding:4px 14px;border:1px solid var(--cyan);border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--cyan);margin-bottom:16px;letter-spacing:2px;text-transform:uppercase;animation:glowPulse 3s ease-in-out infinite}
@keyframes glowPulse{0%,100%{box-shadow:0 0 10px rgba(0,255,245,0.2)}50%{box-shadow:0 0 25px rgba(0,255,245,0.5)}}
.hero h1{font-size:clamp(28px,5vw,48px);font-weight:800;background:linear-gradient(135deg,#fff 0%,var(--cyan) 40%,var(--magenta) 70%,var(--purple) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px;margin-bottom:8px;line-height:1.1}
.hero .sub{font-family:'JetBrains Mono',monospace;font-size:clamp(11px,1.5vw,14px);color:var(--dim);letter-spacing:4px;margin-bottom:4px}
.hero .version{font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:1px}
.hero .version span{color:var(--green)}
/* Descripción */
.desc{font-size:14px;line-height:1.7;color:var(--text);opacity:0.7;text-align:center;margin-bottom:24px;padding:0 12px}
.desc strong{color:var(--cyan);opacity:1}
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
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;margin-top:2px}
.tag-kilo{background:rgba(0,255,245,0.1);color:var(--cyan);border:1px solid rgba(0,255,245,0.2)}
.tag-pollinations{background:rgba(255,215,0,0.1);color:var(--gold);border:1px solid rgba(255,215,0,0.2)}
.tag-openrouter{background:rgba(123,47,247,0.15);color:var(--purple);border:1px solid rgba(123,47,247,0.3)}
.tag-zen{background:rgba(255,0,230,0.1);color:var(--magenta);border:1px solid rgba(255,0,230,0.2)}
.tag-rotator{background:rgba(0,255,245,0.15);color:var(--cyan);border:1px solid rgba(0,255,245,0.3)}
/* Dots */
.carousel-dots{display:flex;justify-content:center;gap:6px;margin-top:10px;flex-wrap:wrap;padding:0 16px}
.carousel-dot{width:6px;height:6px;border-radius:50%;background:var(--dim);border:none;cursor:pointer;transition:all 0.3s;padding:0;flex-shrink:0}
.carousel-dot.active{background:var(--cyan);box-shadow:0 0 8px rgba(0,255,245,0.4);width:20px;border-radius:3px}
.carousel-dot:hover{background:var(--cyan)}
/* Controles */
.carousel-controls{display:flex;justify-content:center;gap:12px;margin-top:6px}
.carousel-btn{background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;transition:all 0.2s}
.carousel-btn:hover{background:rgba(0,255,245,0.1);border-color:var(--cyan);color:var(--cyan)}
/* Estado */
.status-bar{display:flex;justify-content:center;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:20px}
.status-bar .num{color:var(--cyan)}
/* Divider */
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--dim);font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:3px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),transparent)}
/* Secciones compactas */
.section{margin-bottom:28px}
.section-title{font-size:14px;font-weight:700;color:var(--cyan);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title::before{content:'◆';font-size:10px;color:var(--magenta)}
.section p{font-size:13px;line-height:1.6;color:var(--text);opacity:0.7}
/* Endpoint */
.endpoint-display{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin:10px 0;font-family:'JetBrains Mono',monospace;font-size:12px}
.endpoint-display .method{color:var(--green);font-weight:700;flex-shrink:0}
.endpoint-display .url{color:var(--cyan);word-break:break-all;font-size:11px}
.endpoint-display .copy-hint{margin-left:auto;font-size:9px;color:var(--dim);cursor:pointer;padding:2px 6px;border-radius:4px;flex-shrink:0;transition:all 0.2s}
.endpoint-display .copy-hint:hover{background:rgba(0,255,245,0.1);color:var(--cyan)}
/* Code blocks compactos */
.code-block{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin:8px 0;position:relative;font-size:11px}
.code-block .lang{position:absolute;top:6px;right:8px;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:1px}
.code-block code{display:block;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5;color:var(--green);white-space:pre-wrap;word-break:break-all;margin-top:4px}
.code-block .method{color:var(--magenta);font-weight:700}
.code-block .url{color:var(--cyan)}
.code-block .prompt-line{color:var(--dim)}
.code-block .string{color:var(--gold)}
h3{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--cyan);margin:16px 0 6px;letter-spacing:1px}
/* CTA */
.cta-btn{display:block;width:100%;max-width:260px;margin:28px auto;padding:12px 20px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#000;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;border-radius:8px;cursor:pointer;text-decoration:none;transition:all 0.3s;letter-spacing:2px;text-transform:uppercase;position:relative;overflow:hidden}
.cta-btn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transition:left 0.6s}
.cta-btn:hover::after{left:100%}
.cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(0,255,245,0.3)}
/* Footer */
.footer{text-align:center;padding:24px 0;border-top:1px solid var(--border);margin-top:32px}
.footer p{font-size:10px;color:var(--dim);margin:2px 0;font-family:'JetBrains Mono',monospace}
.footer .brand{color:var(--cyan)}
.footer .collab{color:var(--magenta);opacity:0.5;margin-top:8px}
.cursor-blink::after{content:'▋';animation:blink 1s step-end infinite;color:var(--cyan)}
@keyframes blink{50%{opacity:0}}
.stat-pulse{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--green);margin-right:4px;animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
@media(max-width:640px){.container{padding:16px 12px 40px}.hero{padding:24px 12px 16px}.carousel-wrap{max-width:100%}.carousel-viewport{height:90px}.carousel-slide{gap:12px;padding:12px 16px}}
</style>
</head>
<body>
<div class="glow-orb glow-orb-1"></div>
<div class="glow-orb glow-orb-2"></div>
<div class="glow-orb glow-orb-3"></div>
<div class="container">

<div class="hero">
  <div class="hero-badge">⚡ v6.0 — Multi-Provider Gateway</div>
  <h1>CARBONATO<br>PROXY</h1>
  <div class="sub">⎈ AI GATEWAY UNIFIED ⎈</div>
  <div class="version"><span>●</span> 16 modelos · 4 proveedores <span>●</span></div>
</div>

<p class="desc">
  Gateway unificado para <strong>16 modelos de IA</strong> desde una <strong style="color:var(--gold)">sola URL</strong> compatible con OpenAI.
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
  -H <span class="string">"Content-Type: application/json"</span> \\<br>  -d '{<span class="string">"model"</span>:<span class="string">"modelo1"</span>,<span class="string">"stream"</span>:<span class="string" style="color:var(--cyan)">true</span>,<span class="string">"messages"</span>:[{<span class="string">"role"</span>:<span class="string">"user"</span>,<span class="string">"content"</span>:<span class="string">"Cuento"</span>}]}'
  </code></div>

  <h3>⟫ Modelos disponibles</h3>
  <div class="code-block"><span class="lang">HTTP</span><code><span class="method">GET</span> <span class="url">https://carbonato-proxy.vercel.app/models</span></code></div>
</div>

<a href="/api/admin" class="cta-btn">⎈ PANEL DE CONTROL ⎈</a>

<div class="footer">
  <p><span class="stat-pulse"></span> CARBONATO PROXY · <span class="brand">Cofrad.IA</span></p>
  <p>16 modelos · 4 proveedores · 100% código libre</p>
  <p class="collab">⚡ Hecho con Hermes AI · Costa Rica ⚡</p>
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
    <span class="tag \${m.cls}">\${m.tag}</span>
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
</script>
</body>
</html>`);
};
