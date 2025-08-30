import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';

/**
 * Format JavaScript code using Prettier
 * @param {string} code - The code to format
 * @returns {Promise<{success: boolean, formatted?: string, error?: string}>}
 */
export const formatJavaScript = async (code) => {
  try {
    // Get custom config from localStorage or use defaults
    const customConfig = loadFormatterConfig();
    const defaults = getDefaultConfig();
    
    const formatted = await prettier.format(code, {
      parser: 'babel',
      plugins: [parserBabel, parserEstree],
      semi: customConfig.semi ?? defaults.semi,
      singleQuote: customConfig.singleQuote ?? defaults.singleQuote,
      tabWidth: customConfig.tabWidth ?? defaults.tabWidth,
      trailingComma: customConfig.trailingComma ?? defaults.trailingComma,
      printWidth: customConfig.printWidth ?? defaults.printWidth,
      bracketSpacing: customConfig.bracketSpacing ?? defaults.bracketSpacing,
      arrowParens: customConfig.arrowParens ?? defaults.arrowParens,
      endOfLine: 'lf'
    });
    
    return { success: true, formatted };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Failed to format code'
    };
  }
};

/**
 * Load formatter configuration from localStorage
 * @returns {Object} Formatter configuration
 */
export const loadFormatterConfig = () => {
  try {
    const stored = localStorage.getItem('prettierConfig');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Save formatter configuration to localStorage
 * @param {Object} config - Formatter configuration
 */
export const saveFormatterConfig = (config) => {
  try {
    localStorage.setItem('prettierConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save formatter config:', error);
  }
};

/**
 * Check if content is valid JavaScript
 * @param {string} code - Code to validate
 * @returns {Promise<boolean>}
 */
export const isValidJavaScript = async (code) => {
  try {
    // Try to parse with Prettier to check validity
    await prettier.format(code, {
      parser: 'babel',
      plugins: [parserBabel, parserEstree]
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Get default formatter configuration
 * @returns {Object}
 */
export const getDefaultConfig = () => ({
  // CRITICAL: Use semicolons to prevent issues when code is collapsed to one line
  semi: true,
  
  // Single quotes are cleaner for inline strings
  singleQuote: true,
  
  // 2 spaces for readability without too much width
  tabWidth: 2,
  
  // Trailing commas help with one-liner conversion and prevent errors
  trailingComma: 'all',
  
  // Shorter lines since code will be collapsed
  printWidth: 60,
  
  // Always include spaces in brackets for clarity
  bracketSpacing: true,
  
  // Always use parens around arrow function params for consistency
  arrowParens: 'always',
  
  // Preserve necessary parentheses
  bracketSameLine: false,
  
  // Use spaces around operators for readability
  singleAttributePerLine: false,
});