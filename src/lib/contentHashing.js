/**
 * Content hashing utilities for ingredient deduplication
 * Generates deterministic hashes for ingredient content to identify duplicates
 */

/**
 * Simple hash function using djb2 algorithm
 * Chosen for simplicity and good distribution for our use case
 * @param {string} str - String to hash
 * @returns {string} Hex hash string
 */
function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

/**
 * Normalize content for consistent hashing
 * Removes whitespace variations and normalizes line endings
 * @param {string} content - Content to normalize
 * @returns {string} Normalized content
 */
function normalizeContent(content) {
    if (!content) return '';
    
    return content
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();                  // Remove leading/trailing whitespace
}

/**
 * Generate hash for ingredient sections
 * @param {Array} sections - Array of section objects with type and content
 * @returns {string} Hash of sections content
 */
export function hashSections(sections) {
    if (!sections || !Array.isArray(sections)) {
        return '';
    }
    
    // Create normalized representation of sections
    const normalized = sections
        .map(section => {
            const type = section.type || 'html';
            const content = normalizeContent(section.content || '');
            return `${type}:${content}`;
        })
        .join('|');
    
    return simpleHash(normalized);
}

/**
 * Generate hash for NOTE array (legacy format)
 * @param {Array} noteArray - Array of NOTE content strings
 * @returns {string} Hash of NOTE content
 */
export function hashNoteArray(noteArray) {
    if (!noteArray || !Array.isArray(noteArray)) {
        return '';
    }
    
    // Join and normalize NOTE array content
    const normalized = noteArray
        .map(note => normalizeContent(note))
        .filter(note => note) // Remove empty entries
        .join('|');
    
    return simpleHash(normalized);
}

/**
 * Generate content hash for an ingredient
 * Handles both sections format and NOTE array format
 * @param {Object} ingredient - Ingredient object
 * @returns {string} Content hash
 */
export function generateIngredientHash(ingredient) {
    if (!ingredient) return '';
    
    // Check for sections format (new format)
    if (ingredient.sections && Array.isArray(ingredient.sections)) {
        return hashSections(ingredient.sections);
    }
    
    // Check for NOTE array format (legacy)
    if (ingredient.NOTE && Array.isArray(ingredient.NOTE)) {
        return hashNoteArray(ingredient.NOTE);
    }
    
    // Check for notes field (some configs use lowercase)
    if (ingredient.notes && Array.isArray(ingredient.notes)) {
        return hashNoteArray(ingredient.notes);
    }
    
    // No content to hash
    return '';
}

/**
 * Compare two ingredients for content equality
 * @param {Object} ingredient1 - First ingredient
 * @param {Object} ingredient2 - Second ingredient
 * @returns {boolean} True if content is identical
 */
export function areIngredientsIdentical(ingredient1, ingredient2) {
    if (!ingredient1 || !ingredient2) return false;
    
    const hash1 = generateIngredientHash(ingredient1);
    const hash2 = generateIngredientHash(ingredient2);
    
    // Both must have content
    if (!hash1 || !hash2) return false;
    
    return hash1 === hash2;
}

/**
 * Find duplicate ingredients in a collection
 * @param {Array} ingredients - Array of ingredient objects
 * @returns {Object} Map of hash to array of duplicate ingredients
 */
export function findDuplicates(ingredients) {
    const hashMap = new Map();
    
    ingredients.forEach(ingredient => {
        const hash = generateIngredientHash(ingredient);
        if (!hash) return; // Skip ingredients without content
        
        if (!hashMap.has(hash)) {
            hashMap.set(hash, []);
        }
        hashMap.get(hash).push(ingredient);
    });
    
    // Filter to only include duplicates (more than one ingredient)
    const duplicates = {};
    hashMap.forEach((ingredients, hash) => {
        if (ingredients.length > 1) {
            duplicates[hash] = ingredients;
        }
    });
    
    return duplicates;
}

/**
 * Calculate similarity score between two ingredients
 * Returns a value between 0 (completely different) and 1 (identical)
 * @param {Object} ingredient1 - First ingredient
 * @param {Object} ingredient2 - Second ingredient
 * @returns {number} Similarity score
 */
export function calculateSimilarity(ingredient1, ingredient2) {
    // For now, just return 1 if identical, 0 otherwise
    // This can be enhanced later with fuzzy matching
    return areIngredientsIdentical(ingredient1, ingredient2) ? 1 : 0;
}