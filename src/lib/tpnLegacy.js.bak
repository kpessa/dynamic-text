/**
 * TPN Legacy Support Module
 * Provides legacy TPN Advisor functions for dynamic text
 */

// Helper function to normalize key names to canonical form
function getCanonicalKey(key) {
  // Map legacy aliases to their canonical form
  if (key === 'DoseWeightKg') return 'DoseWeightKG';
  if (key === 'Volume') return 'VolumePerKG';
  
  // Handle common case variations
  if (key.toLowerCase() === 'doseweightkg') return 'DoseWeightKG';
  if (key.toLowerCase() === 'volumeperkg') return 'VolumePerKG';
  if (key.toLowerCase() === 'totalvolume') return 'TotalVolume';
  if (key.toLowerCase() === 'nonlipidvolume') return 'NonLipidVolume';
  if (key.toLowerCase() === 'lipidvoltotal') return 'LipidVolTotal';
  if (key.toLowerCase() === 'fat') return 'Fat';
  
  return key;
}

class TPNLegacySupport {
  constructor() {
    this.id = 'tpn_' + Math.random().toString(36).substr(2, 9);
    this.EditMode = 'Compound';
    this.renderComplete = true;
    this.weight = { ideal: 50, actual: 70, obese: 60 };
    this.values = {}; // Store current values (only input values, not calculated)
    this._version = 0; // Version counter to force reactivity
    this.data = {
      RREC: {
        INGREDIENT_map: {},
        META: {
          PERIPHERAL_OSMOLARITY_MAXIMUM: 800
        }
      }
    };
  }

  /**
   * Set a value (for testing)
   */
  setValue(key, value) {
    this.values[key] = value;
    // Trigger recalculation
    this.draw();
  }

  /**
   * Get multiple values at once
   */
  setValues(valueMap) {
    // First, clear any existing calculated values to ensure they're recalculated
    const calculatedKeys = ['TotalVolume', 'NonLipidVolume', 'NonLipidVolTotal', 'LipidVolTotal', 'DexPercent', 'OsmoValue'];
    calculatedKeys.forEach(key => {
      delete this.values[key];
    });
    
    // Normalize keys to canonical form when storing
    const normalizedValues = {};
    for (const [key, value] of Object.entries(valueMap)) {
      const canonicalKey = getCanonicalKey(key);
      // Only store non-calculated values
      if (!calculatedKeys.includes(canonicalKey)) {
        normalizedValues[canonicalKey] = value;
      }
    }
    Object.assign(this.values, normalizedValues);
    this._version++; // Increment version to force reactivity
    this.draw();
  }

  /**
   * Main object getter - returns element wrapper
   */
  getObject(selector) {
    // In test mode, return a mock wrapper that uses stored values
    return new LegacyElementWrapper(selector, this.values);
  }

