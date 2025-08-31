import { previewEngineService } from './previewEngineService';

export interface TestCase {
  name?: string;
  variables?: Record<string, any>;
  expectedOutput?: string;
  expectedStyles?: string;
  matchType?: 'exact' | 'contains' | 'regex';
  testResult?: TestResult;
  category?: 'basicFunctionality' | 'edgeCases' | 'qaBreaking';
}

export interface TestResult {
  status: 'pass' | 'fail';
  passed: boolean;
  actualOutput?: string;
  actualStyles?: string;
  error?: string;
  message: string;
  timestamp: number;
}

export interface SectionTestResults {
  sectionId: string;
  sectionName: string;
  results: Array<{
    testCase: TestCase;
    passed: boolean;
    error?: string;
  }>;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  sectionResults: SectionTestResults[];
}

class TestRunnerService {
  // Strip HTML tags from output
  private stripHTML(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // Extract styles from HTML string
  private extractStylesFromHTML(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = doc.body.querySelectorAll('[style]');
    
    const styles: string[] = [];
    elements.forEach(el => {
      const style = el.getAttribute('style');
      if (style) {
        styles.push(style.trim());
      }
    });
    
    return styles.join('; ');
  }

  // Validate test output based on match type
  private validateTestOutput(actual: string, expected: string, matchType: string = 'exact'): boolean {
    if (!expected) return true;
    
    const actualText = this.stripHTML(actual).trim();
    const expectedText = expected.trim();
    
    switch (matchType) {
      case 'contains':
        return actualText.includes(expectedText);
      case 'regex':
        try {
          const regex = new RegExp(expectedText);
          return regex.test(actualText);
        } catch (e) {
          console.error('Invalid regex:', e);
          return false;
        }
      case 'exact':
      default:
        return actualText === expectedText;
    }
  }

  // Validate test styles
  private validateTestStyles(actual: string, expected: string): boolean {
    if (!expected) return true;
    
    const actualStyles = actual.toLowerCase().replace(/\s+/g, '');
    const expectedStyles = expected.toLowerCase().replace(/\s+/g, '');
    
    return actualStyles.includes(expectedStyles);
  }

  // Run a single test case
  runSingleTest(
    section: any,
    testCase: TestCase,
    context: {
      tpnMode: boolean;
      currentTPNInstance: any;
      currentIngredientValues: any;
      activeTestCase: any;
    }
  ): { passed: boolean; error?: string; testResult: TestResult } {
    if (!section || section.type !== 'dynamic') {
      return {
        passed: false,
        error: 'Invalid section for testing',
        testResult: {
          status: 'fail',
          passed: false,
          error: 'Invalid section for testing',
          message: 'Section is not dynamic or not found',
          timestamp: Date.now()
        }
      };
    }
    
    // Evaluate the code with test variables
    const output = previewEngineService.evaluateCode(section.content, testCase.variables, context);
    const actualText = this.stripHTML(output);
    const actualStyles = this.extractStylesFromHTML(output);
    
    // Validate output
    const outputPassed = this.validateTestOutput(output, testCase.expectedOutput || '', testCase.matchType);
    
    // Validate styles
    const stylesPassed = this.validateTestStyles(actualStyles, testCase.expectedStyles || '');
    
    // Overall test result
    const passed = outputPassed && stylesPassed;
    
    let error: string | undefined;
    if (!passed) {
      const errors = [];
      if (!outputPassed) {
        errors.push(`Output mismatch: expected "${testCase.expectedOutput}", got "${actualText}"`);
      }
      if (!stylesPassed) {
        errors.push(`Styles mismatch: expected "${testCase.expectedStyles}", got "${actualStyles}"`);
      }
      error = errors.join('; ');
    }
    
    const testResult: TestResult = {
      status: passed ? 'pass' : 'fail',
      passed,
      actualOutput: actualText,
      actualStyles,
      error: error,
      message: error || 'Test passed successfully',
      timestamp: Date.now()
    };
    
    return { passed, error, testResult };
  }

  // Run all tests for a section
  runSectionTests(section: any): Array<{ testCase: TestCase; passed: boolean; error?: string }> {
    if (!section || section.type !== 'dynamic' || !section.testCases) {
      return [];
    }
    
    const results: Array<{ testCase: TestCase; passed: boolean; error?: string }> = [];
    
    section.testCases.forEach((testCase: TestCase) => {
      if (testCase.expectedOutput || testCase.expectedStyles) {
        // Note: Context should be passed from the caller
        const result = this.runSingleTest(section, testCase, {
          tpnMode: false,
          currentTPNInstance: null,
          currentIngredientValues: null,
          activeTestCase: {}
        });
        results.push({ testCase, ...result });
      }
    });
    
    return results;
  }

  // Run all tests across all sections
  runAllTests(
    sections: any[],
    context: {
      tpnMode: boolean;
      currentTPNInstance: any;
      currentIngredientValues: any;
      activeTestCase: any;
    }
  ): TestSummary {
    const sectionResults: SectionTestResults[] = [];
    
    sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases) {
        const results: Array<{ testCase: TestCase; passed: boolean; error?: string }> = [];
        
        section.testCases.forEach((testCase: TestCase) => {
          if (testCase.expectedOutput || testCase.expectedStyles) {
            const result = this.runSingleTest(section, testCase, context);
            results.push({ testCase, ...result });
          }
        });
        
        if (results.length > 0) {
          sectionResults.push({
            sectionId: section.id,
            sectionName: `Section ${section.id}`,
            results
          });
        }
      }
    });
    
    // Calculate summary
    const totalTests = sectionResults.reduce((sum, sr) => sum + sr.results.length, 0);
    const passed = sectionResults.reduce((sum, sr) => 
      sum + sr.results.filter(r => r.passed).length, 0);
    const failed = totalTests - passed;
    const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;
    
    return {
      totalTests,
      passed,
      failed,
      passRate,
      sectionResults
    };
  }
}

export const testRunnerService = new TestRunnerService();