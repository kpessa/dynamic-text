// Ingredient categories for filtering and grouping
export const CATEGORIES = [
  'ALL',
  'BASIC_PARAMETERS',
  'MACRONUTRIENTS',
  'ELECTROLYTES',
  'ADDITIVES',
  'PREFERENCES',
  'CALCULATED_VOLUMES',
  'CLINICAL_CALCULATIONS',
  'WEIGHT_CALCULATIONS',
  'OTHER'
] as const;

export type Category = typeof CATEGORIES[number];

// Population type display names
export const POPULATION_TYPE_NAMES: Record<string, string> = {
  'neonatal': 'Neonatal',
  'pediatric': 'Child',
  'adolescent': 'Adolescent',
  'adult': 'Adult',
  // Handle legacy values from Firebase
  'child': 'Child'
} as const;

// Population type colors - using medical semantic colors
export const POPULATION_TYPE_COLORS: Record<string, string> = {
  'neonatal': 'var(--color-danger-600)',    // Most sensitive population - critical red
  'pediatric': 'var(--color-info-600)',     // Pediatric care - informational blue
  'adolescent': 'var(--color-warning-600)', // Transitional care - cautionary orange
  'adult': 'var(--color-primary-600)',      // Standard adult care - primary blue
  // Handle legacy values from Firebase
  'child': 'var(--color-info-600)'
} as const;

// Category colors for visual distinction
export const CATEGORY_COLORS: Record<string, string> = {
  'BASIC_PARAMETERS': 'var(--color-primary-600)',
  'MACRONUTRIENTS': 'var(--color-success-600)',
  'ELECTROLYTES': 'var(--color-info-600)',
  'ADDITIVES': 'var(--color-warning-600)',
  'PREFERENCES': 'var(--color-secondary-600)',
  'CALCULATED_VOLUMES': 'var(--color-primary-500)',
  'CLINICAL_CALCULATIONS': 'var(--color-danger-600)',
  'WEIGHT_CALCULATIONS': 'var(--color-warning-500)',
  'OTHER': 'var(--color-neutral-600)'
} as const;

// Get category color with fallback
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || 'var(--color-neutral-600)';
}