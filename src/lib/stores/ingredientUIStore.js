import { referenceService } from '../firebaseDataService.js';
// import { logError } from '$lib/logger';  // Unused import

// UI state - using plain variables since this is a store module
/** @type {Map<string, boolean>} */
let expandedIngredients = new Map();
let selectionMode = false;
/** @type {Set<string>} */
let selectedIngredients = new Set();
/** @type {any} */
let currentIngredient = null;
/** @type {Map<string, boolean>} */
let referenceLoadingStates = new Map();
/** @type {Map<string, any>} */
let referenceCache = new Map();
/** @type {Record<string, any>} */
let ingredientReferences = {};
/** @type {Record<string, any>} */
let sharedStatuses = {};

// Modal states
let showVersionHistory = false;
/** @type {string | null} */
let versionHistoryIngredientId = null;
let showSharedManager = false;
/** @type {any} */
let sharedManagerIngredient = null;
let showVariationDetector = false;
/** @type {any} */
let variationTargetIngredient = null;
let showBaselineComparison = false;
/** @type {any} */
let baselineComparisonData = null;
let showBulkOperations = false;

// Toggle ingredient expansion
/**
 * @param {string} ingredientId
 */
function toggleExpanded(ingredientId) {
  const newMap = new Map(expandedIngredients);
  if (newMap.has(ingredientId)) {
    newMap.delete(ingredientId);
  } else {
    newMap.set(ingredientId, true);
  }
  expandedIngredients = newMap;
}

// Check if ingredient is expanded
/**
 * @param {string} ingredientId
 * @returns {boolean}
 */
function isExpanded(ingredientId) {
  return expandedIngredients.has(ingredientId);
}

// Toggle selection mode
function toggleSelectionMode() {
  selectionMode = !selectionMode;
  if (!selectionMode) {
    clearSelection();
  }
}

// Toggle ingredient selection
/**
 * @param {string} ingredientId
 */
function toggleIngredientSelection(ingredientId) {
  const newSet = new Set(selectedIngredients);
  if (newSet.has(ingredientId)) {
    newSet.delete(ingredientId);
  } else {
    newSet.add(ingredientId);
  }
  selectedIngredients = newSet;
}

// Select all ingredients
/**
 * @param {string[]} ingredientIds
 */
function selectAll(ingredientIds) {
  selectedIngredients = new Set(ingredientIds);
}

// Clear selection
function clearSelection() {
  selectedIngredients = new Set();
}

// Load references for an ingredient
/**
 * @param {string} ingredientId
 */
async function loadReferencesForIngredient(ingredientId) {
  // Check cache first
  if (referenceCache.has(ingredientId)) {
    const cachedRefs = referenceCache.get(ingredientId);
    ingredientReferences = { ...ingredientReferences, [ingredientId]: cachedRefs };
    return cachedRefs;
  }
  
  // Set loading state
  const newLoadingStates = new Map(referenceLoadingStates);
  newLoadingStates.set(ingredientId, true);
  referenceLoadingStates = newLoadingStates;
  
  try {
    const references = await referenceService.getReferencesForIngredient(ingredientId);
    
    // Group by population type
    /** @type {Record<string, any[]>} */
    const grouped = {};
    /** @type {any[]} */
    const refsArray = references;
    refsArray.forEach((ref) => {
      const populationType = ref.populationType || 'Unknown';
      if (!grouped[populationType]) {
        grouped[populationType] = [];
      }
      grouped[populationType].push(ref);
    });
    
    // Update cache and state
    const newCache = new Map(referenceCache);
    newCache.set(ingredientId, grouped);
    referenceCache = newCache;
    
    ingredientReferences = { ...ingredientReferences, [ingredientId]: grouped };
    
    return grouped;
  } catch (error) {
    // logError('Failed to load references:', error);
    throw error;
  } finally {
    // Clear loading state
    const newLoadingStates = new Map(referenceLoadingStates);
    newLoadingStates.delete(ingredientId);
    referenceLoadingStates = newLoadingStates;
  }
}

// Clear reference cache for an ingredient
/**
 * @param {string} ingredientId
 */
function clearReferenceCache(ingredientId) {
  if (referenceCache.has(ingredientId)) {
    const newCache = new Map(referenceCache);
    newCache.delete(ingredientId);
    referenceCache = newCache;
  }
  
  const newRefs = { ...ingredientReferences };
  delete newRefs[ingredientId];
  ingredientReferences = newRefs;
}

// Modal management functions
/**
 * @param {any} ingredient
 */
function openVersionHistory(ingredient) {
  versionHistoryIngredientId = ingredient.id;
  showVersionHistory = true;
}

/**
 * @param {any} ingredient
 */
function openSharedManager(ingredient) {
  sharedManagerIngredient = ingredient;
  showSharedManager = true;
}

/**
 * @param {any} ingredient
 */
function openVariationDetector(ingredient) {
  variationTargetIngredient = ingredient;
  showVariationDetector = true;
}

/**
 * @param {any} ingredient
 * @param {any} reference
 */
function openBaselineComparison(ingredient, reference) {
  baselineComparisonData = { ingredient, reference };
  showBaselineComparison = true;
}

function openBulkOperations() {
  if (selectedIngredients.size > 0) {
    showBulkOperations = true;
  }
}

function closeAllModals() {
  showVersionHistory = false;
  showSharedManager = false;
  showVariationDetector = false;
  showBaselineComparison = false;
  showBulkOperations = false;
}

// Reset all UI state
function reset() {
  expandedIngredients = new Map();
  selectionMode = false;
  selectedIngredients = new Set();
  currentIngredient = null;
  referenceLoadingStates = new Map();
  closeAllModals();
}

// Export store interface
export const ingredientUIStore = {
  // State getters
  get expandedIngredients() { return expandedIngredients; },
  get selectionMode() { return selectionMode; },
  get selectedIngredients() { return selectedIngredients; },
  get currentIngredient() { return currentIngredient; },
  set currentIngredient(val) { currentIngredient = val; },
  get referenceLoadingStates() { return referenceLoadingStates; },
  get ingredientReferences() { return ingredientReferences; },
  get sharedStatuses() { return sharedStatuses; },
  set sharedStatuses(val) { sharedStatuses = val; },
  get selectedCount() { return selectedIngredients.size; },
  
  // Modal state getters/setters
  get showVersionHistory() { return showVersionHistory; },
  set showVersionHistory(val) { showVersionHistory = val; },
  get versionHistoryIngredientId() { return versionHistoryIngredientId; },
  
  get showSharedManager() { return showSharedManager; },
  set showSharedManager(val) { showSharedManager = val; },
  get sharedManagerIngredient() { return sharedManagerIngredient; },
  
  get showVariationDetector() { return showVariationDetector; },
  set showVariationDetector(val) { showVariationDetector = val; },
  get variationTargetIngredient() { return variationTargetIngredient; },
  
  get showBaselineComparison() { return showBaselineComparison; },
  set showBaselineComparison(val) { showBaselineComparison = val; },
  get baselineComparisonData() { return baselineComparisonData; },
  set baselineComparisonData(val) { baselineComparisonData = val; },
  
  get showBulkOperations() { return showBulkOperations; },
  set showBulkOperations(val) { showBulkOperations = val; },
  
  // Methods
  toggleExpanded,
  isExpanded,
  toggleSelectionMode,
  toggleIngredientSelection,
  selectAll,
  clearSelection,
  loadReferencesForIngredient,
  clearReferenceCache,
  openVersionHistory,
  openSharedManager,
  openVariationDetector,
  openBaselineComparison,
  openBulkOperations,
  closeAllModals,
  reset
};