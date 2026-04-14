/**
 * POST /api/classes
 *
 * action = 'create' — log a new class session
 *   Body: { action, userId, date, topic, homework?, hwDone? }
 *
 * action = 'update' — edit an existing class entry
 *   Body: { action, classId, date, topic, homework?, hwDone? }
 *
 * action = 'delete' — remove a class entry
 *   Body: { action, classId }
 *
 * action = 'toggle-hw' — flip HW done status
 *   Body: { action, classId, hwDone }
 *
 * All actions require admin auth (x-api-key).
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
    requireFields(body, ['action']);

    const { db }   = getAdmin();
    const { action } = body;

    if (action === 'create') {
      requireFields(body, ['userId', 'date', 'topic']);
      const entry = {
        userId:    body.userId,
        date:      body.date,
        topic:     body.topic,
        homework:  body.homework  || '',
        hwDone:    body.hwDone    || false,
        createdAt: new Date().toISOString()
      };
      const ref  = await db.ref('classes').push(entry);
      return ok(res, { id: ref.key, ...entry });
    }

    if (action === 'update') {
      requireFields(body, ['classId']);
      const update = {};
      if (body.date     !== undefined) update.date     = body.date;
      if (body.topic    !== undefined) update.topic    = body.topic;
      if (body.homework !== undefined) update.homework = body.homework;
      if (body.hwDone   !== undefined) update.hwDone   = body.hwDone;
      await db.ref(`classes/${body.classId}`).update(update);
      return ok(res, { classId: body.classId, updated: update });
    }

    if (action === 'delete') {
      requireFields(body, ['classId']);
      await db.ref(`classes/${body.classId}`).remove();
      return ok(res, { classId: body.classId, deleted: true });
    }

    if (action === 'toggle-hw') {
      requireFields(body, ['classId']);
      await db.ref(`classes/${body.classId}`).update({ hwDone: !!body.hwDone });
      return ok(res, { classId: body.classId, hwDone: !!body.hwDone });
    }

    return fail(res, `Unknown action: ${action}`);

  } catch (e) {
    return handleError(res, e);
  }
};
