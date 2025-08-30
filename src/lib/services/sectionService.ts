/**
 * Section Service
 * Handles section management, drag & drop, and section operations
 */

import { sanitizeHTML } from './codeExecutionService';

export interface Section {
  id: string;
  type: 'static' | 'dynamic';
  content: string;
  isEditing?: boolean;
  testCases?: any[];
  activeTestCase?: any;
  testResults?: any;
  showTests?: boolean;
}

/**
 * Create a new section
 */
export function createSection(type: 'static' | 'dynamic'): Section {
  const section: Section = {
    id: crypto.randomUUID(),
    type,
    content: type === 'static' ? '' : '// Dynamic JavaScript\nreturn "Hello, World!";',
    isEditing: true,
    showTests: false
  };
  if (type === 'dynamic') {
    section.testCases = [];
  }
  return section;
}

/**
 * Update section content
 */
export function updateSectionContent(sections: Section[], sectionId: string, content: string): Section[] {
  return sections.map(section => 
    section.id === sectionId
      ? { ...section, content }
      : section
  );
}

/**
 * Delete a section
 */
export function deleteSection(sections: Section[], sectionId: string): Section[] {
  return sections.filter(section => section.id !== sectionId);
}

/**
 * Toggle section editing state
 */
export function toggleSectionEditing(sections: Section[], sectionId: string, isEditing: boolean): Section[] {
  return sections.map(section =>
    section.id === sectionId
      ? { ...section, isEditing }
      : section
  );
}

/**
 * Convert static section to dynamic
 */
export function convertToDynamic(sections: Section[], sectionId: string, content: string): Section[] {
  return sections.map(section => {
    if (section.id === sectionId) {
      // Extract any JavaScript from script tags
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      let dynamicContent = '';
      
      if (scriptMatch && scriptMatch[1]) {
        dynamicContent = scriptMatch[1].trim();
      } else {
        // Convert HTML to a return statement
        const sanitized = sanitizeHTML(content);
        dynamicContent = `// Converted from static HTML\nreturn \`${sanitized}\`;`;
      }
      
      return {
        ...section,
        type: 'dynamic',
        content: dynamicContent,
        testCases: [],
        showTests: false
      };
    }
    return section;
  });
}

/**
 * Reorder sections via drag and drop
 */
export function reorderSections(sections: Section[], fromIndex: number, toIndex: number): Section[] {
  const newSections = [...sections];
  const [movedSection] = newSections.splice(fromIndex, 1);
  if (movedSection) {
    newSections.splice(toIndex, 0, movedSection);
  }
  return newSections;
}

/**
 * Extract used keys from sections
 */
export function extractUsedKeys(sections: Section[]): string[] {
  const keySet = new Set<string>();
  
  sections.forEach(section => {
    if (section.type === 'dynamic') {
      // Extract me.getValue() calls
      const getValueRegex = /me\.getValue\(['"]([^'"]+)['"]\)/g;
      let match;
      const content = section.content || '';
      while ((match = getValueRegex.exec(content)) !== null) {
        if (match[1]) {
          keySet.add(match[1]);
        }
      }
      
      // Also check test variables
      if (section.testCases) {
        section.testCases.forEach(testCase => {
          if (testCase.variables) {
            Object.keys(testCase.variables).forEach(key => keySet.add(key));
          }
        });
      }
    }
  });
  
  return Array.from(keySet);
}

/**
 * Check if sections have unsaved changes
 */
export function hasUnsavedChanges(currentSections: Section[], savedSections: Section[]): boolean {
  if (currentSections.length !== savedSections.length) return true;
  
  return currentSections.some((section, index) => {
    const savedSection = savedSections[index];
    return !savedSection || 
           section.content !== savedSection.content ||
           section.type !== savedSection.type ||
           JSON.stringify(section.testCases) !== JSON.stringify(savedSection.testCases);
  });
}

/**
 * Migrate sections to ensure proper structure
 */
export function migrateSections(sections: any[]): Section[] {
  return sections.map(section => ({
    id: section.id || crypto.randomUUID(),
    type: section.type || 'static',
    content: section.content || '',
    isEditing: false,
    testCases: section.testCases || (section.type === 'dynamic' ? [] : undefined),
    activeTestCase: section.activeTestCase || null,
    testResults: section.testResults || null,
    showTests: section.showTests || false
  }));
}

/**
 * Count sections by type
 */
export function countSectionsByType(sections: Section[]): { static: number; dynamic: number } {
  return sections.reduce((counts, section) => {
    counts[section.type]++;
    return counts;
  }, { static: 0, dynamic: 0 });
}

/**
 * Generate preview HTML from sections
 */
export function generatePreviewHTML(sections: Section[], evaluator: (code: string, vars?: any) => string): string {
  return sections.map(section => {
    if (section.type === 'static') {
      return sanitizeHTML(section.content);
    } else {
      try {
        return evaluator(section.content, section.activeTestCase?.variables || null);
      } catch (error) {
        return `<span style="color: red;">Error: ${(error as Error).message}</span>`;
      }
    }
  }).join('\n');
}