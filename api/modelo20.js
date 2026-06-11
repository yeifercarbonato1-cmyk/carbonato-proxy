// api/modelo20.js — Página simple para modelo20 (sin datos)
// GET /api/modelo20 → página HTML (requiere auth)

const { cookieOk } = require('./admin/helpers.js');
const { MODELOS } = require('./models-def.js');

const m = MODELOS.find(x => x.id === 'modelo20') || {};

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${m.icon || '🐉'} ${m.name || 'modelo20'}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:'Inter',sans-serif;padding:24px}
h1{font-family:'JetBrains Mono',monospace;font-size:18px;color:#44ccff;margin-bottom:4px;letter-spacing:2px}
.sub{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:24px;font-family:'JetBrains Mono',monospace}
.box{border:1px solid rgba(255,255,255,0.08);padding:20px;border-radius:4px;text-align:center}
.box p{font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:8px}
.box .empty{font-size:24px;margin-bottom:8px;opacity:0.3}
.back{font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:16px;display:block;font-family:'JetBrains Mono',monospace;text-decoration:none}
.back:hover{color:rgba(255,255,255,0.6)}
</style>
</head>
<body>
<a href="/api/admin-panel" class="back">⟵ VOLVER AL PANEL</a>
<h1>${m.icon || '🐉'} ${m.name || 'modelo20'}</h1>
<div class="sub">Modelo proxy — sin base de conocimiento</div>
<div class="box">
  <div class="empty">◻</div>
  <p>${m.desc || 'Modelo en funcionamiento'}</p>
  <p style="font-size:10px;color:rgba(255,255,255,0.2)">Sin system prompt • Sin knowledge • Sin caveman</p>
</div>
</body>
</html>`;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!cookieOk(req)) {
      res.statusCode = 302;
      res.setHeader('Location', '/api/admin');
      return res.end();
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(HTML);
  }
  res.status(404).json({ error: 'Not found' });
};
