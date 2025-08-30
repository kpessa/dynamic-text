// Modal Service - Centralized modal state management
// Uses Svelte 5 runes for reactive state

interface ModalState {
  testGenerator: boolean;
  aiWorkflowInspector: boolean;
  ingredientManager: boolean;
  diffViewer: boolean;
  migrationTool: boolean;
  testSummary: boolean;
  exportModal: boolean;
  versionHistory: boolean;
  duplicateReport: boolean;
  selectiveApply: boolean;
  preferences: boolean;
  commitMessageDialog: boolean;
}

class ModalService {
  // Private state with $state rune
  private _modals = $state<ModalState>({
    testGenerator: false,
    aiWorkflowInspector: false,
    ingredientManager: false,
    diffViewer: false,
    migrationTool: false,
    testSummary: false,
    exportModal: false,
    versionHistory: false,
    duplicateReport: false,
    selectiveApply: false,
    preferences: false,
    commitMessageDialog: false
  });

  // Modal-specific data
  private _modalData = $state<Record<string, any>>({
    selectedIngredientForDiff: null,
    currentGeneratedTests: null,
    inspectorCurrentSection: null,
    testSummary: null,
    pendingReferenceData: null,
    targetSectionId: null
  });

  // Public getters for reactive access
  get modals() {
    return this._modals;
  }

  get modalData() {
    return this._modalData;
  }

  // Generic modal operations
  open(modalName: keyof ModalState, data?: any) {
    this._modals[modalName] = true;
    if (data) {
      this._modalData[modalName] = data;
    }
  }

  close(modalName: keyof ModalState) {
    this._modals[modalName] = false;
    // Clear associated data when closing
    if (modalName === 'diffViewer') {
      this._modalData.selectedIngredientForDiff = null;
    } else if (modalName === 'selectiveApply') {
      this._modalData.pendingReferenceData = null;
    }
  }

  closeAll() {
    Object.keys(this._modals).forEach(key => {
      this._modals[key as keyof ModalState] = false;
    });
  }

  // Modal-specific methods for convenience
  openTestGenerator(sectionId: string, generatedTests?: any) {
    this._modalData.targetSectionId = sectionId;
    this._modalData.currentGeneratedTests = generatedTests;
    this._modals.testGenerator = true;
  }

  openAIWorkflowInspector(section: any) {
    this._modalData.inspectorCurrentSection = section;
    this._modals.aiWorkflowInspector = true;
  }

  openDiffViewer(ingredient: any) {
    this._modalData.selectedIngredientForDiff = ingredient;
    this._modals.diffViewer = true;
    // Close ingredient manager when opening diff viewer
    this._modals.ingredientManager = false;
  }

  openTestSummary(summary: any) {
    this._modalData.testSummary = summary;
    this._modals.testSummary = true;
  }

  openSelectiveApply(referenceData: any) {
    this._modalData.pendingReferenceData = referenceData;
    this._modals.selectiveApply = true;
  }

  // Close all editor-related modals when loading a reference
  closeEditingModals() {
    this._modals.ingredientManager = false;
    this._modals.migrationTool = false;
    this._modals.aiWorkflowInspector = false;
    this._modals.testGenerator = false;
  }

  // Check if any modal is open
  get isAnyModalOpen() {
    return Object.values(this._modals).some(isOpen => isOpen);
  }

  // Get specific modal state
  isOpen(modalName: keyof ModalState) {
    return this._modals[modalName];
  }

  // Set modal data without opening
  setModalData(key: string, value: any) {
    this._modalData[key] = value;
  }

  // Get modal data
  getModalData(key: string) {
    return this._modalData[key];
  }
}

// Export singleton instance
export const modalService = new ModalService();