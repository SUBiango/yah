const crypto = require('crypto');
const { config } = require('./config');

/**
 * Minimal dependency-free signed token for admin sessions.
 *
 * Format: base64url(payloadJSON).base64url(HMAC-SHA256(payload, secret))
 * The secret is ADMIN_API_KEY, so tokens cannot be forged without it and
 * cannot be replayed after `exp`.
 */

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function createToken(ttlMs = DEFAULT_TTL_MS) {
  const secret = config.admin.apiKey;
  if (!secret) {
    throw new Error('ADMIN_API_KEY is not configured');
  }
  const payload = { exp: Date.now() + ttlMs, iat: Date.now() };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/**
 * Returns true for a valid, unexpired token OR for the raw ADMIN_API_KEY
 * (useful for server-to-server calls and tests). Uses timing-safe compares.
 */
function verifyToken(token) {
  const secret = config.admin.apiKey;
  if (!secret || !token) {
    return false;
  }

  // Accept the raw API key directly.
  if (safeEqual(token, secret)) {
    return true;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [payloadB64, providedSig] = parts;
  const expectedSig = sign(payloadB64, secret);
  if (!safeEqual(providedSig, expectedSig)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { createToken, verifyToken, safeEqual };
