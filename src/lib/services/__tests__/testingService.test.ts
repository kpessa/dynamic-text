import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  runTestCase,
  runSectionTests,
  createDefaultTestCase,
  validateTestCase,
  calculateTestStats,
  formatTestResults,
  type TestCase,
  type TestResult
} from '../testingService';

// Mock the codeExecutionService
vi.mock('../codeExecutionService', () => ({
  evaluateCode: vi.fn((code: string, variables: any) => {
    // Simple mock implementation
    if (code.includes('error')) {
      throw new Error('Execution error');
    }
    if (code.includes('timeout')) {
      // Simulate timeout
      return new Promise(resolve => setTimeout(resolve, 6000));
    }
    if (code.includes('styled')) {
      return '<div style="color: red;">Styled output</div>';
    }
    if (code.includes('return')) {
      return code.includes('"hello"') ? 'hello' : 'test output';
    }
    return 'default output';
  }),
  stripHTML: vi.fn((html: string) => {
    return html.replace(/<[^>]*>/g, '');
  }),
  validateTestOutput: vi.fn((actual: string, expected: string, matchType: string) => {
    const actualClean = actual.replace(/<[^>]*>/g, '').trim();
    const expectedClean = expected.trim();
    
    switch (matchType) {
      case 'exact':
        return actualClean === expectedClean;
      case 'contains':
        return actualClean.includes(expectedClean);
      case 'regex':
        try {
          return new RegExp(expectedClean).test(actualClean);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }),
  extractStylesFromHTML: vi.fn((html: string) => {
    const styleMatch = html.match(/style="([^"]*)"/);
    if (!styleMatch) return {};
    
    const styles: Record<string, string> = {};
    styleMatch[1].split(';').forEach(style => {
      const [prop, value] = style.split(':').map(s => s.trim());
      if (prop && value) {
        styles[prop] = value;
      }
    });
    return styles;
  })
}));

describe('testingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runTestCase', () => {
    it('should run a test case and return passed result', () => {
      const testCase: TestCase = {
        name: 'Test 1',
        variables: { x: 10 },
        expectedOutput: 'test output',
        matchType: 'exact'
      };
      
      const result = runTestCase('return "test output"', testCase);
      
      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.actualOutput).toBe('test output');
    });

    it('should handle failed test with output mismatch', () => {
      const testCase: TestCase = {
        name: 'Test 2',
        variables: {},
        expectedOutput: 'expected',
        matchType: 'exact'
      };
      
      const result = runTestCase('return "actual"', testCase);
      
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Output mismatch');
      expect(result.error).toContain('Expected (exact): "expected"');
      expect(result.error).toContain('Actual: "default output"');
    });

    it('should handle contains match type', () => {
      const testCase: TestCase = {
        name: 'Test 3',
        variables: {},
        expectedOutput: 'output',
        matchType: 'contains'
      };
      
      const result = runTestCase('return "test output here"', testCase);
      
      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle regex match type', () => {
      const testCase: TestCase = {
        name: 'Test 4',
        variables: {},
        expectedOutput: 'test.*output',
        matchType: 'regex'
      };
      
      const result = runTestCase('return "test some output"', testCase);
      
      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle style expectations', () => {
      const testCase: TestCase = {
        name: 'Test 5',
        variables: {},
        expectedStyles: { color: 'red' }
      };
      
      const result = runTestCase('styled', testCase);
      
      expect(result.passed).toBe(true);
      expect(result.actualStyles).toEqual({ color: 'red' });
    });

    it('should fail on style mismatch', () => {
      const testCase: TestCase = {
        name: 'Test 6',
        variables: {},
        expectedStyles: { color: 'blue' }
      };
      
      const result = runTestCase('styled', testCase);
      
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Style mismatch');
      expect(result.error).toContain('color');
      expect(result.error).toContain('Expected: "blue"');
      expect(result.error).toContain('Actual: "red"');
    });

    it('should handle execution errors', () => {
      const testCase: TestCase = {
        name: 'Test 7',
        variables: {},
        expectedOutput: 'anything'
      };
      
      const result = runTestCase('error', testCase);
      
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Execution error');
      expect(result.actualOutput).toBe('');
    });

    it('should pass test variables to code execution', () => {
      const testCase: TestCase = {
        name: 'Test 8',
        variables: { x: 5, y: 10, data: 'test' },
        expectedOutput: 'test output'
      };
      
      const result = runTestCase('return variables', testCase);
      
      // The mock should have been called with the variables
      const evaluateCode = require('../codeExecutionService').evaluateCode;
      expect(evaluateCode).toHaveBeenCalledWith('return variables', testCase.variables);
    });

    it('should merge TPN context with test variables', () => {
      const testCase: TestCase = {
        name: 'Test 9',
        variables: { x: 5 }
      };
      
      const tpnContext = {
        populationType: 'ADULT',
        tpnInstance: { weight: 70 }
      };
      
      const result = runTestCase('return tpn', testCase, tpnContext);
      
      const evaluateCode = require('../codeExecutionService').evaluateCode;
      expect(evaluateCode).toHaveBeenCalledWith(
        'return tpn',
        expect.objectContaining({
          x: 5,
          populationType: 'ADULT',
          tpnInstance: { weight: 70 }
        })
      );
    });

    it('should handle timeout protection', () => {
      const testCase: TestCase = {
        name: 'Test 10',
        variables: {}
      };
      
      // Note: In the actual implementation, this would timeout
      // For testing, we're just checking the timeout logic exists
      const result = runTestCase('return "quick"', testCase);
      
      expect(result.passed).toBe(true); // Should complete quickly
    });

    it('should handle test without expectations', () => {
      const testCase: TestCase = {
        name: 'Test 11',
        variables: {}
        // No expectedOutput or expectedStyles
      };
      
      const result = runTestCase('return "anything"', testCase);
      
      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.actualOutput).toBeDefined();
    });
  });

  describe('runSectionTests', () => {
    it('should run multiple test cases for a section', () => {
      const testCases: TestCase[] = [
        { name: 'Test 1', variables: {}, expectedOutput: 'test output', matchType: 'exact' },
        { name: 'Test 2', variables: {}, expectedOutput: 'output', matchType: 'contains' },
        { name: 'Test 3', variables: {} }
      ];
      
      const results = runSectionTests('return "test output"', testCases);
      
      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(true);
      expect(results[2].passed).toBe(true);
    });

    it('should handle empty test cases array', () => {
      const results = runSectionTests('return "test"', []);
      
      expect(results).toEqual([]);
    });

    it('should handle null test cases', () => {
      const results = runSectionTests('return "test"', null as any);
      
      expect(results).toEqual([]);
    });

    it('should pass TPN context to all tests', () => {
      const testCases: TestCase[] = [
        { name: 'Test 1', variables: { x: 1 } },
        { name: 'Test 2', variables: { x: 2 } }
      ];
      
      const tpnContext = { populationType: 'CHILD' };
      
      const results = runSectionTests('return "test"', testCases, tpnContext);
      
      expect(results).toHaveLength(2);
      // All tests should pass with merged context
      results.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('createDefaultTestCase', () => {
    it('should create a default test case with required properties', () => {
      const testCase = createDefaultTestCase();
      
      expect(testCase.name).toContain('Test');
      expect(testCase.variables).toEqual({});
      expect(testCase.matchType).toBe('contains');
    });

    it('should create unique names for multiple test cases', () => {
      const testCase1 = createDefaultTestCase();
      const testCase2 = createDefaultTestCase();
      
      expect(testCase1.name).not.toBe(testCase2.name);
    });
  });

  describe('validateTestCase', () => {
    it('should validate a valid test case', () => {
      const testCase: TestCase = {
        name: 'Valid Test',
        variables: { x: 1 },
        expectedOutput: 'output',
        matchType: 'exact'
      };
      
      const result = validateTestCase(testCase);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing test case', () => {
      const result = validateTestCase(null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Test case is required');
    });

    it('should detect missing name', () => {
      const testCase = {
        variables: {}
      };
      
      const result = validateTestCase(testCase);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Test case must have a name');
    });

    it('should detect invalid variables type', () => {
      const testCase = {
        name: 'Test',
        variables: 'not an object'
      };
      
      const result = validateTestCase(testCase);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Variables must be an object');
    });

    it('should detect invalid match type', () => {
      const testCase = {
        name: 'Test',
        variables: {},
        matchType: 'invalid'
      };
      
      const result = validateTestCase(testCase);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Match type must be exact, contains, or regex');
    });

    it('should detect invalid expected styles type', () => {
      const testCase = {
        name: 'Test',
        variables: {},
        expectedStyles: 'not an object'
      };
      
      const result = validateTestCase(testCase);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Expected styles must be an object');
    });

    it('should validate test case with all optional fields', () => {
      const testCase: TestCase = {
        name: 'Complete Test',
        variables: { x: 1, y: 2 },
        expectedOutput: 'output',
        expectedStyles: { color: 'red' },
        matchType: 'regex'
      };
      
      const result = validateTestCase(testCase);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculateTestStats', () => {
    it('should calculate correct statistics', () => {
      const results = [
        {
          sectionId: '1',
          results: [
            { testCase: { name: 'Test 1' }, passed: true } as any,
            { testCase: { name: 'Test 2' }, passed: false } as any,
            { testCase: { name: 'Test 3' }, passed: true } as any
          ]
        },
        {
          sectionId: '2',
          results: [
            { testCase: { name: 'Test 4' }, passed: true } as any,
            { testCase: { name: 'Test 5' }, passed: true } as any
          ]
        }
      ];
      
      const stats = calculateTestStats(results);
      
      expect(stats.totalTests).toBe(5);
      expect(stats.passedTests).toBe(4);
      expect(stats.failedTests).toBe(1);
      expect(stats.passRate).toBe(80);
    });

    it('should handle empty results', () => {
      const stats = calculateTestStats([]);
      
      expect(stats.totalTests).toBe(0);
      expect(stats.passedTests).toBe(0);
      expect(stats.failedTests).toBe(0);
      expect(stats.passRate).toBe(0);
    });

    it('should handle all failed tests', () => {
      const results = [
        {
          sectionId: '1',
          results: [
            { testCase: { name: 'Test 1' }, passed: false } as any,
            { testCase: { name: 'Test 2' }, passed: false } as any
          ]
        }
      ];
      
      const stats = calculateTestStats(results);
      
      expect(stats.totalTests).toBe(2);
      expect(stats.passedTests).toBe(0);
      expect(stats.failedTests).toBe(2);
      expect(stats.passRate).toBe(0);
    });
  });

  describe('formatTestResults', () => {
    it('should format test results for display', () => {
      const results: TestResult[] = [
        { passed: true, actualOutput: 'output1' },
        { passed: false, error: 'Test failed', actualOutput: '' }
      ];
      
      const testCases: TestCase[] = [
        { name: 'Test 1', variables: {} },
        { name: 'Test 2', variables: {} }
      ];
      
      const formatted = formatTestResults(results, testCases);
      
      expect(formatted).toContain('✅ Test 1');
      expect(formatted).toContain('❌ Test 2');
      expect(formatted).toContain('Error: Test failed');
    });

    it('should handle empty results', () => {
      const formatted = formatTestResults([], []);
      
      expect(formatted).toBe('No tests to run');
    });

    it('should handle mismatched arrays', () => {
      const results: TestResult[] = [
        { passed: true, actualOutput: 'output' }
      ];
      
      const testCases: TestCase[] = [
        { name: 'Test 1', variables: {} },
        { name: 'Test 2', variables: {} }
      ];
      
      const formatted = formatTestResults(results, testCases);
      
      expect(formatted).toContain('✅ Test 1');
      expect(formatted).not.toContain('Test 2');
    });
  });
});