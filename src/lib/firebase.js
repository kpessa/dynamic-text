import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { 
  getAuth, 
  connectAuthEmulator,
  signInAnonymously,
  onAuthStateChanged
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
let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with offline persistence
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  });
  
  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence not available in this browser');
    }
  });
  
  auth = getAuth(app);
  
  // Connect to Firebase Emulator if enabled
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    const firestorePort = import.meta.env.VITE_FIREBASE_FIRESTORE_PORT || 8080;
    const authPort = import.meta.env.VITE_FIREBASE_AUTH_PORT || 9099;
    
    connectFirestoreEmulator(db, host, firestorePort);
    connectAuthEmulator(auth, `http://${host}:${authPort}`);
    console.log('Connected to Firebase Emulator');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Authentication state management
let currentUser = null;
let authStateListeners = [];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authStateListeners.forEach(listener => listener(user));
});

// Auth helper functions
export const getCurrentUser = () => currentUser;

export const onAuthStateChange = (callback) => {
  authStateListeners.push(callback);
  // Call immediately with current state
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
};

export const signInAnonymouslyUser = async () => {
  try {
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