// Login page - GET /api/admin
module.exports = async (req, res) => {
  const cookies = req.headers.cookie || '';
  const url = (req.url || '').split('?')[0];
  
  if (cookies.includes('admin_sess=ok')) {
    return res.writeHead(302, { 'Location': '/api/admin-panel' }).end();
  }
  
  if (url === '/logout') {
    res.setHeader('Set-Cookie', 'admin_sess=; Path=/; Max-Age=0; HttpOnly');
    return res.writeHead(302, { 'Location': '/api/admin' }).end();
  }
  
  const error = url.includes('error') ? 'true' : 'false';
  
  return res.setHeader('Content-Type', 'text/html').status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>⎈ CARBONATO PROXY — ACCESO ⎈</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--cyan:#00fff5;--magenta:#ff00e6;--purple:#7b2ff7;--green:#00ff88;--text:#e0e0e0;--dim:#6666aa;--card:rgba(18,18,30,0.6)}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center}
/* Grid bg */
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,0.04) 1px,transparent 1px);background-size:40px 40px;z-index:0;pointer-events:none}
/* Glow orbs */
.glow{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;z-index:0;animation:orb 25s ease-in-out infinite}
.g1{width:500px;height:500px;background:radial-gradient(circle,rgba(123,47,247,0.2),transparent);top:-200px;left:-200px;animation-delay:0s}
.g2{width:400px;height:400px;background:radial-gradient(circle,rgba(0,255,245,0.12),transparent);bottom:-150px;right:-150px;animation-delay:-8s}
.g3{width:300px;height:300px;background:radial-gradient(circle,rgba(255,0,230,0.08),transparent);top:40%;left:70%;animation-delay:-16s}
@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-40px) scale(1.15)}66%{transform:translate(-30px,30px) scale(0.9)}}
/* Digital rain lines */
.rain{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.rain-line{position:absolute;top:-100px;width:1px;height:100px;background:linear-gradient(180deg,transparent,var(--cyan));opacity:0.15;animation:drop 8s linear infinite}
.rain-line:nth-child(1){left:5%;animation-duration:7s;animation-delay:0s}
.rain-line:nth-child(2){left:15%;animation-duration:9s;animation-delay:-2s;height:80px}
.rain-line:nth-child(3){left:25%;animation-duration:6s;animation-delay:-4s;opacity:0.1}
.rain-line:nth-child(4){left:35%;animation-duration:8s;animation-delay:-1s;height:120px}
.rain-line:nth-child(5){left:45%;animation-duration:10s;animation-delay:-5s}
.rain-line:nth-child(6){left:55%;animation-duration:7s;animation-delay:-3s;height:90px}
.rain-line:nth-child(7){left:65%;animation-duration:9s;animation-delay:-6s;opacity:0.1}
.rain-line:nth-child(8){left:75%;animation-duration:6.5s;animation-delay:-2.5s;height:110px}
.rain-line:nth-child(9){left:85%;animation-duration:8.5s;animation-delay:-4.5s}
.rain-line:nth-child(10){left:95%;animation-duration:7.5s;animation-delay:-1.5s;height:70px}
@keyframes drop{0%{transform:translateY(0);opacity:0}10%{opacity:0.15}90%{opacity:0.05}100%{transform:translateY(110vh);opacity:0}}
/* Scan line overlay */
.scanline{position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,245,0.015) 2px,rgba(0,255,245,0.015) 4px);z-index:0;pointer-events:none;animation:scan 8s linear infinite}
@keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
/* Login container */
.login-wrap{position:relative;z-index:1;width:100%;max-width:420px;padding:20px}
.login-box{background:var(--card);border:1px solid rgba(0,255,245,0.12);border-radius:16px;padding:48px 36px 36px;backdrop-filter:blur(20px);position:relative;overflow:hidden;animation:boxIn 0.8s cubic-bezier(0.16,1,0.3,1)}
.login-box::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--cyan),var(--magenta),transparent);opacity:0.8}
@keyframes boxIn{from{opacity:0;transform:scale(0.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
/* Logo area */
.logo-area{text-align:center;margin-bottom:32px}
.logo-icon{font-size:14px;letter-spacing:3px;color:var(--dim);font-family:'JetBrains Mono',monospace;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:8px}
.logo-icon::before,.logo-icon::after{content:'◆';font-size:6px;color:var(--cyan);opacity:0.4}
.logo-area h1{font-size:28px;font-weight:800;background:linear-gradient(135deg,#fff,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.5px;line-height:1.2}
.logo-area .sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);margin-top:6px;letter-spacing:2px}
.typing-text{display:inline-block;overflow:hidden;white-space:nowrap;border-right:2px solid var(--cyan);animation:type 2s steps(30) 1s forwards,blink 1s step-end infinite;width:0;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:2px}
@keyframes type{to{width:18ch}}
@keyframes blink{50%{border-color:transparent}}
/* Form */
.form-group{position:relative;margin-bottom:20px}
.form-group input{width:100%;padding:14px 16px;background:rgba(0,0,0,0.3);border:1px solid rgba(0,255,245,0.12);border-radius:8px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;transition:all 0.3s;letter-spacing:1px}
.form-group input:focus{border-color:var(--cyan);box-shadow:0 0 20px rgba(0,255,245,0.08);background:rgba(0,0,0,0.5)}
.form-group input::placeholder{color:var(--dim);font-size:11px;letter-spacing:2px;opacity:0.4}
.form-group .input-glow{position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);width:0;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);transition:width 0.4s;pointer-events:none}
.form-group input:focus ~ .input-glow{width:80%}
/* Submit button */
.login-btn{width:100%;padding:14px;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;border-radius:8px;color:#000;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:3px;text-transform:uppercase;transition:all 0.3s;position:relative;overflow:hidden;margin-top:4px}
.login-btn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transition:left 0.5s}
.login-btn:hover::after{left:100%}
.login-btn:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(0,255,245,0.25)}
.login-btn:active{transform:translateY(0)}
/* Error */
.error-box{background:rgba(255,0,0,0.06);border:1px solid rgba(255,0,0,0.15);border-radius:8px;padding:10px 14px;margin-top:16px;display:${error === 'true' ? 'flex' : 'none'};align-items:center;gap:8px;animation:shake 0.4s ease-in-out}
.error-box span{font-family:'JetBrains Mono',monospace;font-size:10px;color:#ff4444;letter-spacing:1px}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
/* Status indicator */
.status-dots{display:flex;justify-content:center;gap:4px;margin-top:20px}
.status-dot{width:4px;height:4px;border-radius:50%;background:var(--dim);opacity:0.3}
.status-dot:nth-child(1){background:var(--green);opacity:1;animation:dotPulse 2s ease-in-out infinite}
.status-dot:nth-child(2){background:var(--cyan);opacity:0.4;animation:dotPulse 2s ease-in-out 0.3s infinite}
.status-dot:nth-child(3){background:var(--purple);opacity:0.3;animation:dotPulse 2s ease-in-out 0.6s infinite}
@keyframes dotPulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
.footer-text{text-align:center;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--dim);opacity:0.4;letter-spacing:1px}
.footer-text span{color:var(--cyan);opacity:0.6}
/* Responsive */
@media(max-width:480px){.login-box{padding:32px 20px 24px}.logo-area h1{font-size:22px}}
</style>
</head>
<body>
<div class="glow g1"></div>
<div class="glow g2"></div>
<div class="glow g3"></div>
<div class="rain">
  <div class="rain-line"></div><div class="rain-line"></div><div class="rain-line"></div>
  <div class="rain-line"></div><div class="rain-line"></div><div class="rain-line"></div>
  <div class="rain-line"></div><div class="rain-line"></div><div class="rain-line"></div>
  <div class="rain-line"></div>
