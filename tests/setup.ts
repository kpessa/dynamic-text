import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Svelte 5 runes for testing
// Simple implementation that allows stores to work in test environment

// For $state, we need to return the actual value, not a proxy
globalThis.$state = <T>(initial: T): T => {
  return initial as T;
};

// For $derived, just call the function immediately
globalThis.$derived = (fn: () => any) => {
  return fn();
};

// For $effect, just call the function
globalThis.$effect = (fn: () => void | (() => void)) => {
  return fn();
};

// Mock Firebase functions for testing
vi.mock('../src/lib/firebase', () => ({
  db: {},
  COLLECTIONS: {
    INGREDIENTS: 'ingredients',
    HEALTH_SYSTEMS: 'healthSystems',
    AUDIT_LOG: 'auditLog'
  },
  getCurrentUser: vi.fn(() => ({ uid: 'test-user' })),
  signInAnonymouslyUser: vi.fn(() => Promise.resolve({ uid: 'test-user' }))
}));

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
  writeBatch: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  increment: vi.fn()
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});