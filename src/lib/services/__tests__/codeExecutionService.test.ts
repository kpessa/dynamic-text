/**
 * Tests for Code Execution Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeHTML,
  createMockMe,
  transpileCode,
  evaluateCode,
  stripHTML,
  validateTestOutput,
  extractStylesFromHTML,
  runTestCase
} from '../codeExecutionService';

describe('CodeExecutionService', () => {
  describe('sanitizeHTML', () => {
    it('should remove dangerous script tags', () => {
      const input = '<div>Hello<script>alert("XSS")</script></div>';
      const result = sanitizeHTML(input);
      expect(result).toBe('<div>Hello</div>');
    });

    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong> <em>test</em></p>';
      const result = sanitizeHTML(input);
      expect(result).toBe('<p>Hello <strong>world</strong> <em>test</em></p>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onclick');
    });

    it('should allow safe attributes', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('target="_blank"');
    });
  });

  describe('createMockMe', () => {
    it('should create a me object with getValue function', () => {
      const me = createMockMe({ test: 5 });
      expect(me.getValue('test')).toBe(5);
    });

    it('should return 0 for undefined keys', () => {
      const me = createMockMe({});
      expect(me.getValue('undefined_key')).toBe(0);
    });

    it('should support setValue function', () => {
      const me = createMockMe({});
      me.setValue('newKey', 10);
      expect(me.getValue('newKey')).toBe(10);
    });

    it('should have legacy compatibility methods', () => {
      const me = createMockMe({ quantity: 5 });
      expect(me.getIngredientQuantity('quantity')).toBe(5);
      expect(me.getIngredientAmount('quantity')).toBe(5);
      expect(me.getIngredientDose('quantity')).toBe(5);
    });

    it('should have math helper methods', () => {
      const me = createMockMe();
      expect(me.round(3.14159, 2)).toBe(3.14);
      expect(me.min(5, 3, 8)).toBe(3);
      expect(me.max(5, 3, 8)).toBe(8);
      expect(me.abs(-5)).toBe(5);
    });
  });

  describe('stripHTML', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = stripHTML(input);
      expect(result).toBe('Hello world');
    });

    it('should handle nested tags', () => {
      const input = '<div><p>Test <span>nested</span> tags</p></div>';
      const result = stripHTML(input);
      expect(result).toBe('Test nested tags');
    });

    it('should decode HTML entities', () => {
      const input = '<p>&lt;Hello&gt; &amp; &quot;world&quot;</p>';
      const result = stripHTML(input);
      expect(result).toBe('<Hello> & "world"');
    });
  });

  describe('validateTestOutput', () => {
    it('should return true for matching outputs', () => {
      expect(validateTestOutput('test', 'test')).toBe(true);
    });

    it('should return false for non-matching outputs', () => {
      expect(validateTestOutput('test', 'different')).toBe(false);
    });

    it('should handle numbers', () => {
      expect(validateTestOutput(42, 42)).toBe(true);
      expect(validateTestOutput(42, 43)).toBe(false);
    });

    it('should handle complex objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      const obj3 = { a: 1, b: 3 };
      
      expect(validateTestOutput(obj1, obj2)).toBe(true);
      expect(validateTestOutput(obj1, obj3)).toBe(false);
    });
  });

  describe('extractStylesFromHTML', () => {
    it('should extract inline styles', () => {
      const html = '<div style="color: red; font-size: 14px;">Test</div>';
      const styles = extractStylesFromHTML(html);
      expect(styles).toBeDefined();
    });

    it('should extract style tags', () => {
      const html = '<style>.test { color: blue; }</style><div class="test">Test</div>';
      const styles = extractStylesFromHTML(html);
      expect(styles).toBeDefined();
    });

    it('should handle multiple style sources', () => {
      const html = `
        <style>.global { margin: 10px; }</style>
        <div style="color: red;" class="global">Test</div>
      `;
      const styles = extractStylesFromHTML(html);
      expect(styles).toBeDefined();
    });
  });

  describe('transpileCode', () => {
    it('should transpile ES6 code to ES5', async () => {
      const code = 'const test = () => "hello";';
      const result = await transpileCode(code);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle template literals', async () => {
      const code = 'const msg = `Hello ${name}`;';
      const result = await transpileCode(code);
      expect(result).toBeDefined();
    });

    it('should preserve functionality', async () => {
      const code = 'const add = (a, b) => a + b;';
      const result = await transpileCode(code);
      expect(result).toContain('function');
    });
  });

  describe('evaluateCode', () => {
    it('should evaluate simple expressions', () => {
      const result = evaluateCode('2 + 2', {});
      expect(result).toBe(4);
    });

    it('should access me object variables', () => {
      const me = createMockMe({ test: 10 });
      const result = evaluateCode('me.getValue("test") * 2', { me });
      expect(result).toBe(20);
    });

    it('should handle errors gracefully', () => {
      const result = evaluateCode('undefined_function()', {});
      expect(result).toContain('Error');
    });

    it('should support mathematical operations', () => {
      const result = evaluateCode('Math.sqrt(16) + Math.pow(2, 3)', {});
      expect(result).toBe(12);
    });
  });

  describe('runTestCase', () => {
    it('should run a test case for static content', async () => {
      const section = {
        id: '1',
        type: 'static' as const,
        content: '<p>Hello World</p>',
        isEditing: false,
        isCollapsed: false
      };
      const testCase = {
        name: 'Test',
        expectedOutput: 'Hello World'
      };
      
      const result = await runTestCase(section, testCase);
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should run a test case for dynamic content', async () => {
      const section = {
        id: '2',
        type: 'dynamic' as const,
        content: 'return "Hello " + me.getValue("name");',
        isEditing: false,
        isCollapsed: false
      };
      const testCase = {
        name: 'Test',
        variables: { name: 'World' },
        expectedOutput: 'Hello World'
      };
      
      const result = await runTestCase(section, testCase);
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should handle test failures', async () => {
      const section = {
        id: '3',
        type: 'static' as const,
        content: '<p>Wrong Output</p>',
        isEditing: false,
        isCollapsed: false
      };
      const testCase = {
        name: 'Test',
        expectedOutput: 'Expected Output'
      };
      
      const result = await runTestCase(section, testCase);
      expect(result.passed).toBe(false);
    });

    it('should handle errors in dynamic sections', async () => {
      const section = {
        id: '4',
        type: 'dynamic' as const,
        content: 'throw new Error("Test error");',
        isEditing: false,
        isCollapsed: false
      };
      const testCase = {
        name: 'Test',
        expectedOutput: 'Any output'
      };
      
      const result = await runTestCase(section, testCase);
      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});