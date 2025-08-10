export interface TestCase {
  name: string;
  variables: Record<string, any>;
  expected: string;
  matchType: 'exact' | 'contains' | 'regex' | 'styles';
  expectedStyles?: Record<string, any>;
}

export interface Section {
  id: number;
  type: 'static' | 'dynamic';
  name: string;
  content: string;
  testCases: TestCase[];
}

export interface TestResult {
  passed: boolean;
  actual?: string;
  expected?: string;
  error?: string;
  testCase: TestCase;
}

export interface SectionTestResult {
  sectionId: number;
  sectionName: string;
  results: TestResult[];
}

export interface TestSummary {
  sections: SectionTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}