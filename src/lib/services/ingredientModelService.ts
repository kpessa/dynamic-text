/**
 * Ingredient Model Service
 * 
 * Service layer for managing ingredients as first-class entities
 * with direct content editing and Firebase persistence.
 * 
 * This is the NEW ingredient service for the ingredient-first architecture,
 * separate from the legacy ingredientService.ts
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
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  type DocumentSnapshot,
  type QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import type { 
  Ingredient, 
  Section, 
  TestCase, 
  PopulationVariant 
} from '../models';
import type { TPNAdvisorType, TPNAdvisorAlias } from '../../types/tpn';

// Custom error classes
export class IngredientNotFoundError extends Error {
  constructor(id: string) {
    super(`Ingredient not found: ${id}`);
    this.name = 'IngredientNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Filter interface for listing ingredients
export interface IngredientFilters {
  category?: string;
  namePattern?: string;
  hasVariants?: boolean;
}

// Type alias map for population types
const ADVISOR_ALIAS_MAP: Record<string, TPNAdvisorType | TPNAdvisorType[]> = {
  'infant': 'NEO',
  'neonatal': 'NEO',
  'child': 'CHILD',
  'adolescent': 'ADOLESCENT',
  'adult': 'ADULT',
  'pediatric': ['CHILD', 'ADOLESCENT'] // Special case: maps to multiple
};

/**
 * Service for managing ingredient entities with Firebase persistence
 */
export class IngredientModelService {
  private readonly collectionName = 'ingredients';
  
  constructor() {
    console.log('IngredientModelService initialized');
  }

