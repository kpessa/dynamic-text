import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  connectFirestoreEmulator,
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
  type Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  connectAuthEmulator,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

try {
  // Check if Firebase app is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    // Use existing app
    app = existingApps[0]!;
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    // Initialize new app
    app = initializeApp(firebaseConfig);
    
    // Initialize Firestore with offline persistence using the new API
    try {
      db = initializeFirestore(app, {
        // Use the new cache configuration (replaces both cacheSizeBytes and enableIndexedDbPersistence)
        localCache: persistentLocalCache({
          cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
      });
    } catch (cacheError) {
      // If persistentLocalCache is not available, try without it
      try {
        db = initializeFirestore(app, {
          // No cache configuration - will use default memory cache
        });
      } catch (fallbackError) {
        // If already initialized, just get the existing instance
        db = getFirestore(app);
      }
    }
    
    auth = getAuth(app);
  }
  
  // Connect to Firebase Emulator if enabled
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    const firestorePort = Number(import.meta.env.VITE_FIREBASE_FIRESTORE_PORT) || 8080;
    const authPort = Number(import.meta.env.VITE_FIREBASE_AUTH_PORT) || 9099;
    
    connectFirestoreEmulator(db, host, firestorePort);
    connectAuthEmulator(auth, `http://${host}:${authPort}`);
    // console.log('Connected to Firebase Emulator');
  }
} catch (error) {
  // logError('Firebase initialization error:', error);
}
// Authentication state management
let currentUser: User | null = null;
let authStateListeners: ((user: User | null) => void)[] = [];

if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    authStateListeners.forEach(listener => listener(user));
  });
}

// Auth helper functions
export const getCurrentUser = (): User | null => currentUser;

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  authStateListeners.push(callback);
  // Call immediately with current state
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
};

export const signInAnonymouslyUser = async (): Promise<User> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Check Firebase configuration.');
  }
  
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    // logError('Anonymous sign-in error:', error);
    throw error;
  }
};

// Export initialized instances
export { app, db, auth };

// Collection references
export const COLLECTIONS = {
  INGREDIENTS: 'ingredients',
  REFERENCES: 'references',
  USERS: 'users',
  HEALTH_SYSTEMS: 'healthSystems',
  DOMAINS: 'domains',
  AUDIT_LOG: 'auditLog'
};

// Helper function to check if Firebase is properly configured
export const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};