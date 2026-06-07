const crypto = require('crypto');

function getSecret() {
  return process.env.SESSION_SECRET || 'carbonato-2026-session-secret';
}

// Genera token firmado HMAC-SHA256: timestamp.hmac
function signToken() {
  const secret = getSecret();
  const ts = Date.now();
  const data = `admin:${ts}`;
  const mac = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${ts}.${mac}`;
}

// Verifica cookie admin_sess=<token>
function verifyCookie(cookie) {
  if (!cookie) return false;
  const match = cookie.match(/(?:^|;\s*)admin_sess=([^;]+)/);
  if (!match) return false;
  const token = match[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [ts, mac] = parts;
    const secret = getSecret();
    const data = `admin:${ts}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
    if (mac.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  } catch (e) {
    return false;
  }
}

module.exports = { signToken, verifyCookie };
