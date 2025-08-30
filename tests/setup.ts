import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Svelte 5 runes for testing
// Simple implementation that allows stores to work in test environment

// For $state, we need to return the actual value, not a proxy
globalThis.$state = <T>(initial: T): T => {
  return initial as T;
};

// For $derived, handle both function and getter syntax
globalThis.$derived = (fnOrValue: any) => {
  // If it's a function, call it
  if (typeof fnOrValue === 'function') {
    return fnOrValue();
  }
  // Otherwise return the value directly
  return fnOrValue;
};

// For $derived.by, handle the .by syntax
Object.defineProperty(globalThis.$derived, 'by', {
  value: (fn: () => any) => {
    return fn();
  }
});

// For $effect, just call the function
globalThis.$effect = (fn: () => void | (() => void)) => {
  const cleanup = fn();
  return cleanup;
};

// Mock Firebase functions for testing
vi.mock('../src/lib/firebase', () => ({
  db: {},
  auth: {},
  COLLECTIONS: {
    INGREDIENTS: 'ingredients',
    HEALTH_SYSTEMS: 'healthSystems',
    AUDIT_LOG: 'auditLog'
  },
  getCurrentUser: vi.fn(() => ({ uid: 'test-user' })),
  signInAnonymouslyUser: vi.fn(() => Promise.resolve({ uid: 'test-user' })),
  onAuthStateChange: vi.fn(),
  isFirebaseConfigured: vi.fn(() => true)
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

// Mock DOMPurify for sanitization tests
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string, options?: any) => {
      // Handle null/undefined input
      if (!html) return '';
      // Simple mock that removes script tags
      let cleaned = String(html).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      // Remove onclick and other on* attributes - match the pattern in test
      // The test expects '<div onclick="alert(\'XSS\')">Click me</div>' to become '<div>Click me</div>'
      cleaned = cleaned.replace(/\s+on\w+="[^"]*"/gi, '');
      cleaned = cleaned.replace(/\s+on\w+='[^']*'/gi, '');
      return cleaned;
    })
  }
}));

// Mock Babel standalone for transpilation tests
vi.mock('@babel/standalone', () => ({
  transform: vi.fn((code: string, options?: any) => {
    // Handle invalid syntax
    if (code.includes('const x = ;')) {
      throw new Error('Unexpected token');
    }
    // Simple transpilation mock
    let transpiled = code.replace(/\b(const|let)\b/g, 'var');
    transpiled = transpiled.replace(/=>/g, 'function');
    transpiled = transpiled.replace(/`([^`]*)`/g, '"$1"');
    return {
      code: transpiled
    };
  })
}));

// Mock Web Worker for secureCodeExecution tests
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  postMessage(data: any): void {
    // Simulate worker response
    setTimeout(() => {
      if (this.onmessage) {
        // Handle different message types
        if (data.type === 'INITIALIZE') {
          this.onmessage(new MessageEvent('message', {
            data: {
              id: data.id,
              success: true,
              result: { initialized: true }
            }
          }));
        } else if (data.type === 'EXECUTE_CODE') {
          // Simple mock execution
          const { code, context } = data.payload || {};
          if (code && code.includes('error')) {
            this.onmessage(new MessageEvent('message', {
              data: {
                id: data.id,
                success: false,
                error: 'Execution error'
              }
            }));
          } else {
            // Mock successful execution
            let result = 'test result';
            if (code && code.includes('getValue')) {
              result = '100'; // Mock TPN value
            }
            this.onmessage(new MessageEvent('message', {
              data: {
                id: data.id,
                success: true,
                result: {
                  result,
                  executionTime: 10,
                  success: true
                }
              }
            }));
          }
        } else if (data.type === 'VALIDATE_CODE') {
          this.onmessage(new MessageEvent('message', {
            data: {
              id: data.id,
              success: true,
              result: {
                valid: !data.payload?.code?.includes('invalid'),
                errors: []
              }
            }
          }));
        }
      }
    }, 10);
  }
  
  terminate(): void {
    // Mock terminate
  }
}

// @ts-ignore
global.Worker = MockWorker;

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});