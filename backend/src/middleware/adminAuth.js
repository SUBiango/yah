const { config } = require('../utils/config');
const { verifyToken } = require('../utils/adminToken');

/**
 * Require a valid admin session token on every protected admin request.
 *
 * The client obtains a token from POST /api/admin/login and sends it as
 * `Authorization: Bearer <token>` (or the `x-admin-key` header). Without a
 * configured server-side key, all admin endpoints are rejected — they are
 * never left open by default.
 */
function requireAdminAuth(req, res, next) {
  if (!config.admin.apiKey) {
    console.error('[ADMIN AUTH] ADMIN_API_KEY is not configured; rejecting admin request');
    return res.status(503).json({
      success: false,
      error: 'Admin API is not configured',
    });
  }

  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const provided = bearer || req.headers['x-admin-key'];

  if (!verifyToken(provided)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  next();
}

module.exports = { requireAdminAuth };
