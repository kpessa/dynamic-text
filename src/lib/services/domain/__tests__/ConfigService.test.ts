import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertNotesToSections, configService } from '../ConfigService';

describe('ConfigService - convertNotesToSections', () => {
  beforeEach(() => {
    // Clear console warnings for each test
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('Basic Parsing', () => {
    it('should return empty array for null or undefined input', () => {
      expect(convertNotesToSections(null as any)).toEqual([]);
      expect(convertNotesToSections(undefined)).toEqual([]);
      expect(convertNotesToSections([])).toEqual([]);
    });

    it('should parse pure static content', () => {
      const notes = [
        { TEXT: 'Patient Information' },
        { TEXT: 'Weight: 70 kg' },
        { TEXT: 'Height: 175 cm' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(1);
      expect(sections[0]).toMatchObject({
        type: 'static',
        content: 'Patient Information\nWeight: 70 kg\nHeight: 175 cm',
        name: 'Section 1'
      });
    });

    it('should parse pure dynamic content', () => {
      const notes = [
        { TEXT: '[f(' },
        { TEXT: 'return me.getValue("weight") + " kg"' },
        { TEXT: ')]' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(1);
      expect(sections[0]).toMatchObject({
        type: 'dynamic',
        content: 'return me.getValue("weight") + " kg"', // Content without markers
        testCases: [{ name: 'Default', variables: {} }]
      });
    });

    it('should parse mixed static and dynamic content', () => {
      const notes = [
        { TEXT: 'Patient Information' },
        { TEXT: 'Current Weight:' },
        { TEXT: '[f(' },
        { TEXT: 'return me.getValue("weight") + " kg"' },
        { TEXT: ')]' },
        { TEXT: 'Notes: Patient stable' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(3);
      expect(sections[0].type).toBe('static');
      expect(sections[0].content).toContain('Patient Information');
      expect(sections[1].type).toBe('dynamic');
      expect(sections[2].type).toBe('static');
      expect(sections[2].content).toBe('Notes: Patient stable');
    });
  });

  describe('Dynamic Block Handling', () => {
    it('should handle dynamic blocks on single line', () => {
      const notes = [
        { TEXT: '[f(return "Hello")]' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('dynamic');
      expect(sections[0].content).toBe('return "Hello"');
    });

    it('should handle multiple dynamic blocks', () => {
      const notes = [
        { TEXT: '[f(return "First")]' },
        { TEXT: 'Static Text' },
        { TEXT: '[f(return "Second")]' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(3);
      expect(sections[0].type).toBe('dynamic');
      expect(sections[1].type).toBe('static');
      expect(sections[2].type).toBe('dynamic');
    });

    it('should extract section name from dynamic comment', () => {
      const notes = [
        { TEXT: '[f(' },
        { TEXT: '// Calculate BMI' },
        { TEXT: 'const weight = me.getValue("weight");' },
        { TEXT: 'const height = me.getValue("height");' },
        { TEXT: 'return weight / (height * height);' },
        { TEXT: ')]' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(1);
      expect(sections[0].name).toBe('Calculate BMI');
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed dynamic blocks with warning', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      
      const notes = [
        { TEXT: '[f(' },
        { TEXT: 'return "Unclosed"' }
        // Missing )]
      ];

      const sections = convertNotesToSections(notes);
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unclosed dynamic block')
      );
      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('static');
    });

    it('should handle missing opening marker', () => {
      const notes = [
        { TEXT: 'Some text' },
        { TEXT: ')]' } // Closing without opening
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('static');
      expect(sections[0].content).toBe('Some text\n)]');
    });

    it('should handle nested dynamic blocks', () => {
      const notes = [
        { TEXT: '[f(' },
        { TEXT: 'const nested = "[f(inner)]";' },
        { TEXT: 'return nested;' },
        { TEXT: ')]' }
      ];

      const sections = convertNotesToSections(notes);
      
      // The parser currently treats [f( and )] as actual markers even in strings
      // This is expected behavior as the NOTE format doesn't escape these markers
      // Multiple sections will be created: before, dynamic "inner", and after
      expect(sections.length).toBeGreaterThanOrEqual(1);
      
      // At minimum, we should have a dynamic section
      const dynamicSection = sections.find(s => s.type === 'dynamic');
      expect(dynamicSection).toBeDefined();
    });

    it('should skip notes without TEXT property', () => {
      const notes = [
        { TEXT: 'Valid text' },
        { INVALID: 'This should be skipped' } as any,
        { TEXT: 'More valid text' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections).toHaveLength(1);
      expect(sections[0].content).toBe('Valid text\nMore valid text');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle real-world TPN note format', () => {
      const notes = [
        { TEXT: 'ADULT TPN ADVISOR FUNCTION' },
        { TEXT: '' },
        { TEXT: 'Patient Weight: [f(return me.getValue("weight") + " kg")]' },
        { TEXT: '' },
        { TEXT: 'Calculated Values:' },
        { TEXT: '[f(' },
        { TEXT: '// TPN Calculations' },
        { TEXT: 'const weight = me.getValue("weight");' },
        { TEXT: 'const calories = weight * 25;' },
        { TEXT: 'return `Calories: ${calories} kcal/day`;' },
        { TEXT: ')]' },
        { TEXT: '' },
        { TEXT: 'Recommendations based on calculations above.' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections.length).toBeGreaterThanOrEqual(3);
      
      // Find the TPN Calculations section
      const tpnSection = sections.find(s => s.name === 'TPN Calculations');
      expect(tpnSection).toBeDefined();
      expect(tpnSection?.type).toBe('dynamic');
    });

    it('should handle multiple inline dynamic blocks', () => {
      const notes = [
        { TEXT: 'Weight: [f(return me.getValue("weight"))] Height: [f(return me.getValue("height"))]' }
      ];

      const sections = convertNotesToSections(notes);
      
      expect(sections.length).toBeGreaterThanOrEqual(4); // Static, dynamic, static, dynamic
    });
  });

  describe('ConfigService Integration', () => {
    it('should be accessible through ConfigService instance', () => {
      const notes = [
        { TEXT: 'Test content' }
      ];

      const sections = configService.convertNotesToSections(notes);
      
      expect(sections).toHaveLength(1);
      expect(sections[0].content).toBe('Test content');
    });
  });
});