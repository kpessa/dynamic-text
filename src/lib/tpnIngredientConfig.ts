import neonatalData from '../../cert-west-neonatal.json';
import type { IngredientConfig, IngredientDisplay, NoteItem, ReferenceRange } from './types.js';

/**
 * TPN Ingredient Configuration System
 * Provides ingredient metadata including reference ranges, notes, and display settings
 */

// Create a map of ingredients by keyname for quick lookup
const ingredientMap = new Map<string, IngredientConfig>();

// Type guard for ingredient data structure
interface NeonatalIngredient {
  KEYNAME?: string;
  DISPLAY?: string;
  UOM_DISP?: string;
  PRECISION?: number;
  NOTE?: NoteItem[];
  REFERENCE_RANGE?: ReferenceRange[];
  UNITS?: string;
  MIN?: number;
  MAX?: number;
  DEFAULT?: number;
  CATEGORY?: string;
  EDITMODE?: string;
}

// Type guard for neonatal data
interface NeonatalData {
  INGREDIENT?: NeonatalIngredient[];
}

// Initialize from neonatal data
if ((neonatalData as NeonatalData)?.INGREDIENT) {
  (neonatalData as NeonatalData).INGREDIENT!.forEach(ingredient => {
    if (ingredient.KEYNAME) {
      ingredientMap.set(ingredient.KEYNAME, ingredient as IngredientConfig);
    }
  });
}

// Default configurations for common ingredients not in JSON
const defaultConfigs: Record<string, IngredientConfig> = {
  DoseWeightKG: {
    KEYNAME: 'DoseWeightKG',
    DISPLAY: 'Dose Weight',
    UOM_DISP: 'kg',
    PRECISION: 1,
    NOTE: [
      { TEXT: 'The patient weight used for dosing calculations.' },
      { TEXT: 'Use actual body weight unless otherwise specified.' }
    ],
    REFERENCE_RANGE: [
      { THRESHOLD: 'Feasible Low', VALUE: 0.5 },
      { THRESHOLD: 'Feasible High', VALUE: 250 }
    ]
  },
  VolumePerKG: {
    KEYNAME: 'VolumePerKG',
    DISPLAY: 'Volume per kg',
    UOM_DISP: 'mL/kg/day',
    PRECISION: 1,
    NOTE: [
      { TEXT: 'Total daily fluid requirement per kilogram of body weight.' },
      { TEXT: 'Adult: 25-35 mL/kg/day' },
      { TEXT: 'Pediatric: 100-150 mL/kg/day' }
    ],
    REFERENCE_RANGE: [
      { THRESHOLD: 'Normal Low', VALUE: 20 },
      { THRESHOLD: 'Normal High', VALUE: 150 },
      { THRESHOLD: 'Critical High', VALUE: 200 },
      { THRESHOLD: 'Feasible High', VALUE: 300 }
    ]
  },
  MultiVitamin: {
    KEYNAME: 'MultiVitamin',
    DISPLAY: 'Multivitamin',
    UOM_DISP: 'mL/day',
    PRECISION: 2,
    NOTE: [
      { TEXT: 'Provides essential vitamins for metabolic processes.' },
      { TEXT: '[f(me.getValue("MultiVitamin") === 0 ? "<strong style=\\"color: red;\\">Consider adding multivitamin</strong>" : "Standard dose: " + me.maxP(5 / me.getValue("DoseWeightKG"), 3) + " mL/kg/day (max 5 mL/day)")]' }
    ],
    REFERENCE_RANGE: [
      { THRESHOLD: 'Normal High', VALUE: 5 },
      { THRESHOLD: 'Feasible High', VALUE: 10 }
    ]
  },
  IVAdminSite: {
    KEYNAME: 'IVAdminSite',
    DISPLAY: 'Administration Site',
    UOM_DISP: '',
    PRECISION: 0,
    NOTE: [
      { TEXT: 'Route of TPN administration.' },
      { TEXT: 'Peripheral: Osmolarity must be < 800 mOsm/L' },
      { TEXT: 'Central: No osmolarity restriction' }
    ],
    REFERENCE_RANGE: []
  },
  InfuseOver: {
    KEYNAME: 'InfuseOver',
    DISPLAY: 'Infuse Over',
    UOM_DISP: 'hours',
    PRECISION: 0,
    NOTE: [
      { TEXT: 'Duration of TPN infusion.' },
      { TEXT: 'Standard: 24 hours (continuous)' },
      { TEXT: 'Cyclic: 12-20 hours' }
    ],
    REFERENCE_RANGE: [
      { THRESHOLD: 'Normal Low', VALUE: 8 },
      { THRESHOLD: 'Normal High', VALUE: 24 }
    ]
  }
};

