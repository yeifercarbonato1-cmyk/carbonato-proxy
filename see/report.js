// SEE Report — Genera reportes multicanal (Telegram + dashboard + JSON)

const fs = require('fs');

// ─── Formateo para Telegram ───

function formatTelegram(diagnosis, cycleInfo, improvements) {
  const lines = [];
  lines.push(`🧬 *SEE Cycle ${cycleInfo.cycle}* — ${cycleInfo.timestamp}`);

  // Resumen modelos
  const d = diagnosis;
  const pct = d.models.total > 0 ? `(${d.models.pctOnline}% online)` : '';
  lines.push(`📊 ${d.models.online}/${d.models.total} modelos ${pct}`);

  // Findings por severidad
  if (d.stats.critical > 0) lines.push(`⛔ ${d.stats.critical} críticos`);
  if (d.stats.warning > 0) lines.push(`⚠️ ${d.stats.warning} warnings`);
  if (d.stats.improvement > 0) lines.push(`🔧 ${d.stats.improvement} mejoras código`);
  if (d.stats.opportunity > 0) lines.push(`💡 ${d.stats.opportunity} oportunidades`);
  lines.push(`⏱ ${d.duration}ms de diagnóstico`);

  // Modelos caídos
  const critical = diagnosis.findings.filter(f => f.severity === 'critical');
  if (critical.length > 0) {
    lines.push('', '⛔ *CAÍDOS*:');
    critical.slice(0, 5).forEach(f => {
      lines.push(`  • ${f.model || ''}: ${f.detail.slice(0, 80)}`);
    });
  }

  // Mejoras aplicadas
  const applied = improvements.filter(i => i.applied);
  if (applied.length > 0) {
    lines.push('', '✅ *MEJORAS*:');
    applied.slice(0, 3).forEach(i => {
      lines.push(`  • ${i.action}: ${i.detail.slice(0, 80)}`);
    });
  }

  // Mejoras pendientes
  const pending = improvements.filter(i => !i.applied);
  if (pending.length > 0) {
    lines.push('', '📋 *PENDIENTES*:');
    pending.slice(0, 3).forEach(i => {
      lines.push(`  • ${i.action}: ${i.detail.slice(0, 80)}`);
    });
  }

  // Performance
  if (diagnosis.findings.some(f => f.area === 'performance')) {
    const perf = diagnosis.findings.filter(f => f.area === 'performance');
    lines.push('', '📈 *TENDENCIAS*:');
    perf.slice(0, 2).forEach(f => lines.push(`  • ${f.detail.slice(0, 100)}`));
  }

  lines.push('', `🔗 https://carbonato-proxy.vercel.app/api/see/page`);

  return lines.join('\n');
}

// ─── Formateo JSON para dashboard ───

function formatDashboard(diagnosis, cycleInfo, improvements, memory) {
  return {
    cycle: cycleInfo.cycle,
    timestamp: cycleInfo.timestamp,
    duration: diagnosis.duration,
    models: diagnosis.models,
    stats: diagnosis.stats,
    improvements: improvements.slice(0, 20),
    memory: {
      totalImprovements: memory.improvements.length,
      totalCycles: memory.cycles,
      lastCycle: memory.lastCycleTime,
      failedAttempts: memory.failedAttempts.slice(-5),
      modelHistory: Object.keys(memory.modelHistory).length
    },
    findings: diagnosis.findings.slice(0, 30)
  };
}

// ─── HTML Dashboard ───

function renderDashboardHTML(data) {
  const d = data;
  const findingsHtml = (d.findings || []).map(f => {
    const colorMap = { critical: '#ff4444', warning: '#ffaa00', improvement: '#44aaff', opportunity: '#44ff88', info: '#888' };
    const color = colorMap[f.severity] || '#888';
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
      <td style="color:${color};padding:4px 8px">${f.severity}</td>
      <td style="padding:4px 8px">${f.area}</td>
      <td style="padding:4px 8px">${f.model || ''}</td>
      <td style="padding:4px 8px;font-size:13px">${(f.detail || '').slice(0, 100)}</td>
    </tr>`;
  }).join('');

  const improvementsHtml = (d.improvements || []).map(i => {
    const statusColor = i.applied ? '#44ff88' : i.skipped ? '#888' : i.error ? '#ff4444' : '#ffaa00';
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
      <td style="padding:4px 8px">${i.cycle || d.cycle}</td>
      <td style="padding:4px 8px">${i.action}</td>
      <td style="padding:4px 8px;font-size:13px">${i.detail || ''}</td>
      <td style="color:${statusColor};padding:4px 8px">${i.applied ? '✅' : i.skipped ? '⏭️' : i.error ? '❌' : '⏳'}</td>
    </tr>`;
  }).join('');

  const mem = d.memory || {};
  const modelCount = mem.modelHistory || 0;

  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SEE Dashboard — Skynet Evolution Engine</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:rgba(255,255,255,0.85);font-family:system-ui,-apple-system,sans-serif;padding:20px}
