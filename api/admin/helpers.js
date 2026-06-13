// Helpers compartidos para admin-tools.js y otros módulos
const { verifyCookie } = require('../auth.js');

function proxyBase(req) {
  const host = req.headers['host'] || 'carbonato-proxy.vercel.app';
  return (host.includes('localhost') || host.includes('127.0.0.1')) ? `http://${host}` : `https://${host}`;
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escTpl(s) {
  return esc(s).replace(/\n/g,'<br>');
}

function cookieOk(req) {
  return verifyCookie(req.headers.cookie);
}

function getApiKeys() {
  return String(process.env.CARBONATO_API_KEYS || process.env.CARBONATO_API_KEY || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function apiKeyOk(req) {
  const keys = getApiKeys();
  if (keys.length === 0) return false;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const headerKey = String(req.headers['x-api-key'] || '').trim();
  const queryKey = (() => {
    try { return new URL(req.url, 'http://localhost').searchParams.get('key') || ''; }
    catch(e) { return ''; }
  })();
  const candidate = bearer || headerKey || queryKey;
  return !!candidate && keys.includes(candidate);
}

function requestAuthOk(req) {
  return cookieOk(req) || apiKeyOk(req);
}

function requireRequestAuth(req, res, next) {
  if (!requestAuthOk(req)) return res.status(401).json({ error: 'Auth required' });
  return next();
}

function html(res, str) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(str);
}

function getGithubToken() {
  return process.env.GITHUB_TOKEN || '';
}

module.exports = { proxyBase, esc, escTpl, cookieOk, apiKeyOk, requestAuthOk, requireRequestAuth, html, getGithubToken };
