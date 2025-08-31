/**
 * Service for handling reference editing operations
 */
class ReferenceEditService {
  /**
   * Load a reference for editing
   * @returns Object with all the state updates needed
   */
  loadReferenceForEdit(reference: any, ingredient: any) {
    console.log('ReferenceEditService: loadReferenceForEdit called', {
      ingredient: ingredient.name,
      reference: reference?.name,
      hasSections: !!(reference?.sections),
      fullReference: reference
    });
    
    // Check if sections exist and have content
    if (!reference.sections || reference.sections.length === 0) {
      console.warn('Reference has empty sections! User needs to run "Fix Empty Sections" in Ingredient Manager.');
      return {
        error: 'This reference has no content sections. Please run "Fix Empty Sections" in the Ingredient Manager to populate the clinical notes.',
        success: false
      };
    }
    
    // Return all state updates needed
    const stateUpdates = {
      sections: reference.sections,
      workContext: {
        currentIngredient: ingredient.name,
        currentReferenceName: reference.name,
        loadedReferenceId: reference.id,
        hasUnsavedChanges: false,
        lastSavedTime: reference.updatedAt,
        originalSections: JSON.stringify(reference.sections)
      },
      currentPopulationType: reference.populationType,
      validationData: {
        currentValidationStatus: reference.validationStatus || 'untested',
        currentValidationNotes: reference.validationNotes || '',
        currentValidatedBy: reference.validatedBy || null,
        currentValidatedAt: reference.validatedAt || null,
        currentTestResults: reference.testResults || null
      },
      viewsToClose: {
        showIngredientManager: false,
        showMigrationTool: false,
        showAIWorkflowInspector: false,
        showTestGeneratorModal: false,
        showSidebar: false
      },
      viewSettings: {
        previewCollapsed: false,
        previewMode: 'preview'
      },
      loadedData: {
        loadedIngredient: ingredient,
        loadedReference: reference,
        currentHealthSystem: reference.healthSystem
      },
      success: true
    };
    
    console.log('ReferenceEditService: Reference loaded successfully', {
      sectionsCount: reference.sections.length,
      viewsClosed: true,
      previewVisible: true
    });
    
    return stateUpdates;
  }
  
  /**
   * Apply visual feedback after loading
   */
  applyLoadingFeedback() {
    setTimeout(() => {
      const editorElement = document.querySelector('.editor');
      if (editorElement) {
        editorElement.scrollTop = 0;
        // Add a brief highlight animation
        editorElement.style.transition = 'background-color 0.3s ease';
        editorElement.style.backgroundColor = '#e8f4fd';
        setTimeout(() => {
          editorElement.style.backgroundColor = '';
        }, 300);
      }
    }, 100);
  }
  
  /**
   * Handle saving a reference
   */
  prepareSaveData(
    loadedReferenceId: string,
    currentReferenceName: string,
    sections: any[],
    currentPopulationType: string,
    currentHealthSystem: string,
    validationData: any
  ) {
    return {
      id: loadedReferenceId,
      name: currentReferenceName,
      sections: sections,
      populationType: currentPopulationType,
      healthSystem: currentHealthSystem,
      validationStatus: validationData.currentValidationStatus,
      validationNotes: validationData.currentValidationNotes,
      validatedBy: validationData.currentValidatedBy,
      validatedAt: validationData.currentValidatedAt,
      testResults: validationData.currentTestResults
    };
  }
}

export const referenceEditService = new ReferenceEditService();