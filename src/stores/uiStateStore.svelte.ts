type PreviewMode = 'preview' | 'source' | 'split';

interface UIState {
  showSidebar: boolean;
  showOutput: boolean;
  previewMode: PreviewMode;
  previewCollapsed: boolean;
  showKeyReference: boolean;
  showIngredientManager: boolean;
  showDiffViewer: boolean;
  showMigrationTool: boolean;
  showPreferences: boolean;
  selectedIngredientForDiff: string | null;
  showCommitMessageDialog: boolean;
  showSelectiveApply: boolean;
  showAIWorkflowInspector: boolean;
  inspectorCurrentSection: any | null;
}

class UIStateStore {
  // Private state using $state rune
  private _state = $state<UIState>({
    showSidebar: false,
    showOutput: false,
    previewMode: 'preview',
    previewCollapsed: false,
    showKeyReference: false,
    showIngredientManager: false,
    showDiffViewer: false,
    showMigrationTool: false,
    showPreferences: false,
    selectedIngredientForDiff: null,
    showCommitMessageDialog: false,
    showSelectiveApply: false,
    showAIWorkflowInspector: false,
    inspectorCurrentSection: null
  });

  // Getters
  get showSidebar() { return this._state.showSidebar; }
  get showOutput() { return this._state.showOutput; }
  get previewMode() { return this._state.previewMode; }
  get previewCollapsed() { return this._state.previewCollapsed; }
  get showKeyReference() { return this._state.showKeyReference; }
  get showIngredientManager() { return this._state.showIngredientManager; }
  get showDiffViewer() { return this._state.showDiffViewer; }
  get showMigrationTool() { return this._state.showMigrationTool; }
  get showPreferences() { return this._state.showPreferences; }
  get selectedIngredientForDiff() { return this._state.selectedIngredientForDiff; }
  get showCommitMessageDialog() { return this._state.showCommitMessageDialog; }
  get showSelectiveApply() { return this._state.showSelectiveApply; }
  get showAIWorkflowInspector() { return this._state.showAIWorkflowInspector; }
  get inspectorCurrentSection() { return this._state.inspectorCurrentSection; }

  // Setters
  set showSidebar(value: boolean) { this._state.showSidebar = value; }
  set showOutput(value: boolean) { this._state.showOutput = value; }
  set previewMode(value: PreviewMode) { this._state.previewMode = value; }
  set previewCollapsed(value: boolean) { this._state.previewCollapsed = value; }
  set showKeyReference(value: boolean) { this._state.showKeyReference = value; }
  set showIngredientManager(value: boolean) { this._state.showIngredientManager = value; }
  set showDiffViewer(value: boolean) { this._state.showDiffViewer = value; }
  set showMigrationTool(value: boolean) { this._state.showMigrationTool = value; }
  set showPreferences(value: boolean) { this._state.showPreferences = value; }
  set selectedIngredientForDiff(value: string | null) { this._state.selectedIngredientForDiff = value; }
  set showCommitMessageDialog(value: boolean) { this._state.showCommitMessageDialog = value; }
  set showSelectiveApply(value: boolean) { this._state.showSelectiveApply = value; }
  set showAIWorkflowInspector(value: boolean) { this._state.showAIWorkflowInspector = value; }
  set inspectorCurrentSection(value: any | null) { this._state.inspectorCurrentSection = value; }

  // Derived state
  hasAnyModalOpen = $derived(() => 
    this._state.showIngredientManager ||
    this._state.showDiffViewer ||
    this._state.showMigrationTool ||
    this._state.showPreferences ||
    this._state.showCommitMessageDialog ||
    this._state.showSelectiveApply ||
    this._state.showAIWorkflowInspector
  );

  isSidebarOrOutputVisible = $derived(() => 
    this._state.showSidebar || this._state.showOutput
  );

  // Methods
  toggleSidebar() {
    this._state.showSidebar = !this._state.showSidebar;
  }

  toggleOutput() {
    this._state.showOutput = !this._state.showOutput;
  }

  togglePreviewCollapsed() {
    this._state.previewCollapsed = !this._state.previewCollapsed;
  }

  toggleKeyReference() {
    this._state.showKeyReference = !this._state.showKeyReference;
  }

  setPreviewMode(mode: PreviewMode) {
    this._state.previewMode = mode;
  }

  closeAllModals() {
    this._state.showIngredientManager = false;
    this._state.showDiffViewer = false;
    this._state.showMigrationTool = false;
    this._state.showPreferences = false;
    this._state.showCommitMessageDialog = false;
    this._state.showSelectiveApply = false;
    this._state.showAIWorkflowInspector = false;
    this._state.selectedIngredientForDiff = null;
    this._state.inspectorCurrentSection = null;
  }

  openModal(modalName: keyof UIState) {
    this.closeAllModals();
    if (typeof this._state[modalName] === 'boolean') {
      (this._state[modalName] as boolean) = true;
    }
  }

  // Update method for partial updates
  update(updates: Partial<UIState>) {
    Object.assign(this._state, updates);
  }

  // Subscribe method for Svelte store compatibility
  subscribe(callback: (value: UIState) => void) {
    // Use $effect to watch for changes
    $effect(() => {
      callback(this._state);
    });
    // Return unsubscribe function
    return () => {};
  }

  // Set method for Svelte store compatibility
  set(value: UIState) {
    this._state = value;
  }
}

// Export singleton instance
export const uiStateStore = new UIStateStore();

// Export as uiState for backward compatibility
export const uiState = uiStateStore;