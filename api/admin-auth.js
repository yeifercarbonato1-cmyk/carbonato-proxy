// Auth handler - POST /api/admin-auth
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'carbonato2026';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  let body = '';
  for await (const chunk of req) body += chunk;
  const p = new URLSearchParams(body);
  
  if (p.get('user') === ADMIN_USER && p.get('pass') === ADMIN_PASS) {
    res.setHeader('Set-Cookie', 'admin_sess=ok; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400');
    return res.writeHead(302, { 'Location': '/api/admin-panel' }).end();
  }
  
  return res.writeHead(302, { 'Location': '/api/admin?error=1' }).end();
};