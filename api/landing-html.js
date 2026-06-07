// Landing page HTML — estructura con placeholder para CSS y SCRIPTS
function renderHTML(cardsJS) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Carbonato Proxy - Gateway unificado de IA con 16 modelos. ⚠️ AVISO: Este sitio registra todo el uso (IP, tokens, timestamp). Al usar el proxy acepta estos términos. Proyecto 100% privado, código abierto, operado por una sola persona.">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Carbonato Proxy",
  "description": "Gateway unificado de IA con 16 modelos.",
  "termsOfService": "⚠️ AVISO: Este sitio registra todo el uso de los modelos (IP, tokens, timestamp). Al usar el proxy acepta estos términos. Proyecto 100% privado, código abierto, operado por una sola persona.",
  "applicationCategory": "AIGateway",
  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}
}
</script>
<title>⎈ CARBONATO PROXY ⎈</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>/*CSS*/</style>
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
  <video autoplay loop muted playsinline class="logo-video" src="/logo.mp4"></video>
  <div class="hero-text">
  <div class="hero-badge">⚡ v6.0 — Unified Gateway</div>
  <h1>CARBONATO<br>PROXY</h1>
  <div class="sub">⎈ AI GATEWAY UNIFIED ⎈</div>
  <div class="version"><span>●</span> 16 modelos <span>●</span></div>
</div>
</div>

<div class="disclaimer">
  <span class="disclaimer-icon">⚠</span>
  <span class="disclaimer-text">Este sitio registra todo el uso de los modelos (IP, tokens, timestamp). Al usar el proxy acepta estos términos. El proyecto es de código abierto pero <strong>100% privado</strong> — creado y operado por una sola persona.</span>
</div>

<div class="skyne-line">
  <span class="skyne-text" data-text="PRIMERA RED DE SKYNET">PRIMERA RED DE <span class="skyne-glitch">SKYNET</span></span>
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

<div class="divider">DOCS & ENDPOINT</div>

<div class="grid-2col">
  <div class="grid-left">
    <div class="endpoint-display">
      <span class="method">POST</span>
      <span class="url">https://carbonato-proxy.vercel.app/chat/completions</span>
      <span class="copy-hint" onclick="navigator.clipboard.writeText('https://carbonato-proxy.vercel.app/chat/completions')">📋</span>
    </div>
    <div class="endpoint-display" style="margin-top:6px">
      <span class="method">GET</span>
      <span class="url">/models</span>
      <span class="copy-hint" onclick="navigator.clipboard.writeText('https://carbonato-proxy.vercel.app/models')">📋</span>
    </div>
  </div>
  <div class="grid-right">
    <div class="code-block"><span class="lang">BASH</span><code>
<span class="prompt-line">curl -s https://carbonato-proxy.vercel.app/models</span> | jq .
    </code></div>
    <div class="code-block" style="margin-top:6px"><span class="lang">BASH</span><code>
<span class="prompt-line">curl -s -X POST https://carbonato-proxy.vercel.app/chat/completions \</span>
  -H <span class="string">"Content-Type: application/json"</span> \
  -d '{"model":"modelo1","messages":[{"role":"user","content":"Hola"}]}' | jq .
    </code></div>
  </div>
</div>

<div class="divider">COMPETENCIA</div>

<div class="comp-wrap">
  <label class="comp-label">⬡ SELECCIONAR 3 MODELOS</label>
  <div class="comp-selects">
    <select class="comp-select" id="comp1"></select>
    <select class="comp-select" id="comp2"></select>
    <select class="comp-select" id="comp3"></select>
  </div>
  <label class="comp-label">⬡ PROMPT</label>
  <div class="comp-prompt-row">
    <textarea class="comp-textarea" id="compPrompt" placeholder="Escribe tu prompt aquí..."></textarea>
    <button class="comp-btn" id="compBtn">⟫ COMPETIR ⟪</button>
  </div>
  <div class="comp-status" id="compStatus"></div>
  <div class="comp-results" id="compResults"></div>
</div>

<div class="divider">ACCESO</div>

<div class="cta-row">
  <a href="/api/playground" class="cta-btn cta-playground">⟫ CHAT IA ⟪</a>
</div>

<div class="footer">
  <p class="footer-text">CARBONATO PROXY · 16 modelos · <a href="/api/admin" class="admin-link">⚙</a></p>
  <p class="footer-sub">100% código libre</p>
</div>

</div>

<!--SCRIPTS-->
</body>
</html>`;
}

module.exports = { renderHTML };
