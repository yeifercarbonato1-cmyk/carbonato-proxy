// Servidor de test local para carbonato-proxy
// Solo importa funciones activas — legacy removido Junio 2026
const http = require('http');
const fs = require('fs');
const pathModule = require('path');

function wrapHandler(fn) {
  return (req, res) => {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(res.statusCode || 200);
      res.end(JSON.stringify(data));
    };
    res.send = (body) => {
      if (typeof body === 'object') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(res.statusCode || 200);
        res.end(JSON.stringify(body));
      } else {
        if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(res.statusCode || 200);
        res.end(String(body));
      }
    };
    return fn(req, res);
  };
}

const chatHandler = wrapHandler(require('./api/chat.js'));
const indexHandler = wrapHandler(require('./api/index.js'));
const adminHandler = wrapHandler(require('./api/admin.js'));
const adminPanelHandler = wrapHandler(require('./api/admin-panel.js'));
const adminToolsHandler = wrapHandler(require('./api/admin-tools.js'));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  if (path === '/') return indexHandler(req, res);

  // Chat routes
  const CHAT_ROUTES = ['/chat/completions','/v1/chat/completions','/models','/v1/models','/images/generations','/v1/images/generations'];
  if (CHAT_ROUTES.includes(path)) return chatHandler(req, res);

  // Admin routes — todas por admin-tools.js (router unificado)
  const ADMIN_TOOLS_PREFIXES = [
    '/api/health', '/api/competencia', '/api/prompts',
    '/api/rotator', '/api/playground', '/api/visitors',
    '/api/usage/reset', '/api/admin-auth', '/api/admin-save',
    '/api/admin-logout', '/api/upload', '/api/models-check',
    '/api/docs-ia', '/api/logs', '/api/config'
  ];
  if (ADMIN_TOOLS_PREFIXES.some(p => path.startsWith(p) || path === p)) {
    return adminToolsHandler(req, res);
  }

  // Admin pages
  if (path === '/api/admin') return adminHandler(req, res);
  if (path === '/api/admin-panel') return adminPanelHandler(req, res);

  // Static files from public/
  const publicPath = pathModule.join(__dirname, 'public', path === '/' ? 'index.html' : path);
  if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
    const ext = pathModule.extname(publicPath).toLowerCase();
    const mime = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2','.ttf':'font/ttf','.eot':'font/eot' };
    res.statusCode = 200;
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    const stream = fs.createReadStream(publicPath);
    stream.pipe(res);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3456;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Carbonato Proxy TEST on http://localhost:${PORT}`);
});
