import { describe, it, expect, beforeEach } from 'vitest';
import { noteTransformService } from '../noteTransformService';
import type { Section } from '$lib/types';

describe('NoteTransformService', () => {
  let service: typeof noteTransformService;

  beforeEach(() => {
    service = noteTransformService;
  });

  describe('sectionsToNoteArray', () => {
    it('should convert empty sections to empty NOTE array', () => {
      const result = service.sectionsToNoteArray([]);
      expect(result).toEqual([]);
    });

    it('should convert static sections to NOTE objects', () => {
      const sections: Section[] = [
        {
          id: 'section1',
          name: 'Section 1',
          type: 'static',
          content: 'This is static content',
          isExpanded: false
        },
        {
          id: 'section2',
          name: 'Section 2',
          type: 'static',
          content: 'Another static section',
          isExpanded: true
        }
      ];

      const result = service.sectionsToNoteArray(sections);
      
      expect(result).toEqual([
        { TEXT: 'This is static content' },
        { TEXT: 'Another static section' }
      ]);
    });

    it('should convert dynamic sections to NOTE objects', () => {
      const sections: Section[] = [
        {
          id: 'dynamic1',
          name: 'Dynamic Section',
          type: 'dynamic',
          content: 'const value = me.getValue("weight");\nreturn value * 2;',
          isExpanded: false
        }
      ];

      const result = service.sectionsToNoteArray(sections);
      
      expect(result).toEqual([
        { TEXT: 'const value = me.getValue("weight");\nreturn value * 2;' }
      ]);
    });

    it('should handle mixed section types', () => {
      const sections: Section[] = [
        {
          id: 'static1',
          name: 'Static',
          type: 'static',
          content: 'Static text',
          isExpanded: false
        },
        {
          id: 'dynamic1',
          name: 'Dynamic',
          type: 'dynamic',
          content: 'return me.getValue("test");',
          isExpanded: false
        }
      ];

      const result = service.sectionsToNoteArray(sections);
      
      expect(result).toEqual([
        { TEXT: 'Static text' },
        { TEXT: 'return me.getValue("test");' }
      ]);
    });

    it('should handle sections with empty content', () => {
      const sections: Section[] = [
        {
          id: 'empty1',
          name: 'Empty',
          type: 'static',
          content: '',
          isExpanded: false
        },
        {
          id: 'undefined1',
          name: 'Undefined',
          type: 'static',
          content: undefined as any,
          isExpanded: false
        }
      ];

      const result = service.sectionsToNoteArray(sections);
      
      expect(result).toEqual([
        { TEXT: '' },
        { TEXT: '' }
      ]);
    });
  });

  describe('noteArrayToSections', () => {
    it('should convert empty NOTE array to empty sections', () => {
      const result = service.noteArrayToSections([], 'TEST_KEY');
      expect(result).toEqual([]);
    });

    it('should convert undefined NOTE array to empty sections', () => {
      const result = service.noteArrayToSections(undefined, 'TEST_KEY');
      expect(result).toEqual([]);
    });

    it('should convert NOTE objects to static sections', () => {
      const noteArray = [
        { TEXT: 'Simple text content' },
        { TEXT: 'Another simple text' }
      ];

      const result = service.noteArrayToSections(noteArray, 'CALCIUM');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'Note 1',
        type: 'static',
        content: 'Simple text content',
        isExpanded: false,
        metadata: {
          sourceIngredient: 'CALCIUM',
          originalIndex: 0
        }
      });
      expect(result[1]).toMatchObject({
        name: 'Note 2',
        type: 'static',
        content: 'Another simple text',
        isExpanded: false,
        metadata: {
          sourceIngredient: 'CALCIUM',
          originalIndex: 1
        }
      });
    });

    it('should detect and convert JavaScript content to dynamic sections', () => {
      const noteArray = [
        { TEXT: 'const weight = me.getValue("weight");\nreturn weight * 0.5;' },
        { TEXT: 'if (me.populationType === "neo") {\n  return "Neonatal";\n}' },
        { TEXT: 'function calculate() {\n  return 42;\n}' }
      ];

      const result = service.noteArrayToSections(noteArray, 'PROTEIN');
      
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('dynamic');
      expect(result[1].type).toBe('dynamic');
      expect(result[2].type).toBe('dynamic');
    });

    it('should handle mixed content types correctly', () => {
      const noteArray = [
        { TEXT: 'This is plain text documentation' },
        { TEXT: 'let result = me.getValue("sodium") * 2;' },
        { TEXT: 'Another plain text note' },
        { TEXT: '() => me.ingredients.CALCIUM' }
      ];

      const result = service.noteArrayToSections(noteArray, 'SODIUM');
      
      expect(result[0].type).toBe('static');
      expect(result[1].type).toBe('dynamic');
      expect(result[2].type).toBe('static');
      expect(result[3].type).toBe('dynamic');
    });

    it('should handle empty TEXT fields', () => {
      const noteArray = [
        { TEXT: '' },
        { TEXT: null as any },
        { TEXT: undefined as any }
      ];

      const result = service.noteArrayToSections(noteArray, 'TEST');
      
      expect(result).toHaveLength(3);
      result.forEach(section => {
        expect(section.content).toBe('');
        expect(section.type).toBe('static');
      });
    });

    it('should generate unique IDs for each section', () => {
      const noteArray = [
        { TEXT: 'Note 1' },
        { TEXT: 'Note 2' }
      ];

      const result = service.noteArrayToSections(noteArray, 'TEST');
      
      expect(result[0].id).not.toBe(result[1].id);
      expect(result[0].id).toContain('TEST_note_0');
      expect(result[1].id).toContain('TEST_note_1');
    });
  });

  describe('validateNoteArray', () => {
    it('should validate correct NOTE array format', () => {
      const validArray = [
        { TEXT: 'valid text' },
        { TEXT: '' },
        { TEXT: 'another valid text' }
      ];

      expect(service.validateNoteArray(validArray)).toBe(true);
    });

    it('should reject non-array inputs', () => {
      expect(service.validateNoteArray(null)).toBe(false);
      expect(service.validateNoteArray(undefined)).toBe(false);
      expect(service.validateNoteArray({})).toBe(false);
      expect(service.validateNoteArray('string')).toBe(false);
      expect(service.validateNoteArray(123)).toBe(false);
    });

    it('should reject arrays with invalid objects', () => {
      const invalidArrays = [
        [{ text: 'wrong key' }],
        [{ TEXT: 123 }], // Wrong type
        [null],
        [undefined],
        ['string'],
        [{ TEXT: 'valid' }, { INVALID: 'key' }]
      ];

      invalidArrays.forEach(arr => {
        expect(service.validateNoteArray(arr)).toBe(false);
      });
    });

    it('should accept empty array as valid', () => {
      expect(service.validateNoteArray([])).toBe(true);
    });
  });

  describe('bidirectional transformation', () => {
    it('should maintain content integrity through round-trip conversion', () => {
      const originalSections: Section[] = [
        {
          id: 'test1',
          name: 'Test 1',
          type: 'static',
          content: 'Static content with special chars: <>&"\'',
          isExpanded: false
        },
        {
          id: 'test2',
          name: 'Test 2',
          type: 'dynamic',
          content: 'const result = me.getValue("test");\nreturn result > 10 ? "High" : "Low";',
          isExpanded: true
        }
      ];

      // Convert to NOTE array
      const noteArray = service.sectionsToNoteArray(originalSections);
      
      // Convert back to sections
      const restoredSections = service.noteArrayToSections(noteArray, 'TEST');
      
      // Verify content is preserved
      expect(restoredSections[0].content).toBe(originalSections[0].content);
      expect(restoredSections[1].content).toBe(originalSections[1].content);
      
      // Verify type detection worked correctly
      expect(restoredSections[0].type).toBe('static');
      expect(restoredSections[1].type).toBe('dynamic');
    });

    it('should handle complex JavaScript patterns in dynamic detection', () => {
      const jsPatterns = [
        'function calculate() { return 42; }',
        'const value = 10;',
        'let result = me.getValue("test");',
        'var old = true;',
        'if (condition) { doSomething(); }',
        'for (let i = 0; i < 10; i++) {}',
        'while (true) { break; }',
        'return me.ingredients.CALCIUM;',
        '() => me.populationType',
        '{\n  const x = 1;\n}'
      ];

      jsPatterns.forEach(pattern => {
        const noteArray = [{ TEXT: pattern }];
        const sections = service.noteArrayToSections(noteArray, 'TEST');
        expect(sections[0].type).toBe('dynamic');
      });
    });

    it('should handle edge cases in content', () => {
      const edgeCases = [
        { TEXT: '\n\n\n' }, // Multiple newlines
        { TEXT: '   ' }, // Spaces only
        { TEXT: '\t\t' }, // Tabs
        { TEXT: '// Just a comment' }, // Comment only
        { TEXT: '/* Block comment */' } // Block comment
      ];

      const sections = service.noteArrayToSections(edgeCases, 'EDGE');
      
      expect(sections).toHaveLength(5);
      // Comments should be detected as static (not executable code)
      expect(sections[3].type).toBe('static');
      expect(sections[4].type).toBe('static');
    });
  });

  describe('mergeWithExisting', () => {
    it('should replace existing sections with imported notes', () => {
      const existingSections: Section[] = [
        {
          id: 'existing1',
          name: 'Existing',
          type: 'static',
          content: 'Old content',
          isExpanded: false
        }
      ];

      const importedNotes = [
        { TEXT: 'New content 1' },
        { TEXT: 'New content 2' }
      ];

      const result = service.mergeWithExisting(existingSections, importedNotes, 'MERGE_TEST');
      
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('New content 1');
      expect(result[1].content).toBe('New content 2');
      // Old content should be replaced
      expect(result.find(s => s.content === 'Old content')).toBeUndefined();
    });
  });
});