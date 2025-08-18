/**
 * Section type definitions
 */

export interface TestCase {
  name: string;
  variables: Record<string, any>;
  expectedOutput?: string;
}

export interface Section {
  id: number;
  type: 'static' | 'dynamic';
  name: string;
  content: string;
  testCases?: TestCase[];
  editing?: boolean;
}