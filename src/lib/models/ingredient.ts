/**
 * Ingredient Data Model
 * 
 * Core entity representing a single TPN ingredient with its content,
 * tests, and population-specific variants.
 */

import type { Section, TestCase } from './shared';

/**
 * Metadata tracking for ingredient versioning and authorship
 */
export interface IngredientMetadata {
  /** Version number, incremented on each save */
  version: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** User identifier who created/modified */
  author?: string;
  /** Optional tags for categorization */
  tags?: string[];
  /** Optional description */
  description?: string;
}

/**
 * Population-specific variant of an ingredient
 * 
 * @example
 * {
 *   populationType: 'neonatal',
 *   overrides: {
 *     displayName: 'Calcium (Neonatal)',
 *     sections: [...]
 *   }
 * }
 */
export interface PopulationVariant {
  /** Population type: neonatal, pediatric, adolescent, adult */
  populationType: string;
  /** Overrides for this population */
  overrides: {
    /** Override display name */
    displayName?: string;
    /** Override or additional sections */
    sections?: Section[];
    /** Override or additional tests */
    tests?: TestCase[];
    /** Custom metadata for this variant */
    metadata?: Partial<IngredientMetadata>;
  };
}

/**
 * Main Ingredient entity
 * 
 * Represents a complete TPN ingredient with content sections,
 * test cases, and population-specific variants.
 * 
 * @example
 * {
 *   id: "calcium",
 *   keyname: "Calcium",
 *   displayName: "Calcium Gluconate",
 *   category: "Salt",
 *   sections: [...],
 *   tests: [...],
 *   variants: Map { "neonatal" => {...} }
 * }
 */
export interface Ingredient {
  /** Unique identifier (e.g., "calcium") */
  id: string;
  
  /** Original KEYNAME from legacy config */
  keyname: string;
  
  /** Display name for UI (optional, defaults to keyname) */
  displayName?: string;
  
  /** Category/type (e.g., "Salt", "Vitamin", "Trace Element") */
  category?: string;
  
  /** Direct storage of content sections */
  sections: Section[];
  
  /** Direct storage of test cases */
  tests: TestCase[];
  
  /** Population-specific variants */
  variants?: Map<string, PopulationVariant>;
  
  /** Metadata for versioning and tracking */
  metadata?: IngredientMetadata;
  
  /** Legacy compatibility fields */
  legacy?: {
    /** Original TYPE field */
    TYPE?: string;
    /** Original DISPLAY field */
    DISPLAY?: string;
    /** Any other legacy fields */
    [key: string]: any;
  };
}