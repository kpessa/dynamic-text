# Firebase Testing Patterns and Best Practices

*Research Date: August 17, 2025*
*Project: Dynamic Text Editor - TPN Advisor*

## Overview

This research examines comprehensive Firebase testing strategies, focusing on practical solutions for testing Firestore operations, Firebase Auth, and complex service layers. Based on analysis of failing tests in `/src/lib/__tests__/firebaseDataService.test.ts` and the Firebase service implementation.

## Current Test Failure Analysis

### Root Causes Identified

1. **Incomplete Mock Configuration**: Firebase functions are mocked but don't return properly structured data
2. **Async Operation Handling**: Promises not properly mocked with realistic Firebase response structures
3. **Service Layer Complexity**: The Firebase service uses nested collections, batch operations, and complex business logic
4. **Missing Context**: Tests lack proper user authentication context and database state

### Specific Issues in Current Tests

```typescript
// PROBLEM: Oversimplified mock responses
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ name: 'Test Ingredient' })
  }))
}));

// ISSUE: Real service expects much more complex document structure
```

## Firebase Testing Best Practices

### 1. Proper Mock Structure for Firestore Documents

#### DocumentSnapshot Mock Pattern
```typescript
const createMockDocumentSnapshot = (data: any, exists = true) => ({
  exists: () => exists,
  data: () => exists ? data : undefined,
  id: 'mock-doc-id',
  ref: {
    id: 'mock-doc-id',
    path: 'mock/path'
  },
  metadata: {
    hasPendingWrites: false,
    fromCache: false
  }
});

const createMockQuerySnapshot = (docs: any[] = []) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map(doc => createMockDocumentSnapshot(doc)),
  forEach: (callback: (doc: any) => void) => {
    docs.forEach((doc, index) => {
      callback(createMockDocumentSnapshot(doc));
    });
  }
});
```

#### Collection and Query Mocks
```typescript
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();

// Chain query builders properly
mockQuery.mockImplementation(() => ({
  where: mockWhere.mockReturnThis(),
  orderBy: mockOrderBy.mockReturnThis()
}));
```

### 2. Comprehensive Firebase Service Mocking

#### Complete Mock Setup
```typescript
// Mock Firebase configuration
vi.mock('../firebase', () => ({
  db: {
    app: {
      options: {
        projectId: 'test-project'
      }
    }
  },
  auth: {
    currentUser: { uid: 'test-user-123' }
  },
  COLLECTIONS: {
    INGREDIENTS: 'ingredients',
    HEALTH_SYSTEMS: 'healthSystems',
    AUDIT_LOG: 'auditLog'
  },
  getCurrentUser: vi.fn(() => ({ uid: 'test-user-123' })),
  signInAnonymouslyUser: vi.fn(() => Promise.resolve({ uid: 'test-user-123' })),
  onAuthStateChange: vi.fn(),
  isFirebaseConfigured: vi.fn(() => true)
}));

// Mock Firestore with realistic responses
vi.mock('firebase/firestore', () => {
  const mockDocRef = {
    id: 'test-ingredient-id',
    path: 'ingredients/test-ingredient-id'
  };

  return {
    collection: vi.fn(),
    doc: vi.fn(() => mockDocRef),
    setDoc: vi.fn(() => Promise.resolve()),
    getDoc: vi.fn(),
    deleteDoc: vi.fn(() => Promise.resolve()),
    getDocs: vi.fn(),
    updateDoc: vi.fn(() => Promise.resolve()),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => new Date().toISOString()),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve())
    })),
    arrayUnion: vi.fn((value) => ({ type: 'arrayUnion', value })),
    arrayRemove: vi.fn((value) => ({ type: 'arrayRemove', value })),
    increment: vi.fn((value) => ({ type: 'increment', value })),
    onSnapshot: vi.fn()
  };
});
```

### 3. Service-Specific Test Patterns

#### Testing Ingredient Service
```typescript
describe('Ingredient Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup realistic ingredient document
    const mockIngredientDoc = createMockDocumentSnapshot({
      id: 'calcium-gluconate',
      name: 'Calcium (Gluconate)',
      category: 'Electrolytes',
      healthSystem: 'test-health',
      populationType: 'Neonatal',
      sections: [{ type: 'text', content: 'Test content' }],
      version: 1,
      createdAt: '2025-08-17T10:00:00.000Z',
      lastModified: '2025-08-17T10:00:00.000Z'
    });
    
    vi.mocked(getDoc).mockResolvedValue(mockIngredientDoc);
  });

  it('should save ingredient with proper version tracking', async () => {
    const mockIngredient: IngredientData = {
      name: 'Calcium (Gluconate)',
      category: 'Electrolytes',
      sections: [{ type: 'text', content: 'Test content' }],
      healthSystem: 'test-health',
      populationType: 'Neonatal'
    };

    const result = await ingredientService.saveIngredient(mockIngredient);
    
    expect(setDoc).toHaveBeenCalledWith(
      expect.any(Object), // Document reference
      expect.objectContaining({
        name: 'Calcium (Gluconate)',
        version: 2, // Should increment from mock version 1
        contentHash: expect.any(String),
        lastModified: expect.any(String)
      })
    );
    
    expect(result).toBe('calcium-gluconate');
  });
});
```

