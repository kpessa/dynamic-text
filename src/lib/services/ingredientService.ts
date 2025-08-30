import type { Section } from '$lib/types';
import { noteTransformService, type NoteObject } from './noteTransformService';

/**
 * Service for managing individual TPN ingredient import/export operations
 * Handles validation, transformation, and duplicate detection
 */

// Ingredient interface matching TPN schema.json structure
export interface Ingredient {
  KEYNAME: string;          // Unique identifier
  DISPLAY: string;          // Display name
  MNEMONIC: string;         // Short code
  UOM_DISP: string;         // Unit of measure display
  TYPE: 'Macronutrient' | 'Micronutrient' | 'Additive' | 'Salt' | 'Diluent' | 'Other';
  OSMO_RATIO: number;
  EDITMODE: 'None' | 'Custom';
  PRECISION: number;        // Decimal places
  SPECIAL: string;
  NOTE: NoteObject[];       // Array of { TEXT: string } objects
  ALTUOM: Array<{ NAME: string; UOM_DISP: string }>;
  REFERENCE_RANGE: Array<{
    THRESHOLD: 'Feasible Low' | 'Critical Low' | 'Normal Low' | 'Normal High' | 'Critical High' | 'Feasible High';
    VALUE: number;
  }>;
  LABS: Array<{
    DISPLAY: string;
    EVENT_SET_NAME: string;
    GRAPH: 0 | 1;
  }>;
  CONCENTRATION: {
    STRENGTH: number;
    STRENGTH_UOM: string;
    VOLUME: number;
    VOLUME_UOM: string;
  };
  EXCLUDES: Array<{ keyname: string }>;
}

export type MergeStrategy = 'overwrite' | 'skip' | 'rename';

export interface ImportResult {
  success: boolean;
  ingredient?: Ingredient;
  error?: string;
  duplicateFound?: boolean;
  originalKeyname?: string;
  newKeyname?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchImportResult {
  successful: Ingredient[];
  failed: Array<{ ingredient: any; error: string }>;
  duplicates: Array<{ keyname: string; strategy: MergeStrategy }>;
}

class IngredientService {
  private readonly VALID_TYPES = ['Macronutrient', 'Micronutrient', 'Additive', 'Salt', 'Diluent', 'Other'];
  private readonly VALID_THRESHOLDS = ['Feasible Low', 'Critical Low', 'Normal Low', 'Normal High', 'Critical High', 'Feasible High'];
  private readonly REQUIRED_FIELDS = ['KEYNAME', 'DISPLAY', 'MNEMONIC', 'UOM_DISP', 'TYPE'];

  /**
   * Export a single ingredient with NOTE array transformation
   * @param ingredient - Ingredient to export
   * @param sections - Optional sections to transform into NOTE array
   * @returns JSON string of the ingredient
   */
  exportIngredient(ingredient: Ingredient, sections?: Section[]): string {
    // If sections are provided, transform them to NOTE array
    if (sections && sections.length > 0) {
      ingredient = {
        ...ingredient,
        NOTE: noteTransformService.sectionsToNoteArray(sections)
      };
    }

    return JSON.stringify(ingredient, null, 2);
  }

  /**
   * Export multiple ingredients
   * @param ingredients - Array of ingredients to export
   * @param sectionsMap - Optional map of ingredient KEYNAME to sections
   * @returns JSON string of the ingredients array
   */
  exportIngredients(ingredients: Ingredient[], sectionsMap?: Map<string, Section[]>): string {
    const exportedIngredients = ingredients.map(ingredient => {
      if (sectionsMap?.has(ingredient.KEYNAME)) {
        const sections = sectionsMap.get(ingredient.KEYNAME)!;
        return {
          ...ingredient,
          NOTE: noteTransformService.sectionsToNoteArray(sections)
        };
      }
      return ingredient;
    });

    return JSON.stringify(exportedIngredients, null, 2);
  }

