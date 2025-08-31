/**
 * Transformation Bridge Service
 * 
 * Bidirectional transformation utilities between ingredient and config formats.
 * Maintains backward compatibility while enabling the new ingredient-first architecture.
 */

import type { Ingredient, Section, TestCase, PopulationVariant } from '../models';
import type { TPNAdvisorType, TPNAdvisorAlias } from '../../types/tpn';
import { noteTransformService } from './noteTransformService';

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  differences: string[];
  warnings?: string[];
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

// Legacy population name mapping
const LEGACY_POPULATION_MAP: Record<string, TPNAdvisorType> = {
  'Neonatal': 'NEO',
  'Infant': 'NEO',
  'Child': 'CHILD',
  'Pediatric': 'CHILD', // Default to CHILD for single mapping
  'Adolescent': 'ADOLESCENT',
  'Adult': 'ADULT'
};

/**
 * Service for transforming between config and ingredient formats
 */
export class TransformationBridgeService {
  private cache: Map<string, any> = new Map();
  private cacheSize = 100; // LRU cache size

  constructor() {
    console.log('TransformationBridgeService initialized');
  }

  /**
   * Generate cache key from object
   */
  private getCacheKey(obj: any): string {
    return JSON.stringify(obj);
  }

  /**
   * Get from cache or compute
   */
  private getOrCompute<T>(key: string, compute: () => T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = compute();
    
    // Simple LRU: remove oldest if cache is full
    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, result);
    return result;
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
    return ADVISOR_ALIAS_MAP[populationTypeOrAlias] || 'ADULT'; // Default to ADULT
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

  // ============================================================================
  // Backward Compatible Methods
  // ============================================================================

  /**
   * Extract sections from config NOTE arrays (backward compatible)
   * @deprecated Use configToIngredient for new code
   */
  configToSections(config: any): Section[] {
    if (!config || !config.NOTE) {
      return [];
    }
    
    return noteTransformService.noteArrayToSections(
      config.NOTE,
      config.KEYNAME || 'unknown'
    );
  }

  /**
   * Build config format from sections (backward compatible)
   * @deprecated Use ingredientToConfig for new code
   */
  sectionsToConfig(sections: Section[], ingredientKey: string): any {
    return {
      KEYNAME: ingredientKey,
      NOTE: noteTransformService.sectionsToNoteArray(sections)
    };
  }

  // ============================================================================
  // Config to Ingredient Transformation
  // ============================================================================

  /**
   * Transform config to ingredient
   */
  configToIngredient(config: any): Ingredient {
    if (!config) {
      console.warn('Null or undefined config provided');
      return this.createEmptyIngredient();
    }

    const cacheKey = this.getCacheKey(config);
    return this.getOrCompute(cacheKey, () => {
      const keyname = config.KEYNAME || '';
      
      if (!keyname) {
        console.warn('Config missing KEYNAME field');
      }

      const sections = config.NOTE 
        ? noteTransformService.noteArrayToSections(config.NOTE, keyname)
        : [];

      const ingredient: Ingredient = {
        id: this.generateId(keyname),
        keyname: keyname,
        displayName: config.DISPLAY || keyname,
        category: config.TYPE || 'Other',
        sections: sections,
        tests: this.extractTestCases(config),
        metadata: {
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          uomDisplay: config.UOM_DISP,
          osmoRatio: config.OSMO_RATIO,
          precision: config.PRECISION,
          referenceRanges: config.REFERENCE_RANGE || []
        }
      };

      // Handle population-specific data
      if (config.POPULATION) {
        const populationType = LEGACY_POPULATION_MAP[config.POPULATION];
        if (populationType) {
          ingredient.variants = new Map([
            [populationType, {
              populationType: config.POPULATION.toLowerCase(),
              overrides: {}
            }]
          ]);
        }
      }

      return ingredient;
    });
  }

