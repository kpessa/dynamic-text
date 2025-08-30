import type { Section } from '$lib/types';
import { noteTransformService, type NoteObject } from './noteTransformService';

/**
 * TPN Configuration Service
 * Handles import/export of TPN configurations matching the schema.json format
 */

// Type definitions for TPN configuration structure
export type IngredientType = 'Macronutrient' | 'Micronutrient' | 'Additive' | 'Salt' | 'Diluent' | 'Other';
export type EditMode = 'None' | 'Custom';
export type ThresholdType = 'Feasible Low' | 'Critical Low' | 'Normal Low' | 'Normal High' | 'Critical High' | 'Feasible High';
export type PopulationType = 'neo' | 'child' | 'adolescent' | 'adult';

export interface AltUOM {
  NAME: string;
  UOM_DISP: string;
}

export interface ReferenceRange {
  THRESHOLD: ThresholdType;
  VALUE: number;
}

export interface Lab {
  DISPLAY: string;
  EVENT_SET_NAME: string;
  GRAPH: 0 | 1;
}

export interface Concentration {
  STRENGTH: number;
  STRENGTH_UOM: string;
  VOLUME: number;
  VOLUME_UOM: string;
}

export interface Exclude {
  keyname: string;
}

export interface Ingredient {
  KEYNAME: string;
  DISPLAY: string;
  MNEMONIC: string;
  UOM_DISP: string;
  TYPE: IngredientType;
  OSMO_RATIO: number;
  EDITMODE: EditMode;
  PRECISION: number;
  SPECIAL: string;
  NOTE: NoteObject[];
  ALTUOM: AltUOM[];
  REFERENCE_RANGE: ReferenceRange[];
  LABS: Lab[];
  CONCENTRATION: Concentration;
  EXCLUDES: Exclude[];
}

export interface AltValue {
  CHECKTYPE: string;
  CHECKMATCH: string;
  OVERRIDE_VALUE: string;
}

export interface FlexConfig {
  NAME: string;
  VALUE: string;
  CONFIG_COMMENT?: string;
  ALT_VALUE?: AltValue[];
}

export interface TPNConfiguration {
  INGREDIENT: Ingredient[];
  FLEX: FlexConfig[];
}

export interface ConfigMetadata {
  id?: string;
  name: string;
  populationType: PopulationType;
  timestamp: number;
  userId?: string;
  description?: string;
}

export interface TPNConfigWithMetadata {
  config: TPNConfiguration;
  metadata: ConfigMetadata;
}

