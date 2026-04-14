/**
 * Firebase Admin SDK — singleton initializer.
 * Lazy-initializes once per cold start so it's safe in serverless.
 *
 * Required env vars (set in Vercel dashboard):
 *   FIREBASE_SERVICE_ACCOUNT  — full JSON of your service account key, as a string
 *   FIREBASE_DATABASE_URL     — e.g. https://mathlab-d5d4c-default-rtdb.asia-southeast1.firebasedatabase.app
 */

const admin = require('firebase-admin');

let initialized = false;

function getAdmin() {
  if (!initialized) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL ||
        'https://mathlab-d5d4c-default-rtdb.asia-southeast1.firebasedatabase.app'
    });
    initialized = true;
  }
  return {
    auth: admin.auth(),
    db:   admin.database()
  };
}

module.exports = { getAdmin };
