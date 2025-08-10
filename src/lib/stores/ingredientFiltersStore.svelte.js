import { getKeyCategory } from '../tpnLegacy.js';

// Filter state using Svelte 5 module-level state
let searchQuery = $state('');
let selectedCategory = $state('ALL');
let selectedHealthSystem = $state('ALL');
let showOnlyWithDiffs = $state(false);
let debouncedSearchQuery = $state('');
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
      const category = getKeyCategory(ingredient.name);
      if (category !== selectedCategory) {
        return false;
      }
    }
    
    // Health system filter
    if (selectedHealthSystem !== 'ALL') {
      const refs = ingredientReferences[ingredient.id];
      if (!refs) return false;
      
      let hasHealthSystem = false;
      for (const popType in refs) {
        if (refs[popType].some(ref => ref.healthSystem === selectedHealthSystem)) {
          hasHealthSystem = true;
          break;
        }
      }
      if (!hasHealthSystem) return false;
    }
    
    // Differences filter
    if (showOnlyWithDiffs) {
      const refs = ingredientReferences[ingredient.id];
      if (!refs) return false;
      
      // Check if there are differences across populations
      const allRefs = Object.values(refs).flat();
      if (allRefs.length <= 1) return false;
      
      // Simple check: if any reference is marked as modified
      const hasDiffs = allRefs.some(ref => ref.status === 'MODIFIED');
      if (!hasDiffs) return false;
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

// Check if any filters are active
function hasActiveFilters() {
  return searchQuery !== '' ||
         selectedCategory !== 'ALL' ||
         selectedHealthSystem !== 'ALL' ||
         showOnlyWithDiffs;
}

// Export store interface
export const ingredientFiltersStore = {
  get searchQuery() { return searchQuery; },
  set searchQuery(val) { 
    searchQuery = val;
    updateSearch(val);
  },
  
  get selectedCategory() { return selectedCategory; },
  set selectedCategory(val) { selectedCategory = val; },
  
  get selectedHealthSystem() { return selectedHealthSystem; },
  set selectedHealthSystem(val) { selectedHealthSystem = val; },
  
  get showOnlyWithDiffs() { return showOnlyWithDiffs; },
  set showOnlyWithDiffs(val) { showOnlyWithDiffs = val; },
  
  get debouncedSearchQuery() { return debouncedSearchQuery; },
  
  updateSearch,
  applyFilters,
  reset,
  hasActiveFilters
};