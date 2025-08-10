import { referenceService } from '../firebaseDataService.js';

// UI state using Svelte 5 module-level state
let expandedIngredients = $state(new Map());
let selectionMode = $state(false);
let selectedIngredients = $state(new Set());
let currentIngredient = $state(null);
let referenceLoadingStates = $state(new Map());
let referenceCache = $state.raw(new Map());
let ingredientReferences = $state({});
let sharedStatuses = $state({});

// Modal states
let showVersionHistory = $state(false);
let versionHistoryIngredientId = $state(null);
let showSharedManager = $state(false);
let sharedManagerIngredient = $state(null);
let showVariationDetector = $state(false);
let variationTargetIngredient = $state(null);
let showBaselineComparison = $state(false);
let baselineComparisonData = $state(null);
let showBulkOperations = $state(false);

// Toggle ingredient expansion
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
function selectAll(ingredientIds) {
  selectedIngredients = new Set(ingredientIds);
}

// Clear selection
function clearSelection() {
  selectedIngredients = new Set();
}

// Load references for an ingredient
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
    const grouped = {};
    references.forEach(ref => {
      if (!grouped[ref.populationType]) {
        grouped[ref.populationType] = [];
      }
      grouped[ref.populationType].push(ref);
    });
    
    // Update cache and state
    const newCache = new Map(referenceCache);
    newCache.set(ingredientId, grouped);
    referenceCache = newCache;
    
    ingredientReferences = { ...ingredientReferences, [ingredientId]: grouped };
    
    return grouped;
  } catch (error) {
    console.error('Failed to load references:', error);
    throw error;
  } finally {
    // Clear loading state
    const newLoadingStates = new Map(referenceLoadingStates);
    newLoadingStates.delete(ingredientId);
    referenceLoadingStates = newLoadingStates;
  }
}

// Clear reference cache for an ingredient
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
function openVersionHistory(ingredient) {
  versionHistoryIngredientId = ingredient.id;
  showVersionHistory = true;
}

function openSharedManager(ingredient) {
  sharedManagerIngredient = ingredient;
  showSharedManager = true;
}

function openVariationDetector(ingredient) {
  variationTargetIngredient = ingredient;
  showVariationDetector = true;
}

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