  /**
   * Generate ID from keyname (lowercase, hyphenated)
   */
  private generateId(keyname: string): string {
    return keyname
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Validate ingredient structure
   */
  private validateIngredient(ingredient: Partial<Ingredient>): void {
    if (!ingredient.keyname || !ingredient.sections || !ingredient.tests) {
      throw new ValidationError('Missing required fields: keyname, sections, and tests are required');
    }

    // Validate sections
    if (!Array.isArray(ingredient.sections)) {
      throw new ValidationError('Sections must be an array');
    }

    // Validate tests
    if (!Array.isArray(ingredient.tests)) {
      throw new ValidationError('Tests must be an array');
    }
  }

  /**
   * Validate section structure
   */
  private validateSection(section: any): void {
    if (!section.id || !section.type || !section.content || typeof section.order !== 'number') {
      throw new ValidationError('Invalid section structure: requires id, type, content, and order');
    }
    
    if (section.type !== 'html' && section.type !== 'javascript') {
      throw new ValidationError('Invalid section type: must be "html" or "javascript"');
    }
  }

  /**
   * Validate test structure
   */
  private validateTest(test: any): void {
    if (!test.id || !test.name || !test.variables || typeof test.variables !== 'object') {
      throw new ValidationError('Invalid test structure: requires id, name, and variables object');
    }
  }

  /**
   * Resolve alias to TPNAdvisorType(s)
   */
  private resolveAlias(populationTypeOrAlias: string): TPNAdvisorType | TPNAdvisorType[] {
    // Check if it's already a valid TPNAdvisorType
    if (['NEO', 'CHILD', 'ADOLESCENT', 'ADULT'].includes(populationTypeOrAlias)) {
      return populationTypeOrAlias as TPNAdvisorType;
    }
    
    // Try to resolve alias
    const resolved = ADVISOR_ALIAS_MAP[populationTypeOrAlias];
    if (!resolved) {
      throw new ValidationError(`Invalid population type or alias: ${populationTypeOrAlias}`);
    }
    
    return resolved;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new ingredient
   */
  async create(ingredient: Ingredient): Promise<string> {
    try {
      this.validateIngredient(ingredient);
      
      const id = ingredient.id || this.generateId(ingredient.keyname);
      console.log('Creating ingredient:', id);
      
      const ingredientData = {
        ...ingredient,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Convert Map to object for Firestore
      if (ingredient.variants instanceof Map) {
        ingredientData.variants = Object.fromEntries(ingredient.variants) as any;
      }
      
      await setDoc(doc(db, this.collectionName, id), ingredientData);
      
      return id;
    } catch (error) {
      console.error('Failed to create ingredient:', error);
      throw new Error(`Failed to create ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get an ingredient by ID
   */
  async get(id: string): Promise<Ingredient | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      
      // Convert variants object back to Map
      if (data.variants && typeof data.variants === 'object') {
        data.variants = new Map(Object.entries(data.variants));
      }
      
      return data as Ingredient;
    } catch (error) {
      console.error('Failed to get ingredient:', error);
      throw new Error(`Failed to get ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an ingredient
   */
  async update(id: string, updates: Partial<Ingredient>): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      // Convert Map to object if present
      if (updates.variants instanceof Map) {
        updateData.variants = Object.fromEntries(updates.variants);
      }
      
      await updateDoc(doc(db, this.collectionName, id), updateData);
    } catch (error) {
      console.error('Failed to update ingredient:', error);
      throw new Error(`Failed to update ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an ingredient (with usage check)
   */
  async delete(id: string): Promise<void> {
    try {
      // Check if ingredient is used in any configs
      const configsQuery = query(
        collection(db, 'configManifests'),
        where('ingredientRefs', 'array-contains', { ingredientId: id })
      );
      const configsSnapshot = await getDocs(configsQuery);
      
      if (!configsSnapshot.empty) {
        throw new Error(`Cannot delete ingredient in use by ${configsSnapshot.size} configs`);
      }
      
      await deleteDoc(doc(db, this.collectionName, id));
    } catch (error) {
      console.error('Failed to delete ingredient:', error);
      throw new Error(`Failed to delete ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Section and Test Editing
  // ============================================================================

  /**
   * Update only sections
   */
  async updateSections(id: string, sections: Section[]): Promise<void> {
    // Validate all sections
    sections.forEach(section => this.validateSection(section));
    
    const existing = await this.get(id);
    if (!existing) {
      throw new IngredientNotFoundError(id);
    }
    
    await this.update(id, { sections });
  }

  /**
   * Update only tests
   */
  async updateTests(id: string, tests: TestCase[]): Promise<void> {
    // Validate all tests
    tests.forEach(test => this.validateTest(test));
    
    const existing = await this.get(id);
    if (!existing) {
      throw new IngredientNotFoundError(id);
    }
    
    await this.update(id, { tests });
  }

  /**
   * Add a new section
   */
  async addSection(id: string, section: Section): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new IngredientNotFoundError(id);
    }
    
    // Generate ID if not provided
    if (!section.id) {
      section.id = `sec-${Date.now()}`;
    }
    
    this.validateSection(section);
    
    const updatedSections = [...existing.sections, section];
    await this.update(id, { sections: updatedSections });
  }

  /**
   * Add a new test
   */
  async addTest(id: string, test: TestCase): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new IngredientNotFoundError(id);
    }
    
    // Generate ID if not provided
    if (!test.id) {
      test.id = `test-${Date.now()}`;
    }
    
    this.validateTest(test);
    
    const updatedTests = [...existing.tests, test];
    await this.update(id, { tests: updatedTests });
  }

  // ============================================================================
  // Variant Management
  // ============================================================================

  /**
   * Add or update a variant for a specific population
   */
  async addVariant(
    id: string, 
    populationTypeOrAlias: TPNAdvisorType | TPNAdvisorAlias | string, 
    variant: PopulationVariant
  ): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new IngredientNotFoundError(id);
    }
    
    const resolved = this.resolveAlias(populationTypeOrAlias);
    const variants = existing.variants || new Map();
    
    if (Array.isArray(resolved)) {
      // Handle special case like 'pediatric' -> ['CHILD', 'ADOLESCENT']
      resolved.forEach(type => {
        variants.set(type, variant);
      });
    } else {
      variants.set(resolved, variant);
    }
    
    await this.update(id, { variants });
  }

  /**
   * Get a specific variant
   */
  async getVariant(
    id: string, 
    populationTypeOrAlias: TPNAdvisorType | TPNAdvisorAlias | string
  ): Promise<PopulationVariant | null> {
    const existing = await this.get(id);
    if (!existing) {
      throw new IngredientNotFoundError(id);
    }
    
    if (!existing.variants) {
      return null;
    }
    
    const resolved = this.resolveAlias(populationTypeOrAlias);
    
    // For multi-mapped aliases, return the first match
    if (Array.isArray(resolved)) {
      for (const type of resolved) {
        const variant = existing.variants.get(type);
        if (variant) return variant;
      }
      return null;
    }
    
    return existing.variants.get(resolved) || null;
  }

  /**
   * Remove a specific variant
   */
  async removeVariant(
    id: string, 
    populationTypeOrAlias: TPNAdvisorType | TPNAdvisorAlias | string
  ): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new IngredientNotFoundError(id);
    }
    
