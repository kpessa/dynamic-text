import type { TestSummary, TestResult, SectionTestResult, TestCase } from '../types/section.js';

interface ValidationResult {
  passed: boolean;
  error?: string;
}

interface EvaluationResult {
  result: any;
  actualHTML?: string;
  actualStyles?: any;
}

// Test store for managing test execution and results
class TestStore {
  private _testSummary = $state<TestSummary | null>(null);
  private _currentGeneratedTests = $state<any>(null);
  private _targetSectionId = $state<number | null>(null);
  private _inspectorCurrentSection = $state<number | null>(null);
  private _isRunningTests = $state<boolean>(false);

  // Getters
  get testSummary() { return this._testSummary; }
  get currentGeneratedTests() { return this._currentGeneratedTests; }
  get targetSectionId() { return this._targetSectionId; }
  get inspectorCurrentSection() { return this._inspectorCurrentSection; }
  get isRunningTests() { return this._isRunningTests; }

  // Derived computed values - using getters to prevent reactivity loops
  get hasTestResults() { return this._testSummary !== null; }
  get testPassRate() {
    if (!this._testSummary) return 0;
    const { passed, total } = this._testSummary.summary;
    return total > 0 ? (passed / total) * 100 : 0;
  }
  get isTestingInProgress() { return this._isRunningTests; }

  // Setters
  setTestSummary(summary: TestSummary | null) {
    this._testSummary = summary;
  }

  setCurrentGeneratedTests(tests: any) {
    this._currentGeneratedTests = tests;
  }

  setTargetSectionId(sectionId: number | null) {
    this._targetSectionId = sectionId;
  }

  setInspectorCurrentSection(sectionId: number | null) {
    this._inspectorCurrentSection = sectionId;
  }

  setIsRunningTests(running: boolean) {
    this._isRunningTests = running;
  }

  // Test execution methods
  async runSingleTest(
    _sectionId: number, 
    testCase: TestCase, 
    sectionContent: string, 
    evaluateCodeFn: (code: string, variables?: any) => EvaluationResult
  ): Promise<TestResult> {
    try {
      const evaluation = evaluateCodeFn(sectionContent, testCase.variables);
      const result = this.validateTestOutput(
        evaluation.result, 
        testCase.expected, 
        testCase.matchType,
        evaluation.actualStyles,
        testCase.expectedStyles
      );
      
      return {
        passed: result.passed,
        actual: evaluation.actualHTML || String(evaluation.result),
        expected: testCase.expected,
        error: result.error || undefined,
        testCase
      };
    } catch (error) {
      return {
        passed: false,
        actual: '',
        expected: testCase.expected,
        error: error instanceof Error ? error.message : String(error),
        testCase
      };
    }
  }

  validateTestOutput(
    actual: any, 
    expected: string, 
    matchType: string = 'contains',
    actualStyles?: any,
    expectedStyles?: any
  ): ValidationResult {
    const actualStr = String(actual).trim();
    const expectedStr = expected.trim();
    
    if (!expectedStr) {
      return { passed: true }; // Empty expected means no validation
    }
    
    try {
      switch (matchType) {
        case 'exact':
          return { passed: actualStr === expectedStr };
          
        case 'contains':
          return { passed: actualStr.includes(expectedStr) };
          
        case 'regex': {
          const regex = new RegExp(expectedStr, 'i');
          return { passed: regex.test(actualStr) };
        }
        
        case 'styles':
          if (!expectedStyles || !actualStyles) {
            return { passed: false, error: 'Style validation requires both actual and expected styles' };
          }
          return this.validateStyles(actualStyles, expectedStyles);
          
        default:
          return { passed: actualStr.includes(expectedStr) };
      }
    } catch (error) {
      return { 
        passed: false, 
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  validateStyles(actualStyles: any, expectedStyles: any): ValidationResult {
    try {
      for (const [property, expectedValue] of Object.entries(expectedStyles)) {
        const actualValue = actualStyles[property];
        if (actualValue !== expectedValue) {
          return {
            passed: false,
            error: `Style mismatch for ${property}: expected ${expectedValue}, got ${actualValue}`
          };
        }
      }
      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        error: `Style validation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Create test summary from section results
  createTestSummary(sectionResults: SectionTestResult[]): TestSummary {
    const summary = {
      total: 0,
      passed: 0,
      failed: 0
    };

    sectionResults.forEach(sectionResult => {
      sectionResult.results.forEach(result => {
        summary.total++;
        if (result.passed) {
          summary.passed++;
        } else {
          summary.failed++;
        }
      });
    });

    return {
      sections: sectionResults,
      summary
    };
  }

  // Clear test data
  clearTestData() {
    this._testSummary = null;
    this._currentGeneratedTests = null;
    this._targetSectionId = null;
    this._inspectorCurrentSection = null;
    this._isRunningTests = false;
  }

  // Utility methods
  getTestResultsForSection(sectionId: number): SectionTestResult | undefined {
    return this._testSummary?.sections.find(s => s.sectionId === sectionId);
  }

  getFailedTests(): TestResult[] {
    if (!this._testSummary) return [];
    return this._testSummary.sections.flatMap(section => 
      section.results.filter(result => !result.passed)
    );
  }

  getPassedTests(): TestResult[] {
    if (!this._testSummary) return [];
    return this._testSummary.sections.flatMap(section => 
      section.results.filter(result => result.passed)
    );
  }
}

// Create and export the store instance
export const testStore = new TestStore();
