import { getKeyCategory } from '../tpnLegacy.js';
import { CATEGORIES } from '../constants/ingredientConstants.js';

interface Reference {
  populationType: string;
  status?: string;
  healthSystem?: string;
  [key: string]: any;
}

interface Ingredient {
  id: string;
  name: string;
  healthSystem?: string;
  [key: string]: any;
}

/**
 * Group references by population type
 * @param {Array} references - Array of reference objects
 * @returns {Object} References grouped by population type
 */
export function groupReferencesByPopulation(references: Reference[]): Record<string, Reference[]> {
  const grouped: Record<string, Reference[]> = {};
  
  if (!references || !Array.isArray(references)) {
    return grouped;
  }
  
  references.forEach(ref => {
    if (!grouped[ref.populationType]) {
      grouped[ref.populationType] = [];
    }
    grouped[ref.populationType]!.push(ref);
  });
  
  return grouped;
}

/**
 * Check if an ingredient has differences across populations
 * @param {Object} references - References object grouped by population
 * @returns {boolean} True if there are differences
 */
export function hasDifferences(references: Record<string, Reference[]>): boolean {
  if (!references) return false;
  
  const allRefs = Object.values(references).flat();
  if (allRefs.length <= 1) return false;
  
  // Check if any reference is marked as modified
  return allRefs.some(ref => ref.status === 'MODIFIED');
}

/**
 * Group ingredients by category
 * @param {Array} ingredients - Array of ingredient objects
 * @returns {Object} Ingredients grouped by category
 */
export function groupIngredientsByCategory(ingredients: Ingredient[]): Record<string, Ingredient[]> {
  const grouped: Record<string, Ingredient[]> = {};
  
  ingredients.forEach(ingredient => {
    const category = getKeyCategory(ingredient.name);
    if (category) {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(ingredient);
    }
  });
  
  // Sort each category's ingredients alphabetically
  Object.keys(grouped).forEach(category => {
    grouped[category]!.sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return grouped;
}

/**
 * Sort categories in preferred order
 * @param {Object} groupedIngredients - Ingredients grouped by category
 * @returns {Object} Sorted grouped ingredients
 */
export function sortGroupsByCategory(groupedIngredients: Record<string, Ingredient[]>): Record<string, Ingredient[]> {
  const sorted: Record<string, Ingredient[]> = {};
  
  // First add categories in the preferred order
  CATEGORIES.forEach(category => {
    if (category !== 'ALL' && groupedIngredients[category]) {
      sorted[category] = groupedIngredients[category]!;
    }
  });
  
  // Then add any remaining categories not in the list
  Object.keys(groupedIngredients).forEach(category => {
    if (!sorted[category]) {
      sorted[category] = groupedIngredients[category]!;
    }
  });
  
  return sorted;
}

/**
 * Get unique health systems from ingredients
 * @param {Array} ingredients - Array of ingredient objects
 * @param {Object} ingredientReferences - References grouped by ingredient ID
 * @returns {Array} Array of unique health systems
 */
export function getUniqueHealthSystems(ingredients: Ingredient[], ingredientReferences: Record<string, Reference[]>): string[] {
  const healthSystemsSet = new Set(['ALL']);
  
  ingredients.forEach(ingredient => {
    if (ingredient.healthSystem) {
      healthSystemsSet.add(ingredient.healthSystem);
    }
    
    const refs = ingredientReferences[ingredient.id];
    if (refs) {
      refs.forEach(ref => {
        if (ref.healthSystem) {
          healthSystemsSet.add(ref.healthSystem);
        }
      });
    }
  });
  
  return Array.from(healthSystemsSet);
}

/**
 * Filter ingredients by health system
 * @param {Array} ingredients - Array of ingredient objects
 * @param {string} healthSystem - Health system to filter by
 * @returns {Array} Filtered ingredients
 */
export function filterIngredientsByHealthSystem(ingredients: Ingredient[], healthSystem: string): Ingredient[] {
  if (!healthSystem || healthSystem === 'ALL') {
    return ingredients;
  }
  
  return ingredients.filter(ingredient => 
    ingredient.healthSystem === healthSystem
  );
}