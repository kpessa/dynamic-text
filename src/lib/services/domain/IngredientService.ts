/**
 * Ingredient Service - CRUD operations for TPN ingredients with caching and validation
 * Handles ingredient data with medical safety validation
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  increment,
  type DocumentData
} from 'firebase/firestore';

import { db, COLLECTIONS, getCurrentUser, signInAnonymouslyUser } from '../../firebase';
import { cacheService } from '../base/CacheService';
import { errorService } from '../base/ErrorService';
import { syncService } from '../base/SyncService';
import { getKeyCategory } from '../../tpnLegacy.js';
import { generateIngredientHash } from '../../contentHashing';

import type { 
  IngredientData, 
  ServiceResponse,
  FirebaseTimestamp 
} from '../../types';

// Cache keys
const CACHE_KEYS = {
  ALL_INGREDIENTS: 'ingredients:all',
  INGREDIENT: (id: string) => `ingredient:${id}`,
  INGREDIENTS_BY_CATEGORY: (category: string) => `ingredients:category:${category}`,
  INGREDIENT_VERSIONS: (id: string) => `ingredient:${id}:versions`
};

// Cache TTLs
const CACHE_TTL = {
  INGREDIENT: 10 * 60 * 1000, // 10 minutes
  INGREDIENT_LIST: 5 * 60 * 1000, // 5 minutes
  VERSIONS: 30 * 60 * 1000 // 30 minutes
};

// Helper functions for ID normalization (moved from monolithic service)
export function formatIngredientName(name: string): string {
  if (!name) return '';
  
  // Pattern-based formatting
  const namePatterns = [
    { pattern: /^Pediatric(.+)$/i, replacement: 'Pediatric $1' },
    { pattern: /^Ped(.+)$/i, replacement: 'Ped $1' },
    { pattern: /^Adult(.+)$/i, replacement: 'Adult $1' },
    { pattern: /^Neonatal(.+)$/i, replacement: 'Neonatal $1' },
    { pattern: /(.+)Chloride$/i, replacement: '$1 Chloride' },
    { pattern: /(.+)Acetate$/i, replacement: '$1 Acetate' },
    { pattern: /(.+)Phosphate$/i, replacement: '$1 Phosphate' },
    { pattern: /(.+)Gluconate$/i, replacement: '$1 Gluconate' },
    { pattern: /(.+)Sulfate$/i, replacement: '$1 Sulfate' },
    { pattern: /^Multi[-]?Vitamin$/i, replacement: 'Multi Vitamin' },
    { pattern: /^Vitamin(.+)$/i, replacement: 'Vitamin $1' },
    { pattern: /^Trace[-]?Elements?$/i, replacement: 'Trace Elements' },
    { pattern: /^Trace[-]?(\d+[A-Z]?)$/i, replacement: 'Trace $1' }
  ];
  
  let formatted = name;
  for (const { pattern, replacement } of namePatterns) {
    if (pattern.test(name)) {
      formatted = name.replace(pattern, replacement);
      break;
    }
  }
  
  // Special cases
  const specialCases: Record<string, string> = {
    'Multrys': 'Multrys',
    'Tralement': 'Tralement',
    'PedTE': 'PedTE',
    'MVI': 'MVI',
    'TPN': 'TPN',
    'AscorbicAcid': 'Ascorbic Acid',
    'AminoAcids': 'Amino Acids',
    'FolicAcid': 'Folic Acid'
  };
  
  if (name in specialCases) {
    return specialCases[name];
  }
  
  // CamelCase conversion if no pattern matched
  if (formatted === name) {
    formatted = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  
  return formatted;
}

export function normalizeIngredientId(name: string): string {
  if (!name || typeof name !== 'string') {
    console.warn('normalizeIngredientId called with invalid name:', name);
    return '';
  }
  
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  
  // Validate Firestore ID
  if (normalized.length === 0 || normalized.length > 1500 || 
      normalized.includes('/') || normalized === '.' || 
      normalized === '..' || /^__.*__$/.test(normalized)) {
    console.error(`Invalid Firebase ID generated: "${normalized}" from name: "${name}"`);
    return normalized.length > 1500 ? normalized.substring(0, 1500).replace(/-+$/g, '') : normalized;
  }
  
  return normalized;
}

export class IngredientService {
  /**
   * Save or update an ingredient with version tracking and validation
   */
  async saveIngredient(
    ingredientData: IngredientData, 
    commitMessage?: string
  ): Promise<ServiceResponse<string>> {
    return errorService.withRetry(async () => {
      // Validate medical safety
      this.validateMedicalSafety(ingredientData);
      
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const ingredientId = ingredientData.id || normalizeIngredientId(ingredientData.name);
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      
      // Get current version for version tracking
      const currentDoc = await getDoc(ingredientRef);
      const currentVersion = currentDoc.exists() ? (currentDoc.data().version || 0) : 0;
      
      // Prepare ingredient data
      const data: IngredientData = {
        ...ingredientData,
        name: ingredientData.name, // Preserve original name with parentheses
        id: ingredientId,
        version: currentVersion + 1,
        lastModified: serverTimestamp() as unknown as FirebaseTimestamp,
        modifiedBy: user.uid,
        contentHash: generateIngredientHash(ingredientData),
        commitMessage: commitMessage || null,
        updatedAt: serverTimestamp() as unknown as FirebaseTimestamp,
        updatedBy: user.uid
      };
      
      // Set creation fields for new ingredients
      if (!ingredientData.id || !currentDoc.exists()) {
        data.createdAt = serverTimestamp() as unknown as FirebaseTimestamp;
        data.createdBy = user.uid;
        data.version = 1;
      }
      
      // Save version history before updating
      if (currentDoc.exists() && currentDoc.data()) {
        await this.saveVersionHistory(ingredientId, {
          ...currentDoc.data() as IngredientData,
          commitMessage: (currentDoc.data() as IngredientData).commitMessage || null
        });
      }
      
      // Save ingredient
      await setDoc(ingredientRef, data);
      
      // Invalidate relevant caches
      cacheService.invalidatePattern(new RegExp(`ingredient[s]?:.*${ingredientId}.*`));
      cacheService.invalidate(CACHE_KEYS.ALL_INGREDIENTS);
      if (ingredientData.category) {
        cacheService.invalidate(CACHE_KEYS.INGREDIENTS_BY_CATEGORY(ingredientData.category));
      }
      
      return {
        success: true,
        data: ingredientId,
        message: `Ingredient ${ingredientData.name} saved successfully`
      };
    }, { maxAttempts: 3 }, { operation: 'saveIngredient', ingredientId: ingredientData.id });
  }

  /**
   * Get ingredient by ID with caching
   */
  async getIngredient(ingredientId: string): Promise<ServiceResponse<IngredientData | null>> {
    return errorService.withRetry(async () => {
      const ingredient = await cacheService.get(
        CACHE_KEYS.INGREDIENT(ingredientId),
        async () => {
          const doc = await getDoc(doc(db, COLLECTIONS.INGREDIENTS, ingredientId));
          return doc.exists() ? { id: doc.id, ...doc.data() } as IngredientData : null;
        },
        CACHE_TTL.INGREDIENT
      );
      
      return {
        success: true,
        data: ingredient,
        message: ingredient ? 'Ingredient found' : 'Ingredient not found'
      };
    }, { maxAttempts: 2 }, { operation: 'getIngredient', ingredientId });
  }

  /**
   * Get all ingredients with caching
   */
  async getAllIngredients(): Promise<ServiceResponse<IngredientData[]>> {
    return errorService.withRetry(async () => {
      const ingredients = await cacheService.get(
        CACHE_KEYS.ALL_INGREDIENTS,
        async () => {
          const q = query(
            collection(db, COLLECTIONS.INGREDIENTS),
            orderBy('name', 'asc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as IngredientData[];
        },
        CACHE_TTL.INGREDIENT_LIST
      );
      
      return {
        success: true,
        data: ingredients,
        message: `Retrieved ${ingredients.length} ingredients`
      };
    }, { maxAttempts: 3 }, { operation: 'getAllIngredients' });
  }

  /**
   * Get ingredients by category with caching
   */
  async getIngredientsByCategory(category: string): Promise<ServiceResponse<IngredientData[]>> {
    return errorService.withRetry(async () => {
      const ingredients = await cacheService.get(
        CACHE_KEYS.INGREDIENTS_BY_CATEGORY(category),
        async () => {
          const q = query(
            collection(db, COLLECTIONS.INGREDIENTS),
            where('category', '==', category),
            orderBy('name', 'asc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as IngredientData[];
        },
        CACHE_TTL.INGREDIENT_LIST
      );
      
      return {
        success: true,
        data: ingredients,
        message: `Retrieved ${ingredients.length} ingredients in category ${category}`
      };
    }, { maxAttempts: 3 }, { operation: 'getIngredientsByCategory', category });
  }

  /**
   * Subscribe to ingredient changes with optimization
   */
  subscribeToIngredients(
    callback: (ingredients: IngredientData[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    return syncService.subscribe({
      id: 'ingredients-all',
      collectionPath: COLLECTIONS.INGREDIENTS,
      constraints: [orderBy('name', 'asc')],
      callback: (data) => {
        // Invalidate cache on updates
        cacheService.invalidate(CACHE_KEYS.ALL_INGREDIENTS);
        callback(data as IngredientData[]);
      },
      errorCallback,
      debounceMs: 500
    });
  }

  /**
   * Subscribe to a specific ingredient
   */
  subscribeToIngredient(
    ingredientId: string,
    callback: (ingredient: IngredientData | null) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    return syncService.subscribeToDocument(
      `${COLLECTIONS.INGREDIENTS}/${ingredientId}`,
      (data) => {
        // Invalidate cache on updates
        cacheService.invalidate(CACHE_KEYS.INGREDIENT(ingredientId));
        callback(data as IngredientData | null);
      },
      errorCallback,
      `ingredient-${ingredientId}`
    );
  }

  /**
   * Delete ingredient with cascade operations
   */
  async deleteIngredient(ingredientId: string): Promise<ServiceResponse<void>> {
    return errorService.withRetry(async () => {
      const batch = writeBatch(db);
      
      // Delete main ingredient
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      batch.delete(ingredientRef);
      
      // TODO: Handle cascade deletes for references
      // This would require checking references and handling accordingly
      
      await batch.commit();
      
      // Invalidate caches
      cacheService.invalidatePattern(new RegExp(`ingredient[s]?:.*${ingredientId}.*`));
      cacheService.invalidate(CACHE_KEYS.ALL_INGREDIENTS);
      
      return {
        success: true,
        data: undefined,
        message: 'Ingredient deleted successfully'
      };
    }, { maxAttempts: 2 }, { operation: 'deleteIngredient', ingredientId });
  }

  /**
   * Batch update ingredients with validation
   */
  async batchUpdateIngredients(
    updates: Array<{ id: string; data: Partial<IngredientData> }>
  ): Promise<ServiceResponse<number>> {
    return errorService.withRetry(async () => {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const batch = writeBatch(db);
      
      // Validate all updates first
      for (const update of updates) {
        if (update.data) {
          this.validateMedicalSafety(update.data as IngredientData);
        }
      }
      
      // Apply updates
      for (const update of updates) {
        const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, update.id);
        batch.update(ingredientRef, {
          ...update.data,
          lastModified: serverTimestamp(),
          modifiedBy: user.uid,
          version: increment(1)
        });
      }
      
      await batch.commit();
      
      // Invalidate caches
      cacheService.invalidate(CACHE_KEYS.ALL_INGREDIENTS);
      updates.forEach(update => {
        cacheService.invalidate(CACHE_KEYS.INGREDIENT(update.id));
      });
      
      return {
        success: true,
        data: updates.length,
        message: `Successfully updated ${updates.length} ingredients`
      };
    }, { maxAttempts: 3 }, { operation: 'batchUpdateIngredients', count: updates.length });
  }

  /**
   * Fix ingredient categories based on TPN legacy logic
   */
  async fixIngredientCategories(): Promise<ServiceResponse<number>> {
    return errorService.withRetry(async () => {
      const user = getCurrentUser() || await signInAnonymouslyUser();
      const ingredients = await this.getAllIngredients();
      
      if (!ingredients.success || !ingredients.data) {
        throw new Error('Failed to fetch ingredients for category fix');
      }
      
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      for (const ingredient of ingredients.data) {
        const correctCategory = getKeyCategory(ingredient.name);
        if (correctCategory && ingredient.category !== correctCategory) {
          const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredient.id!);
          batch.update(ingredientRef, {
            category: correctCategory,
            lastModified: serverTimestamp(),
            modifiedBy: user.uid,
            version: increment(1)
          });
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
        // Invalidate caches
        cacheService.invalidate(CACHE_KEYS.ALL_INGREDIENTS);
      }
      
      return {
        success: true,
        data: fixedCount,
        message: `Fixed categories for ${fixedCount} ingredients`
      };
    }, { maxAttempts: 2 }, { operation: 'fixIngredientCategories' });
  }

  /**
   * Get version history for an ingredient
   */
  async getVersionHistory(ingredientId: string): Promise<ServiceResponse<IngredientData[]>> {
    return errorService.withRetry(async () => {
      const versions = await cacheService.get(
        CACHE_KEYS.INGREDIENT_VERSIONS(ingredientId),
        async () => {
          const q = query(
            collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'versions'),
            orderBy('versionNumber', 'desc')
          );
          
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as IngredientData[];
        },
        CACHE_TTL.VERSIONS
      );
      
      return {
        success: true,
        data: versions,
        message: `Retrieved ${versions.length} versions`
      };
    }, { maxAttempts: 2 }, { operation: 'getVersionHistory', ingredientId });
  }

  /**
   * Save version history (private method)
   */
  private async saveVersionHistory(ingredientId: string, versionData: IngredientData): Promise<void> {
    try {
      const versionRef = doc(collection(db, COLLECTIONS.INGREDIENTS, ingredientId, 'versions'));
      await setDoc(versionRef, {
        ...versionData,
        versionNumber: versionData.version || 1,
        archivedAt: serverTimestamp()
      });
      
      // Invalidate version cache
      cacheService.invalidate(CACHE_KEYS.INGREDIENT_VERSIONS(ingredientId));
    } catch (error) {
      console.error('Error saving version history:', error);
      // Don't throw - version history is not critical
    }
  }

  /**
   * Validate medical safety for ingredient data
   */
  private validateMedicalSafety(ingredientData: Partial<IngredientData>): void {
    // Medical validation rules
    if (ingredientData.name) {
      // Check for potentially dangerous ingredient names
      const dangerousPatterns = [
        /insulin/i,
        /heparin/i,
        /warfarin/i,
        /potassium.*chloride.*concentrated/i
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(ingredientData.name)) {
          console.warn(`High-risk ingredient detected: ${ingredientData.name}`);
          // Could implement additional safety checks here
        }
      }
    }
    
    // Validate required fields
    if (!ingredientData.name) {
      throw new Error('Ingredient name is required for medical safety');
    }
    
    // Validate name length and format
    if (ingredientData.name.length > 200) {
      throw new Error('Ingredient name too long (max 200 characters)');
    }
  }
}

// Export singleton instance
export const ingredientService = new IngredientService();