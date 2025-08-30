import { getKeyCategory } from '../tpnLegacy.js';

export function getIngredientBadgeColor(key: string): string {
  const category = getKeyCategory(key);
  const colors: Record<string, string> = {
    'BASIC_PARAMETERS': '#007bff',
    'MACRONUTRIENTS': '#28a745',
    'ELECTROLYTES': '#ffc107',
    'ADDITIVES': '#6c757d',
    'PREFERENCES': '#17a2b8',
    'CALCULATED_VOLUMES': '#e83e8c',
    'CLINICAL_CALCULATIONS': '#fd7e14',
    'WEIGHT_CALCULATIONS': '#6f42c1',
    'OTHER': '#333'
  };
  return colors[category] || colors.OTHER;
}