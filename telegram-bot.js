// Telegram Bot - Carbonato Proxy Monitor
// Checks models, sends alerts for failures, daily stats
const TOKEN = '8626223246:AAHjPOi_cY1pK0rjwK3W43f4MHBfaOF7ePI';
const CHAT_ID = '7507526979';
const API = `https://api.telegram.org/bot${TOKEN}`;
const BASE = process.env.BASE_URL || 'http://localhost:3456';

function sendMsg(text) {
  return fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
  }).then(r => r.json());
}

async function checkModels() {
  const models = [];
  for (let i = 1; i <= 16; i++) {
    const name = 'modelo' + i;
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: name,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(15000)
      });
      const ok = res.ok;
      models.push({ name, ok });
    } catch {
      models.push({ name, ok: false });
    }
  }
  return models;
}

async function sendDailyStats() {
  let db = { usages: [], stats: {} };
  try { db = JSON.parse(require('fs').readFileSync('/tmp/usage-db.json', 'utf8')); } catch {}
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
  
  // Default: check models
  const results = await checkModels();
  const failed = results.filter(r => !r.ok);
  
  if (failed.length > 0) {
    const list = failed.map(f => `⛔ ${f.name}`).join('\n');
    await sendMsg(
      `<b>🚨 MODELOS CAÍDOS</b>\n\n` +
      `Se detectaron ${failed.length} modelo(s) sin respuesta:\n${list}\n\n` +
      `⏱ ${new Date().toLocaleString('es-CR')}`
    );
  }
  
  // If all ok, send weekly status (only on Sundays or if more than 6 failed)
  if (failed.length === 0 && new Date().getDay() === 0) {
    const allOk = results.map(r => `✅ ${r.name}`).join('\n');
    await sendMsg(`<b>✅ MONITOREO SEMANAL</b>\n\nTodos los 16 modelos responden correctamente.\n\n${allOk}`);
  }
}

main().catch(e => {
  require('fs').appendFileSync('/tmp/telegram-bot-errors.log', new Date().toISOString() + ' ' + e.message + '\n');
});