    if (!existing.variants) {
      return;
    }
    
    const resolved = this.resolveAlias(populationTypeOrAlias);
    const variants = new Map(existing.variants);
    
    if (Array.isArray(resolved)) {
      resolved.forEach(type => variants.delete(type));
    } else {
      variants.delete(resolved);
    }
    
    await this.update(id, { variants });
  }

  /**
   * Get variants for multi-mapped aliases (e.g., 'pediatric')
   */
  async getVariantsForAlias(id: string, alias: 'pediatric'): Promise<PopulationVariant[]> {
    const existing = await this.get(id);
    if (!existing || !existing.variants) {
      return [];
    }
    
    const resolved = this.resolveAlias(alias);
    if (!Array.isArray(resolved)) {
      return [];
    }
    
    const results: PopulationVariant[] = [];
    resolved.forEach(type => {
      const variant = existing.variants?.get(type);
      if (variant) {
        results.push(variant);
      }
    });
    
    return results;
  }

  // ============================================================================
  // Query and List Operations
  // ============================================================================

  /**
   * List ingredients with optional filters
   */
  async list(filters?: IngredientFilters): Promise<Ingredient[]> {
    try {
      let q = collection(db, this.collectionName);
      
      if (filters?.category) {
        q = query(q, where('category', '==', filters.category)) as any;
      }
      
      q = query(q, orderBy('displayName')) as any;
      
      const snapshot = await getDocs(q);
      const ingredients: Ingredient[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Convert variants object back to Map
        if (data.variants && typeof data.variants === 'object') {
          data.variants = new Map(Object.entries(data.variants));
        }
        
        // Apply name pattern filter if provided
        if (filters?.namePattern) {
          const pattern = filters.namePattern.toLowerCase();
          if (
            data.displayName?.toLowerCase().includes(pattern) ||
            data.keyname?.toLowerCase().includes(pattern)
          ) {
            ingredients.push(data as Ingredient);
          }
        } else {
          ingredients.push(data as Ingredient);
        }
      });
      
      return ingredients;
    } catch (error) {
      console.error('Failed to list ingredients:', error);
      throw new Error(`Failed to list ingredients: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search ingredients by name
   */
  async search(searchTerm: string): Promise<Ingredient[]> {
    const all = await this.list();
    const term = searchTerm.toLowerCase();
    
    return all.filter(ing => 
      ing.displayName?.toLowerCase().includes(term) ||
      ing.keyname.toLowerCase().includes(term)
    );
  }

  /**
   * Get ingredients by category
   */
  async getByCategory(category: string): Promise<Ingredient[]> {
    return this.list({ category });
  }

  // ============================================================================
  // Real-time Subscriptions
  // ============================================================================

  /**
   * Subscribe to changes for a specific ingredient
   */
  subscribe(id: string, callback: (ingredient: Ingredient | null) => void): Unsubscribe {
    const docRef = doc(db, this.collectionName, id);
    
    return onSnapshot(docRef, (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Convert variants object back to Map
        if (data.variants && typeof data.variants === 'object') {
          data.variants = new Map(Object.entries(data.variants));
        }
        
        callback(data as Ingredient);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Subscribe to changes in the entire ingredients collection
   */
  subscribeToList(callback: (ingredients: Ingredient[]) => void): Unsubscribe {
    const q = query(collection(db, this.collectionName), orderBy('displayName'));
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const ingredients: Ingredient[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Convert variants object back to Map
        if (data.variants && typeof data.variants === 'object') {
          data.variants = new Map(Object.entries(data.variants));
        }
        
        ingredients.push(data as Ingredient);
      });
      
      callback(ingredients);
    });
  }
}

// Export singleton instance
export const ingredientModelService = new IngredientModelService();

// Also export the class for testing
export { IngredientModelService as IngredientService };