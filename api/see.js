// SEE API Endpoint — Dashboard + trigger de ciclo
// Ruta: /api/see(.*) -> api/see.js
// Persistencia dual: /tmp/ + GitHub API (proxi-datos)

const fs = require('fs');
const path = require('path');
const report = require('../see/report.js');
const memory = require('../see/memory.js');

const LATEST_FILE = '/tmp/see-latest.json';
const GH_LATEST_RAW = 'https://raw.githubusercontent.com/yeifer125/proxi-datos/main/see-latest.json';

// Carga el último resultado: local /tmp/ primero, luego GitHub API
async function loadLatest() {
  // Intento local
  try {
    return JSON.parse(fs.readFileSync(LATEST_FILE, 'utf8'));
  } catch(e) {
      console.log('[see:fix] catch en línea 18:', e.message);
      console.log('[see:fix] catch en línea 18:', e.message);
      console.log('[see:fix] catch en línea 18:', e.message);}

  // Intento GitHub API (persistente entre instancias)
  try {
    const r = await fetch(GH_LATEST_RAW, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const data = await r.json();
      // Cache local
      fs.writeFileSync(LATEST_FILE, JSON.stringify(data));
      return data;
    }
  } catch(e) {
      console.log('[see:fix] catch en línea 32:', e.message);
      console.log('[see:fix] catch en línea 32:', e.message);}

  // Fallback: construir desde memoria persistente
  try {
    const { memory: mem } = await memory.load();
    if (mem && mem.cycles > 0) {
      const lastImp = mem.improvements.filter(i => i.cycle === mem.cycles);
      return {
        cycle: mem.cycles,
        timestamp: mem.lastCycleTime || new Date().toISOString(),
        duration: 0,
        models: { online: 0, offline: 0, total: 0 },
        stats: {
          total: mem.failedAttempts.length + mem.improvements.length,
          critical: mem.failedAttempts.filter(f => f.severity === 'critical').length,
          warning: mem.failedAttempts.filter(f => f.severity === 'warning').length,
          improvement: mem.improvements.length,
          opportunity: 0,
          info: 0
        },
        improvements: lastImp.slice(0, 20),
        findings: [],
        memory: {
          totalImprovements: mem.improvements.length,
          totalCycles: mem.cycles,
          lastCycle: mem.lastCycleTime,
          failedAttempts: mem.failedAttempts.slice(-5),
          modelHistory: Object.keys(mem.modelHistory || {}).length
        }
      };
    }
  } catch(e) {}

  return null;
}

// ─── Handlers ───

async function handleSeePage(req, res) {
  const data = await loadLatest();

  if (!data) {
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
  const data = await loadLatest();
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(data || { ok: true, message: 'No cycles yet' });
}

async function handleSeeRun(req, res) {
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
