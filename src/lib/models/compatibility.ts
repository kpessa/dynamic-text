/**
 * Backward Compatibility Type Aliases
 * 
 * This file ensures existing code continues to work while migrating
 * to the new ingredient-first data model.
 */

import type { Section as LegacySection } from '../types';
import type { Ingredient as LegacyIngredient } from '../../types/index';

// Export legacy types with "Legacy" prefix to avoid conflicts
export type { LegacySection, LegacyIngredient };

// Type alias for existing code that expects the old Ingredient type
export type OldIngredient = LegacyIngredient;

// Type alias for existing code that expects the old Section type
export type OldSection = LegacySection;

/**
 * Migration helper to detect if object is using old format
 */
export function isOldIngredientFormat(obj: any): boolean {
  return obj && typeof obj === 'object' && 
    'name' in obj && 
    !('keyname' in obj) &&
    !('KEYNAME' in obj);
}

/**
 * Migration helper to detect if object is using old section format
 */
export function isOldSectionFormat(obj: any): boolean {
  return obj && typeof obj === 'object' &&
    'type' in obj &&
    (obj.type === 'static' || obj.type === 'dynamic') &&
    typeof obj.id === 'number';
}