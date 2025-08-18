/**
 * Code Execution Service Tests
 * Tests for code transpilation, execution, and sandboxing
 */

import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeHTML,
  createMockMe,
  transpileCode,
  evaluateCode,
  extractStylesFromHTML,
  stripHTML,
  validateTestOutput,
  runTestCase
} from '../codeExecutionService';

describe('Code Execution Service', () => {
  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const output = sanitizeHTML(input);
      expect(output).toBe(input);
    });

    it('should remove dangerous tags', () => {
      const input = '<script>alert("XSS")</script><p>Safe content</p>';
      const output = sanitizeHTML(input);
      expect(output).toBe('<p>Safe content</p>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const output = sanitizeHTML(input);
      expect(output).toBe('<div>Click me</div>');
    });

    it('should preserve allowed attributes', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const output = sanitizeHTML(input);
      expect(output).toBe(input);
    });

    it('should handle empty input', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null as any)).toBe('');
      expect(sanitizeHTML(undefined as any)).toBe('');
    });
  });

  describe('createMockMe', () => {
    it('should create mock me object with getValue', () => {
      const variables = { DOSE_WEIGHT: 10, TPN_VOLUME: 1000 };
      const me = createMockMe(variables);
      
      expect(me.getValue('DOSE_WEIGHT')).toBe(10);
      expect(me.getValue('TPN_VOLUME')).toBe(1000);
      expect(me.getValue('UNKNOWN')).toBe(0);
    });

    it('should support setValue', () => {
      const me = createMockMe();
      me.setValue('TEST_KEY', 42);
      expect(me.getValue('TEST_KEY')).toBe(42);
    });

    it('should provide legacy methods', () => {
      const variables = { SODIUM: 3 };
      const me = createMockMe(variables);
      
      expect(me.getIngredientQuantity('SODIUM')).toBe(3);
      expect(me.getIngredientAmount('SODIUM')).toBe(3);
      expect(me.getIngredientDose('SODIUM')).toBe(3);
    });

    it('should provide helper methods', () => {
      const me = createMockMe();
      
      expect(me.round(3.14159, 2)).toBe(3.14);
      expect(me.min(5, 3, 8)).toBe(3);
      expect(me.max(5, 3, 8)).toBe(8);
      expect(me.abs(-5)).toBe(5);
    });

    it('should spread variables as direct properties', () => {
      const variables = { WEIGHT: 10, VOLUME: 100 };
      const me = createMockMe(variables);
      
      expect(me.WEIGHT).toBe(10);
      expect(me.VOLUME).toBe(100);
    });
  });

  describe('transpileCode', () => {
    it('should transpile modern JavaScript to ES5', () => {
      const code = 'const x = 5;';
      const transpiled = transpileCode(code);
      expect(transpiled).toContain('var');
      expect(transpiled).not.toContain('const');
    });

    it('should handle arrow functions', () => {
      const code = 'const add = (a, b) => a + b;';
      const transpiled = transpileCode(code);
      expect(transpiled).toContain('function');
    });

    it('should handle template literals', () => {
      const code = 'const msg = `Hello ${name}`;';
      const transpiled = transpileCode(code);
      expect(transpiled).not.toContain('`');
    });

    it('should throw on invalid syntax', () => {
      const code = 'const x = ;'; // Invalid syntax
      expect(() => transpileCode(code)).toThrow('Code transpilation failed');
    });
  });

  describe('evaluateCode', () => {
    it('should evaluate simple expressions', () => {
      const code = 'return 2 + 2;';
      const result = evaluateCode(code);
      expect(result).toBe('4');
    });

    it('should have access to me object', () => {
      const code = 'return me.getValue("TEST");';
      const result = evaluateCode(code, { TEST: 42 });
      expect(result).toBe('42');
    });

    it('should have access to Math object', () => {
      const code = 'return Math.PI.toFixed(2);';
      const result = evaluateCode(code);
      expect(result).toBe('3.14');
    });

    it('should return empty string for undefined result', () => {
      const code = 'const x = 5;'; // No return
      const result = evaluateCode(code);
      expect(result).toBe('');
    });

    it('should stringify objects', () => {
      const code = 'return { x: 1, y: 2 };';
      const result = evaluateCode(code);
      expect(result).toBe('{"x":1,"y":2}');
    });

    it('should handle errors gracefully', () => {
      const code = 'throw new Error("Test error");';
      const result = evaluateCode(code);
      expect(result).toContain('Error');
      expect(result).toContain('Test error');
    });
  });

  describe('extractStylesFromHTML', () => {
    it('should extract inline styles', () => {
      const html = '<div style="color: red; font-size: 14px;">Text</div>';
      const styles = extractStylesFromHTML(html);
      expect(styles.color).toBe('red');
      expect(styles['font-size']).toBe('14px');
    });

    it('should handle empty style attribute', () => {
      const html = '<div style="">Text</div>';
      const styles = extractStylesFromHTML(html);
      expect(styles).toEqual({});
    });

    it('should handle no style attribute', () => {
      const html = '<div>Text</div>';
      const styles = extractStylesFromHTML(html);
      expect(styles).toEqual({});
    });

    it('should handle malformed styles', () => {
      const html = '<div style="color:">Text</div>';
      const styles = extractStylesFromHTML(html);
      expect(styles).toEqual({});
    });
  });

  describe('stripHTML', () => {
    it('should remove HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const text = stripHTML(html);
      expect(text).toBe('Hello World');
    });

    it('should handle nested tags', () => {
      const html = '<div><p>Nested <span>content</span></p></div>';
      const text = stripHTML(html);
      expect(text).toBe('Nested content');
    });

    it('should handle empty input', () => {
      expect(stripHTML('')).toBe('');
      expect(stripHTML('<p></p>')).toBe('');
    });

    it('should preserve text without tags', () => {
      const text = 'Plain text';
      expect(stripHTML(text)).toBe(text);
    });
  });

  describe('validateTestOutput', () => {
    it('should validate exact match', () => {
      expect(validateTestOutput('Hello', 'Hello', 'exact')).toBe(true);
      expect(validateTestOutput('Hello', 'hello', 'exact')).toBe(false);
    });

    it('should validate contains match', () => {
      expect(validateTestOutput('Hello World', 'World', 'contains')).toBe(true);
      expect(validateTestOutput('Hello World', 'Foo', 'contains')).toBe(false);
    });

    it('should validate regex match', () => {
      expect(validateTestOutput('Test123', '^Test\\d+$', 'regex')).toBe(true);
      expect(validateTestOutput('Test', '^Test\\d+$', 'regex')).toBe(false);
    });

    it('should strip HTML before validation', () => {
      expect(validateTestOutput('<p>Hello</p>', 'Hello', 'exact')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(validateTestOutput('  Hello  ', 'Hello', 'exact')).toBe(true);
    });

    it('should handle invalid regex gracefully', () => {
      expect(validateTestOutput('Test', '[', 'regex')).toBe(false);
    });
  });

  describe('runTestCase', () => {
    it('should run test with variables', () => {
      const code = 'return me.getValue("X") + me.getValue("Y");';
      const testCase = {
        name: 'Addition Test',
        // variables: { X: 3, Y: 4 }
      };
      
      const result = runTestCase(code, testCase);
      expect(result.passed).toBe(true);
      expect(result.actualOutput).toBe('7');
    });

    it('should validate expected output', () => {
      const code = 'return "Hello World";';
      const testCase = {
        name: 'Output Test',
        expectedOutput: 'Hello World',
        matchType: 'exact' as const
      };
      
      const result = runTestCase(code, testCase);
      expect(result.passed).toBe(true);
    });

    it('should fail on output mismatch', () => {
      const code = 'return "Hello";';
      const testCase = {
        name: 'Output Test',
        expectedOutput: 'Goodbye',
        matchType: 'exact' as const
      };
      
      const result = runTestCase(code, testCase);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Output mismatch');
    });

    it('should validate expected styles', () => {
      const code = 'return "<span style=\\"color: red;\\">Text</span>";';
      const testCase = {
        name: 'Style Test',
        // expectedStyles: { color: 'red' }
      };
      
      const result = runTestCase(code, testCase);
      expect(result.passed).toBe(true);
      expect(result.actualStyles.color).toBe('red');
    });

    it('should fail on style mismatch', () => {
      const code = 'return "<span style=\\"color: blue;\\">Text</span>";';
      const testCase = {
        name: 'Style Test',
        // expectedStyles: { color: 'red' }
      };
      
      const result = runTestCase(code, testCase);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Style mismatch');
    });

    it('should handle code errors', () => {
      const code = 'throw new Error("Code error");';
      const testCase = { 
        name: 'Error Test',
        expectedOutput: 'Success',  // Add expected output so test will fail
        matchType: 'contains'
      };
      
      const result = runTestCase(code, testCase);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Output mismatch');
    });
  });
});