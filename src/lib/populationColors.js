// Population type color mappings for UI consistency
export const populationColors = {
  Neonatal: '#e6f3ff',
  Pediatric: '#fff3e6', 
  Adolescent: '#f3e6ff',
  Adult: '#e6ffe6'
};

export function getPopulationColor(populationType) {
  return populationColors[populationType] || '#f0f0f0';
}

export function getPopulationTextColor(populationType) {
  // Return dark text colors for better contrast on light backgrounds
  const textColors = {
    Neonatal: '#0066cc',
    Pediatric: '#cc6600',
    Adolescent: '#6600cc',
    Adult: '#00cc00'
  };
  return textColors[populationType] || '#666666';
}