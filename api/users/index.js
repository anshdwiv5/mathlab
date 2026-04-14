/**
 * POST /api/users
 *
 * action = 'approve'
 *   Body: { action, userId, totalClassesMonth, monthlyFee, syllabusSchedule, syllabusTopics }
 *
 * action = 'reject'
 *   Body: { action, userId }
 *
 * action = 'update-topics'
 *   Body: { action, userId, syllabusTopics: [{ name, status }] }
 *
 * action = 'update-schedule'
 *   Body: { action, userId, syllabusSchedule: [{ month, week, topic, type }] }
 *
 * action = 'update-topic-status'
 *   Body: { action, userId, topicIndex, status }
 *
 * action = 'update-tcm'
 *   Body: { action, userId, totalClassesMonth }
 *
 * action = 'update-fee'
 *   Body: { action, userId, monthlyFee }
 *
 * All require admin auth.
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
    requireFields(body, ['action', 'userId']);

    const { db }     = getAdmin();
    const { action, userId } = body;
    const userRef    = db.ref(`users/${userId}`);

    if (action === 'approve') {
      requireFields(body, ['totalClassesMonth']);
      const tcm     = Number(body.totalClassesMonth);
      const fee     = Number(body.monthlyFee) || 0;
      const updates = {
        status:             'approved',
        totalClassesMonth:  tcm,
        monthlyFee:         fee,
        syllabusSchedule:   body.syllabusSchedule || [],
        syllabusTopics:     (body.syllabusTopics || [])
                              .filter(t => t.name?.trim())
                              .map(t => ({ name: t.name.trim(), status: t.status || 'not_started' }))
      };
      await userRef.update(updates);

      // Create fee record for current month
      const ym = currentYM();
      await db.ref(`fees/${userId}/${ym}`).set({
        amount:         fee,
        status:         'unpaid',
        paidAt:         null,
        markedByParent: false,
        reminderSent:   false
      });

      return ok(res, { userId, ...updates });
    }

    if (action === 'reject') {
      await userRef.update({ status: 'rejected' });
      return ok(res, { userId, status: 'rejected' });
    }

    if (action === 'update-topics') {
      requireFields(body, ['syllabusTopics']);
      const topics = (body.syllabusTopics || [])
        .filter(t => t.name?.trim())
        .map(t => ({ name: t.name.trim(), status: t.status || 'not_started' }));
      await userRef.update({ syllabusTopics: topics });
      return ok(res, { userId, syllabusTopics: topics });
    }

    if (action === 'update-schedule') {
      requireFields(body, ['syllabusSchedule']);
      const schedule = (body.syllabusSchedule || []).filter(r => r.month && r.topic);
      await userRef.update({ syllabusSchedule: schedule });
      return ok(res, { userId, syllabusSchedule: schedule });
    }

    if (action === 'update-topic-status') {
      requireFields(body, ['topicIndex', 'status']);
      const snap   = await userRef.once('value');
      const user   = snap.val();
      const topics = [...(user.syllabusTopics || [])];
      if (!topics[body.topicIndex]) return fail(res, 'Topic index out of range');
      topics[body.topicIndex] = { ...topics[body.topicIndex], status: body.status };
      await userRef.update({ syllabusTopics: topics });
      return ok(res, { userId, topicIndex: body.topicIndex, status: body.status });
    }

    if (action === 'update-tcm') {
      requireFields(body, ['totalClassesMonth']);
      await userRef.update({ totalClassesMonth: Number(body.totalClassesMonth) });
      return ok(res, { userId, totalClassesMonth: Number(body.totalClassesMonth) });
    }

    if (action === 'update-fee') {
      requireFields(body, ['monthlyFee']);
      await userRef.update({ monthlyFee: Number(body.monthlyFee) });
      return ok(res, { userId, monthlyFee: Number(body.monthlyFee) });
    }

    return fail(res, `Unknown action: ${action}`);

  } catch (e) {
    return handleError(res, e);
  }
};

function currentYM() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}
