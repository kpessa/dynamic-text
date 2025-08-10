import { 
  ingredientService, 
  referenceService, 
  configService,
  POPULATION_TYPES 
} from '../firebaseDataService.js';
import { isIngredientShared } from '../sharedIngredientService.js';
import { groupReferencesByPopulation } from '../utils/ingredientUtils.js';

/**
 * Business logic for ingredient management
 */
export class IngredientBusinessLogic {
  
  /**
   * Migrate configurations to ingredients
   */
  async migrateConfigs() {
    console.log('Starting config migration...');
    
    const configs = await configService.getAllConfigs();
    console.log(`Found ${configs.length} configs to migrate`);
    
    let totalIngredients = 0;
    let totalReferences = 0;
    
    for (const config of configs) {
      if (!config.sections || config.sections.length === 0) continue;
      
      for (const section of config.sections) {
        if (!section.name) continue;
        
        // Create or get ingredient
        let ingredient = await ingredientService.getIngredientByName(section.name);
        if (!ingredient) {
          ingredient = await ingredientService.createIngredient({
            name: section.name,
            description: `Imported from ${config.healthSystem || 'Unknown'} configuration`,
            createdBy: 'migration',
            createdAt: new Date(),
            version: 1
          });
          totalIngredients++;
        }
        
        // Create reference for this config
        const reference = await referenceService.createReference({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          configId: config.id,
          healthSystem: config.healthSystem || 'Unknown',
          populationType: config.populationType || POPULATION_TYPES.ADULT,
          content: section.content,
          isJavaScript: section.isJavaScript,
          version: 1,
          createdBy: 'migration',
          createdAt: new Date()
        });
        totalReferences++;
      }
    }
    
    return { totalConfigs: configs.length, totalIngredients, totalReferences };
  }
  
  /**
   * Fix missing parentheses in ingredient names
   */
  async fixParentheses() {
    const ingredients = await ingredientService.getAllIngredients();
    let fixedCount = 0;
    
    const patterns = [
      { regex: /^(Amino Acids) ([A-Z].+)$/, replacement: '$1 ($2)' },
      { regex: /^(Dextrose) ([0-9].+)$/, replacement: '$1 ($2)' },
      { regex: /^(Lipids) ([A-Z].+)$/, replacement: '$1 ($2)' },
      { regex: /^(.*) ([A-Z][a-z]+)$/, replacement: '$1 ($2)' }
    ];
    
    for (const ingredient of ingredients) {
      let newName = ingredient.name;
      let fixed = false;
      
      for (const pattern of patterns) {
        if (pattern.regex.test(ingredient.name) && !ingredient.name.includes('(')) {
          newName = ingredient.name.replace(pattern.regex, pattern.replacement);
          fixed = true;
          break;
        }
      }
      
      if (fixed) {
        await ingredientService.updateIngredient(ingredient.id, { name: newName });
        fixedCount++;
      }
    }
    
    return fixedCount;
  }
  
  /**
   * Fix ingredient categories based on name patterns
   */
  async fixCategories() {
    const ingredients = await ingredientService.getAllIngredients();
    let fixedCount = 0;
    
    for (const ingredient of ingredients) {
      const oldCategory = ingredient.category;
      const newCategory = this.detectCategory(ingredient.name);
      
      if (oldCategory !== newCategory) {
        await ingredientService.updateIngredient(ingredient.id, { category: newCategory });
        fixedCount++;
      }
    }
    
    return fixedCount;
  }
  
  /**
   * Detect category from ingredient name
   */
  detectCategory(name) {
    const patterns = {
      'MACRONUTRIENTS': [/amino acid/i, /protein/i, /dextrose/i, /glucose/i, /lipid/i, /fat/i],
      'ELECTROLYTES': [/sodium/i, /potassium/i, /chloride/i, /calcium/i, /magnesium/i, /phosph/i],
      'ADDITIVES': [/vitamin/i, /trace/i, /element/i, /zinc/i, /copper/i, /selenium/i],
      'CALCULATED_VOLUMES': [/volume/i, /rate/i, /total/i, /fluid/i],
      'CLINICAL_CALCULATIONS': [/gir/i, /osmol/i, /calor/i, /ratio/i],
      'WEIGHT_CALCULATIONS': [/weight/i, /kg/i, /gram/i],
      'PREFERENCES': [/preference/i, /option/i, /choice/i, /select/i]
    };
    
    for (const [category, regexes] of Object.entries(patterns)) {
      if (regexes.some(regex => regex.test(name))) {
        return category;
      }
    }
    
    return 'BASIC_PARAMETERS';
  }
  
  /**
   * Check baseline status for a reference
   */
  async checkBaselineStatus(ingredient, reference) {
    if (!reference.configId) return null;
    
    try {
      const config = await configService.getConfig(reference.configId);
      if (!config?.baselineConfigs) return null;
      
      const baselineConfig = config.baselineConfigs[reference.populationType];
      if (!baselineConfig) return null;
      
      const baselineSection = baselineConfig.sections?.find(
        s => s.name === ingredient.name
      );
      
      if (!baselineSection) return null;
      
      const currentContent = reference.content || '';
      const baselineContent = baselineSection.content || '';
      
      const isModified = currentContent.trim() !== baselineContent.trim();
      
      return {
        status: isModified ? 'MODIFIED' : 'CLEAN',
        currentContent,
        baselineContent,
        differences: isModified ? this.calculateDifferences(currentContent, baselineContent) : null
      };
    } catch (error) {
      console.error('Error checking baseline status:', error);
      return null;
    }
  }
  