  /**
   * Get computed/calculated values
   */
  getValue(key) {
    // Map legacy aliases first
    const canonicalKey = getCanonicalKey(key);
    
    // Check if we have a stored value first
    if (this.values[canonicalKey] !== undefined) {
      return this.values[canonicalKey];
    }
    
    // For backwards compatibility, also check the original key
    if (this.values[key] !== undefined) {
      return this.values[key];
    }
    
    // Also check for case-insensitive match in values
    const lowerKey = key.toLowerCase();
    for (const [storedKey, value] of Object.entries(this.values)) {
      if (storedKey.toLowerCase() === lowerKey) {
        return value;
      }
    }

    switch (canonicalKey) {
      case 'DoseWeightKG':
        return this.values.DoseWeightKG || 0;
      
      case 'VolumePerKG':
        return this.values.VolumePerKG || 0;
      
      case 'TotalVolume': {
        const volPerKgCalc = this.getValue('VolumePerKG');
        const doseWeightCalc = this.getValue('DoseWeightKG');
        return volPerKgCalc * doseWeightCalc;
      }
      
      case 'NonLipidVolume':
      case 'NonLipidVolTotal': {
        const totalVolCalc = this.getValue('TotalVolume');
        const lipidVolCalc = this.getValue('LipidVolTotal');
        return totalVolCalc - lipidVolCalc;
      }
      
      case 'LipidVolTotal': {
        const fatGPerKg = this.getValue('Fat');
        const doseWeight = this.getValue('DoseWeightKG');
        const fatConc = this.getValue('prefFatConcentration') || 0.2;
        return (fatGPerKg * doseWeight) / fatConc;
      }
      
      case 'InfuseOver':
        return this.values.InfuseOver || 24;
      
      case 'LipidInfuseOver':
        return this.values.LipidInfuseOver || 24;
      
      case 'admixture':
        if (this.EditMode === 'Standard') {
          return '3:1';
        } else {
          return this.values.admixturecheckbox ? '2:1' : '3:1';
        }
      
      case 'IVAdminSite':
        return this.values.IVAdminSite || 'Central';
      
      case 'DexPercent':
        return this.dexpcnt || 0;
      
      case 'PeripheralOsmoMax':
        return this.data.RREC.META.PERIPHERAL_OSMOLARITY_MAXIMUM || 800;
      
      case 'OsmoValue': {
        // Simplified osmolarity calculation
        const dexPercent = this.getValue('DexPercent');
        const protein = this.getValue('Protein');
        const doseWt = this.getValue('DoseWeightKG');
        const volume = this.getValue('NonLipidVolTotal');
        
        if (volume <= 0) return 0;
        
        // Basic osmolarity formula
        const dexOsmo = dexPercent * 50; // 50 mOsm per % dextrose
        const proteinOsmo = (protein * doseWt / volume) * 100; // Simplified
        
        return Math.round(dexOsmo + proteinOsmo);
      }
      
      case 'prefKNa':
        return this.values.prefKNa || 'Potassium';
      
      case 'ratioCLAc':
        return this.values.ratioCLAc || '1ac:1ch';
      
      case 'prefFatConcentration':
        return this.values.prefFatConcentration || 0.2;
      
      case 'prefProteinConcentration':
        return this.values.prefProteinConcentration || 0.1;
      
      case 'prefFatText': {
        const fatConcentration = this.getValue('prefFatConcentration');
        return (fatConcentration * 100) + '%';
      }
      
      case 'prefProteinText': {
        const proteinConcentration = this.getValue('prefProteinConcentration');
        return (proteinConcentration * 100) + '%';
      }
      
      // Weight calculations
      case 'wtIdeal':
        return this.weight.ideal;
      case 'wtActual':
        return this.weight.actual;
      case 'wtObese':
        return this.weight.obese;
      
      case 'gender':
        return this.values.gender || 'Male';
      
      // Standard ingredient values - return 0 if not set
      default:
        return this.values[key] || 0;
    }
  }

  /**
   * Number formatting with precision
   */
  maxP(n, p) {
    if (typeof n !== 'number') return n;
    
    let rv = n.toFixed(p || 2);
    
    if (rv.includes('.')) {
      rv = rv.replace(/\.?0+$/, '').replace(/\.$/, '');
    }
    
    return rv;
  }

  /**
   * Preference getter with defaults
   */
  pref(key, defaultValue) {
    const preferences = {
      'ADVISOR_TITLE': 'TPN Advisor',
      'WEIGHT_REQUIRED_TEXT': 'Dose Weight is required',
      'VOLUME_REQUIRED_TEXT': 'TPN Volume is required',
      'ADMINSITE_BLANK_TEXT': 'Administration Site is required',
      'PRECISION_MINVOL_DISPLAY': '2',
      'PRECISION_MINVOL_BREAKDOWN': '2',
      'PREF_SALT_PHOSPHATE': 'Potassium',
      'ACETATE_CHLORIDE_DEFAULT': '1ac:1ch',
      'ADMIXTURE_DEFAULT': '3:1',
      'ORDERSTART_DEFAULT': '2100',
      'TPNINFUSEOVER_DEFAULT': '24',
      'LIPIDINFUSEOVER_DEFAULT': '24'
    };
    
    return preferences[key] || defaultValue;
  }

  /**
   * Electrolyte to Salt conversion (simplified)
   */
  EtoS() {
    const K = this.getValue('Potassium');
    const Na = this.getValue('Sodium');
    const Ca = this.getValue('Calcium');
    const Mg = this.getValue('Magnesium');
    const Phos = this.getValue('Phosphate');
    const CL = this.getValue('Chloride');
    const Ac = this.getValue('Acetate');

    return {
      SodiumChloride: 0,
      SodiumAcetate: 0,
      SodiumPhosphate: 0,
      PotassiumChloride: 0,
      PotassiumAcetate: 0,
      PotassiumPhosphate: 0,
      CalciumGluconate: Ca,
      MagnesiumSulfate: Mg,
      Chloride: CL,
      Acetate: Ac,
      KorNaPhos: this.getValue('prefKNa'),
      log: [],
      Error: ''
    };
  }

