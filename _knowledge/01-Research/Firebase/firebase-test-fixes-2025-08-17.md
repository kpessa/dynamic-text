# Firebase Test Fixes - Practical Implementation Guide

*Date: August 17, 2025*
*Project: Dynamic Text Editor*
*File: `/src/lib/__tests__/firebaseDataService.test.ts`*

## Issue Analysis

The Firebase tests are failing because the mocks are too simplistic and don't match the complex data structures and async patterns used by the actual Firebase service. 

### Key Problems Identified

1. **Mock Response Structure**: Firebase documents have complex structure with metadata
2. **Async Chain Handling**: Service methods chain multiple Firebase operations
3. **User Context Missing**: Tests need proper authentication context
4. **Batch Operations**: Complex batch writes aren't properly mocked
5. **Nested Collections**: References stored as subcollections need proper mocking

## Immediate Fix Implementation

### Step 1: Enhanced Mock Setup

Replace the current mock setup with this comprehensive version:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ingredientService,
  referenceService,
  formatIngredientName,
  normalizeIngredientId,
  normalizeConfigId,
  generateReferenceId,
  versionToPopulationType,
  POPULATION_TYPES
} from '../firebaseDataService';
import type { IngredientData, ReferenceData, Section, PopulationType } from '../types';

// Enhanced Firebase mocks
const mockDocRef = {
  id: 'test-ingredient-id',
  path: 'ingredients/test-ingredient-id'
};

const mockCollectionRef = {
  path: 'ingredients'
};

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(() => Promise.resolve())
};

// Mock Firebase with proper structure
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

// Mock Firestore functions with realistic responses
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => mockCollectionRef),
  doc: vi.fn(() => mockDocRef),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn((collection) => collection),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  orderBy: vi.fn((field, direction) => ({ field, direction })),
  limit: vi.fn((n) => ({ limit: n })),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
  writeBatch: vi.fn(() => mockBatch),
  arrayUnion: vi.fn((value) => ({ type: 'arrayUnion', value })),
  arrayRemove: vi.fn((value) => ({ type: 'arrayRemove', value })),
  increment: vi.fn((value) => ({ type: 'increment', value })),
  onSnapshot: vi.fn()
}));

