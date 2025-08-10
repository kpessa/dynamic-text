import { getKeyCategory } from '../tpnLegacy.js';

// Create module-level state variables - using plain variables since this is a store module
let searchQuery = '';
let selectedCategory = 'ALL';
let selectedHealthSystem = 'ALL';
let showOnlyWithDiffs = false;
let debouncedSearchQuery = '';
let searchTimeout = null;

// Method to update search with debouncing
function updateSearch(query) {
  searchQuery = query;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    debouncedSearchQuery = query;
  }, 300);
}

// Apply filters to ingredients list
function applyFilters(ingredients, ingredientReferences = {}) {
  return ingredients.filter(ingredient => {
    // Search filter
    if (debouncedSearchQuery && 
        !ingredient.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) &&
        (!ingredient.description || !ingredient.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))) {
      return false;
    }
    
    // Category filter
    if (selectedCategory !== 'ALL') {
      const category = getKeyCategory(ingredient.key);
      if (category !== selectedCategory) {
        return false;
      }
    }
    
    // Health system filter
    if (selectedHealthSystem !== 'ALL' && ingredient.healthSystem !== selectedHealthSystem) {
      return false;
    }
    
    // Show only with diffs filter
    if (showOnlyWithDiffs) {
      const refs = ingredientReferences[ingredient.id] || [];
      if (refs.length === 0) return false;
    }
    
    return true;
  });
}

// Reset all filters
function reset() {
  searchQuery = '';
  selectedCategory = 'ALL';
  selectedHealthSystem = 'ALL';
  showOnlyWithDiffs = false;
  debouncedSearchQuery = '';
}

// Get current filter state
function getState() {
  return {
    searchQuery,
    selectedCategory,
    selectedHealthSystem,
    showOnlyWithDiffs,
    debouncedSearchQuery
  };
}

// Set filter state
function setState(state) {
  if (state.searchQuery !== undefined) searchQuery = state.searchQuery;
  if (state.selectedCategory !== undefined) selectedCategory = state.selectedCategory;
  if (state.selectedHealthSystem !== undefined) selectedHealthSystem = state.selectedHealthSystem;
  if (state.showOnlyWithDiffs !== undefined) showOnlyWithDiffs = state.showOnlyWithDiffs;
  if (state.debouncedSearchQuery !== undefined) debouncedSearchQuery = state.debouncedSearchQuery;
}

// Export store interface
export const ingredientFiltersStore = {
  get searchQuery() { return searchQuery; },
  set searchQuery(value) { searchQuery = value; },
  
  get selectedCategory() { return selectedCategory; },
  set selectedCategory(value) { selectedCategory = value; },
  
  get selectedHealthSystem() { return selectedHealthSystem; },
  set selectedHealthSystem(value) { selectedHealthSystem = value; },
  
  get showOnlyWithDiffs() { return showOnlyWithDiffs; },
  set showOnlyWithDiffs(value) { showOnlyWithDiffs = value; },
  
  get debouncedSearchQuery() { return debouncedSearchQuery; },
  
  updateSearch,
  applyFilters,
  reset,
  getState,
  setState
};