import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/**
 * When Firebase env vars are missing the app still runs read-only: FPL data is shown with default
 * settings, and admin features / saved months are unavailable. Useful for first-run and previews.
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  if (env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export const firebaseAuth = auth;
export const firestore = db;

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Firebase is not configured. Add your project settings to .env.local (see .env.example).',
    );
    this.name = 'FirebaseNotConfiguredError';
  }
}

export function requireFirestore(): Firestore {
  if (!db) throw new FirebaseNotConfiguredError();
  return db;
}

export function requireAuth(): Auth {
  if (!auth) throw new FirebaseNotConfiguredError();
  return auth;
}
