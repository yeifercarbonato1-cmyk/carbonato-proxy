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

function html(res, str) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(str);
}

function getGithubToken() {
  return process.env.GITHUB_TOKEN || '';
}

module.exports = { proxyBase, esc, escTpl, cookieOk, html, getGithubToken };
