import { describe, it, expect } from 'vitest';
import { testRunnerService } from '../../src/lib/services/testRunnerService';
import type { TestCase } from '../../src/lib/services/testRunnerService';

describe('TestRunnerService', () => {
  describe('TestCase category field', () => {
    it('should support category field on TestCase', () => {
      const testCase: TestCase = {
        name: 'Test 1',
        variables: { x: 1 },
        category: 'basicFunctionality'
      };
      
      expect(testCase.category).toBe('basicFunctionality');
    });

    it('should allow all three category types', () => {
      const basicTest: TestCase = {
        name: 'Basic Test',
        variables: {},
        category: 'basicFunctionality'
      };
      
      const edgeTest: TestCase = {
        name: 'Edge Test',
        variables: {},
        category: 'edgeCases'
      };
      
      const qaTest: TestCase = {
        name: 'QA Test',
        variables: {},
        category: 'qaBreaking'
      };
      
      expect(basicTest.category).toBe('basicFunctionality');
      expect(edgeTest.category).toBe('edgeCases');
      expect(qaTest.category).toBe('qaBreaking');
    });

    it('should allow category to be optional', () => {
      const testCase: TestCase = {
        name: 'Test without category',
        variables: {}
      };
      
      expect(testCase.category).toBeUndefined();
    });
  });
});