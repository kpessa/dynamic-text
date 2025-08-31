/**
 * Service for managing sections in the Dynamic Text Editor
 * Handles CRUD operations for sections and test cases
 */

import type { TestCase } from './testRunnerService';

export interface Section {
  id: number | string;
  type: 'static' | 'dynamic';
  content: string;
  testCases?: TestCase[];
}

export class SectionManagementService {
  private nextSectionId: number = 1;

  /**
   * Initialize the next section ID based on existing sections
   */
  initializeNextId(sections: Section[]): void {
    const maxId = Math.max(0, ...sections.map(s => 
      typeof s.id === 'number' ? s.id : parseInt(s.id as string) || 0
    ));
    this.nextSectionId = maxId + 1;
  }

  /**
   * Add a new section
   */
  addSection(sections: Section[], type: 'static' | 'dynamic'): Section[] {
    // Ensure nextSectionId is higher than any existing section ID
    this.initializeNextId(sections);
    
    const newSection: Section = {
      id: this.nextSectionId++,
      type: type,
      content: type === 'static' 
        ? '' 
        : '// Write JavaScript that returns HTML\nreturn ""'
    };
    
    if (type === 'dynamic') {
      newSection.testCases = [
        { name: 'Default', variables: {}, category: 'basicFunctionality' }
      ];
    }
    
    return [...sections, newSection];
  }

  /**
   * Delete a section by ID
   */
  deleteSection(sections: Section[], id: number | string): Section[] {
    return sections.filter(s => s.id !== id);
  }

  /**
   * Update section content
   */
  updateSectionContent(sections: Section[], id: number | string, content: string): Section[] {
    return sections.map(s => 
      s.id === id ? { ...s, content } : s
    );
  }

  /**
   * Convert a static section to dynamic when "[f(" is typed
   */
  convertToDynamic(sections: Section[], sectionId: number | string, content: string): Section[] {
    // Find the position of "[f(" in the content
    const bracketIndex = content.indexOf('[f(');
    
    if (bracketIndex === -1) return sections; // Safety check
    
    // Extract HTML before "[f(" and the beginning of the dynamic expression
    const htmlBefore = content.substring(0, bracketIndex).trim();
    const dynamicStart = content.substring(bracketIndex + 3); // Skip "[f("
    
    // Convert the section to dynamic type
    return sections.map(section => {
      if (section.id === sectionId && section.type === 'static') {
        // Create the dynamic content
        let dynamicContent = '';
        
        if (htmlBefore) {
          // If there was HTML before [f(, include it as a return statement
          dynamicContent = `// Converted from static HTML\nlet html = \`${htmlBefore}\`;\n\n// Your dynamic expression here\n${dynamicStart ? dynamicStart : '// Start typing your JavaScript expression...'}`;
        } else {
          // No HTML before, just start with the dynamic expression
          dynamicContent = `// Your dynamic expression here\n${dynamicStart ? dynamicStart : '// Start typing your JavaScript expression...'}`;
        }
        
        return {
          ...section,
          type: 'dynamic' as const,
          content: dynamicContent,
          testCases: [
            { name: 'Default', variables: {}, category: 'basicFunctionality' }
          ]
        };
      }
      return section;
    });
  }

  /**
   * Add a test case to a section
   */
  addTestCase(sections: Section[], sectionId: number | string): Section[] {
    return sections.map(section => {
      if (section.id === sectionId && section.testCases) {
        const newTestCase: TestCase = {
          name: `Test Case ${section.testCases.length + 1}`,
          variables: {},
          category: 'basicFunctionality'
        };
        return {
          ...section,
          testCases: [...section.testCases, newTestCase]
        };
      }
      return section;
    });
  }

  /**
   * Update a test case
   */
  updateTestCase(
    sections: Section[], 
    sectionId: number | string, 
    index: number, 
    updates: Partial<TestCase>
  ): Section[] {
    return sections.map(section => {
      if (section.id === sectionId && section.testCases) {
        const updatedTestCases = [...section.testCases];
        updatedTestCases[index] = { ...updatedTestCases[index], ...updates };
        return { ...section, testCases: updatedTestCases };
      }
      return section;
    });
  }

  /**
   * Delete a test case
   */
  deleteTestCase(sections: Section[], sectionId: number | string, index: number): Section[] {
    return sections.map(section => {
      if (section.id === sectionId && section.testCases && section.testCases.length > 1) {
        const updatedTestCases = section.testCases.filter((_, i) => i !== index);
        return { ...section, testCases: updatedTestCases };
      }
      return section;
    });
  }

  /**
   * Reorder sections after drag and drop
   */
  reorderSections(sections: Section[], draggedId: number | string, targetId: number | string): Section[] {
    const draggedSection = sections.find(s => s.id === draggedId);
    const targetIndex = sections.findIndex(s => s.id === targetId);
    
    if (!draggedSection || targetIndex === -1) return sections;
    
    // Remove dragged section
    const filteredSections = sections.filter(s => s.id !== draggedId);
    
    // Insert at new position
    filteredSections.splice(targetIndex, 0, draggedSection);
    
    return filteredSections;
  }

  /**
   * Check if sections have changed from original
   */
  hasChanges(currentSections: Section[], originalSectionsStr: string | null): boolean {
    if (!originalSectionsStr) return false;
    const currentSectionsStr = JSON.stringify(currentSections);
    return currentSectionsStr !== originalSectionsStr;
  }

  /**
   * Migrate sections to ensure they have required properties
   */
  migrateSections(sections: Section[]): Section[] {
    return sections.map(section => {
      // If it's a dynamic section without testCases, add a default one
      if (section.type === 'dynamic' && !section.testCases) {
        return {
          ...section,
          testCases: [{ name: 'Default', variables: {} }]
        };
      }
      return section;
    });
  }
}

// Export singleton instance
export const sectionManagementService = new SectionManagementService();