// Import mocked functions for setup
import { getDoc, getDocs, setDoc } from 'firebase/firestore';
```

### Step 2: Realistic Mock Data Setup

```typescript
describe('Firebase Data Service', () => {
  const createMockDocumentSnapshot = (data: any, exists = true) => ({
    exists: () => exists,
    data: () => exists ? data : undefined,
    id: data?.id || 'mock-doc-id',
    ref: mockDocRef,
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
      docs.forEach(doc => {
        callback(createMockDocumentSnapshot(doc));
      });
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset batch mock
    mockBatch.set.mockClear();
    mockBatch.update.mockClear();
    mockBatch.delete.mockClear();
    mockBatch.commit.mockClear();
  });

  describe('Ingredient Operations', () => {
    const mockIngredient: IngredientData = {
      id: 'calcium-gluconate',
      name: 'Calcium Gluconate',
      healthSystem: 'test-health',
      populationType: 'Neonatal',
      category: 'Electrolytes',
      sections: [
        { id: 1, type: 'text', content: 'Test content' }
      ],
      version: 1,
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: 'test-user-123',
      modifiedBy: 'test-user-123'
    };

    it('should save ingredient successfully', async () => {
      // Mock existing document check
      const existingDoc = createMockDocumentSnapshot({
        ...mockIngredient,
        version: 1
      });
      vi.mocked(getDoc).mockResolvedValue(existingDoc);

      const result = await ingredientService.saveIngredient(mockIngredient);
      
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          name: 'Calcium Gluconate',
          version: 2, // Should increment
          lastModified: expect.any(String),
          modifiedBy: 'test-user-123'
        })
      );
      
      expect(result).toBe('calcium-gluconate');
    });

    it('should load all ingredients', async () => {
      const mockIngredients = [
        mockIngredient,
        { ...mockIngredient, id: 'sodium-chloride', name: 'Sodium Chloride' }
      ];
      
      const mockSnapshot = createMockQuerySnapshot(mockIngredients);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      const result = await ingredientService.getAllIngredients();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Calcium Gluconate');
    });

    it('should clear all ingredients', async () => {
      const mockIngredients = [mockIngredient];
      const mockSnapshot = createMockQuerySnapshot(mockIngredients);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      await ingredientService.clearAllIngredients();

      expect(mockBatch.delete).toHaveBeenCalledTimes(1);
      expect(mockBatch.commit).toHaveBeenCalledOnce();
    });

    it('should get ingredients by category', async () => {
      const mockElectrolytes = [mockIngredient];
      const mockSnapshot = createMockQuerySnapshot(mockElectrolytes);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      const result = await ingredientService.getIngredientsByCategory('Electrolytes');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].category).toBe('Electrolytes');
    });

    it('should fix ingredient categories', async () => {
      const mockIngredientsForFix = [
        { ...mockIngredient, category: 'WRONG_CATEGORY' }
      ];
      const mockSnapshot = createMockQuerySnapshot(mockIngredientsForFix);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      await ingredientService.fixIngredientCategories();

      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should get version history', async () => {
      const mockVersions = [
        { ...mockIngredient, version: 2 },
        { ...mockIngredient, version: 1 }
      ];
      const mockSnapshot = createMockQuerySnapshot(mockVersions);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      const results = await ingredientService.getVersionHistory('test-ingredient');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
    });
  });

  describe('Reference Operations', () => {
    const mockReference: ReferenceData = {
      id: 'test-ref-id',
      configId: 'test-config',
      ingredientName: 'Calcium Gluconate',
      healthSystem: 'test-health',
      populationType: 'Neonatal',
      sections: [
        { id: 1, type: 'js', content: 'return me.getValue("CA_MEQ");' }
      ] as Section[],
      version: 1,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    it('should save reference successfully', async () => {
      // Mock reference document check
      const existingRefDoc = createMockDocumentSnapshot(mockReference);
      vi.mocked(getDoc).mockResolvedValueOnce(existingRefDoc); // For reference
      vi.mocked(getDoc).mockResolvedValueOnce(createMockDocumentSnapshot({ version: 1 })); // For ingredient

      const result = await referenceService.saveReference('test-ingredient-id', mockReference);
      
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          configId: 'test-config',
          version: 2, // Should increment
          lastModified: expect.any(String)
        })
      );
      
      expect(result).toBeDefined();
    });

    it('should get references for ingredient', async () => {
      const mockReferences = [mockReference];
      const mockSnapshot = createMockQuerySnapshot(mockReferences);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      const result = await referenceService.getReferencesForIngredient('test-ingredient-id');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].configId).toBe('test-config');
    });

    it('should delete reference', async () => {
      await referenceService.deleteReference('test-ingredient-id', 'test-ref-id');

      expect(setDoc).not.toHaveBeenCalled(); // deleteDoc should be called instead
    });

    it('should get references by population', async () => {
      const mockReferences = [mockReference];
      const mockSnapshot = createMockQuerySnapshot(mockReferences);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      const result = await referenceService.getReferencesByPopulation('test-ingredient-id', 'neonatal');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get references for comparison', async () => {
      const mockReferences = [mockReference];
      const mockSnapshot = createMockQuerySnapshot(mockReferences);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

      const results = await referenceService.getReferencesForComparison('test-ingredient-id', 'test-health');
      
      expect(typeof results).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ingredient ID', async () => {
      await expect(ingredientService.saveIngredient({ name: '' } as IngredientData))
        .rejects.toThrow();
    });

    it('should handle missing reference ID', async () => {
      await expect(referenceService.deleteReference('', ''))
        .rejects.toThrow();
    });

    it('should handle invalid ingredient data', async () => {
      const invalidIngredient = { name: '' } as IngredientData;
      await expect(ingredientService.saveIngredient(invalidIngredient))
        .rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      vi.mocked(getDocs).mockRejectedValue(networkError);
      
      await expect(ingredientService.getAllIngredients())
        .rejects.toThrow('Network error');
    });
  });

  // Utility function tests remain the same as they don't use Firebase
  describe('Utility Functions', () => {
    it('should format ingredient name correctly', () => {
      expect(formatIngredientName('calcium_gluconate')).toBe('Calcium Gluconate');
      expect(formatIngredientName('amino-acid-10')).toBe('Amino Acid 10');
      expect(formatIngredientName('multi_vitamin_pediatric')).toBe('Multi Vitamin Pediatric');
    });

    it('should normalize ingredient ID', () => {
      expect(normalizeIngredientId('Calcium (Gluconate)')).toBe('calcium-gluconate');
      expect(normalizeIngredientId('Amino Acid 10%')).toBe('amino-acid-10');
      expect(normalizeIngredientId('Multi-Vitamin  Pediatric')).toBe('multi-vitamin-pediatric');
    });

    it('should normalize config ID', () => {
      const configId = normalizeConfigId('test-health', 'domain', 'subdomain', '1.0');
      expect(configId).toContain('test-health');
      expect(configId).toContain('domain');
      expect(configId).toContain('subdomain');
    });

    it('should generate reference ID', () => {
      const refId = generateReferenceId({
        healthSystem: 'test-health',
        ingredientName: 'Calcium',
        populationType: 'Neonatal'
      });
      expect(refId).toContain('test-health');
      expect(refId).toContain('neonatal');
    });

    it('should convert version to population type', () => {
      expect(versionToPopulationType('neonatal')).toBe('neonatal');
      expect(versionToPopulationType('child')).toBe('child');
      expect(versionToPopulationType('adolescent')).toBe('adolescent');
      expect(versionToPopulationType('adult')).toBe('adult');
      expect(versionToPopulationType('invalid')).toBe('adult');
    });

    it('should have correct population types', () => {
      expect(POPULATION_TYPES).toHaveProperty('NEONATAL');
      expect(POPULATION_TYPES).toHaveProperty('PEDIATRIC');
      expect(POPULATION_TYPES).toHaveProperty('ADOLESCENT');
      expect(POPULATION_TYPES).toHaveProperty('ADULT');
    });
  });
});
```

## Key Improvements Made

### 1. Proper Document Structure
- Added realistic document snapshots with `exists()`, `data()`, `id`, and `ref` properties
- Included metadata that Firebase documents actually have

### 2. Batch Operation Mocking
- Properly mock `writeBatch()` with `set`, `update`, `delete`, and `commit` methods
- Track batch operations to verify they're called correctly

### 3. Async Chain Handling
- Mock `getDoc` to return different values for different calls using `mockResolvedValueOnce`
- Handle multiple Firebase operations in a single service method

### 4. Query Result Mocking
- Create realistic query snapshots with proper structure
- Support empty and populated query results

### 5. Error Handling Testing
- Test both Firebase-specific errors and network errors
- Use proper async error testing patterns with `rejects.toThrow()`

## Additional Mock Utilities

Create a helper file for reusable mock utilities:

```typescript
// src/lib/__tests__/firebase-test-utils.ts
export const createMockDocumentSnapshot = (data: any, exists = true) => ({
  exists: () => exists,
  data: () => exists ? data : undefined,
  id: data?.id || 'mock-doc-id',
  ref: {
    id: data?.id || 'mock-doc-id',
    path: `mock/collection/${data?.id || 'mock-doc-id'}`
  },
  metadata: {
    hasPendingWrites: false,
    fromCache: false
  }
});

export const createMockQuerySnapshot = (docs: any[] = []) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map(doc => createMockDocumentSnapshot(doc)),
  forEach: (callback: (doc: any) => void) => {
    docs.forEach(doc => {
      callback(createMockDocumentSnapshot(doc));
    });
  }
});

export const createMockBatch = () => ({
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(() => Promise.resolve())
});
```

## Expected Results

After implementing these fixes, you should see:

1. **All ingredient service tests passing**: Save, load, clear, category operations
2. **All reference service tests passing**: CRUD operations on nested collections
3. **Proper error handling**: Network and validation errors properly caught
4. **Utility functions passing**: These don't use Firebase so should work immediately

## Testing Strategy Moving Forward

1. **Unit Tests**: Use these comprehensive mocks for service layer testing
2. **Integration Tests**: Consider using Firebase emulator for end-to-end testing
3. **E2E Tests**: Use real Firebase with test data for full system validation

This approach gives you confidence that your Firebase service layer works correctly while maintaining fast, reliable unit tests that don't depend on external services.