h1{font-size:24px;font-weight:700;margin-bottom:4px;background:linear-gradient(135deg,#00fff5,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:rgba(255,255,255,0.4);font-size:13px;margin-bottom:20px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:20px}
.kpi{background:rgba(18,18,30,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;text-align:center}
.kpi .val{font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace}
.kpi .lbl{font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}
th{text-align:left;padding:6px 8px;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.1)}
td{padding:6px 8px;font-family:'JetBrains Mono',monospace;font-size:12px}
.section{background:rgba(18,18,30,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px}
.section h2{font-size:14px;margin-bottom:12px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px}
.nav{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.nav a{color:rgba(255,255,255,0.4);text-decoration:none;font-size:12px;padding:6px 12px;border:1px solid rgba(255,255,255,0.08);border-radius:4px}
.nav a:hover{border-color:rgba(0,255,245,0.3);color:rgba(255,255,255,0.7)}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
.status-ok{background:#44ff88}
.status-warn{background:#ffaa00}
.status-critical{background:#ff4444}
</style></head><body>
<div class="nav">
  <a href="/api/admin-panel">⟐ DASHBOARD</a>
  <a href="/api/health/page">⟐ HEALTH</a>
  <a href="/api/see/page">🧬 SEE</a>
  <a href="/api/skynet/data">⟐ SKYNET</a>
</div>

<h1>🧬 SKYNET EVOLUTION ENGINE</h1>
<p class="sub">Cycle ${d.cycle} · ${d.timestamp} · ${d.duration}ms</p>

<div class="kpi-grid">
  <div class="kpi"><div class="val">${d.models?.online ?? '?'}</div><div class="lbl">ONLINE</div></div>
  <div class="kpi"><div class="val">${d.models?.offline ?? '?'}</div><div class="lbl">OFFLINE</div></div>
  <div class="kpi"><div class="val">${d.stats?.critical || 0}</div><div class="lbl">CRÍTICOS</div></div>
  <div class="kpi"><div class="val">${d.improvements?.length || 0}</div><div class="lbl">MEJORAS</div></div>
  <div class="kpi"><div class="val">${d.cycle}</div><div class="lbl">CICLOS</div></div>
  <div class="kpi"><div class="val">${mem.totalImprovements || 0}</div><div class="lbl">TOTAL MEJORAS</div></div>
</div>

<div class="section">
<h2>📋 Findings</h2>
<table><thead><tr><th>Severidad</th><th>Área</th><th>Modelo</th><th>Detalle</th></tr></thead>
<tbody>${findingsHtml || '<tr><td colspan="4" style="color:rgba(255,255,255,0.3);padding:12px">Sin findings</td></tr>'}</tbody></table>
</div>

<div class="section">
<h2>🛠️ Mejoras</h2>
<table><thead><tr><th>Ciclo</th><th>Acción</th><th>Detalle</th><th>Estado</th></tr></thead>
<tbody>${improvementsHtml || '<tr><td colspan="4" style="color:rgba(255,255,255,0.3);padding:12px">Sin mejoras aún</td></tr>'}</tbody></table>
</div>

<div style="text-align:center;margin-top:20px">
  <a href="/api/see/run" style="display:inline-block;padding:10px 24px;background:linear-gradient(135deg,#00fff5,#7b2ff7);color:#000;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px" onclick="return confirm('¿Ejecutar ciclo SEE ahora?')">▶ EJECUTAR CICLO</a>
</div>
<p style="text-align:center;margin-top:10px;font-size:11px;color:rgba(255,255,255,0.2)">Skynet Evolution Engine v1 · ${d.timestamp}</p>
</body></html>`;
}

module.exports = { formatTelegram, formatDashboard, renderDashboardHTML };
