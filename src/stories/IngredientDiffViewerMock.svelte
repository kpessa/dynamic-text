<script>
  import IngredientDiffViewer from '../lib/IngredientDiffViewer.svelte';
  
  let {
    ingredient = null,
    healthSystem = null,
    onClose = () => {},
    mockData = null
  } = $props();
  
  // Create comprehensive mock data if not provided
  const defaultMockData = {
    neonatal: [
      {
        id: 'ref-neo-1',
        ingredientId: ingredient?.id || 'test-001',
        populationType: 'neonatal',
        healthSystem: 'CHOC',
        domain: 'Clinical',
        subdomain: 'Nutrition',
        version: 1,
        sections: [
          {
            id: 1,
            type: 'static',
            content: '<h3>Neonatal Guidelines</h3><p>For premature infants, requirements are higher to support rapid growth.</p><p>Starting dose: 1.5-2.0 units/kg/day</p>'
          },
          {
            id: 2,
            type: 'dynamic',
            content: `
const weight = me.getValue('weight') || 1.5;
const age = me.getValue('age') || 1;

if (age < 7) {
  return "Initial: 1.5-2.0 units/kg/day";
} else if (age < 28) {
  return "Advance to: 3.0-3.5 units/kg/day";
} else {
  return "Maintenance: 2.5-3.0 units/kg/day";
}`,
            testCases: [
              { name: 'Default', variables: { weight: 1.2, age: 1 } }
            ]
          },
          {
            id: 3,
            type: 'static',
            content: '<p><strong>Monitoring:</strong> Check levels weekly. Adjust based on growth velocity.</p>'
          }
        ]
      },
      {
        id: 'ref-neo-2',
        ingredientId: ingredient?.id || 'test-001',
        populationType: 'neonatal',
        healthSystem: 'Stanford',
        domain: 'Clinical',
        subdomain: 'Nutrition',
        version: 2,
        sections: [
          {
            id: 1,
            type: 'static',
            content: '<h3>Neonatal Protocol - Updated</h3><p>Stanford protocol for supplementation in NICU patients.</p><p>Enhanced monitoring guidelines included.</p>'
          },
          {
            id: 2,
            type: 'dynamic',
            content: `
const weight = me.getValue('weight') || 1.5;
const gestationalAge = me.getValue('gestationalAge') || 28;

if (gestationalAge < 28) {
  return "ELBW: Start 2.0 units/kg/day, advance by 0.5 daily";
} else if (gestationalAge < 32) {
  return "VLBW: Start 1.5 units/kg/day, advance to 3.5";
} else {
  return "Standard: 2.0-3.0 units/kg/day";
}`,
            testCases: [
              { name: 'Default', variables: { weight: 0.8, gestationalAge: 25 } }
            ]
          },
          {
            id: 3,
            type: 'static',
            content: '<p><strong>2024 Update:</strong> Higher targets for growth restriction. Monitor closely.</p>'
          }
        ]
      }
    ],
    pediatric: [
      {
        id: 'ref-ped-1',
        ingredientId: ingredient?.id || 'test-001',
        populationType: 'pediatric',
        healthSystem: 'CHOC',
        domain: 'Clinical',
        subdomain: 'Nutrition',
        version: 1,
        sections: [
          {
            id: 1,
            type: 'static',
            content: '<h3>Pediatric Guidelines</h3><p>Age-appropriate requirements for pediatric patients.</p>'
          },
          {
            id: 2,
            type: 'dynamic',
            content: `
const age = me.getValue('age') || 5;
if (age < 1) {
  return "Infant: 2.0-2.5 units/kg/day";
} else if (age < 3) {
  return "Toddler: 1.5-2.0 units/kg/day";
} else if (age < 10) {
  return "Child: 1.0-1.5 units/kg/day";
} else {
  return "Pre-teen: 0.9-1.2 units/kg/day";
}`,
            testCases: [
              { name: 'Default', variables: { age: 5, weight: 20 } }
            ]
          }
        ]
      },
      {
        id: 'ref-ped-2',
        ingredientId: ingredient?.id || 'test-001',
        populationType: 'pediatric',
        healthSystem: 'CHOC',
        domain: 'Clinical', 
        subdomain: 'Nutrition',
        version: 2,
        sections: [
          {
            id: 1,
            type: 'static',
            content: '<h3>Pediatric Guidelines - Revised</h3><p>Updated based on latest ASPEN guidelines.</p>'
          },
          {
            id: 2,
            type: 'dynamic',
            content: `
const age = me.getValue('age') || 5;
const criticallyIll = me.getValue('criticallyIll') || false;

let base;
if (age < 1) {
  base = "2.0-3.0 units/kg/day";
} else if (age < 3) {
  base = "1.5-2.5 units/kg/day";
} else {
  base = "1.0-2.0 units/kg/day";
}

if (criticallyIll) {
  return base + " (Increase 20% for critical illness)";
}
return base;`,
            testCases: [
              { name: 'Default', variables: { age: 5, weight: 20, criticallyIll: false } }
            ]
          }
        ]
      }
    ],
    adolescent: [
      {
        id: 'ref-ado-1',
        ingredientId: ingredient?.id || 'test-001',
        populationType: 'adolescent',
        healthSystem: 'CHOC',
        domain: 'Clinical',
        subdomain: 'Nutrition',
        version: 1,
        sections: [
          {
            id: 1,
            type: 'static',
            content: '<h3>Adolescent Guidelines</h3><p>Requirements during adolescent growth spurt.</p><p>Standard: 0.8-1.2 units/kg/day</p><p>Athletes: 1.2-1.7 units/kg/day</p>'
          }
        ]
      }
    ],
    adult: [
      {
        id: 'ref-adult-1',
        ingredientId: ingredient?.id || 'test-001',
        populationType: 'adult',
        healthSystem: 'CHOC',
        domain: 'Clinical',
        subdomain: 'Nutrition',
        version: 1,
        sections: [
          {
            id: 1,
            type: 'static',
            content: '<h3>Adult Guidelines</h3><p>Standard adult requirements.</p><p>Healthy: 0.8 units/kg/day</p><p>Elderly: 1.0-1.2 units/kg/day</p>'
          }
        ]
      }
    ]
  };
  
  const referencesToUse = mockData || defaultMockData;
  
  // Mock the referenceService module
  import { referenceService } from '../lib/firebaseDataService.js';
  
  // Override the getReferencesForComparison method
  referenceService.getReferencesForComparison = async (ingredientId, healthSystem) => {
    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Filter by health system if provided
    if (healthSystem) {
      const filtered = {};
      Object.entries(referencesToUse).forEach(([popType, refs]) => {
        filtered[popType] = refs.filter(ref => ref.healthSystem === healthSystem);
      });
      return filtered;
    }
    
    return referencesToUse;
  };
</script>

<IngredientDiffViewer 
  {ingredient}
  {healthSystem}
  {onClose}
/>