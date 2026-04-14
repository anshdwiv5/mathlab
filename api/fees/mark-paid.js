/**
 * POST /api/fees/mark-paid
 *
 * Body:
 *   { uid, ym, action: 'pay' | 'unpay' | 'admin-update', amount?, status? }
 *
 * Auth:
 *   action = 'pay'          → parent Bearer token (uid must match)
 *   action = 'unpay'        → admin x-api-key
 *   action = 'admin-update' → admin x-api-key — respects status field, can update amount without changing status
 */

const { getAdmin }        = require('../_lib/firebase');
const { verifyParent, verifyAdmin } = require('../_lib/auth');
const { preflight, ok, fail, handleError, requireFields } = require('../_lib/response');

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'POST only', 405);

  try {
    const body = req.body || {};
    requireFields(body, ['uid', 'ym', 'action']);

    const { uid, ym, action, amount, status } = body;

    // ── Auth gate ──────────────────────────────────────────────────────
    if (action === 'pay') {
      const decoded = await verifyParent(req);
      if (decoded.uid !== uid) return fail(res, 'Forbidden: token uid mismatch', 403);
    } else {
      verifyAdmin(req);
    }

    // ── Build update ──────────────────────────────────────────────────
    const { db } = getAdmin();
    const ref    = db.ref(`fees/${uid}/${ym}`);

    let update;
    if (action === 'pay') {
      // Parent self-reports payment
      update = { status: 'paid', paidAt: new Date().toISOString(), markedByParent: true };
    } else if (action === 'unpay') {
      // Admin undoes payment — also update amount if provided
      update = { status: 'unpaid', paidAt: null, markedByParent: false };
      if (amount !== undefined) update.amount = Number(amount);
    } else if (action === 'admin-update') {
      // Admin edits — respects the status passed in, can update amount independently
      const resolvedStatus = status || 'unpaid';
      update = {
        status:         resolvedStatus,
        paidAt:         resolvedStatus === 'paid' ? new Date().toISOString() : null,
        markedByParent: false
      };
      if (amount !== undefined) update.amount = Number(amount);
    } else {
      return fail(res, `Unknown action: ${action}`);
    }

    await ref.update(update);

    // Return full updated record so frontend can sync state immediately
    const snap    = await ref.once('value');
    const updated = snap.val();

    return ok(res, { uid, ym, fee: updated });

  } catch (e) {
    return handleError(res, e);
  }
};
