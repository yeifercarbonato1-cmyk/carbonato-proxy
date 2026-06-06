// Servidor de test local para carbonato-proxy
const http = require('http');

function wrapHandler(fn) {
  return (req, res) => {
    const origWriteHead = res.writeHead.bind(res);
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      origWriteHead(res.statusCode || 200);
      res.end(JSON.stringify(data));
    };
    res.send = (body) => {
      if (typeof body === 'object') {
        res.setHeader('Content-Type', 'application/json');
        origWriteHead(res.statusCode || 200);
        res.end(JSON.stringify(body));
      } else {
        if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
        origWriteHead(res.statusCode || 200);
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
const adminAuthHandler = wrapHandler(require('./api/admin-auth.js'));
const adminSaveHandler = wrapHandler(require('./api/admin-save.js'));
const adminLogoutHandler = wrapHandler(require('./api/admin-logout.js'));
const modelsCheckHandler = wrapHandler(require('./api/models-check.js'));
const healthHandler = wrapHandler(require('./api/health.js'));
const competenciaHandler = wrapHandler(require('./api/competencia.js'));
const promptsHandler = wrapHandler(require('./api/prompts.js'));
const rotatorHandler = wrapHandler(require('./api/rotator.js'));
const playgroundHandler = wrapHandler(require('./api/playground.js'));
const adminToolsHandler = wrapHandler(require('./api/admin-tools.js'));
const fs = require('fs');
const pathModule = require('path');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  
  if (path === '/') return indexHandler(req, res);
  
  const CHAT_ROUTES = ['/chat/completions','/v1/chat/completions','/models','/v1/models','/images/generations','/v1/images/generations'];
  if (CHAT_ROUTES.includes(path)) return chatHandler(req, res);
  
  if (path === '/api/usage/reset') return adminToolsHandler(req, res);
  
  const ADMIN_ROUTES = {
    '/api/admin': adminHandler,
    '/api/admin-panel': adminPanelHandler,
    '/api/admin-auth': adminAuthHandler,
    '/api/admin-save': adminSaveHandler,
    '/api/admin-logout': adminLogoutHandler,
    '/api/models-check': modelsCheckHandler
  };
  if (ADMIN_ROUTES[path]) return ADMIN_ROUTES[path](req, res);
  
  // New feature routes
  const NEW_ROUTES = ['/api/health','/api/health/check','/api/health/page','/api/competencia','/api/competencia/page','/api/prompts','/api/prompts/page','/api/rotator/rank','/api/rotator/page','/api/playground','/api/playground/chat'];
  if (path === '/api/health' || path === '/api/health/check' || path === '/api/health/page' || path.startsWith('/api/health/')) return healthHandler(req, res);
  if (path === '/api/competencia' || path === '/api/competencia/page') return competenciaHandler(req, res);
  if (path === '/api/prompts' || path === '/api/prompts/page' || path.startsWith('/api/prompts/')) return promptsHandler(req, res);
  if (path === '/api/rotator/rank' || path === '/api/rotator/page') return rotatorHandler(req, res);
  if (path === '/api/playground' || path === '/api/playground/chat') return playgroundHandler(req, res);
  
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