  /**
   * Extract test cases from config (if present)
   */
  private extractTestCases(config: any): TestCase[] {
    // Check if config has test data
    if (config.TESTS && Array.isArray(config.TESTS)) {
      return config.TESTS.map((test: any, index: number) => ({
        id: test.ID || `test-${index}`,
        name: test.NAME || `Test ${index + 1}`,
        variables: test.VARIABLES || {},
        expected: test.EXPECTED
      }));
    }
    
    return [];
  }

  /**
   * Extract ingredients from multiple configs
   */
  extractIngredientsFromConfigs(configs: any[], deduplicate: boolean = true): Ingredient[] {
    if (!configs || configs.length === 0) {
      return [];
    }

    const ingredients = configs.map(config => this.configToIngredient(config));
    
    if (!deduplicate) {
      return ingredients;
    }

    // Deduplicate by keyname
    const uniqueMap = new Map<string, Ingredient>();
    ingredients.forEach(ingredient => {
      const existing = uniqueMap.get(ingredient.keyname);
      if (!existing || ingredient.metadata?.version! > existing.metadata?.version!) {
        uniqueMap.set(ingredient.keyname, ingredient);
      }
    });

    return Array.from(uniqueMap.values());
  }

  /**
   * Extract ingredient with specific population mapping
   */
  extractIngredientWithPopulationMapping(
    config: any, 
    populationType: TPNAdvisorType
  ): Ingredient {
    const ingredient = this.configToIngredient(config);
    
    // Add population-specific variant if not already present
    if (!ingredient.variants) {
      ingredient.variants = new Map();
    }
    
    if (!ingredient.variants.has(populationType)) {
      ingredient.variants.set(populationType, {
        populationType: populationType.toLowerCase(),
        overrides: {}
      });
    }
    
    return ingredient;
  }

  // ============================================================================
  // Ingredient to Config Transformation
  // ============================================================================

  /**
   * Transform ingredient to config
   */
  ingredientToConfig(ingredient: Ingredient | null): any {
    if (!ingredient) {
      console.warn('Null ingredient provided');
      return this.createEmptyConfig();
    }

    const cacheKey = this.getCacheKey(ingredient);
    return this.getOrCompute(cacheKey, () => {
      const config: any = {
        KEYNAME: ingredient.keyname || '',
        DISPLAY: ingredient.displayName || ingredient.keyname || '',
        TYPE: ingredient.category || 'Other',
        NOTE: noteTransformService.sectionsToNoteArray(ingredient.sections || [])
      };

      // Add metadata fields if present
      if (ingredient.metadata) {
        if (ingredient.metadata.uomDisplay) config.UOM_DISP = ingredient.metadata.uomDisplay;
        if (ingredient.metadata.osmoRatio !== undefined) config.OSMO_RATIO = ingredient.metadata.osmoRatio;
        if (ingredient.metadata.precision !== undefined) config.PRECISION = ingredient.metadata.precision;
        if (ingredient.metadata.referenceRanges) config.REFERENCE_RANGE = ingredient.metadata.referenceRanges;
      }

      // Add tests if present
      if (ingredient.tests && ingredient.tests.length > 0) {
        config.TESTS = ingredient.tests.map(test => ({
          ID: test.id,
          NAME: test.name,
          VARIABLES: test.variables,
          EXPECTED: test.expected
        }));
      }

      return config;
    });
  }

  /**
   * Transform ingredient to config with specific population
   */
  ingredientToConfigWithPopulation(
    ingredient: Ingredient,
    populationTypeOrAlias: TPNAdvisorType | TPNAdvisorAlias | string
  ): any {
    const baseConfig = this.ingredientToConfig(ingredient);
    
    if (!ingredient.variants) {
      return baseConfig;
    }

    const resolved = this.resolveAlias(populationTypeOrAlias);
    
    // Handle multi-mapped aliases (like 'pediatric')
    if (Array.isArray(resolved)) {
      // Return config for first matching variant
      for (const type of resolved) {
        const variant = ingredient.variants.get(type);
        if (variant) {
          return this.applyVariantToConfig(baseConfig, variant);
        }
      }
      return baseConfig;
    }

    // Single population type
    const variant = ingredient.variants.get(resolved);
    if (variant) {
      return this.applyVariantToConfig(baseConfig, variant);
    }

    return baseConfig;
  }

