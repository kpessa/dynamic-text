import type { Section } from '../types/section.js';
import type { ValidationData, LoadedReference, LoadedIngredient } from '../types/workspace.js';
import { POPULATION_TYPES } from '../lib/firebaseDataService.js';

type ValidationStatus = 'untested' | 'passed' | 'failed' | 'partial';

// Workspace store for current work context and state
class WorkspaceStore {
  // Current work context
  private _currentIngredient = $state<string>('');
  private _currentReferenceName = $state<string>('');
  private _loadedIngredient = $state<LoadedIngredient | null>(null);
  private _loadedReference = $state<LoadedReference | null>(null);
  private _currentHealthSystem = $state<string | null>(null);
  private _currentPopulationType = $state<string>(POPULATION_TYPES.ADULT);
  private _availablePopulations = $state<any[]>([]);

  // Save/load state
  private _hasUnsavedChanges = $state<boolean>(false);
  private _lastSavedTime = $state<Date | null>(null);
  private _loadedReferenceId = $state<string | null>(null);
  private _originalSections = $state<Section[] | null>(null);

  // Validation state
  private _currentValidationStatus = $state<ValidationStatus>('untested');
  private _currentValidationNotes = $state<string>('');
  private _currentValidatedBy = $state<string | null>(null);
  private _currentValidatedAt = $state<Date | null>(null);
  private _currentTestResults = $state<any>(null);

  // Firebase and config state
  private _firebaseEnabled = $state<boolean>(false);
  private _activeConfigId = $state<string | null>(null);
  private _activeConfigIngredients = $state<any[]>([]);
  private _selectedIngredientForDiff = $state<any>(null);
  private _pendingSaveData = $state<any>(null);
  private _pendingReferenceData = $state<any>(null);

  // Getters
  get currentIngredient() { return this._currentIngredient; }
  get currentReferenceName() { return this._currentReferenceName; }
  get loadedIngredient() { return this._loadedIngredient; }
  get loadedReference() { return this._loadedReference; }
  get currentHealthSystem() { return this._currentHealthSystem; }
  get currentPopulationType() { return this._currentPopulationType; }
  get availablePopulations() { return this._availablePopulations; }
  get hasUnsavedChanges() { return this._hasUnsavedChanges; }
  get lastSavedTime() { return this._lastSavedTime; }
  get loadedReferenceId() { return this._loadedReferenceId; }
  get originalSections() { return this._originalSections; }
  get currentValidationStatus(): ValidationStatus { return this._currentValidationStatus; }
  get currentValidationNotes() { return this._currentValidationNotes; }
  get currentValidatedBy() { return this._currentValidatedBy; }
  get currentValidatedAt() { return this._currentValidatedAt; }
  get currentTestResults() { return this._currentTestResults; }
  get firebaseEnabled() { return this._firebaseEnabled; }
  get activeConfigId() { return this._activeConfigId; }
  get activeConfigIngredients() { return this._activeConfigIngredients; }
  get selectedIngredientForDiff() { return this._selectedIngredientForDiff; }
  get pendingSaveData() { return this._pendingSaveData; }
  get pendingReferenceData() { return this._pendingReferenceData; }

  // Derived computed values - using getters to prevent reactivity loops
  get hasLoadedContent() {
    return this._loadedIngredient !== null || this._loadedReference !== null;
  }
  
  get hasWorkspaceChanges() {
    return this._hasUnsavedChanges || 
      (this._currentIngredient.trim() !== '') || 
      (this._currentReferenceName.trim() !== '');
  }
  
  get isValidationComplete() {
    return this._currentValidationStatus === 'passed' || 
      this._currentValidationStatus === 'failed';
  }
  
  get workspaceTitle() {
    if (this._currentReferenceName) return this._currentReferenceName;
    if (this._currentIngredient) return this._currentIngredient;
    return 'Untitled Workspace';
  }
  
  get lastSavedTimeFormatted() {
    if (!this._lastSavedTime) return 'Never saved';
    return this._lastSavedTime.toLocaleString();
  }