  /**
   * Main calculation function
   */
  draw() {
    const DW_kg = this.getValue('DoseWeightKG');
    const vVolPerKG = this.getValue('VolumePerKG');
    const vTotalVolume = this.getValue('TotalVolume');
    const C_kgd = this.getValue('Carbohydrates');
    const admixture = this.getValue('admixture');
    
    const nonlipidVolTotal = this.getValue('NonLipidVolTotal');
    
    if (admixture === '3:1') {
      this.dexpcnt = vTotalVolume > 0 ? (100 * C_kgd * DW_kg / vTotalVolume) : 0;
    } else {
      this.dexpcnt = nonlipidVolTotal > 0 ? (100 * C_kgd * DW_kg / nonlipidVolTotal) : 0;
    }
    
    // Store calculated values
    this.values.DexPercent = this.dexpcnt;
    this.values.TotalVolume = vTotalVolume;
    this.values.LipidVolTotal = this.getValue('LipidVolTotal');
    this.values.NonLipidVolTotal = nonlipidVolTotal;
    this.values.OsmoValue = this.getValue('OsmoValue');
  }

  /**
   * Dynamic text evaluation
   */
  evaluate(sourceText, context) {
    try {
      const functionPattern = /\[f\(([^]*?)\)\]/g;
      
      return sourceText.replace(functionPattern, (match, code) => {
        try {
          const fnBody = code.includes('return') ? code : `return (${code})`;
          const fn = new Function('me', fnBody);
          const result = fn.call(this, this);
          return result !== undefined ? result : '';
        } catch (err) {
          console.error('Error evaluating dynamic text:', err);
          return `[Error: ${err.message}]`;
        }
      });
    } catch (err) {
      console.error('Error in evaluate:', err);
      return sourceText;
    }
  }
}

/**
 * Mock element wrapper for test mode
 */
class LegacyElementWrapper {
  constructor(selector, values) {
    this.selector = selector;
    this.values = values || {};
    this.length = 1; // Always return as if element exists
  }
  
  val(value) {
    if (value !== undefined) {
      this.values[this.selector] = value;
      return this;
    }
    return this.values[this.selector] || '';
  }
  
  text(value) {
    if (value !== undefined) {
      this.values[this.selector] = value;
      return this;
    }
    return this.values[this.selector] || '';
  }
  
  data(key) {
    // Return mock data attributes
    if (key === 'uom') {
      // Return unit of measurement for certain keys
      if (this.selector.includes('PerKG')) return '/kg/day';
    }
    return undefined;
  }
  
  prop(key, value) {
    if (value !== undefined) {
      if (key === 'checked') {
        this.values[this.selector] = value;
      }
      return this;
    }
    return this.values[this.selector];
  }
  
  is(selector) {
    if (selector === ':checked') {
      return !!this.values[this.selector];
    }
    return false;
  }
  
  find(selector) {
    return new LegacyElementWrapper(this.selector + ' ' + selector, this.values);
  }
  
  addClass(className) {
    return this;
  }
  
  removeClass(className) {
    return this;
  }
  
  closest(selector) {
    return new LegacyElementWrapper(selector, this.values);
  }
}

/**
 * Dependencies for calculated values
 */
export const CALCULATED_VALUE_DEPENDENCIES = {
  'TotalVolume': ['VolumePerKG', 'DoseWeightKG'],
  'NonLipidVolume': ['TotalVolume', 'LipidVolTotal'],
  'NonLipidVolTotal': ['TotalVolume', 'LipidVolTotal'],
  'LipidVolTotal': ['Fat', 'DoseWeightKG', 'prefFatConcentration'],
  'DexPercent': ['Carbohydrates', 'DoseWeightKG', 'TotalVolume', 'NonLipidVolTotal', 'admixture'],
  'OsmoValue': ['DexPercent', 'Protein', 'DoseWeightKG', 'NonLipidVolTotal'],
  'TotalEnergy': ['Protein', 'Carbohydrates', 'Fat'],
  'admixture': ['admixturecheckbox'],
  // Rate calculations
  'NLrate': ['NonLipidVolTotal', 'InfuseOver'],
  'Lrate': ['LipidVolTotal', 'LipidInfuseOver'],
  'TPNrate': ['TotalVolume', 'InfuseOver']
};

/**
 * TPN Valid Keys and Validation
 */
