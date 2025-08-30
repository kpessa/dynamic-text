import { POPULATION_TYPES } from '../firebaseDataService';

/**
 * Get color for a population type
 * @param populationType - Population type string
 * @returns Hex color code
 */
export function getPopulationColor(populationType: string): string {
  const colors: Record<string, string> = {
    [POPULATION_TYPES.NEONATAL]: '#ff6b6b',
    [POPULATION_TYPES.PEDIATRIC]: '#4ecdc4',
    [POPULATION_TYPES.ADOLESCENT]: '#45b7d1',
    [POPULATION_TYPES.ADULT]: '#5f27cd',
    // Handle legacy values from Firebase
    'pediatric': '#4ecdc4',
    'child': '#4ecdc4',
    'neonatal': '#ff6b6b',
    'adolescent': '#45b7d1',
    'adult': '#5f27cd'
  };
  return colors[populationType] || '#666';
}

/**
 * Get display name for a population type
 * @param populationType - Population type string
 * @returns Display name
 */
export function getPopulationName(populationType: string): string {
  const names: Record<string, string> = {
    [POPULATION_TYPES.NEONATAL]: 'Neonatal',
    [POPULATION_TYPES.PEDIATRIC]: 'Child',
    [POPULATION_TYPES.ADOLESCENT]: 'Adolescent',
    [POPULATION_TYPES.ADULT]: 'Adult',
    // Handle legacy values from Firebase
    'pediatric': 'Child',
    'child': 'Child',
    'neonatal': 'Neonatal',
    'adolescent': 'Adolescent',
    'adult': 'Adult'
  };
  return names[populationType] || populationType;
}