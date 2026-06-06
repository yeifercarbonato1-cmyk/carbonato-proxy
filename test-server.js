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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  
  if (path === '/') return indexHandler(req, res);
  
  const CHAT_ROUTES = ['/chat/completions','/v1/chat/completions','/models','/v1/models','/images/generations','/v1/images/generations'];
  if (CHAT_ROUTES.includes(path)) return chatHandler(req, res);
  
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3456;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Carbonato Proxy TEST on http://localhost:${PORT}`);
});
