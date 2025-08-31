/**
 * Config Manifest Data Model
 * 
 * Represents a complete TPN configuration that references ingredients
 * and provides settings for a specific health system or population.
 */

import type { Section, TestCase } from './shared';

/**
 * Source tracking for imported configurations
 * 
 * @example
 * {
 *   path: 'refs/child-build-main-choc.json',
 *   importedAt: '2024-01-01T00:00:00Z',
 *   sha256: 'abc123...'
 * }
 */
export interface ConfigSource {
  /** Original file path or URL */
  path: string;
  
  /** ISO timestamp of import */
  importedAt: string;
  
  /** SHA256 hash of original content */
  sha256?: string;
  
  /** Original format type */
  originalFormat?: 'legacy' | 'v2' | 'flex';
  
  /** Import metadata */
  metadata?: Record<string, any>;
}

/**
 * Configuration settings (FLEX-like values)
 * 
 * @example
 * {
 *   flexEnabled: true,
 *   defaultPopulation: 'pediatric',
 *   customSettings: { theme: 'dark' }
 * }
 */
export interface ConfigSettings {
  /** Whether FLEX mode is enabled */
  flexEnabled?: boolean;
  
  /** Default population type */
  defaultPopulation?: string;
  
  /** Maximum values configuration */
  maxValues?: Record<string, number>;
  
  /** Minimum values configuration */
  minValues?: Record<string, number>;
  
  /** Default values */
  defaults?: Record<string, any>;
  
  /** Custom application settings */
  customSettings?: Record<string, any>;
}

/**
 * Reference to an ingredient with optional overrides
 * 
 * @example
 * {
 *   ingredientId: 'calcium',
 *   overrides: {
 *     displayName: 'Custom Calcium Name',
 *     sections: [...]
 *   }
 * }
 */
export interface IngredientReference {
  /** ID of the referenced ingredient */
  ingredientId: string;
  
  /** Optional overrides for this specific config */
  overrides?: {
    /** Override display name */
    displayName?: string;
    
    /** Override or additional sections */
    sections?: Section[];
    
    /** Override or additional tests */
    tests?: TestCase[];
    
    /** Custom metadata */
    metadata?: Record<string, any>;
  } | null;
  
  /** Position in the config */
  order?: number;
  
  /** Whether this ingredient is enabled */
  enabled?: boolean;
}

/**
 * Main Config Manifest entity
 * 
 * Represents a complete TPN configuration that references
 * shared ingredients and provides system-specific settings.
 * 
 * @example
 * {
 *   id: 'choc-pediatric-tpn',
 *   name: 'CHOC Pediatric TPN',
 *   source: { path: 'refs/config.json', ... },
 *   ingredientRefs: [
 *     { ingredientId: 'calcium', overrides: null },
 *     { ingredientId: 'phosphate', overrides: {...} }
 *   ],
 *   settings: { flexEnabled: true }
 * }
 */
export interface ConfigManifest {
  /** Unique configuration identifier */
  id: string;
  
  /** Display name for the configuration */
  name: string;
  
  /** Source tracking information */
  source?: ConfigSource;
  
  /** References to ingredients */
  ingredientRefs: IngredientReference[];
  
  /** Configuration settings */
  settings?: ConfigSettings;
  
  /** Configuration metadata */
  metadata?: {
    /** Version number */
    version?: number;
    /** Creation timestamp */
    createdAt?: string;
    /** Last update timestamp */
    updatedAt?: string;
    /** Author/system */
    author?: string;
    /** Description */
    description?: string;
    /** Tags for categorization */
    tags?: string[];
  };
  
  /** Health system identifier */
  healthSystem?: string;
  
  /** Target population types */
  populations?: string[];
}