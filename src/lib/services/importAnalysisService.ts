import type { Ingredient } from '../models';
import { hashSections, generateIngredientHash, findDuplicates } from '../contentHashing';
import { ingredientModelService } from './ingredientModelService';

// Interfaces for import analysis
export interface ImportMatch {
  id: string;
  ingredient: Ingredient;
  matchedWith: Ingredient | null;
  similarity: number;
  differences?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface ImportSummary {
  totalIngredients: number;
  exactMatchCount: number;
  nearMatchCount: number;
  uniqueCount: number;
  estimatedDataSaved: string;
  estimatedSizeReduction: {
    before: number;
    after: number;
  };
}

export interface ImportAnalysisResult {
  exactMatches: ImportMatch[];
  nearMatches: ImportMatch[];
  uniqueIngredients: ImportMatch[];
  summary: ImportSummary;
}

export interface ImportDecision {
  action: 'use-existing' | 'create-new' | 'merge';
  ingredientId?: string;
}

export interface ImportProgress {
  current: number;
  total: number;
  currentItem: string;
  percentage: number;
}

export interface ImportResult {
  success: boolean;
  created: number;
  skipped: number;
  merged: number;
  errors: string[];
}

// Levenshtein distance implementation for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity percentage between two strings
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (!str1 || !str2) return 0;
  
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(str1, str2);
  return Math.round((1 - distance / maxLen) * 100);
}

