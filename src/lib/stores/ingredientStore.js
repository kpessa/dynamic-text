import { ingredientService } from '../firebaseDataService.js';
// import { logError } from '$lib/logger';  // Unused import

// Core ingredient data - using plain variables since this is a store module
/** @type {any[]} */
let ingredients = [];
let loading = false;
/** @type {string | null} */
let error = null;
/** @type {(() => void) | null} */
let unsubscribe = null;

// Initialize the store and subscribe to Firebase
async function init() {
  loading = true;
  error = null;
  
  try {
    // Subscribe to real-time updates
    unsubscribe = ingredientService.subscribeToIngredients((updatedIngredients) => {
      // console.log('Received ingredients update:', updatedIngredients.length);
      ingredients = updatedIngredients;
      loading = false;
    });
  } catch (err) {
    // logError('Failed to initialize ingredient store:', err);
    error = err instanceof Error ? err.message : String(err);
    loading = false;
  }
}

// Initialize with empty state (when Firebase not available)
function initEmpty() {
  ingredients = [];
  loading = false;
  error = null;
}

// Clean up subscription
function destroy() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// Get ingredient by ID
/**
 * @param {string} id
 */
function getById(id) {
  return ingredients.find(ing => ing.id === id);
}

// Update a single ingredient locally (will be synced by Firebase)
/**
 * @param {string} id
 * @param {any} updates
 */
function updateLocal(id, updates) {
  const index = ingredients.findIndex(ing => ing.id === id);
  if (index !== -1) {
    ingredients[index] = { ...ingredients[index], ...updates };
    ingredients = [...ingredients]; // Trigger reactivity
  }
}

// Reload ingredients from Firebase
async function reload() {
  loading = true;
  error = null;
  
  try {
    const loadedIngredients = await ingredientService.getAllIngredients();
    ingredients = loadedIngredients;
    loading = false;
  } catch (err) {
    // logError('Failed to reload ingredients:', err);
    error = err instanceof Error ? err.message : String(err);
    loading = false;
  }
}

// Export store interface
export const ingredientStore = {
  get ingredients() { return ingredients; },
  get loading() { return loading; },
  get error() { return error; },
  
  init,
  initEmpty,
  destroy,
  getById,
  updateLocal,
  reload
};