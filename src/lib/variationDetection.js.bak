/**
 * Variation Detection - Find similar but not identical ingredients
 * Uses text similarity algorithms to identify potential duplicates or variations
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance between strings
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  
  return dp[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio (1 = identical, 0 = completely different)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  
  return 1 - (distance / maxLen);
}

/**
 * Extract text content from sections for comparison
 * @param {Array} sections - Array of section objects
 * @returns {string} Concatenated text content
 */
function extractTextFromSections(sections) {
  if (!sections || !Array.isArray(sections)) return '';
  
  return sections
    .map(section => section.content || '')
    .join('\n')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract text content from NOTE array
 * @param {Array} noteArray - Array of NOTE objects
 * @returns {string} Concatenated text content
 */
function extractTextFromNotes(noteArray) {
  if (!noteArray || !Array.isArray(noteArray)) return '';
  
  return noteArray
    .map(note => note.TEXT || note.text || '')
    .join('\n')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate content similarity between two ingredients
 * @param {Object} ingredient1 - First ingredient
 * @param {Object} ingredient2 - Second ingredient
 * @returns {number} Similarity score (0-1)
 */
export function calculateIngredientSimilarity(ingredient1, ingredient2) {
  if (!ingredient1 || !ingredient2) return 0;
  
  let text1 = '';
  let text2 = '';
  
  // Extract text from first ingredient
  if (ingredient1.sections) {
    text1 = extractTextFromSections(ingredient1.sections);
  } else if (ingredient1.NOTE || ingredient1.notes) {
    text1 = extractTextFromNotes(ingredient1.NOTE || ingredient1.notes);
  }
  
  // Extract text from second ingredient
  if (ingredient2.sections) {
    text2 = extractTextFromSections(ingredient2.sections);
  } else if (ingredient2.NOTE || ingredient2.notes) {
    text2 = extractTextFromNotes(ingredient2.NOTE || ingredient2.notes);
  }
  
  if (!text1 || !text2) return 0;
  
  return calculateSimilarity(text1, text2);
}

/**
 * Find variations of an ingredient within a collection
 * @param {Object} targetIngredient - Ingredient to find variations of
 * @param {Array} ingredients - Array of ingredients to search
 * @param {number} threshold - Similarity threshold (0.5-0.95)
 * @returns {Array} Array of similar ingredients with similarity scores
 */
export function findVariations(targetIngredient, ingredients, threshold = 0.7) {
  if (!targetIngredient || !ingredients || !Array.isArray(ingredients)) {
    return [];
  }
  
  const variations = [];
  
  ingredients.forEach(ingredient => {
    // Skip if it's the same ingredient
    if (ingredient.id === targetIngredient.id) return;
    
    const similarity = calculateIngredientSimilarity(targetIngredient, ingredient);
    
    // Only include if above threshold but not identical (which would be 1.0)
    if (similarity >= threshold && similarity < 0.99) {
      variations.push({
        ingredient,
        similarity,
        similarityPercent: Math.round(similarity * 100)
      });
    }
  });
  
  // Sort by similarity (highest first)
  return variations.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find ingredient name variations (similar names)
 * @param {string} targetName - Name to find variations of
 * @param {Array} ingredients - Array of ingredients
 * @param {number} threshold - Similarity threshold
 * @returns {Array} Ingredients with similar names
 */
export function findNameVariations(targetName, ingredients, threshold = 0.8) {
  if (!targetName || !ingredients) return [];
  
  const variations = [];
  const normalizedTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  ingredients.forEach(ingredient => {
    const name = ingredient.name || ingredient.DISPLAY || ingredient.KEYNAME || '';
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const similarity = calculateSimilarity(normalizedTarget, normalizedName);
    
    if (similarity >= threshold && similarity < 0.99) {
      variations.push({
        ingredient,
        name,
        similarity,
        similarityPercent: Math.round(similarity * 100)
      });
    }
  });
  
  return variations.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Group ingredients by similarity clusters
 * @param {Array} ingredients - Array of ingredients
 * @param {number} threshold - Similarity threshold for clustering
 * @returns {Array} Array of variation groups
 */
export function clusterVariations(ingredients, threshold = 0.7) {
  if (!ingredients || !Array.isArray(ingredients)) return [];
  
  const clusters = [];
  const processed = new Set();
  
  ingredients.forEach(ingredient => {
    if (processed.has(ingredient.id)) return;
    
    const variations = findVariations(ingredient, ingredients, threshold);
    
    if (variations.length > 0) {
      const cluster = {
        id: `cluster-${clusters.length + 1}`,
        primary: ingredient,
        variations: variations,
        totalCount: variations.length + 1
      };
      
      clusters.push(cluster);
      processed.add(ingredient.id);
      variations.forEach(v => processed.add(v.ingredient.id));
    }
  });
  
  // Sort by cluster size (largest first)
  return clusters.sort((a, b) => b.totalCount - a.totalCount);
}

/**
 * Suggest merge candidates based on high similarity
 * @param {Array} ingredients - Array of ingredients
 * @param {number} mergeThreshold - Threshold for merge suggestion (default 0.85)
 * @returns {Array} Array of merge suggestions
 */
export function suggestMerges(ingredients, mergeThreshold = 0.85) {
  const clusters = clusterVariations(ingredients, mergeThreshold);
  
  return clusters.map(cluster => ({
    ...cluster,
    mergeRecommended: true,
    reason: cluster.variations.some(v => v.similarity > 0.95) 
      ? 'Nearly identical content' 
      : 'Highly similar content'
  }));
}

/**
 * Calculate difference highlights between two text strings
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {Object} Object with highlighted differences
 */
export function highlightDifferences(text1, text2) {
  const words1 = text1.split(/\s+/);
  const words2 = text2.split(/\s+/);
  
  const result1 = [];
  const result2 = [];
  
  let i = 0, j = 0;
  
  while (i < words1.length || j < words2.length) {
    if (i >= words1.length) {
      // Remaining words in text2
      result2.push({ text: words2[j], added: true });
      j++;
    } else if (j >= words2.length) {
      // Remaining words in text1
      result1.push({ text: words1[i], removed: true });
      i++;
    } else if (words1[i] === words2[j]) {
      // Matching words
      result1.push({ text: words1[i], match: true });
      result2.push({ text: words2[j], match: true });
      i++;
      j++;
    } else {
      // Different words - simple approach
      result1.push({ text: words1[i], removed: true });
      result2.push({ text: words2[j], added: true });
      i++;
      j++;
    }
  }
  
  return {
    text1: result1,
    text2: result2
  };
}

/**
 * Get variation statistics for a set of ingredients
 * @param {Array} ingredients - Array of ingredients
 * @returns {Object} Statistics about variations
 */
export function getVariationStats(ingredients) {
  const clusters = clusterVariations(ingredients, 0.7);
  const highSimilarity = clusterVariations(ingredients, 0.85);
  const mergeables = suggestMerges(ingredients);
  
  return {
    totalIngredients: ingredients.length,
    variationClusters: clusters.length,
    highSimilarityGroups: highSimilarity.length,
    mergeCandidates: mergeables.length,
    potentialReduction: mergeables.reduce((sum, cluster) => sum + cluster.variations.length, 0)
  };
}