import { describe, it, expect, beforeEach } from 'vitest';
import { workspaceStore } from '../../src/stores/workspaceStore.svelte.ts';
import { TestDataFactory } from '../utils/test-helpers';
import { POPULATION_TYPES } from '../../src/lib/firebaseDataService';
import type { Section } from '../../src/types/section';
import type { ValidationData, LoadedReference, LoadedIngredient } from '../../src/types/workspace';

describe('WorkspaceStore', () => {
  beforeEach(() => {
    // Clear workspace before each test
    workspaceStore.clearWorkspace();
  });

  describe('Basic State Management', () => {
    it('should initialize with correct default values', () => {
      expect(workspaceStore.currentIngredient).toBe('');
      expect(workspaceStore.currentReferenceName).toBe('');
      expect(workspaceStore.loadedIngredient).toBeNull();
      expect(workspaceStore.loadedReference).toBeNull();
      expect(workspaceStore.currentHealthSystem).toBeNull();
      expect(workspaceStore.currentPopulationType).toBe(POPULATION_TYPES.ADULT);
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
      expect(workspaceStore.lastSavedTime).toBeNull();
      expect(workspaceStore.firebaseEnabled).toBe(false);
    });

    it('should set and get current ingredient', () => {
      const testIngredient = 'Sodium Chloride';
      
      workspaceStore.setCurrentIngredient(testIngredient);
      expect(workspaceStore.currentIngredient).toBe(testIngredient);
    });

    it('should set and get current reference name', () => {
      const testReference = 'CHOC Adult Reference';
      
      workspaceStore.setCurrentReferenceName(testReference);
      expect(workspaceStore.currentReferenceName).toBe(testReference);
    });

    it('should set and get current health system', () => {
      const testHealthSystem = 'Children\'s Hospital of Orange County';
      
      workspaceStore.setCurrentHealthSystem(testHealthSystem);
      expect(workspaceStore.currentHealthSystem).toBe(testHealthSystem);
    });

    it('should set and get current population type', () => {
      workspaceStore.setCurrentPopulationType(POPULATION_TYPES.NEO);
      expect(workspaceStore.currentPopulationType).toBe(POPULATION_TYPES.NEO);
      
      workspaceStore.setCurrentPopulationType(POPULATION_TYPES.CHILD);
      expect(workspaceStore.currentPopulationType).toBe(POPULATION_TYPES.CHILD);
    });
  });

  describe('Change Tracking', () => {
    it('should mark as changed', () => {
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
      
      workspaceStore.markAsChanged();
      expect(workspaceStore.hasUnsavedChanges).toBe(true);
    });

    it('should mark as saved and update timestamp', () => {
      workspaceStore.markAsChanged();
      expect(workspaceStore.hasUnsavedChanges).toBe(true);
      expect(workspaceStore.lastSavedTime).toBeNull();
      
      const beforeSave = Date.now();
      workspaceStore.markAsSaved();
      const afterSave = Date.now();
      
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
      expect(workspaceStore.lastSavedTime).toBeInstanceOf(Date);
      
      const savedTime = workspaceStore.lastSavedTime!.getTime();
      expect(savedTime).toBeGreaterThanOrEqual(beforeSave);
      expect(savedTime).toBeLessThanOrEqual(afterSave);
    });

    it('should check for changes in sections', () => {
      const originalSections = TestDataFactory.createSections(3);
      const modifiedSections = TestDataFactory.createSections(3);
      modifiedSections[0].content = 'Modified content';
      
      // First call should set original sections and return false (no changes yet)
      const hasChanges1 = workspaceStore.checkForChanges(originalSections);
      expect(hasChanges1).toBe(false);
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
      expect(workspaceStore.originalSections).toEqual(originalSections);
      
      // Second call with modified sections should detect changes
      const hasChanges2 = workspaceStore.checkForChanges(modifiedSections);
      expect(hasChanges2).toBe(true);
      expect(workspaceStore.hasUnsavedChanges).toBe(true);
    });

    it('should detect no changes when sections are identical', () => {
      const sections = TestDataFactory.createSections(2);
      
      // Set original
      workspaceStore.checkForChanges(sections);
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
      
      // Check with identical sections
      const identicalSections = JSON.parse(JSON.stringify(sections));
      const hasChanges = workspaceStore.checkForChanges(identicalSections);
      
      expect(hasChanges).toBe(false);
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
    });
  });

  describe('Validation State Management', () => {
    it('should update validation data', () => {
      const validationData: ValidationData = {
        status: 'passed',
        notes: 'All tests passed successfully',
        validatedBy: 'test-user',
        validatedAt: new Date()
      };
      
      workspaceStore.updateValidation(validationData);
      
      expect(workspaceStore.currentValidationStatus).toBe('passed');
      expect(workspaceStore.currentValidationNotes).toBe('All tests passed successfully');
      expect(workspaceStore.currentValidatedBy).toBe('test-user');
      expect(workspaceStore.currentValidatedAt).toEqual(validationData.validatedAt);
      expect(workspaceStore.hasUnsavedChanges).toBe(true);
    });

    it('should set test results', () => {
      const testResults = {
        totalTests: 5,
        passed: 4,
        failed: 1,
        results: ['test1', 'test2']
      };
      
      workspaceStore.setTestResults(testResults);
      expect(workspaceStore.currentTestResults).toEqual(testResults);
    });
  });

  describe('Reference Loading', () => {
    it('should load reference with ingredient', () => {
      const mockReference: LoadedReference = {
        id: 'ref-123',
        name: 'Test Reference',
        healthSystem: 'Test Health System',
        populationType: POPULATION_TYPES.CHILD,
        validationStatus: 'passed',
        validationNotes: 'Previously validated',
        validatedBy: 'validator-user',
        validatedAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02')
      };
      
      const mockIngredient: LoadedIngredient = {
        id: 'ing-456',
        name: 'Test Ingredient'
      };
      
      workspaceStore.loadReference(mockReference, mockIngredient);
      
      // Check reference data
      expect(workspaceStore.loadedReference).toEqual(mockReference);
      expect(workspaceStore.loadedReferenceId).toBe('ref-123');
      expect(workspaceStore.currentReferenceName).toBe('Test Reference');
      expect(workspaceStore.currentHealthSystem).toBe('Test Health System');
      expect(workspaceStore.currentPopulationType).toBe(POPULATION_TYPES.CHILD);
      
      // Check ingredient data
      expect(workspaceStore.loadedIngredient).toEqual(mockIngredient);
      expect(workspaceStore.currentIngredient).toBe('Test Ingredient');
      
      // Check validation data transfer
      expect(workspaceStore.currentValidationStatus).toBe('passed');
      expect(workspaceStore.currentValidationNotes).toBe('Previously validated');
      expect(workspaceStore.currentValidatedBy).toBe('validator-user');
      expect(workspaceStore.currentValidatedAt).toEqual(new Date('2023-01-01'));
      
      // Check state flags
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
      expect(workspaceStore.lastSavedTime).toEqual(new Date('2023-01-02'));
    });

    it('should load reference without ingredient', () => {
      const mockReference: LoadedReference = {
        id: 'ref-789',
        name: 'Reference Only',
        healthSystem: 'Test System',
        populationType: POPULATION_TYPES.ADULT
      };
      
      workspaceStore.loadReference(mockReference);
      
      expect(workspaceStore.loadedReference).toEqual(mockReference);
      expect(workspaceStore.loadedIngredient).toBeNull();
      expect(workspaceStore.currentIngredient).toBe('');
    });

    it('should handle reference with missing validation data', () => {
      const mockReference: LoadedReference = {
        id: 'ref-minimal',
        name: 'Minimal Reference',
        populationType: POPULATION_TYPES.ADULT
      };
      
      workspaceStore.loadReference(mockReference);
      
      expect(workspaceStore.currentValidationStatus).toBe('untested');
      expect(workspaceStore.currentValidationNotes).toBe('');
      expect(workspaceStore.currentValidatedBy).toBeNull();
      expect(workspaceStore.currentValidatedAt).toBeNull();
    });
  });

  describe('Firebase State Management', () => {
    it('should manage firebase enabled state', () => {
      expect(workspaceStore.firebaseEnabled).toBe(false);
      
      workspaceStore.setFirebaseEnabled(true);
      expect(workspaceStore.firebaseEnabled).toBe(true);
      
      workspaceStore.setFirebaseEnabled(false);
      expect(workspaceStore.firebaseEnabled).toBe(false);
    });

    it('should manage active config state', () => {
      const configId = 'config-123';
      const ingredients = [{ id: 'ing1', name: 'Ingredient 1' }];
      
      workspaceStore.setActiveConfigId(configId);
      workspaceStore.setActiveConfigIngredients(ingredients);
      
      expect(workspaceStore.activeConfigId).toBe(configId);
      expect(workspaceStore.activeConfigIngredients).toEqual(ingredients);
    });

    it('should manage selected ingredient for diff', () => {
      const ingredient = { id: 'ing-diff', name: 'Diff Ingredient' };
      
      workspaceStore.setSelectedIngredientForDiff(ingredient);
      expect(workspaceStore.selectedIngredientForDiff).toEqual(ingredient);
    });

    it('should manage pending save and reference data', () => {
      const saveData = { sections: [], metadata: {} };
      const referenceData = { name: 'Pending Reference' };
      
      workspaceStore.setPendingSaveData(saveData);
      workspaceStore.setPendingReferenceData(referenceData);
      
      expect(workspaceStore.pendingSaveData).toEqual(saveData);
      expect(workspaceStore.pendingReferenceData).toEqual(referenceData);
    });
  });

  describe('Population Management', () => {
    it('should set available populations', () => {
      const populations = [
        { id: POPULATION_TYPES.ADULT, name: 'Adult' },
        { id: POPULATION_TYPES.CHILD, name: 'Pediatric' }
      ];
      
      workspaceStore.setAvailablePopulations(populations);
      expect(workspaceStore.availablePopulations).toEqual(populations);
    });
  });

  describe('Complete Workspace Clear', () => {
    it('should clear all workspace state', () => {
      // Set up various workspace state
      workspaceStore.setCurrentIngredient('Test Ingredient');
      workspaceStore.setCurrentReferenceName('Test Reference');
      workspaceStore.setCurrentHealthSystem('Test Health System');
      workspaceStore.setCurrentPopulationType(POPULATION_TYPES.CHILD);
      workspaceStore.setFirebaseEnabled(true);
      workspaceStore.setActiveConfigId('config-123');
      workspaceStore.markAsChanged();
      
      const mockReference: LoadedReference = {
        id: 'ref-123',
        name: 'Test Reference',
        populationType: POPULATION_TYPES.ADULT
      };
      workspaceStore.loadReference(mockReference);
      
      workspaceStore.updateValidation({
        status: 'passed',
        notes: 'Test validation',
        validatedBy: 'test-user',
        validatedAt: new Date()
      });
      
      // Verify state is set
      expect(workspaceStore.currentIngredient).toBe('Test Ingredient');
      expect(workspaceStore.hasUnsavedChanges).toBe(true);
      expect(workspaceStore.firebaseEnabled).toBe(true);
      expect(workspaceStore.currentValidationStatus).toBe('passed');
      
      // Clear workspace
      workspaceStore.clearWorkspace();
      
      // Verify everything is cleared
      expect(workspaceStore.currentIngredient).toBe('');
      expect(workspaceStore.currentReferenceName).toBe('');
      expect(workspaceStore.loadedIngredient).toBeNull();
      expect(workspaceStore.loadedReference).toBeNull();
      expect(workspaceStore.currentHealthSystem).toBeNull();
      expect(workspaceStore.currentPopulationType).toBe(POPULATION_TYPES.ADULT);
      expect(workspaceStore.availablePopulations).toEqual([]);
      expect(workspaceStore.hasUnsavedChanges).toBe(false);
      expect(workspaceStore.lastSavedTime).toBeNull();
      expect(workspaceStore.loadedReferenceId).toBeNull();
      expect(workspaceStore.originalSections).toBeNull();
      expect(workspaceStore.currentValidationStatus).toBe('untested');
      expect(workspaceStore.currentValidationNotes).toBe('');
      expect(workspaceStore.currentValidatedBy).toBeNull();
      expect(workspaceStore.currentValidatedAt).toBeNull();
      expect(workspaceStore.currentTestResults).toBeNull();
      expect(workspaceStore.activeConfigId).toBeNull();
      expect(workspaceStore.activeConfigIngredients).toEqual([]);
      expect(workspaceStore.selectedIngredientForDiff).toBeNull();
      expect(workspaceStore.pendingSaveData).toBeNull();
      expect(workspaceStore.pendingReferenceData).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values gracefully', () => {
      expect(() => {
        workspaceStore.setCurrentIngredient(null as any);
        workspaceStore.setCurrentReferenceName(undefined as any);
        workspaceStore.setCurrentHealthSystem(null);
      }).not.toThrow();
    });

    it('should handle invalid population types', () => {
      expect(() => {
        workspaceStore.setCurrentPopulationType('invalid-type' as any);
      }).not.toThrow();
      
      expect(workspaceStore.currentPopulationType).toBe('invalid-type');
    });

    it('should handle empty sections array in change detection', () => {
      const hasChanges = workspaceStore.checkForChanges([]);
      expect(hasChanges).toBe(false);
      expect(workspaceStore.originalSections).toEqual([]);
    });
  });

  describe('State Persistence Behavior', () => {
    it('should maintain original sections reference for change detection', () => {
      const sections1 = TestDataFactory.createSections(2);
      const sections2 = TestDataFactory.createSections(3); // Different number
      
      // Set original sections
      workspaceStore.checkForChanges(sections1);
      const originalSections = workspaceStore.originalSections;
      
      // Check with different sections
      workspaceStore.checkForChanges(sections2);
      
      // Original sections should remain the same
      expect(workspaceStore.originalSections).toEqual(originalSections);
      expect(workspaceStore.originalSections).toHaveLength(2);
      expect(sections2).toHaveLength(3);
    });

    it('should properly handle validation data from loaded references', () => {
      const validatedAt = new Date('2023-06-15T10:30:00Z');
      const mockReference: LoadedReference = {
        id: 'validated-ref',
        name: 'Validated Reference',
        populationType: POPULATION_TYPES.ADULT,
        validationStatus: 'passed',
        validationNotes: 'All tests pass',
        validatedBy: 'validator-123',
        validatedAt: validatedAt.toISOString() // String format as it would come from Firebase
      };
      
      workspaceStore.loadReference(mockReference);
      
      expect(workspaceStore.currentValidationStatus).toBe('passed');
      expect(workspaceStore.currentValidationNotes).toBe('All tests pass');
      expect(workspaceStore.currentValidatedBy).toBe('validator-123');
      expect(workspaceStore.currentValidatedAt).toEqual(validatedAt);
    });
  });
});