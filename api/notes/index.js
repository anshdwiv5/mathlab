/**
 * POST /api/notes
 *
 * action = 'save'
 *   Body: { action, userId, note, weekOf }
 *
 * Requires admin auth.
 */

const { getAdmin }     = require('../_lib/firebase');
const { verifyAdmin }  = require('../_lib/auth');
const { preflight, ok, fail, handleError, requireFields } = require('../_lib/response');

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'POST only', 405);

  try {
    verifyAdmin(req);
    const body = req.body || {};
    requireFields(body, ['userId', 'note']);

    const { db } = getAdmin();
    const record = {
      note:      body.note,
      weekOf:    body.weekOf || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    await db.ref(`notes/${body.userId}`).set(record);
    return ok(res, { userId: body.userId, ...record });

  } catch (e) {
    return handleError(res, e);
  }
};