  /**
   * Apply variant overrides to config
   */
  private applyVariantToConfig(config: any, variant: PopulationVariant): any {
    const result = { ...config };
    
    if (variant.overrides) {
      if (variant.overrides.displayName) {
        result.DISPLAY = variant.overrides.displayName;
      }
      
      if (variant.overrides.sections) {
        result.NOTE = noteTransformService.sectionsToNoteArray(variant.overrides.sections);
      }
      
      if (variant.overrides.tests) {
        result.TESTS = variant.overrides.tests.map(test => ({
          ID: test.id,
          NAME: test.name,
          VARIABLES: test.variables,
          EXPECTED: test.expected
        }));
      }
    }
    
    return result;
  }

  /**
   * Generate configs for multiple population types
   */
  ingredientToConfigWithMultiplePopulations(
    ingredient: Ingredient,
    populations: TPNAdvisorType[]
  ): any[] {
    return populations.map(population => 
      this.ingredientToConfigWithPopulation(ingredient, population)
    );
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate round-trip transformation (config → ingredient → config)
   */
  validateRoundTrip(original: any): ValidationResult {
    try {
      const ingredient = this.configToIngredient(original);
      const result = this.ingredientToConfig(ingredient);
      
      const differences: string[] = [];
      const originalKeys = Object.keys(original);
      const resultKeys = Object.keys(result);
      
      // Check for missing keys
      originalKeys.forEach(key => {
        if (!resultKeys.includes(key)) {
          differences.push(key);
        }
      });
      
      // Check for value differences in common keys
      const commonKeys = originalKeys.filter(k => resultKeys.includes(k));
      commonKeys.forEach(key => {
        if (JSON.stringify(original[key]) !== JSON.stringify(result[key])) {
          differences.push(`${key} value mismatch`);
        }
      });
      
      return {
        valid: differences.length === 0,
        differences,
        warnings: differences.length > 0 ? ['Some data may be lost in transformation'] : []
      };
    } catch (error) {
      return {
        valid: false,
        differences: ['Transformation error'],
        warnings: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Validate ingredient round-trip (ingredient → config → ingredient)
   */
  validateIngredientRoundTrip(original: Ingredient): ValidationResult {
    try {
      const config = this.ingredientToConfig(original);
      const result = this.configToIngredient(config);
      
      const differences: string[] = [];
      
      // Check core fields
      if (original.id !== result.id) differences.push('id');
      if (original.keyname !== result.keyname) differences.push('keyname');
      if (original.displayName !== result.displayName) differences.push('displayName');
      if (original.category !== result.category) differences.push('category');
      
      // Check sections
      if (original.sections.length !== result.sections.length) {
        differences.push('sections count');
      }
      
      // Check tests
      if (original.tests.length !== result.tests.length) {
        differences.push('tests count');
      }
      
      return {
        valid: differences.length === 0,
        differences,
        warnings: differences.length > 0 ? ['Some ingredient data may be lost'] : []
      };
    } catch (error) {
      return {
        valid: false,
        differences: ['Transformation error'],
        warnings: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create empty ingredient with defaults
   */
  private createEmptyIngredient(): Ingredient {
    return {
      id: '',
      keyname: '',
      displayName: '',
      category: 'Other',
      sections: [],
      tests: [],
      metadata: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Create empty config with defaults
   */
  private createEmptyConfig(): any {
    return {
      KEYNAME: '',
      DISPLAY: '',
      TYPE: 'Other',
      NOTE: []
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.cacheSize
    };
  }
}

// Export singleton instance
export const transformationBridgeService = new TransformationBridgeService();