/**
 * Code Execution Service
 * Handles code transpilation, execution, and sandboxing for dynamic sections
 */

import * as Babel from '@babel/standalone';
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'a', 'img', 'code', 'pre', 'blockquote', 'hr', 'sup', 'sub'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'style', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Create a mock 'me' object for code execution
 */
export function createMockMe(variables: Record<string, any> = {}): any {
  const getValue = (key: string) => {
    return variables[key] !== undefined ? variables[key] : 0;
  };

  const setValue = (key: string, value: any) => {
    variables[key] = value;
    return value;
  };

  return {
    getValue,
    setValue,
    // Legacy methods for compatibility
    getIngredientQuantity: getValue,
    getIngredientAmount: getValue,
    getIngredientDose: getValue,
    setIngredientQuantity: setValue,
    setIngredientAmount: setValue,
    setIngredientDose: setValue,
    // Additional helper methods
    round: (value: number, decimals: number = 2) => {
      return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    // Direct access to variables
    ...variables
  };
}

/**
 * Transpile modern JavaScript to ES5 for broader compatibility
 */
export function transpileCode(code: string): string {
  try {
    const result = Babel.transform(code, {
      presets: ['env'],
      plugins: []
    });
    return result.code || '';
  } catch (error) {
    console.error('Transpilation error:', error);
    throw new Error(`Code transpilation failed: ${(error as Error).message}`);
  }
}

/**
 * Evaluate JavaScript code in a sandboxed environment
 */
export function evaluateCode(code: string, testVariables: Record<string, any> | null = null): string {
  const me = testVariables ? createMockMe(testVariables) : createMockMe();
  
  // Create a sandboxed function with limited scope
  const sandbox = {
    me,
    console: {
      log: (...args: any[]) => console.log('[Sandbox]', ...args),
      error: (...args: any[]) => console.error('[Sandbox]', ...args),
      warn: (...args: any[]) => console.warn('[Sandbox]', ...args)
    },
    Math,
    Date,
    JSON,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    // Add safe DOM creation methods
    createElement: (tag: string) => `<${tag}></${tag}>`,
    createTextNode: (text: string) => sanitizeHTML(text)
  };

  try {
    // Transpile the code first
    const transpiledCode = transpileCode(code);
    
    // Create function with sandboxed scope
    const func = new Function(...Object.keys(sandbox), `
      'use strict';
      ${transpiledCode}
    `);
    
    // Execute with sandbox values
    const result = func(...Object.values(sandbox));
    
    // Convert result to string
    if (result === undefined || result === null) {
      return '';
    }
    if (typeof result === 'object') {
      return JSON.stringify(result);
    }
    return String(result);
  } catch (error) {
    console.error('Code execution error:', error);
    return `<span style="color: red;">Error: ${(error as Error).message}</span>`;
  }
}

/**
 * Extract inline styles from HTML string
 */
export function extractStylesFromHTML(htmlString: string): Record<string, string> {
  const styleMatch = htmlString.match(/style="([^"]*)"/i);
  if (!styleMatch) return {};
  
  const styleString = styleMatch[1];
  const styles: Record<string, string> = {};
  
  if (styleString) {
    styleString.split(';').forEach(style => {
    const [property, value] = style.split(':').map(s => s.trim());
    if (property && value) {
      styles[property] = value;
    }
    });
  }
  
  return styles;
}

/**
 * Strip HTML tags from content
 */
export function stripHTML(html: string): string {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Validate test output against expected result
 */
export function validateTestOutput(actual: string, expected: string, matchType: 'exact' | 'contains' | 'regex' = 'contains'): boolean {
  const actualClean = stripHTML(actual).trim();
  const expectedClean = expected.trim();
  
  switch (matchType) {
    case 'exact':
      return actualClean === expectedClean;
    case 'contains':
      return actualClean.includes(expectedClean);
    case 'regex':
      try {
        const regex = new RegExp(expectedClean);
        return regex.test(actualClean);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Run a single test case
 */
export function runTestCase(code: string, testCase: any): any {
  try {
    const output = evaluateCode(code, testCase.variables || {});
    const outputStyles = extractStylesFromHTML(output);
    
    let passed = true;
    let error = null;
    
    // Check output expectations
    if (testCase.expectedOutput) {
      const outputMatches = validateTestOutput(
        output,
        testCase.expectedOutput,
        testCase.matchType || 'contains'
      );
      if (!outputMatches) {
        passed = false;
        error = `Output mismatch. Expected: "${testCase.expectedOutput}", Got: "${stripHTML(output)}"`;
      }
    }
    
    // Check style expectations
    if (passed && testCase.expectedStyles) {
      for (const [prop, expectedValue] of Object.entries(testCase.expectedStyles)) {
        if (outputStyles[prop] !== expectedValue) {
          passed = false;
          error = `Style mismatch for ${prop}. Expected: "${expectedValue}", Got: "${outputStyles[prop] || 'undefined'}"`;
          break;
        }
      }
    }
    
    return {
      passed,
      error,
      actualOutput: stripHTML(output),
      actualStyles: outputStyles
    };
  } catch (error) {
    return {
      passed: false,
      error: (error as Error).message,
      actualOutput: null,
      actualStyles: {}
    };
  }
}