/**
 * Auth helpers.
 *
 * Parents  → pass Firebase Auth ID token:   Authorization: Bearer <token>
 * Admin    → pass API secret:               x-api-key: <MATHLAB_API_KEY>
 */

const { getAdmin } = require('./firebase');

/**
 * Verify a Firebase Auth ID token from the Authorization header.
 * Returns the decoded token ({ uid, email, ... }) or throws.
 */
async function verifyParent(req) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw Object.assign(new Error('Missing Bearer token'), { status: 401 });

  const { auth } = getAdmin();
  try {
    return await auth.verifyIdToken(token);
  } catch (e) {
    throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
  }
}

/**
 * Verify the admin API key from the x-api-key header.
 * Throws if missing or wrong.
 */
function verifyAdmin(req) {
  const key      = req.headers['x-api-key'] || '';
  const expected = process.env.MATHLAB_API_KEY || 'mathlab-api-2026';
  if (!key || key !== expected) {
    throw Object.assign(new Error('Invalid API key'), { status: 401 });
  }
}

module.exports = { verifyParent, verifyAdmin };