  /**
   * Calculate differences between two content strings
   */
  calculateDifferences(current, baseline) {
    const currentLines = current.split('\n');
    const baselineLines = baseline.split('\n');
    
    const differences = {
      added: [],
      removed: [],
      modified: []
    };
    
    // Simple diff algorithm (could be enhanced with proper diff library)
    const maxLength = Math.max(currentLines.length, baselineLines.length);
    
    for (let i = 0; i < maxLength; i++) {
      const currentLine = currentLines[i];
      const baselineLine = baselineLines[i];
      
      if (currentLine === undefined && baselineLine !== undefined) {
        differences.removed.push({ line: i + 1, content: baselineLine });
      } else if (currentLine !== undefined && baselineLine === undefined) {
        differences.added.push({ line: i + 1, content: currentLine });
      } else if (currentLine !== baselineLine) {
        differences.modified.push({ 
          line: i + 1, 
          current: currentLine, 
          baseline: baselineLine 
        });
      }
    }
    
    return differences;
  }
  
  /**
   * Revert reference to baseline
   */
  async revertToBaseline(ingredient, reference) {
    if (!reference.configId) {
      throw new Error('Reference has no associated config');
    }
    
    const config = await configService.getConfig(reference.configId);
    if (!config?.baselineConfigs) {
      throw new Error('Config has no baseline data');
    }
    
    const baselineConfig = config.baselineConfigs[reference.populationType];
    if (!baselineConfig) {
      throw new Error('No baseline found for this population type');
    }
    
    const baselineSection = baselineConfig.sections?.find(
      s => s.name === ingredient.name
    );
    
    if (!baselineSection) {
      throw new Error('No baseline section found for this ingredient');
    }
    
    // Update the reference with baseline content
    await referenceService.updateReference(reference.id, {
      content: baselineSection.content,
      isJavaScript: baselineSection.isJavaScript,
      status: 'CLEAN',
      lastModified: new Date(),
      revertedToBaseline: true,
      revertedAt: new Date()
    });
    
    return true;
  }
  
  /**
   * Merge variation ingredients into primary
   */
  async mergeVariations(primaryIngredient, variationIds) {
    const mergedReferences = [];
    
    for (const variationId of variationIds) {
      // Get all references for the variation
      const references = await referenceService.getReferencesForIngredient(variationId);
      
      // Move references to primary ingredient
      for (const reference of references) {
        await referenceService.updateReference(reference.id, {
          ingredientId: primaryIngredient.id,
          ingredientName: primaryIngredient.name,
          mergedFrom: variationId,
          mergedAt: new Date()
        });
        mergedReferences.push(reference);
      }
      
      // Delete the variation ingredient
      await ingredientService.deleteIngredient(variationId);
    }
    
    // Update primary ingredient version
    await ingredientService.updateIngredient(primaryIngredient.id, {
      version: (primaryIngredient.version || 1) + 1,
      lastModified: new Date(),
      mergedVariations: variationIds
    });
    
    return mergedReferences.length;
  }
  
  /**
   * Perform bulk operations on selected ingredients
   */
  async performBulkOperation(operation, selectedIds, params = {}) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const ingredientId of selectedIds) {
      try {
        switch (operation) {
          case 'DELETE':
            await this.deleteIngredientWithReferences(ingredientId);
            break;
            
          case 'EXPORT':
            // Export logic would go here
            break;
            
          case 'UPDATE_HEALTH_SYSTEM':
            await this.updateIngredientHealthSystem(ingredientId, params.healthSystem);
            break;
            
          case 'UPDATE_POPULATION':
            await this.updateIngredientPopulation(ingredientId, params.populationType);
            break;
            
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({ ingredientId, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Delete ingredient and all its references
   */
  async deleteIngredientWithReferences(ingredientId) {
    // Delete all references first
    const references = await referenceService.getReferencesForIngredient(ingredientId);
    for (const reference of references) {
      await referenceService.deleteReference(reference.id);
    }
    
    // Then delete the ingredient
    await ingredientService.deleteIngredient(ingredientId);
  }
  
  /**
   * Update health system for all references of an ingredient
   */
  async updateIngredientHealthSystem(ingredientId, healthSystem) {
    const references = await referenceService.getReferencesForIngredient(ingredientId);
    
    for (const reference of references) {
      await referenceService.updateReference(reference.id, {
        healthSystem,
        lastModified: new Date()
      });
    }
  }
  
  /**
   * Update population type for all references of an ingredient
   */
  async updateIngredientPopulation(ingredientId, populationType) {
    const references = await referenceService.getReferencesForIngredient(ingredientId);
    
    for (const reference of references) {
      await referenceService.updateReference(reference.id, {
        populationType,
        lastModified: new Date()
      });
    }
  }
  
  /**
   * Check shared status for multiple ingredients
   */
  async checkSharedStatuses(ingredientIds) {
    const statuses = {};
    
    for (const id of ingredientIds) {
      try {
        const sharedInfo = await isIngredientShared(id);
        statuses[id] = {
          isShared: sharedInfo.isShared,
          sharedCount: sharedInfo.configs?.length || 0
        };
      } catch (error) {
        console.error(`Error checking shared status for ${id}:`, error);
        statuses[id] = { isShared: false, sharedCount: 0 };
      }
    }
    
    return statuses;
  }
}

// Export singleton instance
export const ingredientBusinessLogic = new IngredientBusinessLogic();