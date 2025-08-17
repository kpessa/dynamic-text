// Population type color mappings for UI consistency

export type PopulationType = 'Neonatal' | 'Pediatric' | 'Adolescent' | 'Adult';

export const populationColors: Record<PopulationType, string> = {
  Neonatal: '#e6f3ff',
  Pediatric: '#fff3e6', 
  Adolescent: '#f3e6ff',
  Adult: '#e6ffe6'
};

export function getPopulationColor(populationType: string): string {
  return populationColors[populationType as PopulationType] || '#f0f0f0';
}

export function getPopulationTextColor(populationType: string): string {
  // Return dark text colors for better contrast on light backgrounds
  const textColors: Record<PopulationType, string> = {
    Neonatal: '#0066cc',
    Pediatric: '#cc6600',
    Adolescent: '#6600cc',
    Adult: '#00cc00'
  };
  return textColors[populationType as PopulationType] || '#666666';
}