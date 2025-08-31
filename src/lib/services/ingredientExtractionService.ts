import { extractKeysFromCode, extractDirectKeysFromCode, isValidKey, isCalculatedValue } from '../tpnLegacy.js';

export interface ExtractedIngredients {
  tpnKeys: string[];
  calculatedKeys: string[];
  customKeys: string[];
  allKeys: string[];
}

export interface IngredientsBySection {
  [sectionId: string]: ExtractedIngredients;
}

/**
 * Service for extracting and managing ingredient references from sections
 */
class IngredientExtractionService {
  /**
   * Extract all referenced ingredients from sections
   */
  extractReferencedIngredients(sections: any[]): string[] {
    const allKeys = new Set<string>();
    
    // Extract from dynamic sections
    sections.forEach(section => {
      if (section.type === 'dynamic') {
        const keys = extractKeysFromCode(section.content);
        keys.forEach(key => {
          if (isValidKey(key)) {
            allKeys.add(key);
          }
        });
      }
    });
    
    // Also check test case variables
    sections.forEach(section => {
      if (section.testCases) {
        section.testCases.forEach(tc => {
          Object.keys(tc.variables || {}).forEach(key => {
            if (isValidKey(key)) {
              allKeys.add(key);
            }
          });
        });
      }
    });
    
    return Array.from(allKeys).sort();
  }

  /**
   * Extract ingredients per section for badge display
   */
  extractIngredientsBySection(sections: any[]): IngredientsBySection {
    const result: IngredientsBySection = {};
    
    sections.forEach(section => {
      if (section.type === 'dynamic') {
        const keys = extractDirectKeysFromCode(section.content); // Use direct keys only for badges
        const validKeys = keys.filter(key => isValidKey(key) && !isCalculatedValue(key));
        const calculatedKeys = keys.filter(key => isCalculatedValue(key));
        const nonTpnKeys = keys.filter(key => !isValidKey(key));
        
        if (validKeys.length > 0 || nonTpnKeys.length > 0 || calculatedKeys.length > 0) {
          result[section.id] = {
            tpnKeys: validKeys,
            calculatedKeys: calculatedKeys,
            customKeys: nonTpnKeys,
            allKeys: keys
          };
        }
      }
    });
    
    return result;
  }

  /**
   * Auto-populate test cases with extracted ingredients
   */
  autoPopulateTestCases(sections: any[], ingredientsBySection: IngredientsBySection): void {
    Object.entries(ingredientsBySection).forEach(([sectionId, { allKeys }]) => {
      const section = sections.find(s => s.id === parseInt(sectionId));
      if (section && section.testCases) {
        section.testCases.forEach(testCase => {
          // Add any new keys that aren't already in the test case
          allKeys.forEach(key => {
            // Skip calculated values - they don't need to be in test variables
            if (isCalculatedValue(key)) {
              return;
            }
            
            if (testCase.variables[key] === undefined) {
              // Set default value based on whether it's a TPN key or custom
              if (isValidKey(key)) {
                // For TPN keys, use appropriate defaults
                testCase.variables[key] = 0;
              } else {
                // For custom variables, use empty string
                testCase.variables[key] = '';
              }
            }
          });
          
          // Remove ingredients that are no longer in the section
          // But keep calculated values out of the variables
          Object.keys(testCase.variables).forEach(key => {
            if (!allKeys.includes(key) || isCalculatedValue(key)) {
              delete testCase.variables[key];
            }
          });
        });
      }
    });
  }
}

export const ingredientExtractionService = new IngredientExtractionService();