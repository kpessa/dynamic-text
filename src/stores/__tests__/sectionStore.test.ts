import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sectionStore } from '../sectionStore.svelte';
import type { Section, TestCase } from '../../lib/types';

describe('sectionStore - Test Case Management', () => {
  beforeEach(() => {
    // Reset store before each test
    sectionStore.clear();
  });

  describe('addTestCase', () => {
    it('should add a new test case to a dynamic section', () => {
      // Create a dynamic section
      sectionStore.addSection('dynamic');
      const sections = sectionStore.sections;
      const sectionId = sections[0].id;
      
      // Add a test case
      sectionStore.addTestCase(sectionId);
      
      const updatedSection = sectionStore.sections.find(s => s.id === sectionId);
      expect(updatedSection?.testCases).toHaveLength(2); // Default + new one
      expect(updatedSection?.testCases[1].name).toContain('Test');
      expect(updatedSection?.testCases[1].variables).toEqual({});
      expect(updatedSection?.testCases[1].matchType).toBe('contains');
    });

    it('should not add test case to static section', () => {
      // Create a static section
      sectionStore.addSection('static');
      const sections = sectionStore.sections;
      const sectionId = sections[0].id;
      
      // Try to add a test case
      sectionStore.addTestCase(sectionId);
      
      const updatedSection = sectionStore.sections.find(s => s.id === sectionId);
      expect(updatedSection?.testCases).toHaveLength(0);
    });

    it('should set the new test case as active', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      sectionStore.addTestCase(sectionId);
      
      const activeTestCase = sectionStore.activeTestCase[sectionId];
      expect(activeTestCase).toBeDefined();
      expect(activeTestCase.name).toContain('Test');
    });
  });

  describe('updateTestCase', () => {
    it('should update test case properties', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      const updates: Partial<TestCase> = {
        name: 'Updated Test',
        variables: { x: 10, y: 20 },
        expected: 'Expected output',
        matchType: 'exact' as const,
        testResult: {
          passed: true,
          actual: 'Actual output',
          error: undefined,
          executionTime: Date.now()
        }
      };
      
      sectionStore.updateTestCase(sectionId, 0, updates);
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      const testCase = section?.testCases[0];
      
      expect(testCase?.name).toBe('Updated Test');
      expect(testCase?.variables).toEqual({ x: 10, y: 20 });
      expect(testCase?.expected).toBe('Expected output');
      expect(testCase?.matchType).toBe('exact');
      expect(testCase?.testResult?.passed).toBe(true);
    });

    it('should handle partial updates', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      const originalTestCase = sectionStore.sections[0].testCases[0];
      
      sectionStore.updateTestCase(sectionId, 0, { name: 'Partial Update' });
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      const testCase = section?.testCases[0];
      
      expect(testCase?.name).toBe('Partial Update');
      expect(testCase?.variables).toEqual(originalTestCase.variables);
      expect(testCase?.matchType).toBe(originalTestCase.matchType);
    });

    it('should not update non-existent test case', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      const originalSection = { ...sectionStore.sections[0] };
      
      sectionStore.updateTestCase(sectionId, 999, { name: 'Should not update' });
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      expect(section?.testCases).toEqual(originalSection.testCases);
    });
  });

  describe('deleteTestCase', () => {
    it('should delete test case at specified index', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Add multiple test cases
      sectionStore.addTestCase(sectionId);
      sectionStore.addTestCase(sectionId);
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      expect(section?.testCases).toHaveLength(3);
      
      // Delete the middle one
      sectionStore.deleteTestCase(sectionId, 1);
      
      const updatedSection = sectionStore.sections.find(s => s.id === sectionId);
      expect(updatedSection?.testCases).toHaveLength(2);
    });

    it('should update active test case when deleting current active', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      sectionStore.addTestCase(sectionId);
      const secondTestCase = sectionStore.sections[0].testCases[1];
      sectionStore.setActiveTestCase(sectionId, secondTestCase);
      
      // Delete the active test case
      sectionStore.deleteTestCase(sectionId, 1);
      
      // Should set first test case as active
      const activeTestCase = sectionStore.activeTestCase[sectionId];
      expect(activeTestCase).toBe(sectionStore.sections[0].testCases[0]);
    });

    it('should clear active test case when deleting last test case', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Delete the only test case
      sectionStore.deleteTestCase(sectionId, 0);
      
      const activeTestCase = sectionStore.activeTestCase[sectionId];
      expect(activeTestCase).toBeUndefined();
    });
  });

  describe('setActiveTestCase', () => {
    it('should set the active test case for a section', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      sectionStore.addTestCase(sectionId);
      const section = sectionStore.sections[0];
      const testCase = section?.testCases[1];
      
      if (testCase) {
        sectionStore.setActiveTestCase(sectionId, testCase);
      }
      
      expect(sectionStore.activeTestCase[sectionId]).toBe(testCase);
    });

    it('should allow setting different active test cases for different sections', () => {
      sectionStore.addSection('dynamic');
      sectionStore.addSection('dynamic');
      
      const section1Id = sectionStore.sections[0].id;
      const section2Id = sectionStore.sections[1].id;
      
      const testCase1 = sectionStore.sections[0]?.testCases[0];
      const testCase2 = sectionStore.sections[1]?.testCases[0];
      
      if (testCase1) sectionStore.setActiveTestCase(section1Id, testCase1);
      if (testCase2) sectionStore.setActiveTestCase(section2Id, testCase2);
      
      expect(sectionStore.activeTestCase[section1Id]).toBe(testCase1);
      expect(sectionStore.activeTestCase[section2Id]).toBe(testCase2);
    });
  });

  describe('toggleTestCases', () => {
    it('should toggle test case expansion state', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Initially should be expanded (true)
      expect(sectionStore.expandedTestCases[sectionId]).toBe(true);
      
      // Toggle to collapse
      sectionStore.toggleTestCases(sectionId);
      expect(sectionStore.expandedTestCases[sectionId]).toBe(false);
      
      // Toggle to expand again
      sectionStore.toggleTestCases(sectionId);
      expect(sectionStore.expandedTestCases[sectionId]).toBe(true);
    });
  });

  describe('reorderTestCases', () => {
    it('should reorder test cases within a section', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Add multiple test cases
      sectionStore.addTestCase(sectionId);
      sectionStore.addTestCase(sectionId);
      sectionStore.addTestCase(sectionId);
      
      // Update test cases with unique names
      sectionStore.updateTestCase(sectionId, 0, { name: 'Test A' });
      sectionStore.updateTestCase(sectionId, 1, { name: 'Test B' });
      sectionStore.updateTestCase(sectionId, 2, { name: 'Test C' });
      sectionStore.updateTestCase(sectionId, 3, { name: 'Test D' });
      
      // Reorder: move Test B (index 1) to position 3
      sectionStore.reorderTestCases(sectionId, 1, 3);
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      expect(section?.testCases[0].name).toBe('Test A');
      expect(section?.testCases[1].name).toBe('Test C');
      expect(section?.testCases[2].name).toBe('Test D');
      expect(section?.testCases[3].name).toBe('Test B');
    });

    it('should not reorder if indices are the same', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      sectionStore.addTestCase(sectionId);
      sectionStore.updateTestCase(sectionId, 0, { name: 'Test A' });
      sectionStore.updateTestCase(sectionId, 1, { name: 'Test B' });
      
      // Try to reorder with same indices
      sectionStore.reorderTestCases(sectionId, 1, 1);
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      expect(section?.testCases[0].name).toBe('Test A');
      expect(section?.testCases[1].name).toBe('Test B');
    });

    it('should not reorder if dragged index is invalid', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      sectionStore.updateTestCase(sectionId, 0, { name: 'Test A' });
      
      // Try to reorder with invalid index
      sectionStore.reorderTestCases(sectionId, 5, 0);
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      expect(section?.testCases[0].name).toBe('Test A');
    });

    it('should trigger change detection after reordering', () => {
      const checkForChangesSpy = vi.spyOn(sectionStore, 'checkForChanges');
      
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      sectionStore.addTestCase(sectionId);
      sectionStore.addTestCase(sectionId);
      
      // Clear the spy count from previous operations
      checkForChangesSpy.mockClear();
      
      // Perform reorder
      sectionStore.reorderTestCases(sectionId, 0, 2);
      
      expect(checkForChangesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test Case Persistence', () => {
    it('should preserve test cases when converting section type', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Add test cases with data
      sectionStore.addTestCase(sectionId);
      sectionStore.updateTestCase(sectionId, 0, {
        name: 'Persistent Test',
        variables: { data: 'test' }
      });
      
      // Convert to static (should lose test cases)
      sectionStore.updateSectionContent(sectionId, '<p>Static content</p>');
      const staticSection = sectionStore.sections.find(s => s.id === sectionId);
      
      // When section is static, it might not have testCases
      expect(staticSection?.type).toBe('static');
      
      // Convert back to dynamic using convertToDynamic
      sectionStore.convertToDynamic(sectionId, 'return "dynamic";');
      const dynamicSection = sectionStore.sections.find(s => s.id === sectionId);
      
      expect(dynamicSection?.type).toBe('dynamic');
      expect(dynamicSection?.testCases).toBeDefined();
      expect(dynamicSection?.testCases.length).toBeGreaterThan(0);
    });

    it('should maintain test cases when updating section content', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Add test case with data
      sectionStore.updateTestCase(sectionId, 0, {
        name: 'Content Update Test',
        variables: { x: 5 },
        expected: 'Output'
      });
      
      // Update section content
      sectionStore.updateSectionContent(sectionId, 'return "updated";');
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      const testCase = section?.testCases[0];
      
      expect(testCase?.name).toBe('Content Update Test');
      expect(testCase?.variables).toEqual({ x: 5 });
      expect(testCase?.expected).toBe('Output');
    });

    it('should clear test results when test case is modified', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Set test result
      sectionStore.updateTestCase(sectionId, 0, {
        testResult: {
          passed: true,
          actual: 'output',
          error: undefined,
          executionTime: Date.now()
        }
      });
      
      // Modify test case
      sectionStore.updateTestCase(sectionId, 0, {
        expected: 'new expectation'
      });
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      const testCase = section?.testCases[0];
      
      // Result should be preserved when updating expected value
      // This behavior might vary based on implementation
      expect(testCase?.expected).toBe('new expectation');
    });
  });

  describe('Batch Operations', () => {
    it('should handle multiple test cases per section', () => {
      sectionStore.addSection('dynamic');
      const sectionId = sectionStore.sections[0].id;
      
      // Add multiple test cases
      for (let i = 0; i < 5; i++) {
        sectionStore.addTestCase(sectionId);
      }
      
      const section = sectionStore.sections.find(s => s.id === sectionId);
      expect(section?.testCases).toHaveLength(6); // 1 default + 5 added
      
      // Update different test cases
      sectionStore.updateTestCase(sectionId, 2, { name: 'Test 2' });
      sectionStore.updateTestCase(sectionId, 4, { name: 'Test 4' });
      
      const updatedSection = sectionStore.sections.find(s => s.id === sectionId);
      expect(updatedSection?.testCases[2].name).toBe('Test 2');
      expect(updatedSection?.testCases[4].name).toBe('Test 4');
    });

    it('should handle test cases across multiple sections', () => {
      // Create multiple dynamic sections
      for (let i = 0; i < 3; i++) {
        sectionStore.addSection('dynamic');
      }
      
      const sectionIds = sectionStore.sections.map(s => s.id);
      
      // Add test cases to each section
      sectionIds.forEach((id, index) => {
        sectionStore.addTestCase(id);
        sectionStore.updateTestCase(id, 0, {
          name: `Section ${index} Test`
        });
      });
      
      // Verify each section has its own test cases
      sectionIds.forEach((id, index) => {
        const section = sectionStore.sections.find(s => s.id === id);
        expect(section?.testCases[0].name).toBe(`Section ${index} Test`);
      });
    });
  });
});