</div>
<div class="scanline"></div>

<div class="login-wrap">
  <div class="login-box">
    <div class="logo-area">
      <div class="logo-icon">SISTEMA</div>
      <h1>CARBONATO<br>PROXY</h1>
      <div class="typing-text">ACCESO RESTRINGIDO</div>
    </div>

    <form method="POST" action="/api/admin-auth">
      <div class="form-group">
        <input type="text" name="user" placeholder="USUARIO" autocomplete="off" spellcheck="false">
        <div class="input-glow"></div>
      </div>
      <div class="form-group">
        <input type="password" name="pass" placeholder="CONTRASEÑA">
        <div class="input-glow"></div>
      </div>
      <button type="submit" class="login-btn">⎈ INGRESAR ⎈</button>
    </form>

    <div class="error-box">
      <span>⛔ ACCESO DENEGADO — CREDENCIALES INVÁLIDAS</span>
    </div>

    <div class="status-dots">
      <div class="status-dot"></div>
      <div class="status-dot"></div>
      <div class="status-dot"></div>
    </div>

    <div class="footer-text"><span>●</span> COFRAD.IA · SISTEMA SEGURO <span>●</span></div>
  </div>
</div>

<script>
// Efecto de tipeo en placeholder rotativo
const inputs = document.querySelectorAll('input');
inputs.forEach((input, i) => {
  const texts = ['ADMIN', '••••••••••'];
  let idx = 0;
  input.addEventListener('focus', () => {
    input.style.borderColor = 'var(--cyan)';
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = 'rgba(0,255,245,0.12)';
  });
});

// Prevenir mostrar error si no hay error
if (window.location.search.includes('error')) {
  document.querySelector('.error-box').style.display = 'flex';
}
</script>
</body>
</html>`);
};
