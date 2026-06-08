#!/usr/bin/env node
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) { console.error('ERROR: GITHUB_TOKEN no disponible'); process.exit(1); }
const GH_API = 'https://api.github.com/repos/yeifer125/proxi-datos/contents';

async function upsert(filePath, content) {
  const remotePath = `${filePath}.json`;
  const b64 = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
  let sha = null;
  try {
    const r = await fetch(`${GH_API}/${remotePath}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(8000)
    });
    if (r.ok) { const d = await r.json(); sha = d.sha; }
  } catch {}

  const body = { message: `reset: limpiar ${remotePath}`, content: b64 };
  if (sha) body.sha = sha;

  const res = await fetch(`${GH_API}/${remotePath}`, {
    method: 'PUT',
    headers: { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) { const txt = await res.text(); throw new Error(`GitHub ${remotePath}: ${res.status} - ${txt.slice(0, 100)}`); }
  console.log(`✅ ${remotePath} reseteado`);
}

(async () => {
  console.log('Resetting stored data...');
  await upsert('usage-db', { usages: [], stats: {} });
  await upsert('see-latest', {
    ok: true, message: 'Reset a 0', cycle: 0,
    timestamp: new Date().toISOString(),
    stats: { totalRequests: 0, totalTokens: 0, uniqueIPs: 0, modelsOnline: 0, modelsOffline: 0, criticalFindings: 0, improvementsTotal: 0 }
  });
  console.log('Done.');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
