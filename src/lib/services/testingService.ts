/**
 * Testing Service
 * Handles test case management and execution for dynamic sections
 */

import { evaluateCode, stripHTML, validateTestOutput, extractStylesFromHTML } from './codeExecutionService';

export interface TestCase {
  name: string;
  variables: Record<string, any>;
  expectedOutput?: string;
  expectedStyles?: Record<string, string>;
  matchType?: 'exact' | 'contains' | 'regex';
}

export interface TestResult {
  passed: boolean;
  error?: string | undefined;
  actualOutput?: string | undefined;
  actualStyles?: Record<string, string> | undefined;
}

export interface SectionTestResults {
  sectionId: string;
  results: Array<TestResult & { testCase: TestCase }>;
}

/**
 * Run a single test case against code with timeout support
 */
export function runTestCase(code: string, testCase: TestCase, tpnContext?: any): TestResult {
  const startTime = Date.now();
  const TIMEOUT_MS = 5000; // 5 second timeout per test
  
  try {
    // Merge TPN context with test variables if provided
    const variables = tpnContext ? 
      { ...testCase.variables, ...tpnContext } : 
      (testCase.variables || {});
    
    // Create a timeout promise
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Test execution timeout (5 seconds)')), TIMEOUT_MS);
    });
    
    // Execute code with timeout protection (synchronous for now)
    const output = evaluateCode(code, variables);
    const executionTime = Date.now() - startTime;
    
    if (executionTime > TIMEOUT_MS) {
      throw new Error('Test execution timeout (5 seconds)');
    }
    
    const outputStyles = extractStylesFromHTML(output);
    
    let passed = true;
    let error: string | undefined = undefined;
    
    // Check output expectations with all match types
    if (testCase.expectedOutput !== undefined && testCase.expectedOutput !== '') {
      const outputMatches = validateTestOutput(
        output,
        testCase.expectedOutput,
        testCase.matchType || 'contains'
      );
      if (!outputMatches) {
        passed = false;
        const actualOutput = stripHTML(output);
        error = `Output mismatch.\nExpected (${testCase.matchType || 'contains'}): "${testCase.expectedOutput}"\nActual: "${actualOutput}"`;
      }
    }
    
    // Check style expectations
    if (passed && testCase.expectedStyles) {
      for (const [prop, expectedValue] of Object.entries(testCase.expectedStyles)) {
        if (outputStyles[prop] !== expectedValue) {
          passed = false;
          error = `Style mismatch for ${prop}.\nExpected: "${expectedValue}"\nActual: "${outputStyles[prop] || 'undefined'}"`;
          break;
        }
      }
    }
    
    return {
      passed,
      error: error || undefined,
      actualOutput: stripHTML(output),
      actualStyles: outputStyles
    };
  } catch (err: any) {
    return {
      passed: false,
      error: err.message || 'Unknown error during test execution',
      actualOutput: '',
      actualStyles: {}
    };
  }
}

/**
 * Run all test cases for a section
 */
export function runSectionTests(sectionCode: string, testCases: TestCase[], tpnContext?: any): TestResult[] {
  if (!testCases || testCases.length === 0) {
    return [];
  }
  
  return testCases.map(testCase => runTestCase(sectionCode, testCase, tpnContext));
}

/**
 * Generate a default test case
 */
export function createDefaultTestCase(): TestCase {
  return {
    name: `Test ${Date.now()}`,
    variables: {},
    matchType: 'contains'
  };
}

/**
 * Validate test case structure
 */
export function validateTestCase(testCase: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!testCase) {
    errors.push('Test case is required');
    return { valid: false, errors };
  }
  
  if (!testCase.name || typeof testCase.name !== 'string') {
    errors.push('Test case must have a name');
  }
  
  if (testCase.variables && typeof testCase.variables !== 'object') {
    errors.push('Variables must be an object');
  }
  
  if (testCase.matchType && !['exact', 'contains', 'regex'].includes(testCase.matchType)) {
    errors.push('Match type must be exact, contains, or regex');
  }
  
  if (testCase.expectedStyles && typeof testCase.expectedStyles !== 'object') {
    errors.push('Expected styles must be an object');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate test statistics
 */
export function calculateTestStats(results: SectionTestResults[]): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
} {
  const totalTests = results.reduce((sum, sr) => sum + sr.results.length, 0);
  const passedTests = results.reduce((sum, sr) => 
    sum + sr.results.filter(r => r.passed).length, 0
  );
  const failedTests = totalTests - passedTests;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  
  return {
    totalTests,
    passedTests,
    failedTests,
    passRate
  };
}

/**
 * Format test results for display
 */
export function formatTestResults(results: TestResult[], testCases: TestCase[]): string {
  if (results.length === 0) return 'No tests to run';
  
  const lines: string[] = [];
  results.forEach((result, index) => {
    const testCase = testCases[index];
    if (!testCase) return;
    const status = result.passed ? '✅' : '❌';
    lines.push(`${status} ${testCase.name}`);
    if (!result.passed && result.error) {
      lines.push(`   Error: ${result.error}`);
    }
  });
  
  return lines.join('\n');
}