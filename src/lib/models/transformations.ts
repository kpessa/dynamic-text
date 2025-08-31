/**
 * Transformation Type Definitions and Type Guards
 * 
 * Utilities for migrating between legacy and new data formats,
 * detecting duplicates, and validating data structures.
 */

import type { Ingredient, PopulationVariant } from './ingredient';
import type { ConfigManifest, IngredientReference } from './config';
import type { Section, TestCase } from './shared';

/**
 * Result of a transformation operation
 * 
 * @example
 * {
 *   success: true,
 *   data: transformedIngredient,
 *   warnings: ['Missing display name, using keyname']
 * }
 */
export interface TransformationResult<T> {
  /** Whether transformation succeeded */
  success: boolean;
  
  /** Transformed data (if successful) */
  data?: T;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Warning messages */
  warnings?: string[];
  
  /** Transformation metadata */
  metadata?: {
    /** Source format */
    sourceFormat?: string;
    /** Target format */
    targetFormat?: string;
    /** Transformation timestamp */
    timestamp?: string;
    /** Duration in ms */
    duration?: number;
  };
}

/**
 * Options for migration operations
 * 
 * @example
 * {
 *   preserveLegacyFields: true,
 *   generateIds: true,
 *   validateOutput: true
 * }
 */
export interface MigrationOptions {
  /** Whether to preserve legacy fields */
  preserveLegacyFields?: boolean;
  
  /** Whether to auto-generate IDs */
  generateIds?: boolean;
  
  /** Whether to validate output */
  validateOutput?: boolean;
  
  /** Default population type */
  defaultPopulation?: string;
  
  /** Custom ID generator function */
  idGenerator?: (keyname: string) => string;
  
  /** Whether to merge duplicates */
  mergeDuplicates?: boolean;
  
  /** Logging function */
  log?: (message: string) => void;
}

/**
 * Result of deduplication analysis
 * 
 * @example
 * {
 *   totalIngredients: 50,
 *   uniqueIngredients: 30,
 *   duplicates: [
 *     { ingredientId: 'calcium', count: 3, variations: [...] }
 *   ]
 * }
 */
export interface DeduplicationResult {
  /** Total number of ingredients analyzed */
  totalIngredients: number;
  
  /** Number of unique ingredients */
  uniqueIngredients: number;
  
  /** Duplicate groups found */
  duplicates: Array<{
    /** Ingredient ID */
    ingredientId: string;
    /** Number of duplicates */
    count: number;
    /** Duplicate variations */
    variations: Array<{
      /** Source config */
      configId: string;
      /** Hash of content */
      contentHash: string;
      /** Differences from base */
      differences?: string[];
    }>;
  }>;
  
  /** Suggested merges */
  suggestedMerges?: Array<{
    /** Base ingredient to keep */
    baseId: string;
    /** Ingredients to merge */
    mergeIds: string[];
    /** Similarity score */
    similarity: number;
  }>;
}

/**
 * Comparison result between ingredients
 * 
 * @example
 * {
 *   identical: false,
 *   similarity: 0.95,
 *   differences: ['displayName', 'sections[0].content']
 * }
 */
export interface IngredientComparison {
  /** Whether ingredients are identical */
  identical: boolean;
  
  /** Similarity score (0-1) */
  similarity: number;
  
  /** List of different fields */
  differences: string[];
  
  /** Detailed diff information */
  diff?: {
    /** Added fields */
    added?: string[];
    /** Removed fields */
    removed?: string[];
    /** Modified fields */
    modified?: Array<{
      path: string;
      oldValue: any;
      newValue: any;
    }>;
  };
}

/**
 * Legacy config format (for backward compatibility)
 */
export interface LegacyConfig {
  /** Legacy KEYNAME field */
  KEYNAME: string;
  /** Legacy DISPLAY field */
  DISPLAY?: string;
  /** Legacy TYPE field */
  TYPE?: string;
  /** Sections array */
  sections?: any[];
  /** Test cases */
  tests?: any[];
  /** Any other legacy fields */
  [key: string]: any;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for Ingredient
 */
export function isIngredient(value: unknown): value is Ingredient {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.keyname === 'string' &&
    Array.isArray(obj.sections) &&
    Array.isArray(obj.tests)
  );
}

/**
 * Type guard for ConfigManifest
 */
export function isConfigManifest(value: unknown): value is ConfigManifest {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.ingredientRefs)
  );
}

/**
 * Type guard for LegacyConfig
 */
export function isLegacyConfig(value: unknown): value is LegacyConfig {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  
  return (
    typeof obj.KEYNAME === 'string' &&
    !obj.id && // New format has 'id', legacy has 'KEYNAME'
    !obj.keyname // New format has 'keyname'
  );
}

/**
 * Type guard for IngredientReference
 */
export function isIngredientReference(value: unknown): value is IngredientReference {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  
  return typeof obj.ingredientId === 'string';
}

/**
 * Type guard for PopulationVariant
 */
export function isPopulationVariant(value: unknown): value is PopulationVariant {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  
  return (
    typeof obj.populationType === 'string' &&
    obj.overrides && typeof obj.overrides === 'object'
  );
}

/**
 * Type guard for Section
 */
export function isSection(value: unknown): value is Section {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  
  return (
    typeof obj.id === 'string' &&
    (obj.type === 'html' || obj.type === 'javascript') &&
    typeof obj.content === 'string' &&
    typeof obj.order === 'number'
  );
}

/**
 * Type guard for TestCase
 */
export function isTestCase(value: unknown): value is TestCase {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as any;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    obj.variables && typeof obj.variables === 'object'
  );
}