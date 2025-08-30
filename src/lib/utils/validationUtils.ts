import { stripHTML } from './htmlUtils';

/**
 * Validate test output against expectations
 * @param actual - Actual output HTML
 * @param expected - Expected output text
 * @param matchType - Type of matching: 'exact', 'contains', or 'regex'
 * @returns True if validation passes
 */
export function validateTestOutput(actual: string, expected: string, matchType: 'exact' | 'contains' | 'regex' = 'contains'): boolean {
  const actualText = stripHTML(actual).trim();
  const expectedText = (expected || '').trim();
  
  if (!expectedText) return true; // No expectation means pass
  
  switch (matchType) {
    case 'exact':
      return actualText === expectedText;
    case 'contains':
      return actualText.includes(expectedText);
    case 'regex':
      try {
        const regex = new RegExp(expectedText);
        return regex.test(actualText);
      } catch (e) {
        return false;
      }
    default:
      return actualText.includes(expectedText);
  }
}

/**
 * Validate styles against expectations
 * @param actualStyles - Actual styles object
 * @param expectedStyles - Expected styles object
 * @returns Validation result with passed flag and errors
 */
export function validateStyles(
  actualStyles: Record<string, string>, 
  expectedStyles: Record<string, string> | undefined
): { passed: boolean; errors?: string[] } {
  if (!expectedStyles || Object.keys(expectedStyles).length === 0) {
    return { passed: true };
  }
  
  const errors: string[] = [];
  for (const [prop, expectedValue] of Object.entries(expectedStyles)) {
    const actualValue = actualStyles[prop];
    if (actualValue !== expectedValue) {
      errors.push(`${prop}: expected "${expectedValue}", got "${actualValue || 'undefined'}"`);
    }
  }
  
  return {
    passed: errors.length === 0,
    errors
  };
}