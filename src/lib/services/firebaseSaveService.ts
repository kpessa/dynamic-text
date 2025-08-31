import type { Section } from '../types';

interface ValidationData {
  currentValidationStatus: string;
  currentValidationNotes: string;
  currentValidatedBy: string;
  currentValidatedAt: Date | null;
  currentTestResults: any;
}

interface SaveResult {
  success: boolean;
  error?: string;
  requiresSelectiveApply?: boolean;
  sharedCount?: number;
}

interface PreparedReferenceData {
  id: string;
  name: string;
  sections: Section[];
  populationType: string;
  healthSystem: string;
  validationStatus?: string;
  validationNotes?: string;
  validatedBy?: string;
  validatedAt?: Date | null;
  testResults?: any;
  updatedAt?: Date;
  version?: number;
}

export class FirebaseSaveService {
  /**
   * Prepare reference data for saving
   */
  prepareSaveData(
    referenceId: string,
    referenceName: string,
    sections: Section[],
    populationType: string,
    healthSystem: string,
    validationData: ValidationData
  ): PreparedReferenceData {
    return {
      id: referenceId,
      name: referenceName,
      sections: sections,
      populationType: populationType,
      healthSystem: healthSystem,
      validationStatus: validationData.currentValidationStatus,
      validationNotes: validationData.currentValidationNotes,
      validatedBy: validationData.currentValidatedBy,
      validatedAt: validationData.currentValidatedAt,
      testResults: validationData.currentTestResults,
      updatedAt: new Date()
    };
  }

  /**
   * Save reference to Firebase with optional commit message
   */
  async saveReference(
    ingredientId: string,
    referenceData: PreparedReferenceData,
    commitMessage: string | null,
    referenceService: any
  ): Promise<SaveResult> {
    try {
      await referenceService.saveReference(ingredientId, referenceData, commitMessage);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error saving reference:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save reference'
      };
    }
  }

  /**
   * Check if ingredient is shared and prepare for selective apply
   */
  async checkSharedStatus(
    ingredientId: string,
    isIngredientShared: (id: string) => Promise<{ isShared: boolean; sharedCount: number }>
  ): Promise<{ isShared: boolean; sharedCount: number }> {
    return await isIngredientShared(ingredientId);
  }

  /**
   * Handle the complete save workflow
   */
  async handleSaveWorkflow(
    loadedIngredient: any,
    loadedReferenceId: string,
    currentReferenceName: string,
    sections: Section[],
    currentPopulationType: string,
    currentHealthSystem: string,
    validationData: ValidationData,
    commitMessage: string | null
  ): Promise<SaveResult> {
    if (!loadedIngredient || !loadedReferenceId) {
      return {
        success: false,
        error: 'No reference loaded to save'
      };
    }

    try {
      // Dynamically import dependencies
      const { referenceService } = await import('../firebaseDataService');
      const { isIngredientShared } = await import('../sharedIngredientService');
      
      // Prepare the reference data
      const referenceData = this.prepareSaveData(
        loadedReferenceId,
        currentReferenceName,
        sections,
        currentPopulationType,
        currentHealthSystem,
        validationData
      );
      
      // Check if this ingredient is shared
      const sharedStatus = await this.checkSharedStatus(loadedIngredient.id, isIngredientShared);
      
      if (sharedStatus.isShared && sharedStatus.sharedCount > 1) {
        // Return that selective apply is needed
        return {
          success: false,
          requiresSelectiveApply: true,
          sharedCount: sharedStatus.sharedCount
        };
      }
      
      // Save normally
      const result = await this.saveReference(
        loadedIngredient.id,
        referenceData,
        commitMessage,
        referenceService
      );
      
      if (result.success) {
        console.log('Reference saved successfully with commit message:', commitMessage);
      }
      
      return result;
    } catch (error) {
      console.error('Error in save workflow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save reference'
      };
    }
  }

  /**
   * Load population types for an ingredient
   */
  async loadPopulationTypes(
    ingredientId: string,
    currentHealthSystem: string | null,
    currentPopulationType: string
  ): Promise<Array<{
    populationType: string;
    references: any[];
    isActive: boolean;
  }>> {
    try {
      const { referenceService } = await import('../firebaseDataService');
      const { POPULATION_TYPES } = await import('../types');
      
      // Get all references for the current ingredient
      const allReferences = await referenceService.getReferencesForIngredient(ingredientId);
      
      // Group by population type and filter by health system if applicable
      const populationMap = new Map();
      
      allReferences.forEach((ref: any) => {
        // If we have a current health system, only show references from that system
        if (!currentHealthSystem || ref.healthSystem === currentHealthSystem) {
          if (!populationMap.has(ref.populationType)) {
            populationMap.set(ref.populationType, []);
          }
          populationMap.get(ref.populationType).push(ref);
        }
      });
      
      // Convert to array format for display
      const availablePopulations = Array.from(populationMap.entries()).map(([popType, refs]) => ({
        populationType: popType,
        references: refs,
        isActive: popType === currentPopulationType
      }));
      
      // Sort by population type order
      const order = [POPULATION_TYPES.NEO, POPULATION_TYPES.CHILD, POPULATION_TYPES.ADOLESCENT, POPULATION_TYPES.ADULT];
      availablePopulations.sort((a, b) => 
        order.indexOf(a.populationType) - order.indexOf(b.populationType)
      );
      
      return availablePopulations;
    } catch (error) {
      console.error('Error loading population types:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseSaveService = new FirebaseSaveService();