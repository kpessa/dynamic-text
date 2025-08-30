import type { TestCase } from '../lib/types';

interface WorkContext {
  currentIngredient: string;
  currentReferenceName: string;
  hasUnsavedChanges: boolean;
  lastSavedTime: Date | null;
  loadedReferenceId: string | null;
  originalSections: any[] | null;
  tpnMode: boolean;
  currentTPNInstance: any | null;
  tpnPanelExpanded: boolean;
  currentIngredientValues: Record<string, any>;
  editingSection: number | null;
  loadedIngredient: any | null;
  loadedReference: any | null;
  currentHealthSystem: string | null;
  activeTestCase: Record<number, TestCase>;
  expandedTestCases: Record<number, boolean>;
}

class WorkContextStore {
  // Private state using $state rune
  private _state = $state<WorkContext>({
    currentIngredient: '',
    currentReferenceName: '',
    hasUnsavedChanges: false,
    lastSavedTime: null,
    loadedReferenceId: null,
    originalSections: null,
    tpnMode: false,
    currentTPNInstance: null,
    tpnPanelExpanded: true,
    currentIngredientValues: {},
    editingSection: null,
    loadedIngredient: null,
    loadedReference: null,
    currentHealthSystem: null,
    activeTestCase: {},
    expandedTestCases: {}
  });

  // Getters for all properties
  get currentIngredient() { return this._state.currentIngredient; }
  get currentReferenceName() { return this._state.currentReferenceName; }
  get hasUnsavedChanges() { return this._state.hasUnsavedChanges; }
  get lastSavedTime() { return this._state.lastSavedTime; }
  get loadedReferenceId() { return this._state.loadedReferenceId; }
  get originalSections() { return this._state.originalSections; }
  get tpnMode() { return this._state.tpnMode; }
  get currentTPNInstance() { return this._state.currentTPNInstance; }
  get tpnPanelExpanded() { return this._state.tpnPanelExpanded; }
  get currentIngredientValues() { return this._state.currentIngredientValues; }
  get editingSection() { return this._state.editingSection; }
  get loadedIngredient() { return this._state.loadedIngredient; }
  get loadedReference() { return this._state.loadedReference; }
  get currentHealthSystem() { return this._state.currentHealthSystem; }
  get activeTestCase() { return this._state.activeTestCase; }
  get expandedTestCases() { return this._state.expandedTestCases; }

  // Setters for all properties
  set currentIngredient(value: string) { this._state.currentIngredient = value; }
  set currentReferenceName(value: string) { this._state.currentReferenceName = value; }
  set hasUnsavedChanges(value: boolean) { this._state.hasUnsavedChanges = value; }
  set lastSavedTime(value: Date | null) { this._state.lastSavedTime = value; }
  set loadedReferenceId(value: string | null) { this._state.loadedReferenceId = value; }
  set originalSections(value: any[] | null) { this._state.originalSections = value; }
  set tpnMode(value: boolean) { this._state.tpnMode = value; }
  set currentTPNInstance(value: any | null) { this._state.currentTPNInstance = value; }
  set tpnPanelExpanded(value: boolean) { this._state.tpnPanelExpanded = value; }
  set currentIngredientValues(value: Record<string, any>) { this._state.currentIngredientValues = value; }
  set editingSection(value: number | null) { this._state.editingSection = value; }
  set loadedIngredient(value: any | null) { this._state.loadedIngredient = value; }
  set loadedReference(value: any | null) { this._state.loadedReference = value; }
  set currentHealthSystem(value: string | null) { this._state.currentHealthSystem = value; }
  set activeTestCase(value: Record<number, TestCase>) { this._state.activeTestCase = value; }
  set expandedTestCases(value: Record<number, boolean>) { this._state.expandedTestCases = value; }

  // Method to update multiple properties at once
  update(updates: Partial<WorkContext>) {
    Object.assign(this._state, updates);
  }

  // Method to reset the store
  reset() {
    this._state = {
      currentIngredient: '',
      currentReferenceName: '',
      hasUnsavedChanges: false,
      lastSavedTime: null,
      loadedReferenceId: null,
      originalSections: null,
      tpnMode: false,
      currentTPNInstance: null,
      tpnPanelExpanded: true,
      currentIngredientValues: {},
      editingSection: null,
      loadedIngredient: null,
      loadedReference: null,
      currentHealthSystem: null,
      activeTestCase: {},
      expandedTestCases: {}
    };
  }

  // Subscribe method for Svelte store compatibility
  subscribe(callback: (value: WorkContext) => void) {
    // Use $effect to watch for changes
    $effect(() => {
      callback(this._state);
    });
    // Return unsubscribe function
    return () => {};
  }

  // Set method for Svelte store compatibility
  set(value: WorkContext) {
    this._state = value;
  }
}

// Export singleton instance
export const workContextStore = new WorkContextStore();

// Export as workContext for backward compatibility
export const workContext = workContextStore;