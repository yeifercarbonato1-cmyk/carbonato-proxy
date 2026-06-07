// SEE Worker — Orquestador del Skynet Evolution Engine
// Corre como cron cada 4h: DIAGNOSE → PLAN → EVOLVE → SANDBOX → REPORT
//
// Uso: node see/see-worker.js [--dry-run]
// --dry-run: solo diagnostica, no ejecuta cambios

const diagnose = require('./diagnose.js');
const evolver = require('./evolver.js');
const sandbox = require('./sandbox.js');
const memory = require('./memory.js');
const report = require('./report.js');
const gitBridge = require('./git-bridge.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const IS_CRON = process.env.CRON === 'true';

// ─── Ciclo principal ───

async function runCycle() {
  const t0 = Date.now();
  console.log('═══ SEE CYCLE START ═══');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (solo diagnóstico)' : '⚙️  FULL'}`);

  // 1. Cargar memoria
  console.log('[see] Cargando memoria...');
  const { memory: mem, sha: memSha } = await memory.load();
  mem.cycles++;
  mem.lastCycleTime = new Date().toISOString();
  process.env.SEE_CYCLE = String(mem.cycles);

  // 2. DIAGNOSE — 3 capas
  console.log('[see] Diagnóstico multi-capa...');
  const diagnosis = await diagnose.fullDiagnose();
  console.log(`[see] Encontrados ${diagnosis.stats.total} hallazgos (${diagnosis.stats.critical} críticos, ${diagnosis.stats.warning} warnings)`);

  // 3. PLAN — evaluar mejoras
  console.log('[see] Evaluando mejoras potenciales...');
  const improvements = await evolver.evaluateImprovements(diagnosis, mem);
  console.log(`[see] ${improvements.length} mejoras posibles`);

  const results = [];

  // 4. EVOLVE — ejecutar mejoras (saltar si dry-run)
  if (!DRY_RUN && improvements.length > 0) {
    for (const imp of improvements) {
      if (!imp.autoFix) {
        console.log(`[see] Saltando mejora no automática: ${imp.action}`);
        results.push({ ...imp, skipped: true });
        continue;
      }

      console.log(`[see] Ejecutando mejora: ${imp.action}...`);
      const result = await evolver.executeImprovement(imp, mem);
      results.push(result);

      if (result.applied) {
        console.log(`[see] ✅ Mejora aplicada: ${imp.action}`);
      } else if (result.skipped) {
        console.log(`[see] ⏭️ Mejora saltada: ${result.reason || 'sin cambios'}`);
      } else {
        console.log(`[see] ❌ Mejora falló: ${result.error}`);
      }
    }

    // Si hubo cambios, verificar estado git
    const gitStatus = gitBridge.status();
    if (gitStatus.dirty && !DRY_RUN) {
      console.log(`[see] Cambios pendientes en git. Branch: ${gitStatus.branch}`);
      console.log(`[see] ⚠️  PUSH_ENABLED=${gitBridge.PUSH_ENABLED} — no se hizo push`);
    }
  } else if (improvements.length === 0) {
    console.log('[see] No hay mejoras que aplicar');
  }

  // 5. REPORT — guardar memoria y generar reporte
  console.log('[see] Guardando memoria...');
  const saveResult = await memory.save(mem, memSha);
  if (saveResult.ok) {
    console.log(`[see] Memoria guardada (SHA: ${saveResult.sha})`);
  } else {
    console.log(`[see] Memoria: ${saveResult.error || 'solo local'}`);
  }

  // 6. Generar dashboard data
  const cycleInfo = {
    cycle: mem.cycles,
    timestamp: new Date().toISOString(),
    duration: Date.now() - t0,
    dryRun: DRY_RUN,
    gitStatus: gitBridge.status()
  };

  const dashboardData = report.formatDashboard(diagnosis, cycleInfo, results, mem);

  // Guardar última ejecución para el dashboard
  try {
    fs.writeFileSync('/tmp/see-latest.json', JSON.stringify(dashboardData, null, 2));
  } catch(e) {}

  // Persistir a GitHub API para que Vercel lo lea
  try {
    const memMod = require('./memory.js');
    const token = memMod.getGithubToken();
    if (token) {
      const GH_API = 'https://api.github.com/repos/yeifer125/proxi-datos/contents/see-latest.json';
      const content = Buffer.from(JSON.stringify(dashboardData, null, 2)).toString('base64');
      // Intentar obtener SHA actual del archivo
      const getRes = await fetch(GH_API, {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(8000)
      });
      const existing = getRes.ok ? await getRes.json() : {};
      const body = { message: `see: cycle ${mem.cycles} latest`, content };
      if (existing.sha) body.sha = existing.sha;
      await fetch(GH_API, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
      });
    }
  } catch(e) {}

  // 7. Resumen final
  const duration = Date.now() - t0;
  const appliedCount = results.filter(r => r.applied).length;
  const failedCount = results.filter(r => r.applied === false && !r.skipped).length;

  console.log('');
  console.log('═══ SEE CYCLE COMPLETE ═══');
  console.log(`Cycle: ${mem.cycles}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Findings: ${diagnosis.stats.total} (${diagnosis.stats.critical} critical, ${diagnosis.stats.warning} warning)`);
  console.log(`Improvements: ${results.length} (${appliedCount} applied, ${failedCount} failed, ${results.filter(r => r.skipped).length} skipped)`);
  console.log(`Models: ${diagnosis.models.online}/${diagnosis.models.total} online`);
  console.log(`Changes: ${gitBridge.status().dirty ? 'PENDING (git dirty)' : 'none'}`);

  return {
    ok: true,
    cycle: mem.cycles,
    duration,
    diagnosis: {
      total: diagnosis.stats.total,
      critical: diagnosis.stats.critical,
      warning: diagnosis.stats.warning,
      online: diagnosis.models.online,
      total_models: diagnosis.models.total
    },
    improvements: {
      total: results.length,
      applied: appliedCount,
      failed: failedCount,
      skipped: results.filter(r => r.skipped).length
    },
    gitStatus: gitBridge.status()
  };
}

// ─── Entry point ───

if (require.main === module) {
  runCycle()
    .then(result => {
      console.log('\nResultado:', JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    })
    .catch(e => {
      console.error('\n[see] Error fatal:', e.message);
      console.error(e.stack);
      process.exit(1);
    });
} else {
  module.exports = { runCycle };
}