export const TPN_VALID_KEYS = {
  BASIC_PARAMETERS: [
    'DoseWeightKG',
    'VolumePerKG',
    'InfuseOver',
    'LipidInfuseOver',
    'OrderStart',
  ],

  ROUTE: [
    'IVAdminSite',
    'IVAdminSite_Central',
    'IVAdminSite_Peripheral',
  ],

  MACRONUTRIENTS: [
    'Protein',
    'Carbohydrates',
    'Fat',
    'TotalEnergy',
  ],

  ELECTROLYTES: [
    'Potassium',
    'Sodium',
    'Calcium',
    'Magnesium',
    'Phosphate',
    'Chloride',
    'Acetate',
  ],

  SALTS: [
    'SodiumChloride',
    'SodiumAcetate',
    'SodiumPhosphate',
    'PotassiumChloride',
    'PotassiumAcetate',
    'PotassiumPhosphate',
    'CalciumGluconate',
    'MagnesiumSulfate',
  ],

  ADDITIVES: [
    'MultiVitamin',
    'PediatricMultiVitamin',
    'AdultMultiVitamin',
    'NeonatalMultiVitamin',
    'MVI',
    'MVP',
    'TraceElements',
    'Tralement',
    'PedTE',
    'PretermTraceCombo',
    'Trace4',
    'Trace4C',
    'Trace5',
    'Trace5C',
    'ZincSulfate',
    'Selenium',
    'Copper',
    'Chromium',
    'Manganese',
    'Insulin',
    'Heparin',
    'Famotidine',
    'Ranitidine',
    'VitaminK',
    'Levocarnitine',
    'Thiamine',
    'FolicAcid',
    'Multrys',
    'Pyridoxine',
    'AscorbicAcid',
    'Cysteine',
  ],

  PREFERENCES: [
    'prefKNa',
    'ratioCLAc',
    'prefFatConcentration',
    'prefProteinConcentration',
    'prefFatText',
    'prefProteinText',
    'admixturecheckbox',
  ],

  CALCULATED_VOLUMES: [
    'TotalVolume',
    'LipidVolTotal',
    'NonLipidVolTotal',
    'NonLipidVolume',
    'Mix',
    'MixE',
    'Water',
    'TPNVolume',
  ],

  CLINICAL_CALCULATIONS: [
    'DexPercent',
    'OsmoValue',
    'PeripheralOsmoMax',
    'admixture',
  ],

  WEIGHT_CALCULATIONS: [
    'wtIdeal',
    'wtActual',
    'wtObese',
    'gender',
  ],

  ORDER_COMMENTS: [
    'UserOrderComments',
    'LipidOrderComments',
    'OtherAdditives',
  ],

  RADIO_BUTTONS: [
    'rdoChloride',
    'rdoAcetate',
    'rdoChlorideToBal',
    'rdoAcetateToBal',
    'rdoChlorideCustom',
    'rdoAcetateCustom',
  ],

  UI_ELEMENTS: [
    'minvol',
    'minvolinput',
    'prefFat',
    'prefProtein',
  ],

  LEGACY_ALIASES: [
    'DoseWeightKg',
    'Volume',
  ]
};

// Validation functions
export function getAllValidKeys() {
  const allKeys = [];
  Object.values(TPN_VALID_KEYS).forEach(categoryKeys => {
    allKeys.push(...categoryKeys);
  });
  return [...new Set(allKeys)];
}

export function isValidKey(key) {
  const allValidKeys = getAllValidKeys();
  // Check regular keys
  if (allValidKeys.includes(key)) {
    return true;
  }
  // Check legacy aliases
  if (TPN_VALID_KEYS.LEGACY_ALIASES && TPN_VALID_KEYS.LEGACY_ALIASES.includes(key)) {
    return true;
  }
  return false;
}

// Export the getCanonicalKey function defined at the top of the file
export { getCanonicalKey };

export function isCalculatedValue(key) {
  // Use canonical form for checking
  const canonicalKey = getCanonicalKey(key);
  return TPN_VALID_KEYS.CALCULATED_VOLUMES.includes(canonicalKey) ||
         TPN_VALID_KEYS.CLINICAL_CALCULATIONS.includes(canonicalKey) ||
         TPN_VALID_KEYS.WEIGHT_CALCULATIONS.includes(canonicalKey) ||
         canonicalKey === 'TotalEnergy' ||
         ['NLrate', 'Lrate', 'TPNrate'].includes(canonicalKey) ||
         canonicalKey === 'admixture';  // admixture is calculated from admixturecheckbox
}

export function getKeysByCategory(category) {
  return TPN_VALID_KEYS[category] || [];
}

