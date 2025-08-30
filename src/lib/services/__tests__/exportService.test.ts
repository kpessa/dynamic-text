/**
 * Tests for Export Service
 */

import { describe, it, expect } from 'vitest';
import {
  sectionsToJSON,
  sectionsToLineObjects,
  exportAsHTML,
  exportAsMarkdown,
  importFromJSON,
  validateImportData
} from '../exportService';
import type { Section } from '../../types';

describe('ExportService', () => {
  const mockSections: Section[] = [
    {
      id: '1',
      type: 'static',
      content: '<h1>Title</h1>',
      isEditing: false,
      isCollapsed: false
    },
    {
      id: '2',
      type: 'dynamic',
      content: 'return "Dynamic content: " + me.getValue("test");',
      isEditing: false,
      isCollapsed: false
    },
    {
      id: '3',
      type: 'static',
      content: '<p>Paragraph content</p>',
      isEditing: false,
      isCollapsed: false
    }
  ];

  describe('sectionsToJSON', () => {
    it('should convert sections to JSON format', () => {
      const result = sectionsToJSON(mockSections);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should preserve section structure', () => {
      const result = sectionsToJSON(mockSections);
      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].id).toBe('1');
      expect(result.sections[0].type).toBe('static');
    });

    it('should include metadata', () => {
      const result = sectionsToJSON(mockSections);
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle empty sections', () => {
      const result = sectionsToJSON([]);
      expect(result.sections).toHaveLength(0);
    });
  });

  describe('sectionsToLineObjects', () => {
    it('should convert sections to line objects', () => {
      const result = sectionsToLineObjects(mockSections);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('should create proper line object structure', () => {
      const result = sectionsToLineObjects(mockSections);
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('content');
    });

    it('should preserve section types', () => {
      const result = sectionsToLineObjects(mockSections);
      expect(result[0].type).toBe('static');
      expect(result[1].type).toBe('dynamic');
    });

    it('should handle sections with special characters', () => {
      const specialSections: Section[] = [{
        id: '4',
        type: 'static',
        content: '<p>Special: "quotes" & symbols</p>',
        isEditing: false,
        isCollapsed: false
      }];
      const result = sectionsToLineObjects(specialSections);
      expect(result[0].content).toContain('quotes');
    });
  });

  describe('exportAsHTML', () => {
    it('should export sections as HTML', () => {
      const previewHTML = '<div>Preview</div>';
      const result = exportAsHTML(mockSections, previewHTML);
      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
    });

    it('should include section content', () => {
      const previewHTML = '<h1>Title</h1><p>Content</p>';
      const result = exportAsHTML(mockSections, previewHTML);
      expect(result).toContain('Title');
      expect(result).toContain('Content');
    });

    it('should include proper HTML structure', () => {
      const previewHTML = '';
      const result = exportAsHTML(mockSections, previewHTML);
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
      expect(result).toContain('</html>');
    });

    it('should handle empty sections', () => {
      const result = exportAsHTML([], '');
      expect(result).toContain('<!DOCTYPE html>');
    });
  });

  describe('exportAsMarkdown', () => {
    it('should export sections as Markdown', () => {
      const result = exportAsMarkdown(mockSections);
      expect(typeof result).toBe('string');
    });

    it('should convert HTML to Markdown', () => {
      const htmlSections: Section[] = [{
        id: '5',
        type: 'static',
        content: '<h1>Heading</h1><p>Paragraph</p>',
        isEditing: false,
        isCollapsed: false
      }];
      const result = exportAsMarkdown(htmlSections);
      expect(result).toContain('# ');
    });

    it('should include dynamic section markers', () => {
      const result = exportAsMarkdown(mockSections);
      expect(result).toContain('```javascript');
    });

    it('should handle lists', () => {
      const listSections: Section[] = [{
        id: '6',
        type: 'static',
        content: '<ul><li>Item 1</li><li>Item 2</li></ul>',
        isEditing: false,
        isCollapsed: false
      }];
      const result = exportAsMarkdown(listSections);
      expect(result).toContain('- ');
    });
  });

  describe('importFromJSON', () => {
    it('should import valid JSON data', () => {
      const jsonData = {
        version: '1.0',
        sections: [
          { id: '1', type: 'static', content: 'Test' }
        ]
      };
      const result = importFromJSON(jsonData);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should preserve section properties', () => {
      const jsonData = {
        sections: [
          { id: 'test-id', type: 'dynamic', content: 'return 1;' }
        ]
      };
      const result = importFromJSON(jsonData);
      expect(result[0].id).toBe('test-id');
      expect(result[0].type).toBe('dynamic');
      expect(result[0].content).toBe('return 1;');
    });

    it('should handle missing fields with defaults', () => {
      const jsonData = {
        sections: [
          { type: 'static', content: 'Test' }
        ]
      };
      const result = importFromJSON(jsonData);
      expect(result[0].id).toBeDefined();
      expect(result[0].isEditing).toBe(false);
      expect(result[0].isCollapsed).toBe(false);
    });

    it('should filter out invalid sections', () => {
      const jsonData = {
        sections: [
          { id: '1', type: 'static', content: 'Valid' },
          { id: '2', type: 'invalid', content: 'Invalid type' },
          { id: '3', type: 'dynamic', content: 'Valid dynamic' }
        ]
      };
      const result = importFromJSON(jsonData);
      expect(result).toHaveLength(2);
    });
  });

  describe('validateImportData', () => {
    it('should validate correct import data', () => {
      const data = {
        version: '1.0',
        sections: [
          { id: '1', type: 'static', content: 'Test' }
        ]
      };
      const result = validateImportData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing sections', () => {
      const data = { version: '1.0' };
      const result = validateImportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid section types', () => {
      const data = {
        sections: [
          { id: '1', type: 'invalid', content: 'Test' }
        ]
      };
      const result = validateImportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing required fields', () => {
      const data = {
        sections: [
          { type: 'static' }  // Missing content
        ]
      };
      const result = validateImportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate empty sections array', () => {
      const data = {
        version: '1.0',
        sections: []
      };
      const result = validateImportData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle non-object input', () => {
      const result = validateImportData('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null input', () => {
      const result = validateImportData(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});