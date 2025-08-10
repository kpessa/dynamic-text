import { getKeyCategory } from '../tpnLegacy.js';
import { CATEGORIES } from '../constants/ingredientConstants.js';

/**
 * Group references by population type
 * @param {Array} references - Array of reference objects
 * @returns {Object} References grouped by population type
 */
export function groupReferencesByPopulation(references) {
  const grouped = {};
  
  if (!references || !Array.isArray(references)) {
    return grouped;
  }
  
  references.forEach(ref => {
    if (!grouped[ref.populationType]) {
      grouped[ref.populationType] = [];
    }
    grouped[ref.populationType].push(ref);
  });
  
  return grouped;
}

/**
 * Check if an ingredient has differences across populations
 * @param {Object} references - References object grouped by population
 * @returns {boolean} True if there are differences
 */
export function hasDifferences(references) {
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
export function groupIngredientsByCategory(ingredients) {
  const grouped = {};
  
  ingredients.forEach(ingredient => {
    const category = getKeyCategory(ingredient.name);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(ingredient);
  });
  
  // Sort each category's ingredients alphabetically
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return grouped;
}

/**
 * Sort categories in preferred order
 * @param {Object} groupedIngredients - Ingredients grouped by category
 * @returns {Object} Sorted grouped ingredients
 */
export function sortGroupsByCategory(groupedIngredients) {
  const sorted = {};
  
  // First add categories in the preferred order
  CATEGORIES.forEach(category => {
    if (category !== 'ALL' && groupedIngredients[category]) {
      sorted[category] = groupedIngredients[category];
    }
  });
  
  // Then add any remaining categories not in the list
  Object.keys(groupedIngredients).forEach(category => {
    if (!sorted[category]) {
      sorted[category] = groupedIngredients[category];
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
export function getUniqueHealthSystems(ingredients, ingredientReferences) {
  const healthSystemsSet = new Set(['ALL']);
  
  ingredients.forEach(ingredient => {
    const refs = ingredientReferences[ingredient.id];
    if (refs) {
      Object.values(refs).flat().forEach(ref => {
        if (ref.healthSystem) {
          healthSystemsSet.add(ref.healthSystem);
        }
      });
    }
  });
  
  return Array.from(healthSystemsSet).sort((a, b) => {
    if (a === 'ALL') return -1;
    if (b === 'ALL') return 1;
    return a.localeCompare(b);
  });
}

/**
 * Filter ingredients based on active config
 * @param {Array} ingredients - Array of ingredient objects
 * @param {string} activeConfigId - Active configuration ID
 * @param {Array} activeConfigIngredients - Array of active config ingredient names
 * @returns {Array} Filtered ingredients
 */
export function filterByActiveConfig(ingredients, activeConfigId, activeConfigIngredients) {
  if (!activeConfigId || !activeConfigIngredients || activeConfigIngredients.length === 0) {
    return ingredients;
  }
  
  const activeIngredientNames = new Set(
    activeConfigIngredients.map(ing => ing.name || ing)
  );
  
  return ingredients.filter(ingredient => 
    activeIngredientNames.has(ingredient.name)
  );
}

/**
 * Check if ingredient is shared across configs
 * @param {Object} ingredient - Ingredient object
 * @param {Function} isSharedFn - Function to check if ingredient is shared
 * @returns {Object} Shared status object
 */
export async function checkSharedStatus(ingredient, isSharedFn) {
  try {
    const sharedInfo = await isSharedFn(ingredient.id);
    return {
      isShared: sharedInfo.isShared,
      sharedCount: sharedInfo.configs?.length || 0
    };
  } catch (error) {
    console.error('Error checking shared status:', error);
    return { isShared: false, sharedCount: 0 };
  }
}

/**
 * Format ingredient name for display
 * @param {string} name - Raw ingredient name
 * @returns {string} Formatted name
 */
export function formatIngredientDisplayName(name) {
  if (!name) return '';
  
  // Handle special cases for TPN ingredients
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

/**
 * Get selected items from a selection set
 * @param {Set} selectedIds - Set of selected ingredient IDs
 * @param {Array} ingredients - Array of all ingredients
 * @param {Object} ingredientReferences - References grouped by ingredient ID
 * @returns {Array} Array of selected items with their references
 */
export function getSelectedItems(selectedIds, ingredients, ingredientReferences) {
  return Array.from(selectedIds).map(id => {
    const ingredient = ingredients.find(ing => ing.id === id);
    const references = ingredientReferences[id] || {};
    return { ingredient, references };
  }).filter(item => item.ingredient);
}