export class TPNConfigService {
  /**
   * Validates a TPN configuration against the schema
   * @param config - Configuration object to validate
   * @returns Validation result with any errors
   */
  validateTPNConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check top-level structure
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { valid: false, errors };
    }

    // Check INGREDIENT array
    if (!Array.isArray(config.INGREDIENT)) {
      errors.push('Configuration must have an INGREDIENT array');
    } else {
      config.INGREDIENT.forEach((ingredient: any, index: number) => {
        const ingredientErrors = this.validateIngredient(ingredient, index);
        errors.push(...ingredientErrors);
      });
    }

    // Check FLEX array
    if (!Array.isArray(config.FLEX)) {
      errors.push('Configuration must have a FLEX array');
    } else {
      config.FLEX.forEach((flex: any, index: number) => {
        const flexErrors = this.validateFlexConfig(flex, index);
        errors.push(...flexErrors);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates an individual ingredient
   */
  private validateIngredient(ingredient: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `INGREDIENT[${index}]`;

    // Required string fields
    const requiredStrings = ['KEYNAME', 'DISPLAY', 'MNEMONIC', 'UOM_DISP', 'TYPE', 'EDITMODE'];
    requiredStrings.forEach(field => {
      if (typeof ingredient[field] !== 'string') {
        errors.push(`${prefix}.${field} must be a string`);
      }
    });

    // Required number fields
    const requiredNumbers = ['OSMO_RATIO', 'PRECISION'];
    requiredNumbers.forEach(field => {
      if (typeof ingredient[field] !== 'number') {
        errors.push(`${prefix}.${field} must be a number`);
      }
    });

    // Validate TYPE enum
    if (ingredient.TYPE && !['Macronutrient', 'Micronutrient', 'Additive', 'Salt', 'Diluent', 'Other'].includes(ingredient.TYPE)) {
      errors.push(`${prefix}.TYPE must be one of: Macronutrient, Micronutrient, Additive, Salt, Diluent, Other`);
    }

    // Validate EDITMODE enum
    if (ingredient.EDITMODE && !['None', 'Custom'].includes(ingredient.EDITMODE)) {
      errors.push(`${prefix}.EDITMODE must be either None or Custom`);
    }

    // Validate NOTE array
    if (ingredient.NOTE && !noteTransformService.validateNoteArray(ingredient.NOTE)) {
      errors.push(`${prefix}.NOTE must be an array of { TEXT: string } objects`);
    }

    // Validate nested arrays
    if (ingredient.ALTUOM && !Array.isArray(ingredient.ALTUOM)) {
      errors.push(`${prefix}.ALTUOM must be an array`);
    }

    if (ingredient.REFERENCE_RANGE && !Array.isArray(ingredient.REFERENCE_RANGE)) {
      errors.push(`${prefix}.REFERENCE_RANGE must be an array`);
    }

    if (ingredient.LABS && !Array.isArray(ingredient.LABS)) {
      errors.push(`${prefix}.LABS must be an array`);
    }

    if (ingredient.EXCLUDES && !Array.isArray(ingredient.EXCLUDES)) {
      errors.push(`${prefix}.EXCLUDES must be an array`);
    }

    // Validate CONCENTRATION object
    if (ingredient.CONCENTRATION) {
      if (typeof ingredient.CONCENTRATION !== 'object') {
        errors.push(`${prefix}.CONCENTRATION must be an object`);
      } else {
        if (typeof ingredient.CONCENTRATION.STRENGTH !== 'number') {
          errors.push(`${prefix}.CONCENTRATION.STRENGTH must be a number`);
        }
        if (typeof ingredient.CONCENTRATION.VOLUME !== 'number') {
          errors.push(`${prefix}.CONCENTRATION.VOLUME must be a number`);
        }
      }
    }

    return errors;
  }

  /**
   * Validates a FLEX configuration entry
   */
  private validateFlexConfig(flex: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `FLEX[${index}]`;

    if (typeof flex.NAME !== 'string') {
      errors.push(`${prefix}.NAME must be a string`);
    }

    if (typeof flex.VALUE !== 'string') {
      errors.push(`${prefix}.VALUE must be a string`);
    }

    if (flex.ALT_VALUE && !Array.isArray(flex.ALT_VALUE)) {
      errors.push(`${prefix}.ALT_VALUE must be an array if present`);
    }

    return errors;
  }

  /**
   * Exports sections to a TPN configuration format
   * @param sections - Current sections in the editor
   * @param existingConfig - Existing configuration to merge with (optional)
   * @param ingredientKey - Specific ingredient to update (optional)
   * @returns Complete TPN configuration
   */
  exportTPNConfig(
    sections: Section[], 
    existingConfig?: TPNConfiguration,
    ingredientKey?: string
  ): TPNConfiguration {
    // Start with existing config or create new one
    const config: TPNConfiguration = existingConfig || {
      INGREDIENT: [],
      FLEX: []
    };

    if (ingredientKey && sections.length > 0) {
      // Update specific ingredient's NOTE array
      const ingredientIndex = config.INGREDIENT.findIndex(i => i.KEYNAME === ingredientKey);
      
      if (ingredientIndex >= 0) {
        // Transform sections to NOTE array format
        config.INGREDIENT[ingredientIndex].NOTE = noteTransformService.sectionsToNoteArray(sections);
      }
    }

    return config;
  }

  /**
   * Imports a TPN configuration and extracts sections for a specific ingredient
   * @param config - TPN configuration to import
   * @param ingredientKey - Specific ingredient to extract (optional)
   * @returns Sections for editing or all sections
   */
  importTPNConfig(config: TPNConfiguration, ingredientKey?: string): Section[] {
    const validation = this.validateTPNConfig(config);
    
    if (!validation.valid) {
      throw new Error(`Invalid TPN configuration: ${validation.errors.join(', ')}`);
    }

    if (ingredientKey) {
      // Find specific ingredient
      const ingredient = config.INGREDIENT.find(i => i.KEYNAME === ingredientKey);
      
      if (!ingredient) {
        throw new Error(`Ingredient ${ingredientKey} not found in configuration`);
      }

      // Transform NOTE array to sections
      return noteTransformService.noteArrayToSections(ingredient.NOTE, ingredientKey);
    }

    // Return all sections from all ingredients (for full import)
    const allSections: Section[] = [];
    
    config.INGREDIENT.forEach(ingredient => {
      const sections = noteTransformService.noteArrayToSections(
        ingredient.NOTE, 
        ingredient.KEYNAME
      );
      allSections.push(...sections);
    });

    return allSections;
  }

  /**
   * Creates a complete configuration from multiple ingredients with their sections
   * @param ingredientSections - Map of ingredient key to sections
   * @param baseConfig - Base configuration to start from
   * @returns Complete TPN configuration
   */
  createCompleteConfig(
    ingredientSections: Map<string, Section[]>,
    baseConfig: TPNConfiguration
  ): TPNConfiguration {
    const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    // Update each ingredient's NOTE array
    ingredientSections.forEach((sections, ingredientKey) => {
      const ingredientIndex = config.INGREDIENT.findIndex(
        (i: Ingredient) => i.KEYNAME === ingredientKey
      );
      
      if (ingredientIndex >= 0) {
        config.INGREDIENT[ingredientIndex].NOTE = noteTransformService.sectionsToNoteArray(sections);
      }
    });

    return config;
  }

  /**
   * Extracts all ingredient keys from a configuration
   * @param config - TPN configuration
   * @returns Array of ingredient key names
   */
  getIngredientKeys(config: TPNConfiguration): string[] {
    return config.INGREDIENT.map(i => i.KEYNAME);
  }

  /**
   * Gets a specific ingredient from configuration
   * @param config - TPN configuration
   * @param keyname - Ingredient key name
   * @returns Ingredient or undefined
   */
  getIngredient(config: TPNConfiguration, keyname: string): Ingredient | undefined {
    return config.INGREDIENT.find(i => i.KEYNAME === keyname);
  }

  /**
   * Updates a specific ingredient in the configuration
   * @param config - TPN configuration
   * @param keyname - Ingredient key name
   * @param updates - Partial ingredient updates
   * @returns Updated configuration
   */
  updateIngredient(
    config: TPNConfiguration, 
    keyname: string, 
    updates: Partial<Ingredient>
  ): TPNConfiguration {
    const newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
    const ingredientIndex = newConfig.INGREDIENT.findIndex(
      (i: Ingredient) => i.KEYNAME === keyname
    );
    
    if (ingredientIndex >= 0) {
      newConfig.INGREDIENT[ingredientIndex] = {
        ...newConfig.INGREDIENT[ingredientIndex],
        ...updates
      };
    }

    return newConfig;
  }

  /**
   * Ensures numeric precision is maintained according to PRECISION field
   * @param value - Numeric value
   * @param precision - Number of decimal places
   * @returns Properly formatted number
   */
  applyPrecision(value: number, precision: number): number {
    return parseFloat(value.toFixed(precision));
  }

  /**
   * Creates an empty TPN configuration with default structure
   * @param populationType - Type of population
   * @returns Empty TPN configuration
   */
  createEmptyConfig(populationType: PopulationType): TPNConfiguration {
    return {
      INGREDIENT: [],
      FLEX: []
    };
  }

  /**
   * Merges two TPN configurations
   * @param base - Base configuration
   * @param overlay - Configuration to merge on top
   * @returns Merged configuration
   */
  mergeConfigs(base: TPNConfiguration, overlay: TPNConfiguration): TPNConfiguration {
    const merged = JSON.parse(JSON.stringify(base)); // Deep clone

    // Merge ingredients
    overlay.INGREDIENT.forEach(overlayIngredient => {
      const existingIndex = merged.INGREDIENT.findIndex(
        (i: Ingredient) => i.KEYNAME === overlayIngredient.KEYNAME
      );
      
      if (existingIndex >= 0) {
        // Update existing ingredient
        merged.INGREDIENT[existingIndex] = overlayIngredient;
      } else {
        // Add new ingredient
        merged.INGREDIENT.push(overlayIngredient);
      }
    });

    // Merge FLEX configs
    overlay.FLEX.forEach(overlayFlex => {
      const existingIndex = merged.FLEX.findIndex(
        (f: FlexConfig) => f.NAME === overlayFlex.NAME
      );
      
      if (existingIndex >= 0) {
        // Update existing flex config
        merged.FLEX[existingIndex] = overlayFlex;
      } else {
        // Add new flex config
        merged.FLEX.push(overlayFlex);
      }
    });

    return merged;
  }
}

// Export singleton instance
export const tpnConfigService = new TPNConfigService();