// Calculate weighted similarity between two ingredients
export function calculateIngredientSimilarity(ing1: Ingredient, ing2: Ingredient): number {
  // Weight distribution:
  // Content (sections): 60%
  // Display name: 20%
  // Properties (category, type): 20%
  
  let contentSimilarity = 0;
  let nameSimilarity = 0;
  let propertiesSimilarity = 0;
  
  // Compare sections content (60% weight)
  // Sort sections by order and type, then compare content only
  const sortSections = (sections: any[]) => {
    if (!sections) return [];
    return [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  };
  
  const content1 = sortSections(ing1.sections).map(s => `${s.type}:${s.content}`).join('\n');
  const content2 = sortSections(ing2.sections).map(s => `${s.type}:${s.content}`).join('\n');
  contentSimilarity = calculateStringSimilarity(content1, content2);
  
  // Compare display names (20% weight)
  const name1 = ing1.displayName || ing1.keyname;
  const name2 = ing2.displayName || ing2.keyname;
  nameSimilarity = calculateStringSimilarity(name1, name2);
  
  // Compare properties (20% weight)
  const props1 = `${ing1.category || ''}|${ing1.keyname}`;
  const props2 = `${ing2.category || ''}|${ing2.keyname}`;
  propertiesSimilarity = calculateStringSimilarity(props1, props2);
  
  
  // Calculate weighted average
  const weightedSimilarity = (
    contentSimilarity * 0.6 +
    nameSimilarity * 0.2 +
    propertiesSimilarity * 0.2
  );
  
  return Math.round(weightedSimilarity);
}

// Find differences between two ingredients
function findDifferences(ing1: Ingredient, ing2: Ingredient): ImportMatch['differences'] {
  const differences: ImportMatch['differences'] = [];
  
  if (ing1.displayName !== ing2.displayName) {
    differences.push({
      field: 'displayName',
      oldValue: ing1.displayName,
      newValue: ing2.displayName
    });
  }
  
  if (ing1.category !== ing2.category) {
    differences.push({
      field: 'category',
      oldValue: ing1.category,
      newValue: ing2.category
    });
  }
  
  // Compare sections
  const content1 = ing1.sections?.map(s => s.content).join('\n') || '';
  const content2 = ing2.sections?.map(s => s.content).join('\n') || '';
  if (content1 !== content2) {
    differences.push({
      field: 'sections',
      oldValue: `${ing1.sections?.length || 0} sections`,
      newValue: `${ing2.sections?.length || 0} sections`
    });
  }
  
  // Compare tests
  if ((ing1.tests?.length || 0) !== (ing2.tests?.length || 0)) {
    differences.push({
      field: 'tests',
      oldValue: `${ing1.tests?.length || 0} tests`,
      newValue: `${ing2.tests?.length || 0} tests`
    });
  }
  
  return differences;
}

// Main import analysis service
class ImportAnalysisService {
  private cache = new Map<string, string>(); // Content cache for performance
  
  // Analyze a config file for import
  async analyzeConfig(config: any): Promise<ImportAnalysisResult> {
    const startTime = Date.now();
    
    // Extract ingredients from config
    const incomingIngredients = this.extractIngredientsFromConfig(config);
    
    // Get existing ingredients from database
    const existingIngredients = await ingredientModelService.list();
    
    // Initialize result containers
    const exactMatches: ImportMatch[] = [];
    const nearMatches: ImportMatch[] = [];
    const uniqueIngredients: ImportMatch[] = [];
    
    // Analyze each incoming ingredient
    for (const incoming of incomingIngredients) {
      let bestMatch: { ingredient: Ingredient | null; similarity: number } = {
        ingredient: null,
        similarity: 0
      };
      
      // Compare with all existing ingredients
      for (const existing of existingIngredients) {
        const similarity = calculateIngredientSimilarity(incoming, existing);
        
        
        if (similarity > bestMatch.similarity) {
          bestMatch = {
            ingredient: existing,
            similarity
          };
        }
        
        // Short-circuit if exact match found
        if (similarity === 100) break;
      }
      
      // Categorize based on similarity
      const match: ImportMatch = {
        id: `match-${Date.now()}-${Math.random()}`,
        ingredient: incoming,
        matchedWith: bestMatch.ingredient,
        similarity: bestMatch.similarity
      };
      
      if (bestMatch.similarity === 100) {
        exactMatches.push(match);
      } else if (bestMatch.similarity >= 70) {
        match.differences = bestMatch.ingredient ? 
          findDifferences(bestMatch.ingredient, incoming) : undefined;
        nearMatches.push(match);
      } else {
        uniqueIngredients.push({
          ...match,
          matchedWith: null,
          similarity: 0
        });
      }
    }
    
    // Calculate summary statistics
    const summary = this.calculateSummary(
      incomingIngredients.length,
      exactMatches.length,
      nearMatches.length,
      uniqueIngredients.length
    );
    
    console.log(`Analysis completed in ${Date.now() - startTime}ms`);
    
    return {
      exactMatches,
      nearMatches,
      uniqueIngredients,
      summary
    };
  }
  
  // Extract ingredients from config INGREDIENT array
  private extractIngredientsFromConfig(config: any): Ingredient[] {
    if (!config || !Array.isArray(config.INGREDIENT)) {
      return [];
    }
    
    return config.INGREDIENT.map((item: any, index: number) => {
      // Transform config ingredient to our Ingredient type
      const ingredient: Ingredient = {
        id: '', // Will be assigned on creation
        keyname: item.keyname || `ingredient-${index}`,
        displayName: item.displayName || item.keyname,
        category: item.category || 'Other',
        sections: Array.isArray(item.sections) ? item.sections.map((sec: any, i: number) => ({
          id: `sec-${i}`,
          type: sec.type || 'javascript',
          content: sec.content || '',
          order: i
        })) : [],
        tests: Array.isArray(item.tests) ? item.tests : [],
        metadata: {
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      
      return ingredient;
    });
  }
  
  // Calculate import summary
  private calculateSummary(
    total: number,
    exact: number,
    near: number,
    unique: number
  ): ImportSummary {
    const avgIngredientSize = 1024; // Estimated bytes per ingredient
    const before = total * avgIngredientSize;
    
    // Calculate space saved
    // Exact matches: 100% saved
    // Near matches: 75% saved (assuming we'll use existing)
    // Unique: 0% saved
    const savedFromExact = exact * avgIngredientSize;
    const savedFromNear = near * avgIngredientSize * 0.75;
    const after = before - savedFromExact - savedFromNear;
    
    const percentSaved = total > 0 ? 
      Math.round(((before - after) / before) * 100) : 0;
    
    return {
      totalIngredients: total,
      exactMatchCount: exact,
      nearMatchCount: near,
      uniqueCount: unique,
      estimatedDataSaved: `${percentSaved}%`,
      estimatedSizeReduction: {
        before,
        after: Math.round(after)
      }
    };
  }
  
  // Execute import based on decisions
  async executeImport(
    config: any,
    decisions: Map<string, ImportDecision>,
    progressCallback?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      created: 0,
      skipped: 0,
      merged: 0,
      errors: []
    };
    
    try {
      const ingredients = this.extractIngredientsFromConfig(config);
      const total = ingredients.length;
      
      for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        const matchId = Array.from(decisions.keys())[i];
        const decision = decisions.get(matchId);
        
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total,
            currentItem: `Processing: ${ingredient.displayName || ingredient.keyname}`,
            percentage: Math.round(((i + 1) / total) * 100)
          });
        }
        
        if (!decision) {
          // No decision made, treat as create new
          try {
            await ingredientModelService.create(ingredient);
            result.created++;
          } catch (error) {
            result.errors.push(`Failed to create ${ingredient.keyname}: ${error}`);
            result.success = false;
          }
          continue;
        }
        
        switch (decision.action) {
          case 'use-existing':
            // Skip import, use existing ingredient
            result.skipped++;
            break;
            
          case 'create-new':
            // Create as new ingredient
            try {
              await ingredientModelService.create(ingredient);
              result.created++;
            } catch (error) {
              result.errors.push(`Failed to create ${ingredient.keyname}: ${error}`);
              result.success = false;
            }
            break;
            
          case 'merge':
            // Merge with existing ingredient
            if (decision.ingredientId) {
              try {
                const existing = await ingredientModelService.get(decision.ingredientId);
                if (existing) {
                  // Merge logic: combine sections, tests, etc.
                  const merged: Ingredient = {
                    ...existing,
                    sections: [...existing.sections, ...ingredient.sections],
                    tests: [...existing.tests, ...ingredient.tests],
                    metadata: {
                      ...existing.metadata,
                      updatedAt: new Date().toISOString(),
                      version: (existing.metadata?.version || 0) + 1
                    }
                  };
                  await ingredientModelService.update(decision.ingredientId, merged);
                  result.merged++;
                }
              } catch (error) {
                result.errors.push(`Failed to merge ${ingredient.keyname}: ${error}`);
                result.success = false;
              }
            }
            break;
        }
      }
      
      if (progressCallback) {
        progressCallback({
          current: total,
          total,
          currentItem: 'Import complete',
          percentage: 100
        });
      }
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Import failed: ${error}`);
    }
    
    return result;
  }
  
  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const importAnalysisService = new ImportAnalysisService();