import { sectionStore } from './sectionStore.svelte.ts';
import { extractKeysFromCode, extractDirectKeysFromCode, isValidKey, isCalculatedValue } from '../lib/tpnLegacy.js';
import type { Section } from '../lib/types';

interface IngredientInfo {
  tpnKeys: string[];
  calculatedKeys: string[];
  customKeys: string[];
  allKeys: string[];
}

class IngredientStore {
  // Derived state for all referenced ingredients
  referencedIngredients = $derived.by(() => {
    const allKeys = new Set<string>();
    
    sectionStore.sections.forEach(section => {
      if (section.type === 'dynamic') {
        const keys = extractKeysFromCode(section.content);
        keys.forEach(key => {
          if (isValidKey(key)) {
            allKeys.add(key);
          }
        });
      }
    });
    
    sectionStore.sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases) {
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
  });

  // Derived state for ingredients by section
  ingredientsBySection = $derived.by(() => {
    const result: Record<number, IngredientInfo> = {};
    
    sectionStore.sections.forEach(section => {
      if (section.type === 'dynamic') {
        const keys = extractDirectKeysFromCode(section.content);
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
  });
}

// Export singleton instance
export const ingredientStore = new IngredientStore();

// Export individual stores for backward compatibility
export const referencedIngredients = ingredientStore.referencedIngredients;
export const ingredientsBySection = ingredientStore.ingredientsBySection;