// Telegram Bot - Carbonato Proxy Monitor v2
// Llama a /api/health/check en Vercel (no prueba modelos localmente)
const TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHATID || '').trim();
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : '';
const BASE = process.env.BASE_URL || 'https://carbonato-proxy.vercel.app';
const fs = require('fs');

function sendMsg(text) {
  if (!TOKEN || !CHAT_ID) {
    throw new Error('TELEGRAM env config missing: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID');
  }
  return fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
  }).then(r => r.json());
}

async function checkModels() {
  // Llama al endpoint health de Vercel que prueba los 16 modelos
  const res = await fetch(`${BASE}/api/health/check`, {
    signal: AbortSignal.timeout(120000)
  });
  const data = await res.json();
  if (!data.ok || !Array.isArray(data.results)) {
    throw new Error('Respuesta inválida de health check: ' + JSON.stringify(data).slice(0, 200));
  }
  return data.results;
}

async function sendDailyStats() {
  let db = { usages: [], stats: {} };
  try { db = JSON.parse(fs.readFileSync('/tmp/usage-db.json', 'utf8')); } catch {}
  const stats = db.stats || {};
  const usages = db.usages || [];
  let totalReq = 0, totalTok = 0;
  Object.values(stats).forEach(s => {
    totalReq += s.totalRequests || 0;
    totalTok += s.totalTokens || 0;
  });
  const today = new Date().toISOString().split('T')[0];
  const todayReqs = usages.filter(u => (u.timestamp||'').startsWith(today)).length;
  const todayToks = usages.filter(u => (u.timestamp||'').startsWith(today)).reduce((a,u) => a+(u.tokens||0), 0);

  await sendMsg(
    `<b>📊 CARBONATO PROXY — RESUMEN DIARIO</b>\n\n` +
    `📆 ${new Date().toLocaleDateString('es-CR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}\n\n` +
    `📈 <b>Totales acumulados:</b>\n` +
    `  Requests: ${totalReq.toLocaleString()}\n` +
    `  Tokens: ${totalTok.toLocaleString()}\n\n` +
    `📆 <b>Hoy:</b>\n` +
    `  Requests: ${todayReqs}\n` +
    `  Tokens: ${todayToks.toLocaleString()}\n\n` +
    `🟢 Sistema activo · 16 modelos · 4 proveedores`
  );
}

async function main() {
  const mode = process.argv[2] || 'check';

  if (mode === 'stats') {
    await sendDailyStats();
    return;
  }

  if (mode === 'test') {
    const r = await sendMsg('<b>🔬 CARBONATO PROXY</b>\n\nSistema de monitoreo activo ✅\nPróxima verificación en 30 min');
    console.log('Test sent:', JSON.stringify(r));
    return;
  }

  // Default: check models via /api/health/check
  const results = await checkModels();
  const failed = results.filter(r => r.status !== 'OK');

  if (failed.length > 0) {
    const list = failed.map(f => `⛔ ${f.model} (${f.name})`).join('\n');
    await sendMsg(
      `<b>🚨 MODELOS CAÍDOS</b>\n\n` +
      `Se detectaron ${failed.length} modelo(s) sin respuesta:\n${list}\n\n` +
      `⏱ ${new Date().toLocaleString('es-CR')}`
    );
  }

  // If all ok, send weekly status (only on Sundays)
  if (failed.length === 0 && new Date().getDay() === 0) {
    const allOk = results.map(r => `✅ ${r.model} — ${r.latency}`).join('\n');
    await sendMsg(`<b>✅ MONITOREO SEMANAL</b>\n\nTodos los 16 modelos responden correctamente.\n\n${allOk}`);
  }
}

main().catch(e => {
  fs.appendFileSync('/tmp/telegram-bot-errors.log', new Date().toISOString() + ' ' + e.message + '\n');
});