#### Testing Async Operations and Error Handling
```typescript
describe('Error Handling', () => {
  it('should handle Firestore permission errors', async () => {
    const permissionError = new Error('Missing or insufficient permissions');
    permissionError.code = 'permission-denied';
    
    vi.mocked(getDoc).mockRejectedValue(permissionError);
    
    await expect(ingredientService.getAllIngredients())
      .rejects
      .toThrow('Missing or insufficient permissions');
  });

  it('should handle network failures gracefully', async () => {
    const networkError = new Error('Failed to fetch');
    networkError.code = 'unavailable';
    
    vi.mocked(getDocs).mockRejectedValue(networkError);
    
    await expect(ingredientService.getAllIngredients())
      .rejects
      .toThrow('Failed to fetch');
  });
});
```

### 4. Testing Complex Firestore Queries

#### Query Result Mocking
```typescript
describe('Query Operations', () => {
  it('should filter ingredients by category', async () => {
    const mockIngredients = [
      { name: 'Calcium', category: 'Electrolytes' },
      { name: 'Sodium', category: 'Electrolytes' }
    ];
    
    const mockSnapshot = createMockQuerySnapshot(mockIngredients);
    vi.mocked(getDocs).mockResolvedValue(mockSnapshot);
    
    const result = await ingredientService.getIngredientsByCategory('Electrolytes');
    
    expect(query).toHaveBeenCalledWith(
      expect.any(Object), // collection reference
      where('category', '==', 'Electrolytes'),
      orderBy('name', 'asc')
    );
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Calcium');
  });
});
```

### 5. Testing Nested Collections and References

#### Reference Service Testing
```typescript
describe('Reference Service', () => {
  it('should save reference under ingredient with proper nesting', async () => {
    const ingredientId = 'calcium-gluconate';
    const mockReference = {
      configId: 'test-config',
      healthSystem: 'test-health',
      sections: [{ type: 'js', content: 'return me.getValue("CA_MEQ");' }]
    };

    // Mock nested collection structure
    const mockRefDoc = {
      id: 'test-ref-id',
      path: `ingredients/${ingredientId}/references/test-ref-id`
    };
    
    vi.mocked(doc).mockReturnValue(mockRefDoc);
    
    const result = await referenceService.saveReference(ingredientId, mockReference);
    
    expect(doc).toHaveBeenCalledWith(
      expect.any(Object), // db
      'ingredients',
      ingredientId,
      'references',
      expect.any(String) // generated reference ID
    );
    
    expect(setDoc).toHaveBeenCalledWith(
      mockRefDoc,
      expect.objectContaining({
        configId: 'test-config',
        ingredientId: ingredientId,
        version: expect.any(Number)
      })
    );
  });
});
```

### 6. Testing Batch Operations

#### Batch Write Testing
```typescript
describe('Batch Operations', () => {
  it('should clear all ingredients using batch writes', async () => {
    const mockBatch = {
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve())
    };
    
    vi.mocked(writeBatch).mockReturnValue(mockBatch);
    
    const mockDocs = [
      { ref: { id: 'ingredient1' } },
      { ref: { id: 'ingredient2' } }
    ];
    
    vi.mocked(getDocs).mockResolvedValue({
      docs: mockDocs,
      size: 2
    });
    
    const deletedCount = await ingredientService.clearAllIngredients();
    
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
    expect(deletedCount).toBe(2);
  });
});
```

### 7. Testing Firebase Auth Integration

#### Auth Context Testing
```typescript
describe('Authentication Integration', () => {
  it('should sign in anonymously when no user is present', async () => {
    // Mock no current user
    vi.mocked(getCurrentUser).mockReturnValue(null);
    
    const mockUser = { uid: 'anonymous-user-123' };
    vi.mocked(signInAnonymouslyUser).mockResolvedValue(mockUser);
    
    const ingredient = { name: 'Test' };
    await ingredientService.saveIngredient(ingredient);
    
    expect(signInAnonymouslyUser).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        createdBy: 'anonymous-user-123'
      })
    );
  });
});
```

## Mock Data Strategies

### 1. Realistic Test Data
```typescript
const createTestIngredient = (overrides = {}): IngredientData => ({
  id: 'test-ingredient',
  name: 'Test Ingredient',
  category: 'Test Category',
  description: 'Test description',
  healthSystem: 'test-health',
  populationType: 'Neonatal',
  sections: [
    { id: 1, type: 'text', content: 'Static content' },
    { id: 2, type: 'js', content: 'return me.getValue("TEST");', testCases: [] }
  ],
  version: 1,
  createdAt: '2025-08-17T10:00:00.000Z',
  lastModified: '2025-08-17T10:00:00.000Z',
  createdBy: 'test-user',
  modifiedBy: 'test-user',
  ...overrides
});
```