/**
 * Get ingredient configuration by keyname
 */
export function getIngredientConfig(keyname: string): IngredientConfig {
  // Check JSON data first
  if (ingredientMap.has(keyname)) {
    return ingredientMap.get(keyname)!;
  }
  
  // Check defaults
  if (defaultConfigs[keyname]) {
    return defaultConfigs[keyname]!;
  }
  
  // Return minimal config for unknown ingredients
  return {
    KEYNAME: keyname,
    DISPLAY: keyname,
    UOM_DISP: '',
    PRECISION: 2,
    NOTE: [],
    REFERENCE_RANGE: []
  };
}

/**
 * Get all available ingredient configurations
 */
export function getAllIngredientConfigs(): Map<string, IngredientConfig> {
  const allConfigs = new Map<string, IngredientConfig>();
  
  // Add JSON data
  ingredientMap.forEach((value, key) => {
    allConfigs.set(key, value);
  });
  
  // Add defaults that aren't in JSON
  Object.entries(defaultConfigs).forEach(([key, value]) => {
    if (!allConfigs.has(key)) {
      allConfigs.set(key, value);
    }
  });
  
  return allConfigs;
}

/**
 * Check if an ingredient has reference ranges
 */
export function hasReferenceRanges(keyname: string): boolean {
  const config = getIngredientConfig(keyname);
  return config.REFERENCE_RANGE && config.REFERENCE_RANGE.length > 0;
}

/**
 * Get ingredient notes as formatted HTML
 */
export function getIngredientNotes(keyname: string): string {
  const config = getIngredientConfig(keyname);
  if (!config.NOTE || config.NOTE.length === 0) {
    return '<em>No additional information</em>';
  }
  
  return config.NOTE
    .map(note => note.TEXT || '')
    .filter(text => text.length > 0)
    .join('<br>');
}

/**
 * Process dynamic note text
 */
export function processDynamicNote(noteText: string, meObject: any): string {
  // Check if this is a dynamic note with [f(...)]
  const dynamicMatch = noteText.match(/\[f\(([\s\S]*)\)\]/);
  
  if (dynamicMatch && meObject) {
    try {
      // Extract the code and handle escaped quotes
      let code = dynamicMatch[1]!;
      
      // Replace escaped quotes with regular quotes for evaluation
      // This handles cases like style=\\"color: red;\\"
      code = code.replace(/\\"/g, '"');
      
      // Wrap in proper function context if it doesn't have return
      const funcBody = code.includes('return') ? code : `return (${code})`;
      
      // Create and execute function
      const func = new Function('me', funcBody);
      const result = func(meObject);
      
      // Ensure we return a string
      return result !== undefined && result !== null ? String(result) : '';
    } catch (error) {
      console.error('Error evaluating dynamic note:', error);
      return `<span style="color: red;">Error: ${(error as Error).message}</span>`;
    }
  }
  
  return noteText;
}

/**
 * Get ingredient display information
 */
export function getIngredientDisplay(keyname: string): IngredientDisplay {
  const config = getIngredientConfig(keyname);
  return {
    name: config.DISPLAY || keyname,
    unit: config.UOM_DISP || '',
    precision: config.PRECISION || 2,
    editMode: config.EDITMODE || 'Custom'
  };
}
