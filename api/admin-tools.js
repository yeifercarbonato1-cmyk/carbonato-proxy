// admin-tools.js — ROUTER UNIFICADO (Vercel Hobby: 1 function para múltiples rutas)
// Handlers separados en api/admin/helpers.js, db.js, handlers.js
const { URL } = require('url');
const h = require('./admin/handlers.js');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  // --- HEALTH ---
  if (pathname === '/api/health' || pathname === '/api/health/check') return h.handleHealthCheck(req, res);
  if (pathname === '/api/health/page') return h.handleHealthPage(req, res);
  if (pathname === '/api/health/save' && method === 'POST') return h.handleHealthSave(req, res);

  // --- COMPETENCIA ---
  if (pathname === '/api/competencia' && method === 'POST') return h.handleCompetencia(req, res);
  if (pathname === '/api/competencia/page') return h.handleCompetenciaPage(req, res);

  // --- PROMPTS ---
  if (pathname === '/api/prompts') {
    if (method === 'GET') return h.handlePromptsList(req, res);
    if (method === 'POST') return h.handlePromptsCreate(req, res);
    if (method === 'DELETE') return h.handlePromptsDelete(req, res);
  }
  if (pathname === '/api/prompts/page') return h.handlePromptsPage(req, res);

  // --- ROTATOR ---
  if (pathname === '/api/rotator/rank') return h.handleRotatorRank(req, res);
  if (pathname === '/api/rotator/page') return h.handleRotatorPage(req, res);

  // --- PLAYGROUND ---
  if (pathname === '/api/playground' || pathname === '/api/playground/page') return h.handlePlaygroundPage(req, res);
  if (pathname === '/api/playground/chat') return h.handlePlaygroundChat(req, res);

  // --- VISITORS ---
  if (pathname === '/api/visitors/page') return h.handleVisitorsPage(req, res);
  if (pathname === '/api/visitors/reset' && method === 'POST') return h.handleVisitorsReset(req, res);
  if (pathname === '/api/visitors/geo') return h.handleVisitorsGeo(req, res);

  // --- USAGE RESET ---
  if (pathname === '/api/usage/reset' && method === 'POST') return h.handleUsageReset(req, res);

  // --- ADMIN AUTH / SAVE / LOGOUT ---
  if (pathname === '/api/admin-auth' && method === 'POST') return h.handleAdminAuth(req, res);
  if (pathname === '/api/admin-save' && method === 'POST') return h.handleAdminSave(req, res);
  if (pathname === '/api/admin-logout') return h.handleAdminLogout(req, res);

  // --- UPLOAD ---
  if (pathname === '/api/upload' && method === 'POST') return h.handleUpload(req, res);

  // --- MODELS CHECK ---
  if (pathname === '/api/models-check') return h.handleModelsCheck(req, res);

  // --- DOCS IA ---
  if (pathname === '/api/docs-ia') return h.handleDocsIA(req, res);

  // --- LOGS ---
  if (pathname === '/api/logs/page') return h.handleLogsPage(req, res);

  // --- CONFIG ---
  if (pathname === '/api/config/page') return h.handleConfigPage(req, res);
  if (pathname === '/api/config/save' && method === 'POST') return h.handleConfigSave(req, res);

  // --- TELEGRAM WEBHOOK ---
  if (pathname === '/api/telegram/webhook' && method === 'POST') return h.handleTelegramWebhook(req, res);

  // --- SKYNET ---
  if (pathname === '/api/skynet/page') return h.handleSkynetPage(req, res);
  if (pathname === '/api/skynet/data') return h.handleSkynetData(req, res);

  res.status(404).json({ error: 'Not found', path: pathname });
};
