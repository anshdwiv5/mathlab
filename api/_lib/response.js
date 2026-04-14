/**
 * Standard response helpers.
 * Every API handler should use these for consistency.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
};

/** Apply CORS headers. Call at the top of every handler. */
function cors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

/** Handle OPTIONS preflight */
function preflight(req, res) {
  if (req.method === 'OPTIONS') { cors(res); res.status(200).end(); return true; }
  return false;
}

/** 200 success */
function ok(res, data = {}) {
  cors(res);
  return res.status(200).json({ ok: true, data });
}

/** 4xx / 5xx error */
function fail(res, message, status = 400) {
  cors(res);
  console.error(`[${status}] ${message}`);
  return res.status(status).json({ ok: false, error: message });
}

/** Handle errors thrown from auth helpers (they carry a .status) */
function handleError(res, e) {
  return fail(res, e.message, e.status || 500);
}

/** Assert required fields are present in body */
function requireFields(body, fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      throw Object.assign(new Error(`Missing required field: ${f}`), { status: 400 });
    }
  }
}

module.exports = { cors, preflight, ok, fail, handleError, requireFields };
