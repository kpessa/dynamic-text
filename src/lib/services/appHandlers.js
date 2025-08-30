// App-level handler functions extracted for component size reduction
import { workContext } from '../../stores/workContextStore.svelte.ts';
import { validation } from '../../stores/validationStore.svelte.ts';
import { uiState } from '../../stores/uiStateStore.svelte.ts';

export function handleIngredientSelection(ingredient) {
  console.log('App: handleIngredientSelection called', {
    ingredient: ingredient.name,
    action: 'Opening diff viewer'
  });
  uiState.update(state => ({
    ...state,
    selectedIngredientForDiff: ingredient,
    showDiffViewer: true
  }));
}

export function handleCreateReference(ingredient, populationType, setSections, addSection) {
  workContext.update(ctx => ({
    ...ctx,
    currentIngredient: ingredient.name,
    currentPopulationType: populationType,
    currentReferenceName: `${ingredient.name} - ${populationType}`,
    loadedIngredient: ingredient,
    loadedReference: {
      name: `${ingredient.name} - ${populationType}`,
      populationType: populationType,
      healthSystem: null,
      version: null
    },
    currentHealthSystem: null,
    loadedReferenceId: null,
    hasUnsavedChanges: false,
    originalSections: '[]'
  }));
  
  setSections([]);
  addSection('static');
  
  uiState.update(state => ({
    ...state,
    showIngredientManager: false
  }));
}

export function handleEditReference(ingredient, reference, setSections) {
  console.log('App: handleEditReference called', {
    ingredient: ingredient.name,
    reference: reference?.name,
    hasSections: !!(reference?.sections),
    fullReference: reference
  });
  
  if (!reference) return;
  
  // Check if sections exist and have content
  if (!reference.sections || reference.sections.length === 0) {
    console.warn('Reference has empty sections! User needs to run "Fix Empty Sections" in Ingredient Manager.');
    alert(`This reference has no content sections. Please run "Fix Empty Sections" in the Ingredient Manager to populate the clinical notes.`);
    return;
  }
  
  setSections(reference.sections);
  
  workContext.update(ctx => ({
    ...ctx,
    currentIngredient: ingredient.name,
    currentReferenceName: reference.name,
    currentPopulationType: reference.populationType,
    loadedReferenceId: reference.id,
    hasUnsavedChanges: false,
    lastSavedTime: reference.updatedAt,
    originalSections: JSON.stringify(reference.sections),
    loadedIngredient: ingredient,
    loadedReference: reference,
    currentHealthSystem: reference.healthSystem,
    previewCollapsed: false
  }));
  
  // Load validation data
  validation.update(val => ({
    ...val,
    currentValidationStatus: reference.validationStatus || 'untested',
    currentValidationNotes: reference.validationNotes || '',
    currentValidatedBy: reference.validatedBy || null,
    currentValidatedAt: reference.validatedAt || null,
    currentTestResults: reference.testResults || null
  }));
  
  // Close all other views
  uiState.update(state => ({
    ...state,
    showIngredientManager: false,
    showMigrationTool: false,
    showAIWorkflowInspector: false,
    showTestGeneratorModal: false,
    showSidebar: false,
    previewMode: 'preview'
  }));
  
  // Scroll to top and flash indicator
  setTimeout(() => {
    const editorElement = document.querySelector('.editor');
    if (editorElement) {
      editorElement.scrollTop = 0;
      editorElement.style.transition = 'background-color 0.3s ease';
      editorElement.style.backgroundColor = '#e8f4fd';
      setTimeout(() => {
        editorElement.style.backgroundColor = '';
      }, 300);
    }
  }, 100);
}

export function handleMigrationComplete(result) {
  uiState.update(state => ({
    ...state,
    showMigrationTool: false
  }));
}

export async function handleSelectiveApply(results, sections) {
  uiState.update(state => ({
    ...state,
    showSelectiveApply: false
  }));
  
  workContext.update(ctx => ({
    ...ctx,
    hasUnsavedChanges: false,
    lastSavedTime: new Date(),
    originalSections: JSON.stringify(sections)
  }));
  
  console.log('Changes applied to configurations:', results);
  alert(`Changes applied to ${results.filter(r => r.status === 'success').length} configurations successfully.`);
}

export function handleOpenDiffViewer() {
  return async function() {
    const currentWorkContext = workContext.get();
    const currentUiState = uiState.get();
    
    console.log('Compare button clicked', { 
      loadedIngredient: currentWorkContext.loadedIngredient, 
      showIngredientManager: currentUiState.showIngredientManager, 
      showDiffViewer: currentUiState.showDiffViewer 
    });
    
    uiState.update(state => ({
      ...state,
      showIngredientManager: false
    }));
    
    if (currentWorkContext.loadedIngredient) {
      if (!currentWorkContext.loadedIngredient.id || currentWorkContext.loadedIngredient.id === currentWorkContext.loadedIngredient.name) {
        try {
          const { ingredientService } = await import('../firebaseDataService.js');
          const ingredients = await ingredientService.getAllIngredients();
          
          const foundIngredient = ingredients.find(ing => 
            ing.name === currentWorkContext.loadedIngredient.name || 
            ing.name === currentWorkContext.loadedIngredient.id
          );
          
          if (foundIngredient) {
            console.log('Found ingredient:', foundIngredient);
            uiState.update(state => ({
              ...state,
              selectedIngredientForDiff: foundIngredient,
              showDiffViewer: true,
              showIngredientManager: false
            }));
          } else {
            alert(`Cannot find ingredient "${currentWorkContext.loadedIngredient.name}" in Firebase. Make sure it has been properly imported.`);
          }
        } catch (error) {
          console.error('Error finding ingredient:', error);
          alert('Error loading ingredient data. Please try again.');
        }
      } else {
        console.log('Using existing ingredient:', currentWorkContext.loadedIngredient);
        uiState.update(state => ({
          ...state,
          selectedIngredientForDiff: currentWorkContext.loadedIngredient,
          showDiffViewer: true,
          showIngredientManager: false
        }));
      }
    }
  };
}