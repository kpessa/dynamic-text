import { initializeApp, type FirebaseApp } from 'firebase/app';
import { 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  initializeFirestore,
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

// Firebase configuration from environment variables (Node.js compatible)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with offline persistence
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  });
  
  // For Node.js scripts, we typically don't need offline persistence
  // Skip enableIndexedDbPersistence as it's browser-only
  
  auth = getAuth(app);
  
  // Connect to Firebase Emulator if enabled
  if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const host = process.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    const firestorePort = Number(process.env.VITE_FIREBASE_FIRESTORE_PORT) || 8080;
    const authPort = Number(process.env.VITE_FIREBASE_AUTH_PORT) || 9099;
    
    connectFirestoreEmulator(db, host, firestorePort);
    connectAuthEmulator(auth, `http://${host}:${authPort}`);
    console.log('Connected to Firebase Emulator');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
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
  try {
    if (!auth) {
      throw new Error('Auth is not initialized');
    }
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
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