### 2. Mock Data Builders
```typescript
class MockFirebaseBuilder {
  private docs: Map<string, any> = new Map();
  
  addDocument(collection: string, id: string, data: any) {
    this.docs.set(`${collection}/${id}`, data);
    return this;
  }
  
  mockGetDoc(path: string) {
    const data = this.docs.get(path);
    return createMockDocumentSnapshot(data, !!data);
  }
  
  mockGetDocs(collectionPath: string) {
    const docs = Array.from(this.docs.entries())
      .filter(([path]) => path.startsWith(collectionPath))
      .map(([, data]) => data);
    return createMockQuerySnapshot(docs);
  }
}
```

## Common Pitfalls and Solutions

### 1. Firestore Document References
```typescript
// ❌ WRONG: Mock returns plain object
vi.mocked(doc).mockReturnValue({ id: 'test' });

// ✅ CORRECT: Mock returns proper DocumentReference structure
vi.mocked(doc).mockReturnValue({
  id: 'test-id',
  path: 'collection/test-id',
  parent: { path: 'collection' },
  firestore: mockDb
});
```

### 2. ServerTimestamp Handling
```typescript
// ❌ WRONG: Returns actual Firebase timestamp object
serverTimestamp: vi.fn(() => ({ serverTimestamp: true })),

// ✅ CORRECT: Returns ISO string for testing
serverTimestamp: vi.fn(() => new Date().toISOString()),
```

### 3. Query Chain Building
```typescript
// ❌ WRONG: Each query method returns new mock
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();

// ✅ CORRECT: Chain methods return same query object
const mockQuery = {
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis()
};
```

### 4. Async Error Testing
```typescript
// ❌ WRONG: Not testing async rejection properly
expect(() => service.method()).toThrow();

// ✅ CORRECT: Proper async error testing
await expect(service.method()).rejects.toThrow();
```

## Integration with Testing Libraries

### Using Firebase Admin SDK for Tests
```typescript
// For more realistic testing with actual Firebase
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const testEnv = await initializeTestEnvironment({
  projectId: 'test-project',
  firestore: {
    rules: fs.readFileSync('firestore.rules', 'utf8')
  }
});

// Use in tests for real Firebase operations
const db = testEnv.authenticatedContext('test-user').firestore();
```

### Firebase Emulator Integration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./src/test-setup.ts'],
    environment: 'jsdom'
  }
});

// src/test-setup.ts
import { connectFirestoreEmulator } from 'firebase/firestore';

if (process.env.VITEST) {
  // Connect to emulator for integration tests
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Test Organization Strategies

### 1. Separate Unit and Integration Tests
```
src/
├── lib/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── firebaseDataService.unit.test.ts
│   │   │   └── ingredientService.unit.test.ts
│   │   └── integration/
│   │       ├── firestore.integration.test.ts
│   │       └── auth.integration.test.ts
```

### 2. Test Categories
- **Unit Tests**: Mock all Firebase operations
- **Integration Tests**: Use Firebase emulator
- **E2E Tests**: Use real Firebase with test data

### 3. Test Data Management
```typescript
// test-data/firebase-fixtures.ts
export const fixtures = {
  ingredients: {
    calcium: createTestIngredient({ name: 'Calcium' }),
    sodium: createTestIngredient({ name: 'Sodium' })
  },
  references: {
    neonatal: createTestReference({ populationType: 'Neonatal' })
  }
};
```

## Performance Testing

### Testing Query Performance
```typescript
it('should efficiently query large collections', async () => {
  const startTime = performance.now();
  
  await ingredientService.getAllIngredients();
  
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(100); // ms
});
```

### Memory Leak Testing
```typescript
it('should not leak memory with subscriptions', async () => {
  const unsubscribe = ingredientService.subscribeToIngredients(() => {});
  
  // Simulate component unmount
  unsubscribe();
  
  // Verify cleanup
  expect(mockOnSnapshot).toHaveBeenCalledWith(
    expect.any(Object),
    expect.any(Function)
  );
});
```

## Conclusion

Effective Firebase testing requires:

1. **Comprehensive Mocking**: Properly structured mocks that match Firebase API behavior
2. **Realistic Test Data**: Mock data that reflects actual application usage
3. **Error Scenario Coverage**: Testing network failures, permission errors, and edge cases
4. **Async Operation Handling**: Proper Promise-based testing patterns
5. **Service Layer Testing**: Testing business logic separately from Firebase operations

The key to successful Firebase testing is understanding that Firebase operations are complex and require detailed mocking to properly simulate real-world behavior. Focus on testing business logic while ensuring Firebase interactions are properly isolated and mocked.

## Related Patterns

- [[Service Layer Testing Patterns]]
- [[Async Operation Testing]]
- [[Error Handling Patterns]]
- [[Mock Data Strategies]]

---

*Research conducted for Dynamic Text Editor project - TPN Advisor Functions*
*Focus: Production-ready Firebase testing strategies*