  // Setters
  setCurrentIngredient(ingredient: string) { this._currentIngredient = ingredient; }
  setCurrentReferenceName(name: string) { this._currentReferenceName = name; }
  setLoadedIngredient(ingredient: LoadedIngredient | null) { this._loadedIngredient = ingredient; }
  setLoadedReference(reference: LoadedReference | null) { this._loadedReference = reference; }
  setCurrentHealthSystem(healthSystem: string | null) { this._currentHealthSystem = healthSystem; }
  setCurrentPopulationType(populationType: string) { this._currentPopulationType = populationType; }
  setAvailablePopulations(populations: any[]) { this._availablePopulations = populations; }
  setHasUnsavedChanges(hasChanges: boolean) { this._hasUnsavedChanges = hasChanges; }
  setLastSavedTime(time: Date | null) { this._lastSavedTime = time; }
  setLoadedReferenceId(id: string | null) { this._loadedReferenceId = id; }
  setOriginalSections(sections: Section[] | null) { this._originalSections = sections; }
  setFirebaseEnabled(enabled: boolean) { this._firebaseEnabled = enabled; }
  setActiveConfigId(id: string | null) { this._activeConfigId = id; }
  setActiveConfigIngredients(ingredients: any[]) { this._activeConfigIngredients = ingredients; }
  setSelectedIngredientForDiff(ingredient: any) { this._selectedIngredientForDiff = ingredient; }
  setPendingSaveData(data: any) { this._pendingSaveData = data; }
  setPendingReferenceData(data: any) { this._pendingReferenceData = data; }

  // Validation methods
  updateValidation(validationData: ValidationData) {
    this._currentValidationStatus = validationData.status;
    this._currentValidationNotes = validationData.notes;
    this._currentValidatedBy = validationData.validatedBy;
    this._currentValidatedAt = validationData.validatedAt;
    this._hasUnsavedChanges = true;
  }

  setTestResults(results: any) {
    this._currentTestResults = results;
  }

  // Change tracking
  markAsChanged() {
    this._hasUnsavedChanges = true;
  }

  markAsSaved() {
    this._hasUnsavedChanges = false;
    this._lastSavedTime = new Date();
  }

  checkForChanges(currentSections: Section[]): boolean {
    if (!this._originalSections) {
      this._originalSections = structuredClone(currentSections);
      return false;
    }

    const hasChanges = JSON.stringify(this._originalSections) !== JSON.stringify(currentSections);
    this._hasUnsavedChanges = hasChanges;
    return hasChanges;
  }

  // Update original sections snapshot
  updateOriginalSections(sections: Section[]) {
    this._originalSections = structuredClone(sections);
  }

  // Load reference data
  loadReference(reference: LoadedReference, ingredient: LoadedIngredient | null = null) {
    this._loadedReference = { ...reference }; // Create defensive copy
    this._loadedReferenceId = reference.id;
    this._currentReferenceName = reference.name || '';
    this._currentHealthSystem = reference.healthSystem || null;
    this._currentPopulationType = reference.populationType || POPULATION_TYPES.ADULT;
    
    if (ingredient) {
      this._loadedIngredient = { ...ingredient }; // Create defensive copy
      this._currentIngredient = ingredient.name || '';
    }

    // Update validation data from reference
    if (reference.validationStatus) {
      this._currentValidationStatus = reference.validationStatus;
      this._currentValidationNotes = reference.validationNotes || '';
      this._currentValidatedBy = reference.validatedBy || null;
      this._currentValidatedAt = reference.validatedAt ? new Date(reference.validatedAt) : null;
    }

    this._hasUnsavedChanges = false;
    this._lastSavedTime = reference.updatedAt ? new Date(reference.updatedAt) : null;
  }

  // Clear workspace
  clearWorkspace() {
    // Reset all state to initial values
    this._currentIngredient = '';
    this._currentReferenceName = '';
    this._loadedIngredient = null;
    this._loadedReference = null;
    this._currentHealthSystem = null;
    this._currentPopulationType = POPULATION_TYPES.ADULT;
    this._availablePopulations = [];
    this._hasUnsavedChanges = false;
    this._lastSavedTime = null;
    this._loadedReferenceId = null;
    this._originalSections = null;
    this._currentValidationStatus = 'untested';
    this._currentValidationNotes = '';
    this._currentValidatedBy = null;
    this._currentValidatedAt = null;
    this._currentTestResults = null;
    this._activeConfigId = null;
    this._activeConfigIngredients = [];
    this._selectedIngredientForDiff = null;
    this._pendingSaveData = null;
    this._pendingReferenceData = null;
  }

  // Utility methods for workspace state management
  isWorkspaceEmpty(): boolean {
    return !this._currentIngredient.trim() && 
           !this._currentReferenceName.trim() && 
           !this._loadedIngredient && 
           !this._loadedReference;
  }

  // Export current workspace state
  exportWorkspaceState() {
    return {
      currentIngredient: this._currentIngredient,
      currentReferenceName: this._currentReferenceName,
      currentHealthSystem: this._currentHealthSystem,
      currentPopulationType: this._currentPopulationType,
      validationStatus: this._currentValidationStatus,
      validationNotes: this._currentValidationNotes,
      hasUnsavedChanges: this._hasUnsavedChanges,
      lastSavedTime: this._lastSavedTime
    };
  }
}

// Create and export the store instance
export const workspaceStore = new WorkspaceStore();
