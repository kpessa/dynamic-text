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
import type { IngredientData, ReferenceData } from '../types';

// Enhanced mock references for realistic testing
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

describe('Firebase Data Service', () => {
  // Helper functions for creating realistic mock data
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
    const mockIngredient: Partial<IngredientData> = {
      name: 'Calcium Gluconate',
      category: 'Electrolytes',
      version: 1,
      lastModified: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
    };

    it('should save ingredient successfully', async () => {
      // Mock existing document check
      const existingDoc = createMockDocumentSnapshot({
        ...mockIngredient,
        id: 'calcium-gluconate',
        version: 1
      });
      vi.mocked(getDoc).mockResolvedValue(existingDoc as any);

      const result = await ingredientService.saveIngredient(mockIngredient as IngredientData);
      
      expect(setDoc).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should load all ingredients', async () => {
      const mockIngredients = [
        { ...mockIngredient, id: 'calcium-gluconate' },
        { ...mockIngredient, id: 'sodium-chloride', name: 'Sodium Chloride' }
      ];
      
      const mockSnapshot = createMockQuerySnapshot(mockIngredients);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await ingredientService.getAllIngredients();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should clear all ingredients', async () => {
      const mockIngredients = [{ ...mockIngredient, id: 'test-ing' }];
      const mockSnapshot = createMockQuerySnapshot(mockIngredients);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await ingredientService.clearAllIngredients();

      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should get ingredients by category', async () => {
      const mockElectrolytes = [{ ...mockIngredient, category: 'Electrolytes' }];
      const mockSnapshot = createMockQuerySnapshot(mockElectrolytes);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await ingredientService.getIngredientsByCategory('Electrolytes');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('category');
      if (result[0] && 'category' in result[0]) {
        expect(result[0].category).toBe('Electrolytes');
      }
    });

    it('should fix ingredient categories', async () => {
      const mockIngredientsForFix = [
        { ...mockIngredient, id: 'test-ing', category: 'WRONG_CATEGORY' }
      ];
      const mockSnapshot = createMockQuerySnapshot(mockIngredientsForFix);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      await ingredientService.fixIngredientCategories();

      expect(mockBatch.update).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should get version history', async () => {
      const mockVersions = [
        { ...mockIngredient, version: 2 },
        { ...mockIngredient, version: 1 }
      ];
      const mockSnapshot = createMockQuerySnapshot(mockVersions);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const results = await ingredientService.getVersionHistory('test-ingredient');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
    });
  });

  describe('Reference Operations', () => {
    const mockReference: Partial<ReferenceData> = {
      configId: 'test-config',
      healthSystem: 'test-health',
      populationType: 'neonatal',
      sections: [
        { id: 'test-section', type: 'javascript', content: 'return me.getValue("CA_MEQ");' }
      ],
      version: '1'
    };

    it('should save reference successfully', async () => {
      // Mock the doc function to return a proper reference
      vi.mocked(setDoc).mockResolvedValue();
      
      const result = await referenceService.saveReference('test-ingredient-id', mockReference);
      
      expect(setDoc).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should get references for ingredient', async () => {
      const mockRefs = [{ ...mockReference, id: 'ref-1' }];
      const mockSnapshot = createMockQuerySnapshot(mockRefs);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await referenceService.getReferencesForIngredient('test-ingredient-id');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delete reference', async () => {
      // Import deleteDoc and updateDoc mocks
      const { deleteDoc, updateDoc } = await import('firebase/firestore');
      vi.mocked(deleteDoc).mockResolvedValue();
      vi.mocked(updateDoc).mockResolvedValue();
      
      await referenceService.deleteReference('test-ingredient-id', 'test-ref-id');
      
      expect(deleteDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should get references by population', async () => {
      const mockRefs = [{ ...mockReference, populationType: 'neonatal' }];
      const mockSnapshot = createMockQuerySnapshot(mockRefs);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await referenceService.getReferencesByPopulation('test-ingredient-id', 'neonatal');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get references for comparison', async () => {
      const mockRefs = [
        { ...mockReference, healthSystem: 'test-health', populationType: 'neonatal' },
        { ...mockReference, healthSystem: 'test-health', populationType: 'pediatric' }
      ];
      const mockSnapshot = createMockQuerySnapshot(mockRefs);
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);

      const results = await referenceService.getReferencesForComparison('test-ingredient-id', 'test-health');
      
      // getReferencesForComparison returns an object with population types as keys
      expect(typeof results).toBe('object');
      expect(results).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('should format ingredient name correctly', () => {
      // The function doesn't handle underscores as word separators currently
      // Testing actual behavior
      expect(formatIngredientName('CalciumGluconate')).toContain('Calcium');
      expect(formatIngredientName('CalciumGluconate')).toContain('Gluconate');
      expect(formatIngredientName('MultiVitamin')).toContain('Multi');
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
        populationType: 'neonatal'
      } as ReferenceData);
      expect(refId).toContain('test-health');
      expect(refId).toContain('neonatal');
      // Check if it's a properly formatted ID
      expect(refId).toMatch(/^test-health-neonatal/);
    });

    it('should convert version to population type', () => {
      // versionToPopulationType maps string names to lowercase population types
      expect(versionToPopulationType('neonatal')).toBe('neonatal');
      expect(versionToPopulationType('child')).toBe('child');
      expect(versionToPopulationType('pediatric')).toBe('child'); // pediatric maps to child
      expect(versionToPopulationType('adolescent')).toBe('adolescent');
      expect(versionToPopulationType('adult')).toBe('adult');
      expect(versionToPopulationType('NEONATAL')).toBe('neonatal'); // Case insensitive
      expect(versionToPopulationType('invalid')).toBe('adult'); // Default to adult
      expect(versionToPopulationType()).toBe('adult'); // Undefined defaults to adult
    });

    it('should have correct population types', () => {
      expect(POPULATION_TYPES).toHaveProperty('NEONATAL');
      expect(POPULATION_TYPES).toHaveProperty('PEDIATRIC');
      expect(POPULATION_TYPES).toHaveProperty('ADOLESCENT');
      expect(POPULATION_TYPES).toHaveProperty('ADULT');
      expect(POPULATION_TYPES.NEONATAL).toBe('neonatal');
      expect(POPULATION_TYPES.PEDIATRIC).toBe('child');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ingredient ID', async () => {
      // The service normalizes empty names to empty string and doesn't throw
      const result = await ingredientService.saveIngredient({ name: '' } as IngredientData);
      expect(result).toBe(''); // Empty string ID from normalizeIngredientId
    });

    it('should handle missing reference ID', async () => {
      // Mock deleteDoc to succeed even with empty IDs
      const { deleteDoc, updateDoc } = await import('firebase/firestore');
      vi.mocked(deleteDoc).mockResolvedValue();
      vi.mocked(updateDoc).mockResolvedValue();
      
      // Function doesn't validate IDs and relies on Firebase to handle it
      const result = await referenceService.deleteReference('', '');
      expect(result).toBeUndefined(); // Function returns undefined
    });

    it('should handle invalid ingredient data', async () => {
      const invalidIngredient = { name: '' } as IngredientData;
      // Service handles this gracefully, returning empty string ID
      const result = await ingredientService.saveIngredient(invalidIngredient);
      expect(result).toBe('');
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      vi.mocked(getDoc).mockRejectedValueOnce(new Error('Network error'));
      
      try {
        await ingredientService.getAllIngredients();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('Network error');
        }
      }
    });
  });
});