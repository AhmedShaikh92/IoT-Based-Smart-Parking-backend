import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let serviceAccount;

try {
  // Try to use service account JSON from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    // Fall back to reading from file (for local development)
    serviceAccount = require('./serviceAccountKey.json');
  }
} catch (error) {
  console.error('❌ Firebase configuration error:', error.message);
  process.exit(1);
}

export default admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
});

export const db = admin.firestore();

// Enable offline persistence (optional, for better performance)
// db.enablePersistence().catch(err => console.log('Persistence error:', err));