  /**
   * Import a single ingredient with validation
   * @param jsonString - JSON string containing the ingredient
   * @returns Import result with ingredient or error
   */
  importIngredient(jsonString: string): ImportResult {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = this.validateIngredient(parsed);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      // Ensure NOTE is an array
      if (!Array.isArray(parsed.NOTE)) {
        parsed.NOTE = [];
      }

      return {
        success: true,
        ingredient: parsed as Ingredient
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Import multiple ingredients with validation
   * @param jsonString - JSON string containing array of ingredients
   * @returns Batch import result
   */
  importIngredients(jsonString: string): BatchImportResult {
    const result: BatchImportResult = {
      successful: [],
      failed: [],
      duplicates: []
    };

    try {
      const parsed = JSON.parse(jsonString);
      
      if (!Array.isArray(parsed)) {
        result.failed.push({
          ingredient: parsed,
          error: 'Expected an array of ingredients'
        });
        return result;
      }

      for (const item of parsed) {
        const validation = this.validateIngredient(item);
        
        if (!validation.valid) {
          result.failed.push({
            ingredient: item,
            error: validation.errors.join('; ')
          });
        } else {
          // Ensure NOTE is an array
          if (!Array.isArray(item.NOTE)) {
            item.NOTE = [];
          }
          result.successful.push(item as Ingredient);
        }
      }
    } catch (error) {
      result.failed.push({
        ingredient: null,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return result;
  }

  /**
   * Validate an ingredient object
   * @param ingredient - Object to validate
   * @returns Validation result with errors and warnings
   */
  validateIngredient(ingredient: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if ingredient is an object
    if (!ingredient || typeof ingredient !== 'object') {
      errors.push('Ingredient must be an object');
      return { valid: false, errors, warnings };
    }

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!(field in ingredient) || !ingredient[field]) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    // Validate TYPE enum
    if (ingredient.TYPE && !this.VALID_TYPES.includes(ingredient.TYPE)) {
      errors.push(`Invalid TYPE value: ${ingredient.TYPE}. Must be one of: ${this.VALID_TYPES.join(', ')}`);
    }

    // Validate numeric fields
    if ('OSMO_RATIO' in ingredient && typeof ingredient.OSMO_RATIO !== 'number') {
      errors.push('OSMO_RATIO must be a number');
    }

    if ('PRECISION' in ingredient && typeof ingredient.PRECISION !== 'number') {
      errors.push('PRECISION must be a number');
    }

    // Validate REFERENCE_RANGE
    if (ingredient.REFERENCE_RANGE) {
      if (!Array.isArray(ingredient.REFERENCE_RANGE)) {
        errors.push('REFERENCE_RANGE must be an array');
      } else {
        ingredient.REFERENCE_RANGE.forEach((range: any, index: number) => {
          if (!range.THRESHOLD || !this.VALID_THRESHOLDS.includes(range.THRESHOLD)) {
            errors.push(`Invalid THRESHOLD at REFERENCE_RANGE[${index}]: ${range.THRESHOLD}`);
          }
          if (typeof range.VALUE !== 'number') {
            errors.push(`VALUE must be a number at REFERENCE_RANGE[${index}]`);
          }
        });
      }
    }

    // Validate NOTE array structure
    if (ingredient.NOTE) {
      if (!Array.isArray(ingredient.NOTE)) {
        errors.push('NOTE must be an array');
      } else if (!noteTransformService.validateNoteArray(ingredient.NOTE)) {
        errors.push('NOTE array must contain objects with TEXT property');
      }
    }

    // Validate LABS array
    if (ingredient.LABS && Array.isArray(ingredient.LABS)) {
      ingredient.LABS.forEach((lab: any, index: number) => {
        if (!lab.DISPLAY || !lab.EVENT_SET_NAME) {
          errors.push(`LABS[${index}] must have DISPLAY and EVENT_SET_NAME`);
        }
        if ('GRAPH' in lab && lab.GRAPH !== 0 && lab.GRAPH !== 1) {
          errors.push(`LABS[${index}].GRAPH must be 0 or 1`);
        }
      });
    }

    // Validate CONCENTRATION
    if (ingredient.CONCENTRATION) {
      const conc = ingredient.CONCENTRATION;
      if (typeof conc.STRENGTH !== 'number' || typeof conc.VOLUME !== 'number') {
        errors.push('CONCENTRATION.STRENGTH and VOLUME must be numbers');
      }
    }

    // Add warnings for best practices
    if (!ingredient.NOTE || ingredient.NOTE.length === 0) {
      warnings.push('NOTE array is empty - consider adding documentation');
    }

    if (!ingredient.REFERENCE_RANGE || ingredient.REFERENCE_RANGE.length === 0) {
      warnings.push('No REFERENCE_RANGE defined');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if an ingredient with the given KEYNAME already exists
   * @param keyname - KEYNAME to check
   * @param existingIngredients - Array of existing ingredients
   * @returns true if duplicate found
   */
  checkDuplicateIngredient(keyname: string, existingIngredients: Ingredient[]): boolean {
    return existingIngredients.some(ing => ing.KEYNAME === keyname);
  }

  /**
   * Merge an ingredient into existing configuration with conflict resolution
   * @param newIngredient - Ingredient to merge
   * @param existingIngredients - Current ingredients array
   * @param strategy - How to handle duplicates
   * @returns Updated ingredients array and result info
   */
  mergeIngredient(
    newIngredient: Ingredient,
    existingIngredients: Ingredient[],
    strategy: MergeStrategy = 'skip'
  ): { ingredients: Ingredient[]; result: ImportResult } {
    const isDuplicate = this.checkDuplicateIngredient(newIngredient.KEYNAME, existingIngredients);

    if (!isDuplicate) {
      // No duplicate, simply add
      return {
        ingredients: [...existingIngredients, newIngredient],
        result: {
          success: true,
          ingredient: newIngredient
        }
      };
    }

    // Handle duplicate based on strategy
    switch (strategy) {
      case 'overwrite':
        const updatedIngredients = existingIngredients.map(ing =>
          ing.KEYNAME === newIngredient.KEYNAME ? newIngredient : ing
        );
        return {
          ingredients: updatedIngredients,
          result: {
            success: true,
            ingredient: newIngredient,
            duplicateFound: true
          }
        };

      case 'skip':
        return {
          ingredients: existingIngredients,
          result: {
            success: false,
            error: `Ingredient with KEYNAME '${newIngredient.KEYNAME}' already exists`,
            duplicateFound: true
          }
        };

      case 'rename':
        const renamedIngredient = {
          ...newIngredient,
          KEYNAME: this.generateUniqueKeyname(newIngredient.KEYNAME, existingIngredients)
        };
        return {
          ingredients: [...existingIngredients, renamedIngredient],
          result: {
            success: true,
            ingredient: renamedIngredient,
            duplicateFound: true,
            originalKeyname: newIngredient.KEYNAME,
            newKeyname: renamedIngredient.KEYNAME
          }
        };
    }
  }

  /**
   * Generate a unique KEYNAME by appending a suffix
   * @param baseKeyname - Original KEYNAME
   * @param existingIngredients - Current ingredients
   * @returns Unique KEYNAME
   */
  private generateUniqueKeyname(baseKeyname: string, existingIngredients: Ingredient[]): string {
    let suffix = 2;
    let newKeyname = `${baseKeyname}_${suffix}`;
    
    while (existingIngredients.some(ing => ing.KEYNAME === newKeyname)) {
      suffix++;
      newKeyname = `${baseKeyname}_${suffix}`;
    }
    
    return newKeyname;
  }

  /**
   * Filter ingredients by type
   * @param ingredients - Array of ingredients
   * @param type - Type to filter by
   * @returns Filtered ingredients
   */
  filterByType(ingredients: Ingredient[], type: Ingredient['TYPE']): Ingredient[] {
    return ingredients.filter(ing => ing.TYPE === type);
  }

  /**
   * Search ingredients by name or mnemonic
   * @param ingredients - Array of ingredients
   * @param query - Search query
   * @returns Matching ingredients
   */
  searchIngredients(ingredients: Ingredient[], query: string): Ingredient[] {
    const lowerQuery = query.toLowerCase();
    return ingredients.filter(ing =>
      ing.DISPLAY.toLowerCase().includes(lowerQuery) ||
      ing.MNEMONIC.toLowerCase().includes(lowerQuery) ||
      ing.KEYNAME.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Convert ingredient NOTE array to sections for editing
   * @param ingredient - Ingredient with NOTE array
   * @returns Sections for the editor
   */
  convertNoteToSections(ingredient: Ingredient): Section[] {
    return noteTransformService.noteArrayToSections(ingredient.NOTE, ingredient.KEYNAME);
  }

  /**
   * Sort ingredients by display name
   * @param ingredients - Array of ingredients
   * @returns Sorted array
   */
  sortByDisplayName(ingredients: Ingredient[]): Ingredient[] {
    return [...ingredients].sort((a, b) => a.DISPLAY.localeCompare(b.DISPLAY));
  }
}

// Export singleton instance
export const ingredientService = new IngredientService();