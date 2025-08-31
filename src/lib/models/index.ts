/**
 * Data Models Export Barrel
 * 
 * Central export point for all TypeScript interfaces and types
 * for the ingredient-first data model architecture.
 */

// Core models
export type {
  Ingredient,
  IngredientMetadata,
  PopulationVariant
} from './ingredient';

export type {
  ConfigManifest,
  ConfigSource,
  ConfigSettings,
  IngredientReference
} from './config';

export type {
  Section,
  TestCase
} from './shared';

// Transformation utilities
export type {
  TransformationResult,
  MigrationOptions,
  DeduplicationResult,
  IngredientComparison,
  LegacyConfig
} from './transformations';

// Type guards
export {
  isIngredient,
  isConfigManifest,
  isLegacyConfig,
  isIngredientReference,
  isPopulationVariant,
  isSection,
  isTestCase
} from './transformations';

// Backward compatibility
export type {
  LegacySection,
  LegacyIngredient,
  OldIngredient,
  OldSection
} from './compatibility';

export {
  isOldIngredientFormat,
  isOldSectionFormat
} from './compatibility';