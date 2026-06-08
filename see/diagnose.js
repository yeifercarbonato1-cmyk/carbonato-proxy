// SEE Diagnose — Diagnóstico multi-capa del proxy
// Capa 1: Salud (Skynet scan)
// Capa 2: Performance (usage-db + health-db tendencias)
// Capa 3: Código (TODO/FIXME, errores en logs)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./config-tune.js');

const PROXY_DIR = path.resolve(__dirname, '..');

// ─── Capa 1: Salud ───

async function diagnoseHealth() {
  const findings = [];
  const CONFIG = config.getConfig();

  for (const [modelKey, cfg] of Object.entries(CONFIG)) {
    if (cfg.isRotator) continue;
    const t0 = Date.now();
    try {
      const resolvedKey = cfg.key ? config.resolveKey(cfg.key) : '';
      const headers = { 'Content-Type': 'application/json' };
      if (resolvedKey) headers['Authorization'] = `Bearer ${resolvedKey}`;

      const r = await fetch(cfg.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        }),
        signal: AbortSignal.timeout(10000)
      });
      const latency = Date.now() - t0;

      if (r.ok) {
        findings.push({
          severity: 'info',
          area: 'health',
          model: modelKey,
          detail: `${modelKey} OK (${latency}ms)`,
          latency
        });
      } else {
        const text = await r.text().catch(() => '');
        findings.push({
          severity: r.status === 429 ? 'warning' : 'critical',
          area: 'health',
          model: modelKey,
          detail: `${modelKey} HTTP ${r.status}: ${text.slice(0, 100)}`,
          latency
        });
      }
    } catch(e) {
      findings.push({
        severity: 'critical',
        area: 'health',
        model: modelKey,
        detail: `${modelKey}: ${e.message.slice(0, 120)}`,
        latency: Date.now() - t0
      });
    }
  }

  return findings;
}

// ─── Capa 2: Performance ───

function diagnosePerformance() {
  const findings = [];
  const usagePath = '/tmp/usage-db.json';
  const healthPath = '/tmp/health-db.json';

  // Analizar usage-db
  try {
    const usage = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
    const usages = usage.usages || [];

    if (usages.length > 0) {
      // Modelos infrautilizados
      const modelCounts = {};
      usages.forEach(u => {
        modelCounts[u.model] = (modelCounts[u.model] || 0) + 1;
      });
      const total = usages.length;
      for (const [model, count] of Object.entries(modelCounts)) {
        const pct = (count / total) * 100;
        if (pct < 2 && count < 10) {
          findings.push({
            severity: 'opportunity',
            area: 'performance',
            model,
            detail: `${model} solo ${count} requests (${pct.toFixed(1)}%) — posible reemplazo`
          });
        }
      }

      // Último acceso
      const sorted = [...usages].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      const recentModel = sorted[0]?.model;
      findings.push({
        severity: 'info',
        area: 'performance',
        detail: `Modelo más usado: ${recentModel} (${total} requests totales)`
      });
    }
  } catch(e) { /* sin datos aún */ }

  // Analizar health-db
  try {
    const health = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
    const entries = Array.isArray(health) ? health : [];

    if (entries.length > 20) {
      const byModel = {};
      entries.forEach(e => {
        if (!byModel[e.model]) byModel[e.model] = [];
        if (e.latency < 30000) byModel[e.model].push(e.latency);
      });

      for (const [model, latencies] of Object.entries(byModel)) {
        if (latencies.length < 5) continue;
        const recent = latencies.slice(-10);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const old = latencies.slice(0, 10);
        const oldAvg = old.reduce((a, b) => a + b, 0) / old.length;

        if (avg > oldAvg * 1.5 && oldAvg > 0) {
          findings.push({
            severity: 'warning',
            area: 'performance',
            model,
            detail: `${model} latencia subió ${(avg / oldAvg).toFixed(1)}x (${Math.round(oldAvg)}→${Math.round(avg)}ms)`
          });
        }
      }
    }
  } catch(e) {}

  return findings;
}

// ─── Capa 3: Código ───

function diagnoseCode() {
  const findings = [];
  const srcDir = path.join(PROXY_DIR, 'api');

  // Buscar TODO/FIXME en archivos JS
  try {
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
      const todos = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)[^]*/g);
      if (todos) {
        todos.forEach(t => {
          const clean = t.replace(/^\/\/\s*/, '');
          findings.push({
            severity: 'improvement',
            area: 'code',
            file: `api/${file}`,
            detail: clean.slice(0, 120)
          });
        });
      }

      // console.log olvidados
      const logLines = content.match(/^\s*console\.(log|warn)\([^)]*\)[^}]*$/gm);
      if (logLines && !file.includes('.min.')) {
        for (const line of logLines) {
          const trimmed = line.trim();
          if (trimmed.includes('[config]') || trimmed.includes('[rotator]') ||
              trimmed.includes('[skynet]') || trimmed.includes('Error') ||
              trimmed.includes('[see]')) continue; // logs intencionales
          findings.push({
            severity: 'improvement',
            area: 'code',
            file: `api/${file}`,
            detail: `console.log posiblemente debug: ${trimmed.slice(0, 80)}`
          });
        }
      }
    }
  } catch(e) {}

  // Buscar catch silenciosos — DESHABILITADO
  // code-patch.js no tiene handler + falsos positivos con catches intencionales
  // if (false) // skip sin romper sintaxis
  { // bloque eliminado — mantener try como no-op para no romper estructura
    const files = [];
    for (const file of files) {}
  }

  return findings;
}

// ─── Diagnóstico completo ───

async function fullDiagnose() {
  const t0 = Date.now();
  const health = await diagnoseHealth();
  const performance = diagnosePerformance();
  const code = diagnoseCode();

  const allFindings = [...health, ...performance, ...code];

  const stats = {
    total: allFindings.length,
    critical: allFindings.filter(f => f.severity === 'critical').length,
    warning: allFindings.filter(f => f.severity === 'warning').length,
    improvement: allFindings.filter(f => f.severity === 'improvement').length,
    opportunity: allFindings.filter(f => f.severity === 'opportunity').length,
    info: allFindings.filter(f => f.severity === 'info').length
  };

  const online = health.filter(f => f.severity === 'info').length +
    health.filter(f => f.severity === 'warning').length;
  const offline = health.filter(f => f.severity === 'critical').length;

  return {
    timestamp: new Date().toISOString(),
    duration: Date.now() - t0,
    models: {
      total: health.length,
      online,
      offline,
      pctOnline: health.length > 0 ? Math.round((online / health.length) * 100) : 0
    },
    stats,
    findings: allFindings.sort((a, b) => {
      const order = { critical: 0, warning: 1, improvement: 2, opportunity: 3, info: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    }),
    layers: { health, performance, code }
  };
}

module.exports = { fullDiagnose, diagnoseHealth, diagnosePerformance, diagnoseCode };
