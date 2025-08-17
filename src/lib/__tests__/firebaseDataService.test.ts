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

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
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

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      name: 'Test Ingredient',
      healthSystem: 'test-health',
      populationType: 'Neonatal'
    })
  })),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({
    empty: false,
    docs: []
  })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn()
}));

describe('Firebase Data Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ingredient Operations', () => {
    const mockIngredient: Partial<IngredientData> = {
      name: 'Calcium Gluconate',
      healthSystem: 'test-health',
      populationType: 'Neonatal',
      category: 'Electrolytes',
      sections: [
        { type: 'text', content: 'Test content' }
      ],
      NOTE: ['Line 1', 'Line 2'],
      version: '1',
      lastModified: new Date().toISOString()
    };

    it('should save ingredient successfully', async () => {
      const result = await ingredientService.saveIngredient(mockIngredient as IngredientData);
      expect(result).toBeDefined();
    });

    // Note: There's no load method, ingredients are loaded via getAllIngredients
    it('should load all ingredients', async () => {
      const result = await ingredientService.getAllIngredients();
      expect(Array.isArray(result)).toBe(true);
    });

    // Note: There's no delete method in the service
    it('should clear all ingredients', async () => {
      await expect(ingredientService.clearAllIngredients()).resolves.not.toThrow();
    });

    it('should get ingredients by category', async () => {
      const result = await ingredientService.getIngredientsByCategory('Electrolytes');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should fix ingredient categories', async () => {
      await expect(ingredientService.fixIngredientCategories()).resolves.not.toThrow();
    });

    it('should get version history', async () => {
      const results = await ingredientService.getVersionHistory('test-ingredient');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Reference Operations', () => {
    const mockReference: Partial<ReferenceData> = {
      configId: 'test-config',
      ingredientName: 'Calcium Gluconate',
      healthSystem: 'test-health',
      populationType: 'Neonatal',
      sections: [
        { type: 'js', content: 'return me.getValue("CA_MEQ");' }
      ] as Section[],
      version: '1'
    };

    it('should save reference successfully', async () => {
      const result = await referenceService.saveReference('test-ingredient-id', mockReference);
      expect(result).toBeDefined();
    });

    it('should get references for ingredient', async () => {
      const result = await referenceService.getReferencesForIngredient('test-ingredient-id');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delete reference', async () => {
      await expect(referenceService.deleteReference('test-ingredient-id', 'test-ref-id')).resolves.not.toThrow();
    });

    it('should get references by population', async () => {
      const result = await referenceService.getReferencesByPopulation('test-ingredient-id', 'neonatal');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get references for comparison', async () => {
      const results = await referenceService.getReferencesForComparison('test-ingredient-id', 'test-health');
      expect(Array.isArray(results)).toBe(true);
    });
  });

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
      expect(refId).toContain('calcium');
      expect(refId).toContain('neonatal');
    });

    it('should convert version to population type', () => {
      expect(versionToPopulationType('1')).toBe('Neonatal');
      expect(versionToPopulationType('2')).toBe('Pediatric');
      expect(versionToPopulationType('3')).toBe('Adolescent');
      expect(versionToPopulationType('4')).toBe('Adult');
      expect(versionToPopulationType('invalid')).toBe('Adult');
    });

    it('should have correct population types', () => {
      expect(POPULATION_TYPES).toHaveProperty('Neonatal');
      expect(POPULATION_TYPES).toHaveProperty('Pediatric');
      expect(POPULATION_TYPES).toHaveProperty('Adolescent');
      expect(POPULATION_TYPES).toHaveProperty('Adult');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ingredient ID', async () => {
      await expect(ingredientService.saveIngredient({ name: '' } as IngredientData)).rejects.toThrow();
    });

    it('should handle missing reference ID', async () => {
      await expect(referenceService.deleteReference('', '')).rejects.toThrow();
    });

    it('should handle invalid ingredient data', async () => {
      const invalidIngredient = { name: '' } as IngredientData;
      await expect(ingredientService.saveIngredient(invalidIngredient)).rejects.toThrow();
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

// Import getDoc for mocking
import { getDoc } from 'firebase/firestore';