export function getKeyCategory(key) {
  // First check with canonical form
  const canonicalKey = getCanonicalKey(key);
  
  for (const [category, keys] of Object.entries(TPN_VALID_KEYS)) {
    if (keys.includes(canonicalKey) || keys.includes(key)) {
      return category;
    }
  }
  
  // Check for rate calculations
  if (['NLrate', 'Lrate', 'TPNrate'].includes(canonicalKey)) {
    return 'CALCULATED_VOLUMES';
  }
  
  // Check if it's admixture (which is calculated)
  if (canonicalKey === 'admixture') {
    return 'CLINICAL_CALCULATIONS';
  }
  
  // Additional pattern-based categorization for items not in the list
  const keyLower = key.toLowerCase();
  
  // Check for vitamin patterns
  if (keyLower.includes('vitamin') || keyLower.includes('vit')) {
    return 'ADDITIVES';
  }
  
  // Check for trace element patterns
  if (keyLower.includes('trace') || keyLower === 'tralement' || keyLower === 'pedte') {
    return 'ADDITIVES';
  }
  
  // Check for specific additives
  if (['multrys', 'mvi', 'mvp'].includes(keyLower)) {
    return 'ADDITIVES';
  }
  
  // Check for electrolyte patterns
  if (keyLower.includes('chloride') || keyLower.includes('acetate') || 
      keyLower.includes('phosphate') || keyLower.includes('gluconate') || 
      keyLower.includes('sulfate')) {
    return 'ELECTROLYTES';
  }
  
  return null;
}

export function getInputKeys() {
  return [
    ...TPN_VALID_KEYS.BASIC_PARAMETERS,
    ...TPN_VALID_KEYS.MACRONUTRIENTS.filter(k => k !== 'TotalEnergy'),
    ...TPN_VALID_KEYS.ELECTROLYTES,
    ...TPN_VALID_KEYS.ADDITIVES,
    ...TPN_VALID_KEYS.ORDER_COMMENTS
  ];
}

export function getCalculatedKeys() {
  return [
    ...TPN_VALID_KEYS.SALTS,
    ...TPN_VALID_KEYS.CALCULATED_VOLUMES,
    ...TPN_VALID_KEYS.CLINICAL_CALCULATIONS,
    ...TPN_VALID_KEYS.WEIGHT_CALCULATIONS,
    'TotalEnergy'
  ];
}

export function getDefaultValues() {
  return {
    'DoseWeightKG': 70,
    'VolumePerKG': 100,
    'InfuseOver': 24,
    'LipidInfuseOver': 24,
    'OrderStart': 2100,
    
    'Protein': 2.5,
    'Carbohydrates': 15,
    'Fat': 3,
    
    'Potassium': 2,
    'Sodium': 3,
    'Calcium': 0.5,
    'Magnesium': 0.3,
    'Phosphate': 1,
    'Chloride': 0,
    'Acetate': 0,
    
    'prefKNa': 'Potassium',
    'ratioCLAc': '1ac:1ch',
    'prefFatConcentration': 0.2,
    'prefProteinConcentration': 0.1,
    
    'IVAdminSite': 'Central',
    
    // All additives default to 0
    ...Object.fromEntries(TPN_VALID_KEYS.ADDITIVES.map(key => [key, 0]))
  };
}

export function getKeyUnit(key) {
  const units = {
    'DoseWeightKG': 'kg',
    'VolumePerKG': 'mL/kg/day',
    'InfuseOver': 'hours',
    'LipidInfuseOver': 'hours',
    'OrderStart': 'HHMM',
    
    'Protein': 'g/kg/day',
    'Carbohydrates': 'g/kg/day',
    'Fat': 'g/kg/day',
    'TotalEnergy': 'Kcal/kg/day',
    
    'Potassium': 'mEq/kg/day',
    'Sodium': 'mEq/kg/day',
    'Calcium': 'mEq/kg/day',
    'Magnesium': 'mEq/kg/day',
    'Phosphate': 'mmol/kg/day',
    'Chloride': 'mEq/kg/day',
    'Acetate': 'mEq/kg/day',
    
    'TotalVolume': 'mL',
    'LipidVolTotal': 'mL',
    'NonLipidVolTotal': 'mL',
    'DexPercent': '%',
    'OsmoValue': 'mOsm/L',
    
    'MultiVitamin': 'mL/kg/day',
    'TraceElements': 'mL/kg/day',
    'Insulin': 'units/kg/day',
    'Heparin': 'units/mL',
  };
  
  return units[key] || '';
}

