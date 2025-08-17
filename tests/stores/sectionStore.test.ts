import { describe, it, expect, beforeEach } from 'vitest';
import { sectionStore } from '../../src/stores/sectionStore.svelte.ts';
import { TestDataFactory } from '../utils/test-helpers';
import type { Section, TestCase } from '../../src/types/section';

describe('SectionStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    sectionStore.clearSections();
  });

  describe('Section Management', () => {
    it('should add static section with default content', () => {
      const section = sectionStore.addSection('static');
      
      expect(section.type).toBe('static');
      expect(section.name).toBe('Static Section 1');
      expect(section.content).toContain('<p>Enter your HTML content here...</p>');
      expect(section.testCases).toEqual([]);
      expect(sectionStore.sections).toHaveLength(1);
    });

    it('should add dynamic section with default test case', () => {
      const section = sectionStore.addSection('dynamic');
      
      expect(section.type).toBe('dynamic');
      expect(section.name).toBe('Dynamic Section 1');
      expect(section.content).toContain('// Enter your JavaScript code here');
      expect(section.testCases).toHaveLength(1);
      expect(section.testCases[0].name).toBe('Default Test');
      expect(sectionStore.expandedTestCases[section.id]).toBe(true);
      expect(sectionStore.activeTestCase[section.id]).toEqual(section.testCases[0]);
    });

    it('should increment section IDs correctly', () => {
      const section1 = sectionStore.addSection('static');
      const section2 = sectionStore.addSection('dynamic');
      const section3 = sectionStore.addSection('static');
      
      expect(section1.id).toBe(1);
      expect(section2.id).toBe(2);
      expect(section3.id).toBe(3);
      expect(sectionStore.nextSectionId).toBe(4);
    });

    it('should delete section and cleanup related state', () => {
      const section = sectionStore.addSection('dynamic');
      const sectionId = section.id;
      
      // Verify section exists and has related state
      expect(sectionStore.sections).toHaveLength(1);
      expect(sectionStore.activeTestCase[sectionId]).toBeDefined();
      expect(sectionStore.expandedTestCases[sectionId]).toBe(true);
      
      // Set as editing section
      sectionStore.setEditingSection(sectionId);
      expect(sectionStore.editingSection).toBe(sectionId);
      
      // Delete section
      sectionStore.deleteSection(sectionId);
      
      // Verify cleanup
      expect(sectionStore.sections).toHaveLength(0);
      expect(sectionStore.activeTestCase[sectionId]).toBeUndefined();
      expect(sectionStore.expandedTestCases[sectionId]).toBeUndefined();
      expect(sectionStore.editingSection).toBeNull();
    });

    it('should update section content', () => {
      const section = sectionStore.addSection('dynamic');
      const newContent = 'return "Updated content";';
      
      sectionStore.updateSectionContent(section.id, newContent);
      
      expect(sectionStore.sections[0].content).toBe(newContent);
    });

    it('should update section name', () => {
      const section = sectionStore.addSection('static');
      const newName = 'Updated Section Name';
      
      sectionStore.updateSectionName(section.id, newName);
      
      expect(sectionStore.sections[0].name).toBe(newName);
    });
  });

  describe('Test Case Management', () => {
    let section: Section;
    
    beforeEach(() => {
      section = sectionStore.addSection('dynamic');
    });

    it('should add test case to dynamic section', () => {
      expect(section.testCases).toHaveLength(1);
      
      sectionStore.addTestCase(section.id);
      
      expect(section.testCases).toHaveLength(2);
      expect(section.testCases[1].name).toBe('Test 2');
      expect(sectionStore.activeTestCase[section.id]).toEqual(section.testCases[1]);
    });

    it('should not add test case to static section', () => {
      const staticSection = sectionStore.addSection('static');
      
      sectionStore.addTestCase(staticSection.id);
      
      expect(staticSection.testCases).toHaveLength(0);
    });

    it('should update test case', () => {
      const updates: Partial<TestCase> = {
        name: 'Updated Test',
        variables: { testVar: 123 },
        expected: 'Updated expected result',
        matchType: 'exact'
      };
      
      sectionStore.updateTestCase(section.id, 0, updates);
      
      const testCase = section.testCases[0];
      expect(testCase.name).toBe('Updated Test');
      expect(testCase.variables).toEqual({ testVar: 123 });
      expect(testCase.expected).toBe('Updated expected result');
      expect(testCase.matchType).toBe('exact');
    });

    it('should delete test case and update active test case', () => {
      // Add a second test case
      sectionStore.addTestCase(section.id);
      expect(section.testCases).toHaveLength(2);
      
      // Delete first test case
      sectionStore.deleteTestCase(section.id, 0);
      
      expect(section.testCases).toHaveLength(1);
      expect(section.testCases[0].name).toBe('Test 2');
      expect(sectionStore.activeTestCase[section.id]).toEqual(section.testCases[0]);
    });

    it('should handle deleting last test case', () => {
      expect(section.testCases).toHaveLength(1);
      
      sectionStore.deleteTestCase(section.id, 0);
      
      expect(section.testCases).toHaveLength(0);
      expect(sectionStore.activeTestCase[section.id]).toBeUndefined();
    });

    it('should set active test case', () => {
      const newTestCase = TestDataFactory.createTestCase({ name: 'Custom Test' });
      section.testCases.push(newTestCase);
      
      sectionStore.setActiveTestCase(section.id, newTestCase);
      
      expect(sectionStore.activeTestCase[section.id]).toEqual(newTestCase);
    });

    it('should toggle test case expansion', () => {
      expect(sectionStore.expandedTestCases[section.id]).toBe(true);
      
      sectionStore.toggleTestCases(section.id);
      expect(sectionStore.expandedTestCases[section.id]).toBe(false);
      
      sectionStore.toggleTestCases(section.id);
      expect(sectionStore.expandedTestCases[section.id]).toBe(true);
    });
  });

  describe('Drag and Drop', () => {
    it('should set dragged section', () => {
      const section = sectionStore.addSection('static');
      
      sectionStore.setDraggedSection(section);
      expect(sectionStore.draggedSection).toEqual(section);
      
      sectionStore.setDraggedSection(null);
      expect(sectionStore.draggedSection).toBeNull();
    });

    it('should reorder sections', () => {
      const section1 = sectionStore.addSection('static');
      const section2 = sectionStore.addSection('dynamic');
      const section3 = sectionStore.addSection('static');
      
      // Initial order: [1, 2, 3]
      expect(sectionStore.sections.map(s => s.id)).toEqual([1, 2, 3]);
      
      // Move section 3 to position 1 (before section 1)
      sectionStore.reorderSections(3, 1);
      
      // New order: [3, 1, 2]
      expect(sectionStore.sections.map(s => s.id)).toEqual([3, 1, 2]);
    });

    it('should handle reordering with same indices', () => {
      const section1 = sectionStore.addSection('static');
      const section2 = sectionStore.addSection('dynamic');
      
      const originalOrder = sectionStore.sections.map(s => s.id);
      
      // Try to reorder section to same position
      sectionStore.reorderSections(1, 1);
      
      // Order should remain unchanged
      expect(sectionStore.sections.map(s => s.id)).toEqual(originalOrder);
    });
  });

  describe('Bulk Operations', () => {
    it('should set sections and update related state', () => {
      const testSections = TestDataFactory.createSections(3);
      
      sectionStore.setSections(testSections);
      
      expect(sectionStore.sections).toEqual(testSections);
      expect(sectionStore.nextSectionId).toBe(4); // Max ID + 1
      
      // Check that dynamic sections have active test cases
      testSections.forEach(section => {
        if (section.type === 'dynamic' && section.testCases.length > 0) {
          expect(sectionStore.activeTestCase[section.id]).toEqual(section.testCases[0]);
          expect(sectionStore.expandedTestCases[section.id]).toBe(true);
        }
      });
    });

    it('should clear all sections and state', () => {
      // Add some sections and state
      const section1 = sectionStore.addSection('dynamic');
      const section2 = sectionStore.addSection('static');
      sectionStore.setEditingSection(section1.id);
      sectionStore.setDraggedSection(section1);
      
      // Verify state exists
      expect(sectionStore.sections).toHaveLength(2);
      expect(sectionStore.editingSection).toBe(section1.id);
      expect(sectionStore.draggedSection).toEqual(section1);
      
      // Clear everything
      sectionStore.clearSections();
      
      // Verify complete cleanup
      expect(sectionStore.sections).toHaveLength(0);
      expect(sectionStore.nextSectionId).toBe(1);
      expect(sectionStore.activeTestCase).toEqual({});
      expect(sectionStore.expandedTestCases).toEqual({});
      expect(sectionStore.editingSection).toBeNull();
      expect(sectionStore.draggedSection).toBeNull();
    });
  });

  describe('Section Conversion', () => {
    it('should convert static section to dynamic', () => {
      const section = sectionStore.addSection('static');
      const jsContent = 'return "Converted to dynamic";';
      
      expect(section.type).toBe('static');
      expect(section.testCases).toHaveLength(0);
      
      sectionStore.convertToDynamic(section.id, jsContent);
      
      expect(section.type).toBe('dynamic');
      expect(section.content).toBe(jsContent);
      expect(section.testCases).toHaveLength(1);
      expect(section.testCases[0].name).toBe('Default Test');
      expect(sectionStore.activeTestCase[section.id]).toEqual(section.testCases[0]);
      expect(sectionStore.expandedTestCases[section.id]).toBe(true);
    });

    it('should not convert dynamic section', () => {
      const section = sectionStore.addSection('dynamic');
      const originalContent = section.content;
      
      sectionStore.convertToDynamic(section.id, 'new content');
      
      // Should remain unchanged
      expect(section.type).toBe('dynamic');
      expect(section.content).toBe(originalContent);
    });
  });

  describe('Derived Properties', () => {
    it('should return only dynamic sections', () => {
      sectionStore.addSection('static');
      const dynamic1 = sectionStore.addSection('dynamic');
      sectionStore.addSection('static');
      const dynamic2 = sectionStore.addSection('dynamic');
      
      const dynamicSections = sectionStore.dynamicSections;
      
      expect(dynamicSections).toHaveLength(2);
      expect(dynamicSections.map(s => s.id)).toEqual([dynamic1.id, dynamic2.id]);
      expect(dynamicSections.every(s => s.type === 'dynamic')).toBe(true);
    });
  });

  describe('Editing State', () => {
    it('should manage editing section state', () => {
      const section = sectionStore.addSection('dynamic');
      
      expect(sectionStore.editingSection).toBeNull();
      
      sectionStore.setEditingSection(section.id);
      expect(sectionStore.editingSection).toBe(section.id);
      
      sectionStore.setEditingSection(null);
      expect(sectionStore.editingSection).toBeNull();
    });
  });
});