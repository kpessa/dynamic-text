/**
 * Helper functions for writing one-liner safe code
 * These patterns help prevent issues when code is collapsed to a single line
 */

/**
 * Best practices for one-liner safe code
 */
export const ONE_LINER_BEST_PRACTICES = {
  // Always use semicolons
  useSemicolons: {
    bad: 'const a = 1\nconst b = 2',
    good: 'const a = 1; const b = 2;',
    reason: 'Prevents statements from merging incorrectly'
  },
  
  // Use explicit returns
  explicitReturns: {
    bad: 'if (x) return "a"\nreturn "b"',
    good: 'if (x) { return "a"; } return "b";',
    reason: 'Clear control flow when collapsed'
  },
  
  // Always use blocks for conditionals
  useBlocks: {
    bad: 'if (x) doSomething()',
    good: 'if (x) { doSomething(); }',
    reason: 'Prevents ambiguity in one-liner form'
  },
  
  // Avoid ASI (Automatic Semicolon Insertion) pitfalls
  avoidASI: {
    bad: 'return\n  value',
    good: 'return value;',
    reason: 'ASI can cause unexpected behavior'
  },
  
  // Use parentheses for clarity
  useParentheses: {
    bad: 'x > 5 && y < 10 || z === 0',
    good: '(x > 5 && y < 10) || z === 0',
    reason: 'Clear operator precedence'
  },
  
  // Prefer ternary for simple conditionals
  useTernary: {
    bad: 'let result; if (x) { result = "yes"; } else { result = "no"; }',
    good: 'const result = x ? "yes" : "no";',
    reason: 'More concise and works well in one-liner'
  },
  
  // Use array/object methods for transformations
  useFunctionalMethods: {
    bad: 'let results = []; for (let i = 0; i < items.length; i++) { results.push(items[i] * 2); }',
    good: 'const results = items.map(item => item * 2);',
    reason: 'Cleaner and safer for one-liner conversion'
  },
  
  // Avoid multiline template literals
  avoidMultilineTemplates: {
    bad: '`Line 1\nLine 2\nLine 3`',
    good: '`Line 1\\nLine 2\\nLine 3`',
    reason: 'Explicit newlines work better in one-liner'
  },
};

/**
 * Validate if code is safe for one-liner conversion
 * @param {string} code - The code to validate
 * @returns {Object} Validation result with warnings
 */
export const validateForOneLiner = (code) => {
  const warnings = [];
  
  // Check for missing semicolons at statement ends
  const needsSemicolon = /[^{};,\s]\s*\n\s*(?:const|let|var|if|for|while|do|return|throw|break|continue)\b/;
  if (needsSemicolon.test(code)) {
    warnings.push({
      type: 'missing-semicolon',
      message: 'Missing semicolons between statements',
      severity: 'error'
    });
  }
  
  // Check for unbraced if statements
  const unbracedIf = /\bif\s*\([^)]+\)\s*[^{]/;
  if (unbracedIf.test(code)) {
    warnings.push({
      type: 'unbraced-conditional',
      message: 'Conditional statements without braces',
      severity: 'warning'
    });
  }
  
  // Check for multiline template literals
  const multilineTemplate = /`[^`]*\n[^`]*`/;
  if (multilineTemplate.test(code)) {
    warnings.push({
      type: 'multiline-template',
      message: 'Multiline template literals may not display correctly',
      severity: 'info'
    });
  }
  
  // Check for return statements on new lines
  const returnNewline = /return\s*\n/;
  if (returnNewline.test(code)) {
    warnings.push({
      type: 'return-newline',
      message: 'Return statement followed by newline (ASI issue)',
      severity: 'error'
    });
  }
  
  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings
  };
};

/**
 * Transform code to be more one-liner friendly
 * @param {string} code - The code to transform
 * @returns {string} Transformed code
 */
export const makeOneLineFriendly = (code) => {
  let transformed = code;
  
  // Add semicolons before new statements
  transformed = transformed.replace(
    /([^{};,\s])\s*\n\s*(?=const|let|var|if|for|while|do|return|throw|break|continue)/g,
    '$1; '
  );
  
  // Fix return statements with newlines
  transformed = transformed.replace(/return\s+\n\s*/g, 'return ');
  
  // Add braces to single-line if statements
  transformed = transformed.replace(
    /\bif\s*\(([^)]+)\)\s+([^{][^;]*);?/g,
    'if ($1) { $2; }'
  );
  
  // Add trailing semicolon if missing
  if (!/[;}\s]$/.test(transformed.trim())) {
    transformed = transformed.trim() + ';';
  }
  
  return transformed;
};

/**
 * Common TPN patterns that work well as one-liners
 */
export const TPN_PATTERNS = {
  // Simple calculation
  simpleCalc: `const sodium = me.getValue('Sodium'); return sodium * 2;`,
  
  // Conditional with proper semicolons
  conditional: `const val = me.getValue('Sodium'); if (val > 140) { return 'High'; } else if (val < 135) { return 'Low'; } else { return 'Normal'; }`,
  
  // Using ternary for cleaner code
  ternary: `const val = me.getValue('Sodium'); return val > 140 ? 'High' : val < 135 ? 'Low' : 'Normal';`,
  
  // Multiple calculations
  multiCalc: `const na = me.getValue('Sodium'); const k = me.getValue('Potassium'); const total = na + k; return \`Total: \${total} mEq/L\`;`,
  
  // Array operations
  arrayOps: `const values = ['Sodium', 'Potassium', 'Chloride'].map(key => me.getValue(key)); return values.join(', ');`,
  
  // Object construction
  objectReturn: `const data = { sodium: me.getValue('Sodium'), potassium: me.getValue('Potassium') }; return JSON.stringify(data);`,
  
  // Error handling
  errorHandling: `try { const val = me.getValue('Sodium'); return val * 2; } catch (e) { return 'Error: ' + e.message; }`,
};

/**
 * Format code specifically for TPN one-liner usage
 * @param {string} code - The code to format
 * @returns {string} Formatted code
 */
export const formatForTPN = (code) => {
  // First make it one-liner friendly
  let formatted = makeOneLineFriendly(code);
  
  // Ensure it returns something (TPN expects a return value)
  if (!formatted.includes('return')) {
    // If there's a simple expression at the end, add return
    const lastStatement = formatted.trim().split(';').pop().trim();
    if (lastStatement && !lastStatement.startsWith('const') && !lastStatement.startsWith('let')) {
      formatted = formatted.replace(new RegExp(lastStatement + '$'), `return ${lastStatement}`);
    }
  }
  
  return formatted;
};