/**
 * Extract keys from dynamic text code (with dependencies)
 */
export function extractKeysFromCode(code) {
  const keys = new Set();
  
  // Match me.getValue('key') or me.getValue("key")
  const getValueRegex = /me\.getValue\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = getValueRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Match me.getObject('key') or me.getObject("key") - including chained methods
  const getObjectRegex = /me\.getObject\s*\(\s*['"]([^'"]+)['"]\s*\)(?:\s*\.\s*(?:val|prop|text|data|find|closest))?/g;
  while ((match = getObjectRegex.exec(code)) !== null) {
    const key = match[1];
    // Filter out jQuery-style selectors (IDs, classes, attributes)
    if (!key.startsWith('#') && !key.startsWith('.') && !key.includes('[')) {
      keys.add(key);
    }
  }
  
  // Check for EtoS() which uses electrolytes internally
  if (/me\.EtoS\s*\(\s*\)/.test(code)) {
    ['Potassium', 'Sodium', 'Calcium', 'Magnesium', 'Phosphate'].forEach(key => keys.add(key));
  }
  
  // Check for draw() which might trigger calculations
  if (/me\.draw\s*\(\s*\)/.test(code)) {
    // Common ingredients used in calculations
    ['DoseWeightKG', 'VolumePerKG', 'Carbohydrates', 'Protein', 'Fat'].forEach(key => keys.add(key));
  }
  
  // Extract calculated volume references
  // Look for patterns like: TotalVolume, NonLipidVolTotal, LipidVolTotal, NLvol, Lvol, etc.
  const calculatedVolumeRegex = /\b(TotalVolume|NonLipidVolTotal|NonLipidVolume|LipidVolTotal|NLvol|Lvol|TPNVolume|Mix|MixE|Water)\b/g;
  while ((match = calculatedVolumeRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Extract other calculated values that might be referenced
  const calculatedValueRegex = /\b(DexPercent|OsmoValue|PeripheralOsmoMax)\b/g;
  while ((match = calculatedValueRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Extract admixture references (it's a special case)
  if (/\b(admixture)\b/.test(code)) {
    keys.add('admixture');
  }
  
  // Extract rate calculations that might be referenced
  const rateRegex = /\b(NLrate|Lrate|TPNrate)\b/g;
  while ((match = rateRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Now recursively add dependencies for all calculated values
  const allKeys = Array.from(keys);
  const processedKeys = new Set();
  
  function addDependencies(key) {
    if (processedKeys.has(key)) return;
    processedKeys.add(key);
    
    const canonicalKey = getCanonicalKey(key);
    
    // If this is a calculated value, add its dependencies
    if (CALCULATED_VALUE_DEPENDENCIES[canonicalKey]) {
      CALCULATED_VALUE_DEPENDENCIES[canonicalKey].forEach(dep => {
        keys.add(dep);
        addDependencies(dep); // Recursive call
      });
    }
  }
  
  // Process all initially found keys
  allKeys.forEach(key => addDependencies(key));
  
  // Convert all keys to canonical form
  const canonicalKeys = Array.from(keys).map(key => getCanonicalKey(key));
  
  return [...new Set(canonicalKeys)]; // Remove duplicates
}

/**
 * Extract only directly referenced keys from dynamic text code (no dependencies)
 */
export function extractDirectKeysFromCode(code) {
  const keys = new Set();
  
  // Match me.getValue('key') or me.getValue("key")
  const getValueRegex = /me\.getValue\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = getValueRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Match me.getObject('key') or me.getObject("key") - including chained methods
  const getObjectRegex = /me\.getObject\s*\(\s*['"]([^'"]+)['"]\s*\)(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*\(\))?/g;
  while ((match = getObjectRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Match direct template literal usage like ${TotalVolume} or ${BSA}
  const templateRegex = /\$\{([A-Za-z_$][A-Za-z0-9_$]*)\}/g;
  while ((match = templateRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Match rate calculations in templates: NLrate, Lrate, TPNrate
  const rateRegex = /\b(NLrate|Lrate|TPNrate)\b/g;
  while ((match = rateRegex.exec(code)) !== null) {
    keys.add(match[1]);
  }
  
  // Convert all keys to canonical form
  const canonicalKeys = Array.from(keys).map(key => getCanonicalKey(key));
  
  return [...new Set(canonicalKeys)]; // Remove duplicates
}

// Export classes
export { TPNLegacySupport, LegacyElementWrapper };