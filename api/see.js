// SEE API Endpoint — Dashboard + trigger de ciclo
// Ruta: /api/see(.*) → api/see.js
// Integración con el proxy existente

const fs = require('fs');
const path = require('path');
const report = require('../see/report.js');

const LATEST_FILE = '/tmp/see-latest.json';

// Carga el último resultado de ciclo
function loadLatest() {
  try {
    return JSON.parse(fs.readFileSync(LATEST_FILE, 'utf8'));
  } catch(e) {
    return null;
  }
}

// ─── Handlers ───

async function handleSeePage(req, res) {
  const data = loadLatest();

  if (!data) {
    // Sin datos aún — mostrar página vacía
    const empty = report.renderDashboardHTML({
      cycle: 0,
      timestamp: new Date().toISOString(),
      duration: 0,
      models: { online: 0, offline: 0, total: 0 },
      stats: { critical: 0, warning: 0, improvement: 0, opportunity: 0, info: 0 },
      improvements: [],
      findings: [],
      memory: { totalImprovements: 0, totalCycles: 0 }
    });
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(empty);
  }

  const html = report.renderDashboardHTML(data);
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}

async function handleSeeStatus(req, res) {
  const data = loadLatest();
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(data || { ok: true, message: 'No cycles yet' });
}

async function handleSeeRun(req, res) {
  // Ejecutar ciclo (bloqueante, puede tardar)
  try {
    const worker = require('../see/see-worker.js');
    const result = await worker.runCycle();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch(e) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ ok: false, error: e.message });
  }
}

// ─── Router ───

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  if (pathname === '/api/see/page' || pathname === '/api/see') {
    return handleSeePage(req, res);
  }
  if (pathname === '/api/see/status') {
    return handleSeeStatus(req, res);
  }
  if (pathname === '/api/see/run' && method === 'POST') {
    return handleSeeRun(req, res);
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(404).json({ error: 'Not found' });
};
